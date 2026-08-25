(() => {
  'use strict';

  // Diese Datei sperrt die App hinter einer PIN und verschlüsselt die
  // gespeicherten Daten. app.js wird bewusst NICHT verändert (dort gewinnt
  // "die letzte Definition", jede Änderung dort ist riskant) — stattdessen
  // wird app.js erst NACH erfolgreicher Entsperrung überhaupt geladen, und
  // localStorage wird für app.js transparent aus-/verschlüsselt.

  const KEY = 'fiamed-pflege-v2';
  const LEGACY_KEY = 'fiamed-pflege-v1';
  const LOCK_KEY = 'fiamed-pflege-lock-v1';
  const APP_SCRIPT_SRC = 'app.js';
  const PIN_ITERATIONS = 250000;
  const RECOVERY_ITERATIONS = 250000;
  const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // ohne 0/O/1/I/L
  const MAX_FAILS_BEFORE_THROTTLE = 5;

  const realGetItem = Storage.prototype.getItem.bind(localStorage);
  const realSetItem = Storage.prototype.setItem.bind(localStorage);

  let masterKey = null;
  let cachedPlaintext = null;
  let pendingPlaintext = null;   // noch nicht verschlüsselt geschriebener Stand
  let writeInFlight = false;     // läuft gerade ein Schreibvorgang?

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  // ---------- Basis-Helfer ----------
  function bytesToBase64(bytes) {
    const CHUNK = 0x8000; // in Stücken, sonst Stack-Overflow bei großen Daten (z. B. Fotos)
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }
  function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function randomBytes(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  }
  function makeRecoveryCode() {
    const raw = randomBytes(20);
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      out += RECOVERY_ALPHABET[raw[i] % RECOVERY_ALPHABET.length];
      if ((i + 1) % 5 === 0 && i !== raw.length - 1) out += '-';
    }
    return out;
  }
  function normalizeRecoveryCode(code) {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // ---------- Schlüssel-Ableitung (PIN/Code -> AES-Schlüssel) ----------
  async function deriveWrappingKey(secretText, saltB64, iterations) {
    const salt = base64ToBytes(saltB64);
    const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(secretText), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function wrapMasterKey(wrappingKey, masterKeyBytes) {
    const iv = randomBytes(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, masterKeyBytes);
    return { iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) };
  }
  async function unwrapMasterKey(wrappingKey, wrapped) {
    const iv = base64ToBytes(wrapped.iv);
    const ct = base64ToBytes(wrapped.ct);
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, ct);
    return new Uint8Array(raw);
  }

  // ---------- Daten ver-/entschlüsseln ----------
  async function encryptState(key, plaintextJson) {
    const iv = randomBytes(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintextJson));
    return JSON.stringify({ v: 1, iv: bytesToBase64(iv), ct: bytesToBase64(new Uint8Array(ct)) });
  }
  async function decryptState(key, envelopeJson) {
    const env = JSON.parse(envelopeJson);
    const iv = base64ToBytes(env.iv);
    const ct = base64ToBytes(env.ct);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return textDecoder.decode(pt);
  }
  function isEncryptedEnvelope(raw) {
    if (!raw) return false;
    try {
      const obj = JSON.parse(raw);
      return !!obj && obj.v === 1 && typeof obj.iv === 'string' && typeof obj.ct === 'string';
    } catch { return false; }
  }

  // ---------- IndexedDB-Spiegel der Lock-Metadaten ----------
  // Ohne pinSalt/pinWrapped/recoverySalt/recoveryWrapped sind die verschlüsselten
  // Daten UNWIDERRUFLICH verloren — das ist kein Bug, sondern der Sinn der
  // Verschlüsselung (es gibt bewusst keinen Server-Zweitschlüssel). localStorage
  // kann von Browsern aber ohne Vorwarnung geräumt werden (z. B. Safaris
  // "Intelligent Tracking Prevention" nach längerer Nichtbenutzung der Seite).
  // Eine zweite, unabhängige Kopie in IndexedDB (anderer Speicher, andere
  // Räum-Regeln) senkt das Risiko eines Totalverlusts. Beide Speicher werden bei
  // jedem Lesen/Schreiben synchron gehalten; fehlt eine Kopie, heilt die andere sie.
  const IDB_NAME = 'fiamed-lock-backup';
  const IDB_STORE = 'meta';
  const IDB_KEY = 'current';
  function openLockDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB nicht verfügbar')); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGetMeta() {
    try {
      const db = await openLockDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch { return null; }
  }
  async function idbSetMeta(meta) {
    try {
      const db = await openLockDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(meta, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) { console.error('IndexedDB-Sicherung der Lock-Metadaten fehlgeschlagen', err); }
  }

  // ---------- localStorage-Weiche für app.js ----------
  // app.js liest/schreibt localStorage[KEY] ganz normal, synchron, wie eh und je.
  // Diese Weiche hält den Klartext nur im Speicher (nie persistiert) und
  // schreibt eine verschlüsselte Fassung in die echte localStorage.
  //
  // Das Verschlüsseln MUSS asynchron bleiben: WebCrypto bietet keine synchrone
  // Variante, und eine selbstgebaute wäre schlechter als das Problem. Es bleibt
  // also ein kurzer Moment, in dem eine Änderung nur im Speicher steht. Zwei
  // Maßnahmen halten dieses Fenster so klein wie möglich (Bug vom 25.08.2026:
  // Tour wirkte zurückgesetzt, wenn die App direkt nach einer Änderung
  // weggewischt wurde):
  //
  // 1. Schreibvorgänge werden ZUSAMMENGEFASST statt aufgereiht. Vorher hängte
  //    jedes setItem einen weiteren Verschlüsselungslauf an eine Kette, obwohl
  //    nur der jeweils letzte Stand zählt — bei mehreren schnellen Änderungen
  //    warteten alle aufeinander und das Fenster wuchs. Jetzt wird immer nur der
  //    neueste Stand geschrieben, ältere Zwischenstände werden übersprungen.
  // 2. Beim Wechsel in den Hintergrund (visibilitychange/pagehide) wird sofort
  //    ausgeschrieben. Beim Wegwischen geht die App immer erst in den
  //    Hintergrund, bevor sie beendet wird — dieser Moment reicht in der Praxis.
  function flushPendingWrite() {
    if (writeInFlight || pendingPlaintext === null) return;
    writeInFlight = true;
    (async () => {
      try {
        while (pendingPlaintext !== null) {
          const value = pendingPlaintext;
          const envelope = await encryptState(masterKey, value);
          realSetItem(KEY, envelope);
          // Erst NACH dem tatsächlichen Schreiben als erledigt markieren — und nur,
          // wenn inzwischen kein neuerer Stand eingetroffen ist. Wichtig für den
          // Fall, dass iOS die Seite mitten im Vorgang einfriert: dann bleibt der
          // Stand als offen vermerkt und wird beim Wiederaufwachen (pageshow)
          // nachgeholt, statt lautlos verloren zu gehen.
          if (pendingPlaintext === value) pendingPlaintext = null;
        }
      } catch (err) {
        console.error('Verschlüsseltes Speichern fehlgeschlagen', err);
      } finally {
        writeInFlight = false;
      }
    })();
  }

  function installShim() {
    localStorage.getItem = function (k) {
      if (k === KEY) return cachedPlaintext;
      return realGetItem(k);
    };
    localStorage.setItem = function (k, v) {
      if (k === KEY) {
        cachedPlaintext = v;
        pendingPlaintext = v;
        flushPendingWrite();
        return;
      }
      return realSetItem(k, v);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingWrite();
    });
    window.addEventListener('pagehide', flushPendingWrite);
    // Rückkehr aus dem Hintergrund: nachholen, was beim Einfrieren liegengeblieben ist.
    window.addEventListener('pageshow', flushPendingWrite);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flushPendingWrite();
    });
  }

  // ---------- Lock-Metadaten ----------
  // Liest bevorzugt aus localStorage; fehlt es dort, wird IndexedDB als
  // Rückfallebene geprüft (und localStorage bei Erfolg gleich mitgeheilt).
  // Erst wenn BEIDE Speicher leer sind, gilt "keine PIN eingerichtet".
  async function loadLockMeta() {
    const raw = realGetItem(LOCK_KEY);
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        idbSetMeta(meta); // im Hintergrund nachziehen, falls die IndexedDB-Kopie fehlt
        return meta;
      } catch { /* localStorage-Eintrag beschädigt: unten auf IndexedDB ausweichen */ }
    }
    const fromIdb = await idbGetMeta();
    if (fromIdb) {
      realSetItem(LOCK_KEY, JSON.stringify(fromIdb));
      return fromIdb;
    }
    return null;
  }
  async function saveLockMeta(meta) {
    realSetItem(LOCK_KEY, JSON.stringify(meta));
    await idbSetMeta(meta);
  }

  // ---------- App laden (erst NACH Entsperrung) ----------
  function bootApp() {
    hideOverlay();
    setupPinChangeUI();
    const s = document.createElement('script');
    s.src = APP_SCRIPT_SRC;
    document.body.appendChild(s);
  }

  // ---------- "PIN ändern" in den Einstellungen ----------
  // app.js baut #settings bei jedem Aufruf komplett neu (innerHTML=...) und
  // würde ein einmal eingefügtes Panel dabei wieder löschen. Ein
  // MutationObserver setzt es deshalb nach jedem Neu-Rendern erneut ein.
  function setupPinChangeUI() {
    const settingsEl = document.getElementById('settings');
    if (!settingsEl) return;
    const inject = () => {
      if (document.getElementById('pinChangePanel')) return;
      const panel = document.createElement('div');
      panel.id = 'pinChangePanel';
      panel.className = 'panel';
      panel.style.marginTop = '18px';
      panel.innerHTML = `
        <div class="section-head"><div><h2>PIN ändern</h2><p>Schützt weiterhin dieselben Daten — der Wiederherstellungscode bleibt dabei gültig.</p></div></div>
        <form id="pinChangeForm" class="form-grid">
          <label>Aktuelle PIN<input type="password" inputmode="numeric" pattern="[0-9]*" id="pinChangeCurrent" name="currentPin" autocomplete="current-password" required></label>
          <label>Neue PIN<input type="password" inputmode="numeric" pattern="[0-9]*" id="pinChangeNew1" name="newPin1" autocomplete="off" required></label>
          <label>Neue PIN bestätigen<input type="password" inputmode="numeric" pattern="[0-9]*" id="pinChangeNew2" name="newPin2" autocomplete="off" required></label>
          <button type="button" class="lock-link" id="pinChangeToggle">👁 PIN anzeigen</button>
          <p class="lock-error" id="pinChangeError" hidden></p>
          <button type="submit" class="btn">PIN ändern</button>
        </form>
      `;
      settingsEl.appendChild(panel);
      wirePinVisibilityToggle('pinChangeToggle', ['pinChangeNew1', 'pinChangeNew2']);
      document.getElementById('pinChangeForm').onsubmit = handlePinChangeSubmit;
    };
    inject();
    new MutationObserver(inject).observe(settingsEl, { childList: true });
  }

  async function handlePinChangeSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const currentPin = form.currentPin.value.trim();
    const newPin1 = form.newPin1.value.trim();
    const newPin2 = form.newPin2.value.trim();
    const err = document.getElementById('pinChangeError');
    err.hidden = true;

    if (!/^\d{4,8}$/.test(newPin1)) { err.textContent = 'Die neue PIN muss aus 4 bis 8 Ziffern bestehen.'; err.hidden = false; return; }
    if (newPin1 !== newPin2) { err.textContent = 'Die beiden neuen PINs stimmen nicht überein.'; err.hidden = false; return; }

    const meta = await loadLockMeta();
    if (!meta) { err.textContent = 'Keine PIN eingerichtet.'; err.hidden = false; return; }

    let masterKeyBytes;
    try {
      const currentWrapKey = await deriveWrappingKey(currentPin, meta.pinSalt, meta.pinIterations);
      masterKeyBytes = await unwrapMasterKey(currentWrapKey, meta.pinWrapped);
    } catch {
      err.textContent = 'Die aktuelle PIN ist falsch.';
      err.hidden = false;
      return;
    }

    const newSalt = randomBytes(16);
    const newWrapKey = await deriveWrappingKey(newPin1, bytesToBase64(newSalt), meta.pinIterations);
    meta.pinSalt = bytesToBase64(newSalt);
    meta.pinWrapped = await wrapMasterKey(newWrapKey, masterKeyBytes);
    meta.failedAttempts = 0;
    meta.lockedUntil = 0;
    await saveLockMeta(meta);

    form.reset();
    err.hidden = false;
    err.style.color = 'var(--green, #26aa72)';
    err.textContent = 'PIN wurde geändert.';
  }

  // ---------- UI ----------
  let overlay = null;
  function render(html) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lockOverlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = html;
  }
  function hideOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  // Blendet ein "👁 PIN anzeigen"-Umschalter ein, der beide Felder eines
  // PIN-Bestätigungspaars synchron zwischen versteckt/sichtbar umschaltet.
  // Grund: Mobile Browser (v. a. iOS Safari) schlagen bei zwei benachbarten
  // password-Feldern manchmal unbemerkt ein eigenes, zufälliges Passwort für
  // eines der beiden Felder vor — beide Felder zeigen dann nur Punkte, wirken
  // identisch befüllt, sind es aber nicht. Sichtbar machen deckt das sofort auf.
  function wirePinVisibilityToggle(toggleId, fieldIds) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
    toggle.onclick = () => {
      const showing = toggle.dataset.showing === '1';
      fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.type = showing ? 'password' : 'text';
      });
      toggle.dataset.showing = showing ? '0' : '1';
      toggle.textContent = showing ? '👁 PIN anzeigen' : '🙈 PIN verbergen';
    };
  }

  // ---- Screen: PIN einrichten (erster Start) ----
  function showSetupScreen(existingPlaintextToMigrate) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">✚</div>
        <h1>PIN einrichten</h1>
        <p>Schütze die App mit einer PIN (4–8 Ziffern). So bleiben die Daten geschützt, falls jemand das Gerät in die Hand nimmt.</p>
        <form id="setupForm">
          <label>Neue PIN<input type="password" inputmode="numeric" pattern="[0-9]*" id="pin1" autocomplete="off" required></label>
          <label>PIN bestätigen<input type="password" inputmode="numeric" pattern="[0-9]*" id="pin2" autocomplete="off" required></label>
          <button type="button" class="lock-link" id="pin1Toggle">👁 PIN anzeigen</button>
          <p class="lock-error" id="setupError" hidden></p>
          <button type="submit" class="lock-btn">Weiter</button>
        </form>
      </div>
    `);
    wirePinVisibilityToggle('pin1Toggle', ['pin1', 'pin2']);
    document.getElementById('setupForm').onsubmit = async (e) => {
      e.preventDefault();
      const pin1 = document.getElementById('pin1').value.trim();
      const pin2 = document.getElementById('pin2').value.trim();
      const err = document.getElementById('setupError');
      if (!/^\d{4,8}$/.test(pin1)) { err.textContent = 'Die PIN muss aus 4 bis 8 Ziffern bestehen.'; err.hidden = false; return; }
      if (pin1 !== pin2) { err.textContent = 'Die beiden PINs stimmen nicht überein.'; err.hidden = false; return; }
      await setupPin(pin1, existingPlaintextToMigrate);
    };
  }

  async function setupPin(pin, existingPlaintextToMigrate) {
    render(`<div class="lock-card"><p>Einrichtung läuft …</p></div>`);

    const masterKeyObj = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const masterKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', masterKeyObj));

    const pinSalt = randomBytes(16);
    const pinWrapKey = await deriveWrappingKey(pin, bytesToBase64(pinSalt), PIN_ITERATIONS);
    const pinWrapped = await wrapMasterKey(pinWrapKey, masterKeyBytes);

    const recoveryCode = makeRecoveryCode();
    const recoverySalt = randomBytes(16);
    const recoveryWrapKey = await deriveWrappingKey(normalizeRecoveryCode(recoveryCode), bytesToBase64(recoverySalt), RECOVERY_ITERATIONS);
    const recoveryWrapped = await wrapMasterKey(recoveryWrapKey, masterKeyBytes);

    const meta = {
      v: 1,
      pinSalt: bytesToBase64(pinSalt), pinIterations: PIN_ITERATIONS, pinWrapped,
      recoverySalt: bytesToBase64(recoverySalt), recoveryIterations: RECOVERY_ITERATIONS, recoveryWrapped,
      failedAttempts: 0, lockedUntil: 0
    };
    await saveLockMeta(meta);

    masterKey = masterKeyObj;
    cachedPlaintext = existingPlaintextToMigrate || null;
    installShim();
    if (existingPlaintextToMigrate) {
      const envelope = await encryptState(masterKey, existingPlaintextToMigrate);
      realSetItem(KEY, envelope);
    }

    showRecoveryCodeScreen(recoveryCode);
  }

  function showRecoveryCodeScreen(code) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">🔑</div>
        <h1>Wiederherstellungscode</h1>
        <p>Falls die PIN einmal vergessen wird, ist das der einzige Weg zurück zu den Daten — es gibt keine Cloud, die sie zurücksetzen kann. Aufschreiben und sicher aufbewahren (z. B. auf Papier).</p>
        <div class="lock-code">${code}</div>
        <label class="lock-check"><input type="checkbox" id="confirmSaved"> Ich habe den Code notiert und sicher aufbewahrt.</label>
        <button class="lock-btn" id="continueBtn" disabled>Weiter zur App</button>
      </div>
    `);
    const cb = document.getElementById('confirmSaved');
    const btn = document.getElementById('continueBtn');
    cb.onchange = () => { btn.disabled = !cb.checked; };
    btn.onclick = () => bootApp();
  }

  // ---- Screen: PIN eingeben (jeder weitere Start) ----
  function showUnlockScreen(meta) {
    const waitMs = meta.lockedUntil - Date.now();
    if (waitMs > 0) {
      render(`<div class="lock-card"><h1>Kurz warten</h1><p>Zu viele falsche Versuche. Bitte in ${Math.ceil(waitMs / 1000)} Sekunden erneut versuchen.</p></div>`);
      setTimeout(() => showUnlockScreen(meta), Math.min(waitMs, 3000));
      return;
    }
    render(`
      <div class="lock-card">
        <div class="lock-badge">✚</div>
        <h1>FiaMed Pflege</h1>
        <p>Bitte PIN eingeben.</p>
        <form id="unlockForm">
          <input type="password" inputmode="numeric" pattern="[0-9]*" id="pinInput" autocomplete="current-password" autofocus required>
          <p class="lock-error" id="unlockError" hidden></p>
          <button type="submit" class="lock-btn">Entsperren</button>
        </form>
        <button type="button" class="lock-link" id="forgotBtn">PIN vergessen?</button>
      </div>
    `);
    document.getElementById('unlockForm').onsubmit = async (e) => {
      e.preventDefault();
      const pin = document.getElementById('pinInput').value.trim();
      const ok = await tryUnlockWithPin(meta, pin);
      if (!ok) {
        const err = document.getElementById('unlockError');
        err.textContent = 'Falsche PIN.';
        err.hidden = false;
        document.getElementById('pinInput').value = '';
      }
    };
    document.getElementById('forgotBtn').onclick = () => showRecoveryEntryScreen(meta);
  }

  async function tryUnlockWithPin(meta, pin) {
    // Frisch laden statt dem beim Rendern übergebenen Objekt zu vertrauen: War die
    // App in einem anderen Tab/Fenster zwischenzeitlich offen (z. B. PIN dort
    // geändert), verhindert das, dass hier mit veralteten Metadaten verglichen
    // oder später ein veralteter Stand zurückgeschrieben wird.
    meta = (await loadLockMeta()) || meta;
    try {
      const wrapKey = await deriveWrappingKey(pin, meta.pinSalt, meta.pinIterations);
      const masterKeyBytes = await unwrapMasterKey(wrapKey, meta.pinWrapped);
      const keyObj = await crypto.subtle.importKey('raw', masterKeyBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      await finishUnlock(keyObj, meta, true);
      return true;
    } catch {
      meta.failedAttempts = (meta.failedAttempts || 0) + 1;
      if (meta.failedAttempts >= MAX_FAILS_BEFORE_THROTTLE) {
        const extra = meta.failedAttempts - MAX_FAILS_BEFORE_THROTTLE;
        meta.lockedUntil = Date.now() + Math.min(30 * Math.pow(2, extra), 300) * 1000;
      }
      await saveLockMeta(meta);
      return false;
    }
  }

  // ---- Screen: Wiederherstellungscode eingeben ----
  function showRecoveryEntryScreen(meta) {
    render(`
      <div class="lock-card">
        <h1>Wiederherstellungscode</h1>
        <p>Gib den Code ein, der bei der Einrichtung angezeigt wurde.</p>
        <form id="recoverForm">
          <input type="text" id="recoveryInput" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autocomplete="off" required>
          <p class="lock-error" id="recoverError" hidden></p>
          <button type="submit" class="lock-btn">Prüfen</button>
        </form>
        <button type="button" class="lock-link" id="backBtn">Zurück zur PIN-Eingabe</button>
      </div>
    `);
    document.getElementById('recoverForm').onsubmit = async (e) => {
      e.preventDefault();
      const code = normalizeRecoveryCode(document.getElementById('recoveryInput').value);
      meta = (await loadLockMeta()) || meta; // s. Kommentar in tryUnlockWithPin
      try {
        const wrapKey = await deriveWrappingKey(code, meta.recoverySalt, meta.recoveryIterations);
        const masterKeyBytes = await unwrapMasterKey(wrapKey, meta.recoveryWrapped);
        const keyObj = await crypto.subtle.importKey('raw', masterKeyBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
        showSetNewPinScreen(keyObj, meta);
      } catch {
        const err = document.getElementById('recoverError');
        err.textContent = 'Der Code ist ungültig.';
        err.hidden = false;
      }
    };
    document.getElementById('backBtn').onclick = () => showUnlockScreen(meta);
  }

  function showSetNewPinScreen(keyObj, meta) {
    render(`
      <div class="lock-card">
        <h1>Neue PIN festlegen</h1>
        <p>Der Code war richtig. Bitte jetzt eine neue PIN vergeben.</p>
        <form id="newPinForm">
          <label>Neue PIN<input type="password" inputmode="numeric" pattern="[0-9]*" id="newPin1" autocomplete="off" required></label>
          <label>PIN bestätigen<input type="password" inputmode="numeric" pattern="[0-9]*" id="newPin2" autocomplete="off" required></label>
          <button type="button" class="lock-link" id="newPinToggle">👁 PIN anzeigen</button>
          <p class="lock-error" id="newPinError" hidden></p>
          <button type="submit" class="lock-btn">Speichern</button>
        </form>
      </div>
    `);
    wirePinVisibilityToggle('newPinToggle', ['newPin1', 'newPin2']);
    document.getElementById('newPinForm').onsubmit = async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('newPin1').value.trim();
      const p2 = document.getElementById('newPin2').value.trim();
      const err = document.getElementById('newPinError');
      if (!/^\d{4,8}$/.test(p1)) { err.textContent = 'Die PIN muss aus 4 bis 8 Ziffern bestehen.'; err.hidden = false; return; }
      if (p1 !== p2) { err.textContent = 'Die beiden PINs stimmen nicht überein.'; err.hidden = false; return; }

      const masterKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyObj));
      const pinSalt = randomBytes(16);
      const pinWrapKey = await deriveWrappingKey(p1, bytesToBase64(pinSalt), meta.pinIterations);
      meta.pinSalt = bytesToBase64(pinSalt);
      meta.pinWrapped = await wrapMasterKey(pinWrapKey, masterKeyBytes);
      meta.failedAttempts = 0;
      meta.lockedUntil = 0;
      await saveLockMeta(meta);
      await finishUnlock(keyObj, meta, false);
    };
  }

  async function finishUnlock(keyObj, meta, resetThrottle) {
    if (resetThrottle) {
      meta.failedAttempts = 0;
      meta.lockedUntil = 0;
      await saveLockMeta(meta);
    }
    masterKey = keyObj;
    const rawEnvelope = realGetItem(KEY);
    cachedPlaintext = rawEnvelope ? await decryptState(masterKey, rawEnvelope) : null;
    installShim();
    bootApp();
  }

  // ---- Screen: Metadaten fehlen, verschlüsselte Daten sind aber noch da ----
  // Kann passieren, wenn der Browser localStorage UND die IndexedDB-Sicherung
  // geräumt hat (z. B. Safaris "Intelligent Tracking Prevention" nach langer
  // Nichtbenutzung), während die verschlüsselten Daten selbst erhalten blieben.
  // Ohne PIN-Salt und eingewickelten Schlüssel sind diese Daten unwiderruflich
  // unlesbar — das lässt sich nicht reparieren, aber es lässt sich EHRLICH
  // anzeigen, statt stillschweigend eine neue, leere PIN einzurichten und die
  // alten Daten dabei unbemerkt für immer zu verwaisen.
  function showOrphanedDataScreen() {
    render(`
      <div class="lock-card">
        <div class="lock-badge">⚠️</div>
        <h1>PIN-Information nicht gefunden</h1>
        <p>Auf diesem Gerät liegen bereits verschlüsselte Daten, aber die dazugehörige PIN-Information fehlt — vermutlich hat der Browser sie gelöscht, z. B. nach längerer Nichtbenutzung.</p>
        <p><b>Ohne die bisherige PIN oder den Wiederherstellungscode lassen sich diese Daten nicht mehr entschlüsseln — das ist technisch nicht möglich, nicht nur schwierig.</b></p>
        <p>Falls die PIN oder der Code noch griffbereit sind: bitte jetzt nicht fortfahren, sondern zuerst Hilfe holen (Papa). Ein Neueinrichten hier macht die alten, jetzt unlesbaren Daten dauerhaft unerreichbar.</p>
        <button class="lock-btn" id="acknowledgeOrphan">Verstanden — neu einrichten</button>
      </div>
    `);
    document.getElementById('acknowledgeOrphan').onclick = () => showSetupScreen(null);
  }

  // ---------- Start ----------
  async function start() {
    const meta = await loadLockMeta();
    if (meta) {
      showUnlockScreen(meta);
      return;
    }
    const raw = realGetItem(KEY) || realGetItem(LEGACY_KEY);
    if (raw && isEncryptedEnvelope(raw)) {
      // Keine Metadaten, aber schon verschlüsselte Daten vorhanden: NICHT als
      // "noch nie eingerichtet" behandeln, siehe showOrphanedDataScreen().
      showOrphanedDataScreen();
      return;
    }
    // Wirklich noch keine PIN eingerichtet: prüfen, ob schon (unverschlüsselte)
    // Altdaten vorhanden sind, damit sie bei der Einrichtung mit übernommen werden.
    const existingPlaintext = (raw && !isEncryptedEnvelope(raw)) ? raw : null;
    showSetupScreen(existingPlaintext);
  }

  start();
})();
