# Plan Papa — Fundament, Sicherheit, Datenschutz

Zuständig: Martin. Henri fasst nichts davon an; sein Claude verweist bei diesen Themen
zurück an Papa (siehe `CLAUDE.md`).

## Grundsatzentscheidung: local-first bleibt vorerst

Der Wunsch „Account-Login + Datenbank" enthält zwei verschiedene Dinge, die getrennt gehören:

- **Sicherheit braucht keinen Server.** Dass die App local-first ist, ist ihr größter
  rechtlicher Vorteil. Sobald Gesundheitsdaten auf einem Server liegen, greift § 393 SGB V:
  der Anbieter selbst braucht ein C5-Typ-2-Testat, es braucht einen AVV mit dem Pflegedienst,
  und aus „Familie baut Werkzeug" wird „Dienstleister mit Rechenschaftspflicht".
  **Ein Server verschlechtert die DSGVO-Lage, er verbessert sie nicht.**
- **Teilen braucht einen Server** (Chefin verteilt die Tour an zwei Fachkräfte). Das ist ein
  Feature-Wunsch, kein Sicherheitswunsch — und erst dran, wenn die Chefin die App wirklich nutzen will.

**Reihenfolge laut Entscheidung vom 22.08.2026: erst Umbau/Features, dann Stufe 0.**
Bedingung solange: Repo bleibt privat, und es wird **nichts neu deployed**, bevor Stufe 0 erledigt ist.

---

## Stufe 0 · Aufräumen (~2 Stunden)

- [ ] **12 echte Patientennamen aus `app.js` entfernen** und durch erfundene ersetzen.
      Sie stehen als Startdaten im Code (Suche im Quelltext nach `'Herr ` bzw. `'Frau `).
      Gesundheitsdaten nach Art. 9 DSGVO — die Namen werden hier bewusst nicht wiederholt.
- [ ] **Git-Historie bereinigen** — ein neuer Commit genügt nicht, die Namen bleiben in der
      Historie. Erfordert Force-Push in Henris Repo → vorher mit ihm absprechen.
- [ ] **Deployment prüfen:** Wo läuft die App tatsächlich? Die Beispiel-URL aus der Doku
      (`fiamed-pflege.netlify.app`) ist unbelegt (404). Falls öffentlich erreichbar:
      nach der Bereinigung neu deployen.
- [x] ~~**Release-Bug fixen:** `Release/app.js` stürzte in `renderWeek` ab
      (`ReferenceError: _ is not defined`).~~ **Von Henri erledigt** (PR #1, 22.08.2026) —
      Release und Quelle sind wieder identisch, Cache-Version steht auf `v10`.
- [x] ~~**Toten Karten-Code entfernen** (`renderMap`, `updateMapLive`, `syncLiveLocation`,
      `placeLocation`).~~ **Von Henri erledigt** (PR #2, 22.08.2026).

## Stufe 1 · Fundament ohne Server (ein Wochenende)

- [x] ~~**App-Sperre beim Öffnen** (PIN).~~ **Live seit 22.08.2026** (Commits `e662504`,
      `838ffa4`, `2e50f14`, gemergt auf `main`). PIN 4–8 Ziffern, „PIN ändern" in den
      Einstellungen, einmaliger Wiederherstellungscode statt Mail-Reset. **Face-ID folgt
      über die Capacitor-Hülle** (native Secure-Storage ist zuverlässiger als der Browser-
      WebAuthn-Umweg für eine reine PWA), noch offen.
- [x] ~~**Lokale Daten verschlüsseln** (WebCrypto, Schlüssel aus der PIN abgeleitet).~~
      **Live seit 22.08.2026** — `localStorage['fiamed-pflege-v2']` liegt nur noch als
      AES-256-GCM-Chiffrat vor. **Gilt nur für `index.html`/`app.js`, NICHT für die einzelne
      `FiaMed-Pflege.html`-Datei** — die lädt weiterhin unverschlüsselt. Empfehlung: diese
      Einzeldatei nicht mehr für die Tante empfehlen, stattdessen die gehostete `index.html`
      nutzen (siehe Hosting-Punkt unten) — echtes Nachrüsten des PIN-Schutzes in der
      Einzeldatei ist ein eigener, größerer Umbau (alles inline, kein trennbares „Zimmer").
- [ ] **Export nur verschlüsselt** — der JSON-Export ist derzeit eine Klartextdatei mit allen Patientendaten.
- [ ] **Retention:** automatisches Löschen alter Besuchsdaten nach fester Frist (Datenminimierung).
- [ ] **Teilen-Knopf entschärfen:** „Bericht an Chefin teilen" überträgt volle Klartextnamen
      per WhatsApp. Initialen statt voller Namen wären ein billiger, echter Gewinn.
      (Ist-Zustand ohne App ist nicht besser — die Chefin schickt die Liste selbst per WhatsApp.)
- [ ] **Datenschutzhinweis in der App:** welche Daten wo liegen, wer sie sieht, wie man sie löscht.
- [ ] **Hosting:** `index.html` (mit PIN-Schutz) über eine echte `https://`-Adresse bereitstellen
      (Netlify, wie in `Claude-Uebergabe/FiaMed-Pflege-App/PWA-VEROEFFENTLICHEN.md` beschrieben).
      Erst danach ist „Zum Home-Bildschirm hinzufügen" zuverlässig nutzbar, und erst danach
      macht die einzelne `FiaMed-Pflege.html`-Datei als Empfehlung keinen Sinn mehr.

## Stufe 2 · Nur wenn die Chefin wirklich mitmachen will

- [ ] **Zuerst das Gespräch führen, vor jeder Zeile Code.** Wenn die Tante die App beruflich mit
      echten Patientendaten nutzt, ist **der Pflegedienst** der datenschutzrechtlich Verantwortliche —
      nicht Henri, nicht Martin. In diesem Fall ein einfaches Gespräch: Die Chefin ist begeistert.
      Ergebnis: Sie weiß Bescheid und ist einverstanden.
- [ ] **Dann erst Server** — mit Ende-zu-Ende-Verschlüsselung (Server sieht nur Chiffrat),
      analog zur Envelope-Architektur aus BP360. Aufwand: Wochen, nicht Tage.
- [ ] AVV mit dem Pflegedienst, EU-Hosting, DSFA.

---

## Dauerhafte Leitplanken

- **Keine Abrechnung.** Sobald die App Daten für die Kassenabrechnung erzeugt, braucht der
  Hersteller eine ITSG-Softwareprüfung mit PROD-/MOD-ID plus KIM/TI-Anbindung.
  (Frist für den vollelektronischen Leistungsnachweis: 01.10.2027, nicht 12/2026.)
- **Keine automatische Wundvermessung oder -bewertung.** Foto aufnehmen, speichern, anzeigen
  ist frei. Automatisches Ausmessen, Klassifizieren oder Therapieempfehlungen machen die App
  zum Medizinprodukt ab Klasse IIa (MDR Regel 11, Benannte Stelle).
- **Kein Build-Schritt, keine Frameworks.** Vanilla HTML/CSS/JS bleibt — hält die App einfach
  und für Henri begreifbar.
