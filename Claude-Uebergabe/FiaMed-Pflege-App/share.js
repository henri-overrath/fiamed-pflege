// share.js — Ver-/Entschlüsselung für den Tourenaustausch zwischen Chefin und Fachkräften.
//
// Warum eine eigene Datei statt lock.js zu erweitern: lock.js schützt die App-Sperre
// (PIN -> Schlüssel für den gesamten localStorage-Inhalt dieses einen Geräts) und ist laut
// CLAUDE.md bewusst Papa-Bereich, an dem nichts geändert werden soll, ohne vorher zu fragen.
// Der Tourenaustausch braucht eine andere Art Schlüssel: kein geräteeigener PIN, sondern ein
// Codewort, das alle drei Beteiligten (Chefin + zwei Fachkräfte) sich einmal persönlich
// mitteilen — NIE über denselben Kanal wie das Tourenpaket selbst (siehe Warnhinweis in app.js).
//
// Es gibt keinen Server: Das "Senden" erzeugt nur einen Textblock, der über den Kanal
// verschickt wird, den die Beteiligten ohnehin nutzen (WhatsApp, SMS, Mail, ...). Wer den
// Text ohne das Codewort abfängt, sieht nur Chiffrat — aber die App selbst überträgt nichts.
//
// Kryptografie: PBKDF2 (Codewort -> Schlüssel) + AES-256-GCM (Verschlüsselung), dieselbe
// Kombination wie in lock.js, aber komplett unabhängig instanziiert (eigenes Salt, eigene
// Iterationszahl) — ein falsches Tourenpaket-Codewort hat keinerlei Auswirkung auf die
// PIN-Sperre des Geräts und umgekehrt.

(() => {
  'use strict';

  const PREFIX = 'FIAMED-TOUR-1:';
  const ITERATIONS = 150000;
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function randomBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }
  function bytesToBase64(bytes) {
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b) });
    return btoa(s);
  }
  function base64ToBytes(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  async function deriveTourKey(passphrase, salt) {
    const baseKey = await crypto.subtle.importKey(
      'raw', textEncoder.encode(String(passphrase || '')), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // data: beliebiges JSON-fähiges Objekt (das Tourenpaket). passphrase: das Team-Codewort.
  // Ergebnis: ein einzeiliger Textblock, der komplett per Copy-Paste / Teilen-Funktion
  // weitergegeben werden kann.
  async function encryptTourPackage(passphrase, data) {
    if (!passphrase || !String(passphrase).trim()) throw new Error('kein-codewort');
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveTourKey(passphrase, salt);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, textEncoder.encode(JSON.stringify(data))
    );
    return PREFIX + [
      bytesToBase64(salt),
      bytesToBase64(iv),
      bytesToBase64(new Uint8Array(ct))
    ].join(':');
  }

  // Wirft bei falschem Codewort oder unlesbarem Text einen Error mit sprechendem .message.
  async function decryptTourPackage(passphrase, text) {
    const trimmed = String(text || '').trim();
    if (!trimmed.startsWith(PREFIX)) throw new Error('kein-tourenpaket');
    const parts = trimmed.slice(PREFIX.length).split(':');
    if (parts.length !== 3) throw new Error('kein-tourenpaket');
    const [saltB64, ivB64, ctB64] = parts;
    if (!passphrase || !String(passphrase).trim()) throw new Error('kein-codewort');
    let key;
    try {
      key = await deriveTourKey(passphrase, base64ToBytes(saltB64));
    } catch {
      throw new Error('kein-tourenpaket');
    }
    let plainBytes;
    try {
      plainBytes = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(ivB64) }, key, base64ToBytes(ctB64)
      );
    } catch {
      throw new Error('falsches-codewort');
    }
    try {
      return JSON.parse(textDecoder.decode(plainBytes));
    } catch {
      throw new Error('kein-tourenpaket');
    }
  }

  window.FiaTour = { encryptTourPackage, decryptTourPackage, PREFIX };
})();
