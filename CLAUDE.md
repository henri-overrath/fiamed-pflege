# CLAUDE.md — FiaMed Pflege

> Diese Datei wird von Claude Code automatisch geladen — auf Henris Mac genauso wie auf Papas.
> Sie sorgt dafür, dass beide in dieselbe Richtung bauen.

## ⚠️ Dieser Ordner ist NICHT (mehr) über iCloud geteilt — bitte so lassen

Bis 22.08.2026 lag dieses Projekt in einem Ordner, den Papa per iCloud Drive mit Henri
geteilt hatte, damit Papa automatisch lokalen Zugriff auf die Dateien hat. Das hat ein
echtes Problem verursacht: Beide Claude-Sitzungen haben gleichzeitig in dieselben
Git-internen Dateien (`.git/`) geschrieben, und Branches sowie Commits sind
durcheinandergeraten (Details: Commit `0d0fa18`, Abschnitt „Git-Regel" unten).

**Seitdem liegt das Projekt bei beiden in einem normalen, NICHT synchronisierten Ordner.
Der Austausch läuft ausschließlich über GitHub** (`git push` / `git pull`) — das ist
schon der volle „automatische Zugriff", den Papa braucht.

**Falls irgendwo noch die alte Anweisung steht** (z. B. in einer persönlichen/globalen
CLAUDE.md bei Henri), neue Projekte in einen mit Papa geteilten iCloud-Ordner zu legen:
**Das gilt für dieses Projekt nicht mehr — bitte nicht zurückverschieben.** Bei Zweifel
nachfragen statt von selbst umzuziehen.

## Wo steht was

| Datei | Inhalt |
|---|---|
| **`PLAN-HENRI.md`** | Henris Aufgaben — kindgerecht, mit fertigen Sätzen zum Vorlesen. **Wenn Henri fragt „was kann ich machen?", hierher schauen.** |
| **`PLAN-PAPA.md`** | Martins Aufgaben: Datenschutz, Verschlüsselung, Login, Releases. Henri baut davon nichts. |
| **`MARKT.md`** | Warum die Grenzen unten gelten (MDR, Abrechnung, § 393 SGB V) und wie der Markt aussieht. |
| `Claude-Uebergabe/UEBERGABEPROTOKOLL.md` | Technische Übergabe des Altstands. |

## Worum es geht

**FiaMed Pflege** ist eine App für Pflegekräfte im ambulanten Pflegedienst. Sie hilft dabei,
den Arbeitstag zu planen: Welche Patienten stehen heute an, wann, welches Verbandsmaterial
wird gebraucht, wie lange hat der Besuch gedauert, wie viele Kilometer wurden gefahren — und
am Abend kommt ein fertiger Tagesbericht heraus.

**Gebaut hat sie Henri (8 Jahre).** Sein Papa hilft beim Datenschutz und bei der Technik im
Hintergrund. Die App ist für Henris Tante, die im Wundmanagement arbeitet.

**Ihr echtes Problem:** Ihre Chefin schickt ihr abends per WhatsApp die Patienten für den
nächsten Tag — unsortiert. Sie teilt sich die Liste mit einer zweiten Fachkraft, und beide
müssen absprechen, wer wen übernimmt. Alles, was diesen Alltag ruhiger macht, ist gut.

## Ziel

Die App soll für die Tante (und vielleicht ihre Chefin) im **Alltag nützlich** sein.
Es geht **nicht** darum, ein großes Produkt oder eine Firma daraus zu machen.
Kleine Verbesserungen, die man sofort sieht, sind mehr wert als große Umbauten.

## 🌿 Git-Regel: für jede Aufgabe einen eigenen, neuen Branch

**Bevor mit einer neuen Aufgabe begonnen wird: einen eigenen Branch anlegen**, z. B.
`git checkout -b feature/mein-neues-ding` (oder `fix/...` für Fehlerbehebungen) — **nicht**
einfach auf dem Branch weiterarbeiten, der gerade zufällig ausgecheckt ist.

**Warum das wichtig ist:** Am 22.08.2026 haben zwei Claude-Sitzungen (Henris und Papas)
gleichzeitig im selben lokalen Ordner gearbeitet. Dabei sind Branches durcheinandergeraten
und ein Commit hat versehentlich fremde, unfertige Änderungen mitgenommen — reparierbar,
aber unnötig riskant. Ein eigener Branch pro Aufgabe verhindert das von vornherein.

**Vor dem Loslegen kurz prüfen:** Zeigt `git status` bereits Änderungen an Dateien, die
nichts mit der eigenen Aufgabe zu tun haben, oder ist der Branch-Name unbekannt (nicht
selbst gewählt) — **stoppen und nachfragen**, statt einfach weiterzumachen. Das kann ein
Zeichen sein, dass eine andere Sitzung gerade im selben Ordner arbeitet.

## Wie mit Henri gearbeitet wird

- **Auf Deutsch, und in einfachen Worten.** Erkläre kurz, was du gerade machst und warum.
- **Kleine Schritte.** Lieber eine Sache fertig als drei angefangen.
- **Zeigen, nicht nur beschreiben.** Nach einer Änderung sagen, wo man sie in der App sieht.
- **Nichts kaputtmachen:** Vorhandene Funktionen bleiben, außer Henri will es ausdrücklich anders.
- Wenn etwas nicht geht, ehrlich sagen — und einen einfacheren Weg vorschlagen.

## 🔒 PIN-Sperre + Verschlüsselung (seit 22.08.2026 LIVE)

Die App ist jetzt beim Start hinter einer PIN gesperrt, und die gespeicherten Daten liegen
verschlüsselt auf der Platte statt im Klartext.

- **`index.html` lädt `app.js` NICHT mehr direkt.** Stattdessen steht dort
  `<script src="lock.js">`. `lock.js` zeigt zuerst die PIN-Abfrage und hängt `app.js` erst
  per JavaScript nach, sobald die PIN stimmt. **Diese Struktur nie rückgängig machen** —
  wer `<script src="app.js">` wieder direkt einfügt, schaltet die Sperre komplett ab, ohne
  dass es auffällt.
- `app.js` selbst wurde **nicht verändert** und merkt vom Umbau nichts — `lock.js` schiebt
  sich zwischen `app.js` und den Browser-Speicher und ver-/entschlüsselt dabei unsichtbar.
- **`lock.js` ist Papa-Bereich** (Kryptografie, Schlüssel-Handling). Henri kann in `app.js`
  weiterbauen wie gewohnt — an `lock.js` bitte nichts ändern, ohne vorher zu fragen.
- Es gibt keinen Passwort-Reset per Mail (kein Server!) — stattdessen einen einmaligen
  Wiederherstellungscode, der bei der Ersteinrichtung angezeigt wird. „PIN ändern" gibt es
  in den Einstellungen.
- Details/Testprotokoll: Commit „PIN-Sperre + lokale Verschlüsselung (Stufe 1, Papa-Plan)"
  (die genaue Prüfsumme hat sich durch die Historienbereinigung vom 22.08.2026 geändert,
  einfach im Log danach suchen: `git log --oneline --all --grep=PIN-Sperre`).

## 🔄 Tourenaustausch ohne Server (seit 23.08.2026 LIVE)

Die Chefin kann Patienten den beiden Fachkräften zuteilen, ohne dass Gesundheitsdaten über
einen Server laufen — angefragt, weil Chefin und Tante sich die Tour bisher unsortiert per
WhatsApp zuschicken und dann telefonisch klären mussten, wer wen übernimmt.

**Bewusst kein Server, kein automatischer Sync.** Ein echter Server hätte sofort § 393 SGB V
(C5-Typ-2-Testat), einen AVV mit dem Pflegedienst und § 203 StGB (Schweigepflicht-
Verpflichtung für Papa als Betreiber) ausgelöst — siehe `MARKT.md`. Stattdessen: Ein Tipp zum
Senden, ein Tipp zum Empfangen.

- In der Tagesplanung (Modal „Tagesplanung") bekommt jeder Patient eine Zuteilung
  („Nicht zugewiesen" / Name Fachkraft 1 / Name Fachkraft 2). Zwei Buttons bauen daraus ein
  **verschlüsseltes Tourenpaket** (nur die Patienten dieser Fachkraft, inkl. Adresse, Zeit,
  Material, Notiz) und öffnen die normale Teilen-Funktion — der Text geht über den Kanal, den
  die drei ohnehin nutzen (WhatsApp, SMS, Mail).
- Empfangen läuft über „Tour empfangen" in den Einstellungen: Text einfügen, Codewort
  eingeben, übernehmen. Unbekannte Patientennamen werden automatisch neu angelegt. Bei
  exakter Namensübereinstimmung wird der bestehende Patient automatisch erkannt (keine
  Dublette). **Bei einem knappen, tippfehler-ähnlichen Treffer** (z. B. „Frau Musterr" vs.
  „Frau Muster") fragt die App einmal kurz nach, statt automatisch zu entscheiden — das nutzt
  dieselbe tippfehler-tolerante Suche (`fuzzyPatients`/`lev`), die auch die Suchleiste
  verwendet. So bleiben wiederkehrende Patienten über mehrere Tourenpakete hinweg dieselbe
  Person, ganz ohne geteilte IDs oder Server. Existiert für den Tag bereits eine Planung,
  fragt die App vor dem Überschreiben nach (Regel 6).
- **`share.js` ist eigener Papa-Bereich** (PBKDF2 + AES-256-GCM, komplett unabhängig von
  `lock.js` und dessen PIN-Schlüssel) — bitte nichts daran ändern, ohne vorher zu fragen.
  Henri kann an der Bedienung in `app.js` (Zuteilungs-Auswahl, Senden-/Empfangen-Buttons)
  weiterbauen wie gewohnt.
- **Das Team-Codewort ist kein Geräte-PIN.** Alle Beteiligten (Chefin + beide Fachkräfte)
  müssen es sich einmal persönlich oder telefonisch mitteilen — **nie** über denselben Kanal
  wie die Tour selbst, sonst schützt die Verschlüsselung nichts. Vor jedem Senden warnt die
  App noch einmal genau davor.
- Vollständig getestet (Verschlüsselung/Entschlüsselung, falsches Codewort, ungültiger Text,
  Namensabgleich, automatisches Anlegen, Überschreib-Schutz) — Details siehe Commit-Historie
  zu diesem Feature (`git log --oneline --all --grep=Tourenpaket` bzw. `--grep=Tourenaustausch`).
- Cache-Version in `service-worker.js` wurde für dieses Feature bereits auf `v20` erhöht.

## ⚠️ Das Repository ist seit 22.08.2026 ÖFFENTLICH

Grund: Nur so funktioniert das kostenlose automatische Hosting (GitHub Pages, siehe
`PWA-VEROEFFENTLICHEN.md`) — private Repos brauchen dafür ein bezahltes GitHub-Konto.
**Das heißt: Alles, was in dieses Repo committet wird, ist ab sofort für jeden im Internet
einsehbar — nicht nur theoretisch „landet irgendwann auf GitHub", sondern sofort, mit
jedem Push.** Regel 1 unten ist damit keine Vorsichtsmaßnahme mehr, sondern die einzige
Grenze zwischen echten Patientendaten und dem offenen Internet.

Vorgeschichte: Ursprünglich standen zwölf echte, von der Tante tatsächlich genutzte
Patientennamen als Startbelegung im Code (`const names=[...]` in `app.js`). Die wurden am
22.08.2026 entfernt UND die komplette Git-Historie wurde bereinigt (`git filter-repo`,
danach Force-Push) — deshalb stimmen alte Commit-Hashes aus früheren Notizen nicht mehr.

## 🩹 Wundfotos (geplant, siehe PLAN-HENRI.md)

Die Tante möchte Wundfotos direkt am Patienten speichern und gebündelt drucken/versenden
können — ein echter Wunsch aus ihrem Arbeitsalltag, kein Extra. DSGVO-technisch geprüft
(22.08.2026): grundsätzlich unproblematisch, solange folgende Leitplanken gelten.

- **Mehrere Fotos pro Patient**, nicht nur eins — für Verlaufsdokumentation. Jedes Foto
  bekommt automatisch Datum/Uhrzeit, optional eine kurze Notiz.
- **Vor dem Speichern verkleinern** (z. B. max. 1600px lange Kante) — sonst wird der
  Browser-Speicher (Limit meist 5–10 MB) schnell knapp, besonders mit mehreren Patienten.
- **Speicherung selbst ist bereits gelöst:** Fotos landen im normalen `state`-Objekt und
  werden dadurch automatisch von `lock.js` mitverschlüsselt — dafür muss nichts Neues gebaut werden.
- **Vor dem Teilen immer ein Warnhinweis**, bevor sich die native Teilen-Auswahl öffnet:
  Wundfotos sind besonders sensible Gesundheitsdaten, private WhatsApp ist dafür beruflich
  ungeeignet (Metadaten gehen an Meta/USA). Die App darf den Kanal nicht hart sperren
  (technisch kaum möglich über die native Teilen-Funktion), aber muss vorher warnen.
- **Kurzer Tipp beim Fotografieren:** nur die Wunde selbst, keine Gesichter oder
  Namensschilder im Bild.
- **Absolut tabu (siehe Regel 3):** automatisches Ausmessen, Bewerten, Klassifizieren oder
  Verbandmittel-Vorschläge aus dem Foto — macht die App sofort zum Medizinprodukt.
- Datenlöschung nach Frist (Retention) ist **Papas Aufgabe** (`PLAN-PAPA.md`), nicht Henris —
  durch die zusätzlichen, besonders sensiblen Bilddaten jetzt vorgezogen.

## Harte Regeln (nicht verletzen)

1. **Niemals echte Patientendaten in den Code schreiben.** Keine echten Namen, Adressen,
   Telefonnummern oder Diagnosen — auch nicht als Beispiel oder Testdaten. Nur erfundene Namen
   (Frau Muster, Herr Beispiel). Das Repo ist öffentlich — alles, was im Code steht, ist
   sofort für jeden im Internet sichtbar, nicht nur „irgendwann".
2. **Alle Daten bleiben auf dem Gerät.** Keine Cloud, kein Server, keine Datenbank im Internet,
   keine Anmeldung, kein Hochladen von Daten — **außer Papa hat es ausdrücklich freigegeben**.
   Das ist kein Techniklimit, sondern Gesetz: Gesundheitsdaten dürfen nicht einfach weggeschickt werden.
3. **Keine Wund-Vermessung oder Wund-Bewertung.** Fotos aufnehmen, speichern, anzeigen,
   bündeln, drucken und teilen ist erlaubt (siehe „🩹 Wundfotos" unten). Sobald die App eine
   Wunde **automatisch ausmisst, bewertet, klassifiziert (z. B. Dekubitus-Kategorie) oder eine
   Behandlung/Verbandmittel vorschlägt**, wird sie rechtlich zum Medizinprodukt (MDR Regel 11)
   — das ist dann ein monatelanges Zulassungsverfahren. Diese Grenze nie überschreiten, auch
   nicht als „hilfreiches Extra".
4. **Keine Abrechnung.** Sobald die App Daten für die Abrechnung mit der Pflegekasse erzeugt,
   braucht sie eine amtliche Softwareprüfung (ITSG). Also: keine Leistungsnachweise,
   keine Unterschriften von Patienten, keine Abrechnungsdateien.
5. **Bei jeder Datenänderung `save(...)` aufrufen** und die betroffene Ansicht neu rendern.
6. **Bei Löschen/Zurücksetzen immer nachfragen**, bevor etwas verschwindet.

## Technische Fallen in diesem Projekt

- **`app.js` enthält viele Funktionen mehrfach.** Historisch gewachsen — `setup` steht 8×,
  `show`/`renderReports`/`endVisit`/`ask` je 6×, `renderPlan`/`renderAll`/`printReport` je 5× drin.
  In JavaScript gewinnt **die letzte** Definition in der Datei. **Immer zuerst die letzte
  Definition suchen**, sonst ändert man Code, der gar nicht mehr läuft.
- **Zwei Ordner mit demselben Code:** `Claude-Uebergabe/FiaMed-Pflege-App/` ist der
  **maßgebliche Arbeitsstand**. `Claude-Uebergabe/Release/` ist die Kopie, die zu Netlify
  hochgeladen wird. Nach Änderungen muss der Release-Ordner neu aus der Quelle erzeugt werden —
  sonst laufen die beiden auseinander (ist schon einmal passiert und hat die Wochenansicht zerstört).
- **Service Worker:** Nach jeder Änderung an veröffentlichten Dateien die Zahl in `const CACHE = 'fiamed-pflege-pwa-vXX'` (oben in `service-worker.js`) um eins hochzählen, sonst sehen Nutzer die alte Version.
  **Zwei zusätzliche Fallen, beide am 23.08.2026 live erlebt und behoben — nicht rückgängig machen:**
  - Im `install`-Handler **nie** zu `caches.open(CACHE).then(cache => cache.addAll(APP_FILES))`
    zurückwechseln. GitHub Pages sendet `Cache-Control: max-age=600` — ohne `{cache:'reload'}`
    pro Datei übernimmt ein frisch installierter Service Worker sonst bis zu 10 Minuten alte,
    aus dem normalen Browser-HTTP-Cache stammende Dateien in seinen eigenen (neuen!) Cache,
    obwohl der Server längst die neue Version hat. Führte dazu, dass ein bereits ausgelieferter
    Bugfix beim Nutzer trotz korrektem Update-Zyklus nicht ankam.
  - `pwa.js` muss einen `controllerchange`-Listener behalten, der die Seite einmalig automatisch
    neu lädt. Ohne den bleibt eine bereits offene/installierte Seite vom ALTEN Service Worker
    kontrolliert, bis sie komplett geschlossen und neu geöffnet wird — ein einfaches „Neu laden"
    reicht dafür strukturell oft nicht.
- **Kein Build-Schritt, keine Bibliotheken.** Reines HTML/CSS/JavaScript. Bitte so lassen —
  das hält die App einfach und schnell.
- **Daten liegen in `localStorage` unter `fiamed-pflege-v2`.** Vorsicht bei Änderungen am
  Datenmodell: Die Tante hat dort echte Arbeitsdaten. Nie ohne Sicherung umbauen.

## Wer macht was

**Papa (Martin):** Datenschutz, Sicherheit, Anmeldung, Datenbank, Git, Releases, alles
Rechtliche. Wenn eine Aufgabe hier hineinfällt — an Papa verweisen, nicht selbst bauen.

**Henri:** Alles, was man sieht und benutzt — Ansichten, Knöpfe, Farben, neue Funktionen für
den Alltag der Tante. Hier darf frei ausprobiert werden.

## Was der Tante am meisten helfen würde

Aus einer echten Durchsicht der App (August 2026), nach Nutzen sortiert:

1. **In der Tour-Ansicht fehlen die wichtigsten Infos.** Uhrzeit, geplantes Material und die
   Notiz werden abends eingegeben und sind gespeichert (in `dayPlans` und `plannedMaterials`),
   aber die Tour-Karte zeigt sie nicht an. Genau die braucht sie unterwegs.
2. **Material erfassen dauert zu lange.** Beim Patienten öffnet sich das komplette
   Stammdatenformular. Sie steht mit Handschuhen am Bett — zwei Taps müssten reichen.
3. **Anrufen und Navigieren direkt aus der Patientenkarte** (`tel:` und Karten-Link).
4. **Der PflegePilot rät falsch.** Auf die Frage „Wie viele Patienten habe ich heute noch
   offen?" öffnete er die Detailansicht einer beliebigen Patientin — die fehlertolerante
   Suche hatte einen Namen in die Frage hineininterpretiert und ungefragt gehandelt.
   Besser: nur die vier Knöpfe anbieten und keine freie Texteingabe raten lassen.
