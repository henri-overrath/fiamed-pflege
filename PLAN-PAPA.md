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

**Update 22.08.2026, Abend:** Stufe 0 (Namen raus + Historie bereinigt) ist erledigt — war
zwingend, weil GitHub Pages (Hosting-Lösung) ein öffentliches Repo voraussetzt. **Das Repo
ist jetzt öffentlich**, siehe Warnung oben in `CLAUDE.md`.

---

## Stufe 0 · Aufräumen (~2 Stunden)

- [x] ~~**12 echte Patientennamen aus `app.js` entfernen** und durch erfundene ersetzen.~~
      **Erledigt 22.08.2026** — Startbelegung ist jetzt leer (neue Geräte starten mit
      0 Patienten), zwei Beispieltexte mit echtem Namen ebenfalls ersetzt.
- [x] ~~**Git-Historie bereinigen** — Force-Push in Henris Repo.~~ **Erledigt 22.08.2026**
      mit `git filter-repo --replace-text`, unabhängig via Frisch-Klon verifiziert.
      **Henri musste danach neu klonen** (alte Commit-Hashes ungültig).
- [x] ~~**Deployment:** echte, funktionierende Hosting-Adresse.~~ **Erledigt 22.08.2026** —
      https://henri-overrath.github.io/fiamed-pflege/ (GitHub Pages, automatisch bei jedem
      Push). Voraussetzung dafür: Repo musste öffentlich werden (private Repos haben bei
      GitHub kein kostenloses Pages) — deshalb war die Namens-/Historienbereinigung davor
      zwingend, nicht mehr optional.
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
      AES-256-GCM-Chiffrat vor.
- [x] ~~**`FiaMed-Pflege.html`-Einzeldatei** — konnte strukturell nicht denselben PIN-Schutz
      bekommen (alles inline, kein trennbares „Zimmer").~~ **Gelöscht 22.08.2026** — statt
      Warnhinweis einfach entfernt (Quelle + Release), da ohnehin nicht mehr empfohlen.
      README verweist jetzt nur noch auf die Live-Adresse.
- [ ] **Export nur verschlüsselt** — der JSON-Export ist derzeit eine Klartextdatei mit allen Patientendaten.
- [ ] **Retention (VORGEZOGEN, siehe unten „Wundfotos"):** automatisches Löschen alter
      Besuchsdaten nach fester Frist (Datenminimierung).
- [ ] **Teilen-Knopf entschärfen:** „Bericht an Chefin teilen" überträgt volle Klartextnamen
      per WhatsApp. Initialen statt voller Namen wären ein billiger, echter Gewinn.
      (Ist-Zustand ohne App ist nicht besser — die Chefin schickt die Liste selbst per WhatsApp.)
- [ ] **Datenschutzhinweis in der App:** welche Daten wo liegen, wer sie sieht, wie man sie löscht.
- [x] ~~**Hosting:** `index.html` (mit PIN-Schutz) über eine echte `https://`-Adresse.~~
      **Erledigt 22.08.2026** — https://henri-overrath.github.io/fiamed-pflege/, GitHub
      Pages, automatisch via `.github/workflows/deploy-pages.yml` bei jedem Push. Getestet:
      Service Worker registriert, Manifest lädt, `display: standalone`, PIN-Ersteinrichtung
      erscheint korrekt. **Offen:** Tante muss die App auf ihrem Gerät neu über diesen Link
      installieren (die alte `FiaMed-Pflege.html`-Installation ist weiterhin ungeschützt).

## 🩹 Wundfotos — Rollenteilung (angefragt 23.08.2026)

Die Tante möchte Wundfotos am Patienten speichern und gebündelt drucken/versenden können.
DSGVO-Prüfung: grundsätzlich unproblematisch (reines Fotografieren/Speichern/Anzeigen ist
laut `MARKT.md` nicht MDR-relevant), solange die Leitplanken in `CLAUDE.md` gelten
(Komprimierung, Warnhinweis vor dem Teilen, kein automatisches Ausmessen/Bewerten).
Kompletter Bauplan für Henri: `PLAN-HENRI.md`, Abschnitt „🩹 Wundfotos".

**Henri baut:** Mehrfach-Fotos, Komprimierung, Galerie, Bündel-Druck, Bündel-Teilen +
Warnhinweis, Foto-Tipp. Die Speicherung selbst braucht **keine neue Verschlüsselung** —
Fotos landen im `state`-Objekt und werden dadurch automatisch von `lock.js` mitverschlüsselt.

**Papas Anteil:**
- [ ] **Retention jetzt wirklich bauen, bevor die Fotos in Umlauf sind** — besonders
      sensible Bilddaten ohne jede Löschfrist sind ein wachsendes Risiko, das mit jedem
      Foto größer wird. Nicht mehr nur „TODO", siehe Zeile oben in Stufe 1.
- [ ] Nach Henris Umsetzung stichprobenartig gegenprüfen: Wird wirklich komprimiert
      (Dateigröße nach dem Speichern kontrollieren)? Erscheint der Warnhinweis wirklich
      vor JEDER Teilen-Aktion, auch bei nur einem ausgewählten Foto?

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
