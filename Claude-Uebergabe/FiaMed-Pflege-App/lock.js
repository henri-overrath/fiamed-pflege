(() => {
  'use strict';

  // ============================================================================
  // lock.js — Zugriffsschutz und Verschlüsselung (Papa-Bereich)
  //
  // Diese Datei hat seit 02.09.2026 ZWEI Betriebsarten, die sie beim Start
  // selbst erkennt:
  //
  //  1. NATIVE APP (Android/iOS über Capacitor, window.Capacitor vorhanden):
  //     Die App wird mit der Gerätesperre entsperrt — Face ID, Fingerabdruck
  //     oder Geräte-Code, je nachdem, was auf dem Handy eingerichtet ist. Es
  //     gibt keine eigene PIN mehr und keinen Wiederherstellungscode: Das
  //     Geheimnis ist die Gerätesperre selbst, und die kann die Tante nicht
  //     "vergessen", ohne dass auch das Handy gesperrt wäre.
  //     Die Daten liegen weiterhin AES-256-GCM-verschlüsselt in localStorage.
  //     Der Hauptschlüssel liegt im Schlüsselbund (iOS) bzw. Keystore (Android)
  //     und wird bei jedem Start erst nach erfolgreicher Gerätesperre geholt.
  //     Nach 2 Minuten im Hintergrund wird erneut entsperrt.
  //
  //  2. WEB-VERSION (Browser, GitHub Pages, Henris Entwicklungsumgebung):
  //     KEIN Schutz mehr. Die Web-Version dient seit 02.09.2026 nur noch zum
  //     Programmieren und Sichten mit erfundenen Testdaten (Regel 1 in
  //     CLAUDE.md). app.js wird direkt geladen, localStorage bleibt Klartext.
  //     Einzige Ausnahme: Liegen aus der PIN-Zeit noch verschlüsselte Daten im
  //     Browser, fragt die App EINMAL nach der alten PIN (oder dem
  //     Wiederherstellungscode), entschlüsselt die Daten dauerhaft und entfernt
  //     die PIN. So kommt niemand an alte Daten nicht mehr heran, nur weil die
  //     PIN abgeschafft wurde.
  //
  // In beiden Fällen gilt weiter: app.js wird NICHT verändert und merkt von
  // alldem nichts. index.html lädt deshalb weiterhin lock.js statt app.js —
  // lock.js entscheidet, wann app.js nachgeladen wird. Bitte nicht umbauen.
  // ============================================================================

  const KEY = 'fiamed-pflege-v2';
  const LEGACY_KEY = 'fiamed-pflege-v1';
  const LOCK_KEY = 'fiamed-pflege-lock-v1';           // Metadaten aus der PIN-Zeit (nur noch für die Umstellung)
  const APP_SCRIPT_SRC = 'app.js';
  const MASTER_KEY_ITEM = 'fiamed_master_key_v1';    // Eintrag im Schlüsselbund/Keystore (nativ)
  const RELOCK_AFTER_MS = 2 * 60 * 1000;             // nativ: nach so langer Zeit im Hintergrund erneut entsperren
  const KEYCHAIN_ACCESS_WHEN_UNLOCKED = 0;           // iOS: Eintrag nur bei entsperrtem Gerät lesbar, wandert bei verschlüsselten Backups mit
  const MAX_FAILS_BEFORE_THROTTLE = 5;

  const cap = window.Capacitor;
  const isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  const realGetItem = Storage.prototype.getItem.bind(localStorage);
  const realSetItem = Storage.prototype.setItem.bind(localStorage);
  const realRemoveItem = Storage.prototype.removeItem.bind(localStorage);

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
  function normalizeRecoveryCode(code) {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Schlüssel-Ableitung (PIN/Code -> AES-Schlüssel), nur noch für die Umstellung ----------
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
  async function unwrapMasterKey(wrappingKey, wrapped) {
    const iv = base64ToBytes(wrapped.iv);
    const ct = base64ToBytes(wrapped.ct);
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, ct);
    return new Uint8Array(raw);
  }
  function importMasterKey(rawBytes) {
    return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
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

  // ---------- IndexedDB-Spiegel der alten PIN-Metadaten ----------
  // Aus der PIN-Zeit: eine zweite Kopie der Lock-Metadaten, weil Browser
  // localStorage ohne Vorwarnung räumen können. Wird nur noch gelesen (für die
  // Umstellung) und beim Aufräumen gelöscht.
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
  async function idbDeleteMeta() {
    try {
      const db = await openLockDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch { /* nichts zu löschen */ }
  }

  async function loadLockMeta() {
    const raw = realGetItem(LOCK_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch { /* beschädigt: unten auf IndexedDB ausweichen */ }
    }
    return idbGetMeta();
  }
  async function saveLockMeta(meta) {
    realSetItem(LOCK_KEY, JSON.stringify(meta));
    await idbSetMeta(meta);
  }
  async function clearLockMeta() {
    realRemoveItem(LOCK_KEY);
    await idbDeleteMeta();
  }

  // ---------- localStorage-Weiche für app.js (nur nativ aktiv) ----------
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
  // 1. Schreibvorgänge werden ZUSAMMENGEFASST statt aufgereiht: Es wird immer nur
  //    der neueste Stand geschrieben, ältere Zwischenstände werden übersprungen.
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
          // wenn inzwischen kein neuerer Stand eingetroffen ist.
          if (pendingPlaintext === value) pendingPlaintext = null;
        }
      } catch (err) {
        console.error('Verschlüsseltes Speichern fehlgeschlagen', err);
      } finally {
        writeInFlight = false;
      }
    })();
  }

  // ⚠️ Die Weiche MUSS auf Storage.prototype liegen, nicht auf dem
  // localStorage-Objekt selbst. Bis 02.09.2026 stand hier
  // `localStorage.getItem = function …` — in Chrome/Firefox überschreibt das die
  // Methode, in WebKit (iOS-App, iPhone-Safari, Mac-Safari) aber NICHT: WebKit
  // legt stattdessen einen Speicher-Eintrag namens "getItem" mit dem
  // Funktionstext an, und app.js redet weiter mit dem echten localStorage.
  // Folge: Die Daten lagen im Klartext auf dem Gerät, und beim nächsten Start
  // scheiterte das "Entschlüsseln" des Klartexts — was als "Falsche PIN"
  // angezeigt wurde, obwohl die PIN stimmte. Im iPhone-Simulator nachgewiesen
  // (localstorage.sqlite3 enthielt "getItem", "setItem" und den Klartext).
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  function installShim() {
    Storage.prototype.getItem = function (k) {
      if (this === localStorage && k === KEY) return cachedPlaintext;
      return originalGetItem.call(this, k);
    };
    Storage.prototype.setItem = function (k, v) {
      if (this === localStorage && k === KEY) {
        cachedPlaintext = v;
        pendingPlaintext = v;
        flushPendingWrite();
        return;
      }
      return originalSetItem.call(this, k, v);
    };
    document.addEventListener('visibilitychange', flushPendingWrite);
    window.addEventListener('pagehide', flushPendingWrite);
    window.addEventListener('pageshow', flushPendingWrite);
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
  function on(id, handler) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
  }

  // ---------- App laden (erst NACH Entsperrung bzw. sofort im Web) ----------
  let appBooted = false;
  function bootApp() {
    if (appBooted) return;
    appBooted = true;
    hideOverlay();
    if (isNative) {
      setupProtectionInfoUI();
      installRelock();
    }
    const s = document.createElement('script');
    s.src = APP_SCRIPT_SRC;
    document.body.appendChild(s);
  }

  // ---------- Hinweis "App-Schutz" in den Einstellungen (nur nativ) ----------
  // app.js baut #settings bei jedem Aufruf komplett neu (innerHTML=...) und
  // würde ein einmal eingefügtes Panel dabei wieder löschen. Ein
  // MutationObserver setzt es deshalb nach jedem Neu-Rendern erneut ein.
  function setupProtectionInfoUI() {
    const settingsEl = document.getElementById('settings');
    if (!settingsEl) return;
    const inject = () => {
      if (document.getElementById('protectionInfoPanel')) return;
      const panel = document.createElement('div');
      panel.id = 'protectionInfoPanel';
      panel.className = 'panel';
      panel.style.marginTop = '18px';
      panel.innerHTML = `
        <div class="section-head"><div><h2>App-Schutz</h2>
        <p>Die App wird mit der Gerätesperre entsperrt — Face ID, Fingerabdruck oder Geräte-Code, je nachdem, was auf diesem Gerät eingerichtet ist. Nach 2 Minuten im Hintergrund wird erneut entsperrt.</p>
        <p>Alle Daten liegen verschlüsselt auf diesem Gerät. Der Schlüssel dazu liegt im Schlüsselbund bzw. Keystore des Geräts und verlässt es nie. Für einen Gerätewechsel bitte „JSON exportieren" nutzen.</p>
        </div></div>`;
      settingsEl.appendChild(panel);
    };
    inject();
    new MutationObserver(inject).observe(settingsEl, { childList: true });
  }

  // ============================================================================
  // NATIVE APP: Gerätesperre + Schlüsselbund/Keystore
  // ============================================================================
  // Die beiden Capacitor-Plugins werden ohne Bundler direkt über die
  // Native-Bridge angesprochen (Capacitor.nativePromise). Es gibt bewusst
  // keinen Build-Schritt in diesem Projekt (siehe CLAUDE.md).
  //   @aparajita/capacitor-biometric-auth  -> Plugin "BiometricAuthNative"
  //   @aparajita/capacitor-secure-storage  -> Plugin "SecureStorage"
  function nativeCall(plugin, method, options) {
    return cap.nativePromise(plugin, method, options || {});
  }
  function nativePluginAvailable(name) {
    if (Array.isArray(cap.PluginHeaders)) return cap.PluginHeaders.some(h => h && h.name === name);
    return true; // ältere Bridge ohne Liste: beim Aufruf zeigt sich, ob es klappt
  }
  function nativePluginsAvailable() {
    return typeof cap.nativePromise === 'function'
      && nativePluginAvailable('BiometricAuthNative')
      && nativePluginAvailable('SecureStorage');
  }

  async function secureGetMasterKey() {
    const res = await nativeCall('SecureStorage', 'internalGetItem', { prefixedKey: MASTER_KEY_ITEM, sync: false });
    return res && typeof res.data === 'string' && res.data ? res.data : null;
  }
  async function secureSetMasterKey(b64) {
    await nativeCall('SecureStorage', 'internalSetItem', {
      prefixedKey: MASTER_KEY_ITEM, data: b64, sync: false, access: KEYCHAIN_ACCESS_WHEN_UNLOCKED
    });
    // Sofort gegenlesen: Ein Schlüssel, der nicht wirklich gespeichert wurde,
    // würde die Daten beim nächsten Start unlesbar machen.
    const check = await secureGetMasterKey();
    if (check !== b64) throw new Error('Schlüssel konnte nicht im Schlüsselbund abgelegt werden.');
  }
  async function secureRemoveMasterKey() {
    try { await nativeCall('SecureStorage', 'internalRemoveItem', { prefixedKey: MASTER_KEY_ITEM, sync: false }); } catch { /* war nicht da */ }
  }

  let authInProgress = false;
  function checkBiometry() {
    return nativeCall('BiometricAuthNative', 'checkBiometry', {});
  }
  async function authenticateWithDevice() {
    authInProgress = true;
    try {
      await nativeCall('BiometricAuthNative', 'internalAuthenticate', {
        reason: 'FiaMed Pflege entsperren',
        allowDeviceCredential: true,      // Face ID/Fingerabdruck zuerst, sonst Geräte-Code
        cancelTitle: 'Abbrechen',
        androidTitle: 'FiaMed Pflege entsperren',
        androidSubtitle: 'Patientendaten sind geschützt',
        androidConfirmationRequired: false
      });
    } finally {
      authInProgress = false;
    }
  }
  function describeAuthError(err) {
    const code = err && err.code;
    switch (code) {
      case 'userCancel':
      case 'appCancel':
      case 'systemCancel':
        return 'Entsperren wurde abgebrochen.';
      case 'passcodeNotSet':
      case 'noDeviceCredential':
        return 'Auf diesem Gerät ist keine Gerätesperre eingerichtet (Code, Muster, Face ID oder Fingerabdruck). Bitte zuerst in den Geräteeinstellungen einrichten, dann erneut versuchen.';
      case 'biometryLockout':
        return 'Zu viele Fehlversuche. Bitte mit dem Geräte-Code entsperren oder kurz warten.';
      case 'authenticationFailed':
        return 'Entsperren fehlgeschlagen. Bitte erneut versuchen.';
      default:
        return 'Entsperren nicht möglich' + (err && err.message ? ': ' + err.message : '.');
    }
  }

  // Prüft, ob das Gerät überhaupt eine Sperre hat. Ohne Gerätesperre gäbe es
  // nichts, womit die App geschützt werden könnte — dann lieber ehrlich stoppen.
  async function ensureDeviceSecure(retry) {
    let info;
    try { info = await checkBiometry(); } catch (err) { showFatalScreen('Gerätesperre nicht prüfbar', describeAuthError(err), retry); return false; }
    if (info && info.deviceIsSecure) return true;
    render(`
      <div class="lock-card">
        <div class="lock-badge">🔒</div>
        <h1>Gerätesperre fehlt</h1>
        <p>FiaMed Pflege schützt Patientendaten mit der Sperre dieses Geräts. Bitte zuerst in den Geräteeinstellungen einen Code, ein Muster, Face ID oder einen Fingerabdruck einrichten — danach hier fortfahren.</p>
        <button class="lock-btn" id="recheckBtn">Erneut prüfen</button>
      </div>
    `);
    on('recheckBtn', retry);
    return false;
  }

  function showLockedScreen(message, retry) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">✚</div>
        <h1>FiaMed Pflege</h1>
        <p>${escapeHtml(message)}</p>
        <button class="lock-btn" id="unlockBtn">Entsperren</button>
      </div>
    `);
    on('unlockBtn', retry);
  }

  async function startNative() {
    if (!nativePluginsAvailable()) {
      showFatalScreen('Sicherheitsmodul fehlt', 'Diese App-Version wurde ohne die Anbindung an Gerätesperre und Schlüsselbund gebaut. Bitte die App neu bauen (npm run sync, dann Android/iOS neu bauen).');
      return;
    }
    let storedKey = null;
    try {
      storedKey = await secureGetMasterKey();
    } catch (err) {
      showFatalScreen('Schlüsselbund nicht erreichbar', 'Der Schlüssel zu den Daten konnte nicht gelesen werden' + (err && err.message ? ': ' + err.message : '.'), startNative);
      return;
    }
    if (storedKey) { await unlockNativeWithStoredKey(storedKey); return; }

    // Kein Schlüssel im Schlüsselbund: Erststart oder Installation aus der PIN-Zeit.
    const meta = await loadLockMeta();
    if (meta) { showLegacyPinScreen(meta, adoptKeyNative, 'native'); return; }
    const raw = realGetItem(KEY);
    if (raw && isEncryptedEnvelope(raw)) { showOrphanedDataScreen(); return; }
    const legacyPlain = raw || realGetItem(LEGACY_KEY) || null;
    showNativeSetupScreen(legacyPlain);
  }

  // Jeder weitere Start: Gerätesperre, dann Schlüssel aus dem Schlüsselbund verwenden.
  async function unlockNativeWithStoredKey(storedKeyB64) {
    showLockedScreen('Bitte mit Face ID, Fingerabdruck oder dem Geräte-Code entsperren.', () => unlockNativeWithStoredKey(storedKeyB64));
    try {
      await authenticateWithDevice();
    } catch (err) {
      showLockedScreen(describeAuthError(err), () => unlockNativeWithStoredKey(storedKeyB64));
      return;
    }
    let keyObj;
    try {
      keyObj = await importMasterKey(base64ToBytes(storedKeyB64));
    } catch {
      showKeyMismatchScreen('Der im Schlüsselbund abgelegte Schlüssel ist beschädigt.');
      return;
    }
    await openWithKey(keyObj);
  }

  // Erststart in der nativen App: Schlüssel erzeugen und im Schlüsselbund ablegen.
  function showNativeSetupScreen(legacyPlaintext) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">✚</div>
        <h1>Willkommen</h1>
        <p>FiaMed Pflege wird mit der Sperre dieses Geräts geschützt — Face ID, Fingerabdruck oder Geräte-Code. Es gibt keine extra PIN, die man vergessen könnte.</p>
        <p>Alle Daten bleiben verschlüsselt auf diesem Gerät. Der Schlüssel dazu liegt im Schlüsselbund des Geräts.</p>
        <button class="lock-btn" id="setupBtn">Schutz einrichten</button>
      </div>
    `);
    on('setupBtn', async () => {
      if (!(await ensureDeviceSecure(() => showNativeSetupScreen(legacyPlaintext)))) return;
      try {
        await authenticateWithDevice();
      } catch (err) {
        showFatalScreen('Einrichtung abgebrochen', describeAuthError(err), () => showNativeSetupScreen(legacyPlaintext));
        return;
      }
      render(`<div class="lock-card"><p>Einrichtung läuft …</p></div>`);
      try {
        const keyObj = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const rawBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyObj));
        await secureSetMasterKey(bytesToBase64(rawBytes));
        masterKey = keyObj;
        cachedPlaintext = legacyPlaintext;
        installShim();
        if (legacyPlaintext) {
          realSetItem(KEY, await encryptState(masterKey, legacyPlaintext));
          realRemoveItem(LEGACY_KEY);
        }
        bootApp();
      } catch (err) {
        showFatalScreen('Einrichtung fehlgeschlagen', (err && err.message) || String(err), () => showNativeSetupScreen(legacyPlaintext));
      }
    });
  }

  // Umstellung einer Installation aus der PIN-Zeit: Die alte PIN (oder der
  // Wiederherstellungscode) hat den Hauptschlüssel freigegeben. Ab jetzt wandert
  // er in den Schlüsselbund, die PIN-Metadaten werden entfernt.
  async function adoptKeyNative(keyObj) {
    if (!(await ensureDeviceSecure(() => adoptKeyNative(keyObj)))) return;
    render(`<div class="lock-card"><p>Umstellung läuft …</p></div>`);
    let plaintext;
    try {
      plaintext = await readEncryptedData(keyObj);
    } catch {
      showKeyMismatchScreen('Die PIN war richtig, aber die gespeicherten Daten passen nicht zu diesem Schlüssel.');
      return;
    }
    try {
      const rawBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyObj));
      await secureSetMasterKey(bytesToBase64(rawBytes));
      await clearLockMeta();
    } catch (err) {
      showFatalScreen('Umstellung fehlgeschlagen', (err && err.message) || String(err), () => adoptKeyNative(keyObj));
      return;
    }
    render(`
      <div class="lock-card">
        <div class="lock-badge">✅</div>
        <h1>Umstellung abgeschlossen</h1>
        <p>Die PIN wird nicht mehr gebraucht. Ab jetzt entsperrt sich FiaMed Pflege mit Face ID, Fingerabdruck oder dem Geräte-Code. Der Wiederherstellungscode kann vernichtet werden.</p>
        <button class="lock-btn" id="continueBtn">Weiter zur App</button>
      </div>
    `);
    on('continueBtn', () => {
      masterKey = keyObj;
      cachedPlaintext = plaintext;
      installShim();
      bootApp();
    });
  }

  // Entschlüsselt den gespeicherten Datenblock — GETRENNT von der Frage, ob der
  // Schlüssel selbst stimmt. Vorher landete ein Fehler hier im selben catch wie
  // eine falsche PIN und erschien als "Falsche PIN", obwohl die PIN richtig war.
  async function readEncryptedData(keyObj) {
    const raw = realGetItem(KEY);
    if (!raw) return null;
    if (!isEncryptedEnvelope(raw)) return raw; // Klartext-Altbestand
    return decryptState(keyObj, raw);
  }

  async function openWithKey(keyObj) {
    let plaintext;
    try {
      plaintext = await readEncryptedData(keyObj);
    } catch {
      showKeyMismatchScreen('Das Entsperren hat geklappt, aber die gespeicherten Daten passen nicht zum Schlüssel im Schlüsselbund.');
      return;
    }
    masterKey = keyObj;
    cachedPlaintext = plaintext;
    installShim();
    if (plaintext !== null && !isEncryptedEnvelope(realGetItem(KEY))) {
      // Klartext-Altbestand: ab jetzt verschlüsselt ablegen.
      pendingPlaintext = plaintext;
      flushPendingWrite();
    }
    bootApp();
  }

  // Nach längerer Zeit im Hintergrund erneut entsperren (die App bleibt dabei
  // geladen, nur die Oberfläche wird verdeckt). Während die Gerätesperre selbst
  // angezeigt wird, geht die WebView auf Android kurz in den Hintergrund — das
  // darf nicht als "war lange weg" zählen (authInProgress).
  let relockActive = false;
  function installRelock() {
    let hiddenSince = null;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (!authInProgress && hiddenSince === null) hiddenSince = Date.now();
        return;
      }
      const away = hiddenSince === null ? 0 : Date.now() - hiddenSince;
      hiddenSince = null;
      if (away >= RELOCK_AFTER_MS) relock();
    });
  }
  async function relock() {
    if (relockActive) return;
    relockActive = true;
    const attempt = async () => {
      showLockedScreen('Bitte erneut mit Face ID, Fingerabdruck oder dem Geräte-Code entsperren.', attempt);
      try {
        await authenticateWithDevice();
        relockActive = false;
        hideOverlay();
      } catch (err) {
        showLockedScreen(describeAuthError(err), attempt);
      }
    };
    await attempt();
  }

  // ============================================================================
  // WEB-VERSION: kein Schutz, nur einmalige Umstellung alter PIN-Daten
  // ============================================================================
  async function startWeb() {
    const meta = await loadLockMeta();
    const raw = realGetItem(KEY);
    const encrypted = !!raw && isEncryptedEnvelope(raw);
    if (meta && encrypted) { showLegacyPinScreen(meta, migrateWebToPlaintext, 'web'); return; }
    if (meta) await clearLockMeta();           // PIN eingerichtet, aber nichts Verschlüsseltes da: einfach weg damit
    if (encrypted) { showOrphanedDataScreen(); return; }
    bootApp();
  }
  async function migrateWebToPlaintext(keyObj) {
    let plaintext;
    try {
      plaintext = await readEncryptedData(keyObj);
    } catch {
      showKeyMismatchScreen('Die PIN war richtig, aber die gespeicherten Daten passen nicht zu diesem Schlüssel.');
      return;
    }
    if (plaintext !== null) realSetItem(KEY, plaintext);
    await clearLockMeta();
    bootApp();
  }

  // ============================================================================
  // Gemeinsam: alte PIN-Eingabe (nur noch für die Umstellung), Fehler-Schirme, Reset
  // ============================================================================
  function showLegacyPinScreen(meta, onKey, mode) {
    const waitMs = (meta.lockedUntil || 0) - Date.now();
    if (waitMs > 0) {
      render(`<div class="lock-card"><h1>Kurz warten</h1><p>Zu viele falsche Versuche. Bitte in ${Math.ceil(waitMs / 1000)} Sekunden erneut versuchen.</p></div>`);
      setTimeout(() => showLegacyPinScreen(meta, onKey, mode), Math.min(waitMs, 3000));
      return;
    }
    const intro = mode === 'web'
      ? 'Die Web-Version wird nicht mehr durch eine PIN geschützt — sie dient nur noch zum Programmieren und Ausprobieren mit Testdaten. Damit die vorhandenen Daten weiter nutzbar sind, bitte die bisherige PIN ein letztes Mal eingeben. Danach liegen sie unverschlüsselt im Browser.'
      : 'Die App entsperrt ab jetzt mit Face ID, Fingerabdruck oder dem Geräte-Code statt mit einer PIN. Für die Umstellung bitte die bisherige PIN ein letztes Mal eingeben.';
    render(`
      <div class="lock-card">
        <div class="lock-badge">✚</div>
        <h1>Bisherige PIN eingeben</h1>
        <p>${intro}</p>
        <form id="unlockForm">
          <!-- autocomplete "one-time-code": Safari füllte sonst unsichtbar alte PINs aus dem Schlüsselbund ein (26.08.2026). -->
          <input type="password" inputmode="numeric" pattern="[0-9]*" id="pinInput" autocomplete="one-time-code" autofocus required>
          <p class="lock-error" id="unlockError" hidden></p>
          <button type="submit" class="lock-btn">Weiter</button>
        </form>
        <button type="button" class="lock-link" id="forgotBtn">PIN vergessen? Wiederherstellungscode verwenden</button>
        <button type="button" class="lock-link" id="resetBtn">Ohne diese Daten neu beginnen</button>
      </div>
    `);
    document.getElementById('unlockForm').onsubmit = async (e) => {
      e.preventDefault();
      const pin = document.getElementById('pinInput').value.trim();
      const err = document.getElementById('unlockError');
      err.hidden = true;
      let keyObj;
      try {
        keyObj = await unwrapWithPin(meta, pin);
      } catch {
        err.textContent = 'Falsche PIN.';
        err.hidden = false;
        document.getElementById('pinInput').value = '';
        return;
      }
      await onKey(keyObj);
    };
    on('forgotBtn', () => showRecoveryEntryScreen(meta, onKey, mode));
    on('resetBtn', () => showResetScreen(() => showLegacyPinScreen(meta, onKey, mode)));
  }

  async function unwrapWithPin(meta, pin) {
    meta = (await loadLockMeta()) || meta;
    try {
      const wrapKey = await deriveWrappingKey(pin, meta.pinSalt, meta.pinIterations);
      const masterKeyBytes = await unwrapMasterKey(wrapKey, meta.pinWrapped);
      if (meta.failedAttempts || meta.lockedUntil) {
        meta.failedAttempts = 0;
        meta.lockedUntil = 0;
        await saveLockMeta(meta);
      }
      return await importMasterKey(masterKeyBytes);
    } catch (err) {
      meta.failedAttempts = (meta.failedAttempts || 0) + 1;
      if (meta.failedAttempts >= MAX_FAILS_BEFORE_THROTTLE) {
        const extra = meta.failedAttempts - MAX_FAILS_BEFORE_THROTTLE;
        meta.lockedUntil = Date.now() + Math.min(30 * Math.pow(2, extra), 300) * 1000;
      }
      await saveLockMeta(meta);
      throw err;
    }
  }

  function showRecoveryEntryScreen(meta, onKey, mode) {
    render(`
      <div class="lock-card">
        <h1>Wiederherstellungscode</h1>
        <p>Bitte den Code eingeben, der bei der PIN-Einrichtung angezeigt wurde.</p>
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
      const current = (await loadLockMeta()) || meta;
      let keyObj;
      try {
        const wrapKey = await deriveWrappingKey(code, current.recoverySalt, current.recoveryIterations);
        const masterKeyBytes = await unwrapMasterKey(wrapKey, current.recoveryWrapped);
        keyObj = await importMasterKey(masterKeyBytes);
      } catch {
        const err = document.getElementById('recoverError');
        err.textContent = 'Der Code ist ungültig.';
        err.hidden = false;
        return;
      }
      await onKey(keyObj);
    };
    on('backBtn', () => showLegacyPinScreen(meta, onKey, mode));
  }

  // Verschlüsselte Daten vorhanden, aber weder Schlüssel noch PIN-Metadaten:
  // Diese Daten sind unwiderruflich unlesbar — ehrlich anzeigen statt still neu anfangen.
  function showOrphanedDataScreen() {
    render(`
      <div class="lock-card">
        <div class="lock-badge">⚠️</div>
        <h1>Schlüssel nicht gefunden</h1>
        <p>Auf diesem Gerät liegen verschlüsselte Daten, aber der passende Schlüssel fehlt — z. B. nach einer wiederhergestellten Sicherung oder weil der Browser Daten gelöscht hat.</p>
        <p><b>Ohne den Schlüssel lassen sich diese Daten nicht mehr entschlüsseln — das ist technisch nicht möglich, nicht nur schwierig.</b></p>
        <p>Im Zweifel zuerst Hilfe holen (Papa). Ein Neubeginn macht die alten Daten dauerhaft unerreichbar.</p>
        <button class="lock-btn" id="resetBtn">Neu beginnen</button>
      </div>
    `);
    on('resetBtn', () => showResetScreen(showOrphanedDataScreen));
  }

  function showKeyMismatchScreen(detail) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">⚠️</div>
        <h1>Daten passen nicht zum Schlüssel</h1>
        <p>${escapeHtml(detail)}</p>
        <p>Das passiert, wenn Daten aus einer anderen Einrichtung zurückgespielt wurden (z. B. durch eine Sicherung des Betriebssystems). Sie lassen sich mit diesem Schlüssel nicht lesen.</p>
        <p>Im Zweifel zuerst Hilfe holen (Papa). Ein Neubeginn löscht die alten Daten dauerhaft.</p>
        <button class="lock-btn" id="resetBtn">Neu beginnen</button>
      </div>
    `);
    on('resetBtn', () => showResetScreen(() => showKeyMismatchScreen(detail)));
  }

  function showFatalScreen(title, message, retry) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">⚠️</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        ${retry ? '<button class="lock-btn" id="retryBtn">Erneut versuchen</button>' : ''}
      </div>
    `);
    if (retry) on('retryBtn', retry);
  }

  // Regel 6 (CLAUDE.md): Löschen nur nach ausdrücklicher Bestätigung.
  function showResetScreen(back) {
    render(`
      <div class="lock-card">
        <div class="lock-badge">🗑️</div>
        <h1>Alles löschen und neu beginnen?</h1>
        <p>Dabei werden alle Patienten, Touren, Berichte und Einstellungen auf diesem Gerät dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.</p>
        <label class="lock-check"><input type="checkbox" id="confirmReset"> Ich verstehe, dass die Daten unwiederbringlich gelöscht werden.</label>
        <div class="lock-stack">
          <button class="lock-btn danger" id="resetConfirmBtn" disabled>Alles löschen</button>
          <button class="lock-btn secondary" id="resetBackBtn">Zurück</button>
        </div>
      </div>
    `);
    const cb = document.getElementById('confirmReset');
    const btn = document.getElementById('resetConfirmBtn');
    cb.onchange = () => { btn.disabled = !cb.checked; };
    btn.onclick = resetEverything;
    on('resetBackBtn', back);
  }
  async function resetEverything() {
    render(`<div class="lock-card"><p>Wird gelöscht …</p></div>`);
    realRemoveItem(KEY);
    realRemoveItem(LEGACY_KEY);
    await clearLockMeta();
    if (isNative) await secureRemoveMasterKey();
    location.reload();
  }

  // ---------- Start ----------
  async function start() {
    // Aufräumen: Die alte Weiche hat in WebKit Einträge "getItem"/"setItem"
    // (mit Funktionstext) im localStorage hinterlassen — siehe installShim().
    realRemoveItem('getItem');
    realRemoveItem('setItem');
    try {
      if (isNative) await startNative();
      else await startWeb();
    } catch (err) {
      console.error('lock.js: Start fehlgeschlagen', err);
      showFatalScreen('Start fehlgeschlagen', (err && err.message) || String(err), () => location.reload());
    }
  }

  start();
})();
