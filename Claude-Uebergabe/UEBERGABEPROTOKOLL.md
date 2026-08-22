# Übergabeprotokoll – FiaMed Pflege

Stand: 22. August 2026  
Zweck: Dieses Dokument übergibt die bestehende FiaMed-Pflege-App an Claude zur weiteren Pflege und Entwicklung.

## 1. Projektziel

FiaMed Pflege ist eine deutschsprachige, lokale Pflege- und Tour-App für Mac, iPhone, iPad und Android. Sie soll Pflegekräfte bei Tagesplanung, Besuchen, Material, Arbeitszeit und Tagesberichten unterstützen.

Die App ist absichtlich eine **lokale PWA**:

- keine Cloud und kein Server,
- alle personenbezogenen Daten liegen im Browser-Speicher des jeweiligen Geräts,
- Export/Import dient dem Gerätewechsel,
- Offline-Betrieb ist vorgesehen,
- Veröffentlichung erfolgt durch Hochladen des Release-Ordners zu Netlify.

## 2. Aktueller, maßgeblicher Projektstand

Für die Weiterentwicklung ist diese Kopie maßgeblich:

`FiaMed-Pflege-App/`

Wichtigste Startdatei für die veröffentlichte App:

`FiaMed-Pflege-App/index.html`

Für eine einzelne, weitergebbare Offline-Datei existiert zusätzlich:

`FiaMed-Pflege-App/FiaMed-Pflege.html`

Die zuletzt erzeugte Netlify-Fassung liegt außerhalb dieses Ordners unter `../Release/`. Der Inhalt ist identisch zur Projektfassung. Für Netlify nur den Inhalt des Release-Ordners hochladen, nicht die übergeordnete Projektstruktur.

## 3. Technologie und Architektur

- Vanilla HTML, CSS und JavaScript, keine Abhängigkeiten und kein Build-Schritt.
- Einstieg: `index.html`.
- Geschäftslogik und Darstellung: `app.js`.
- Gestaltung ist auf mehrere CSS-Dateien aufgeteilt.
- PWA: `manifest.webmanifest`, `pwa.js`, `service-worker.js`, `icon-192.png`, `icon-512.png`.
- Netlify: `netlify.toml`.
- Browserdaten: `localStorage` mit Schlüssel `fiamed-pflege-v2`; ältere Daten können aus `fiamed-pflege-v1` übernommen werden.

### Kritische technische Besonderheit

`app.js` ist historisch durch viele kleine Erweiterungen gewachsen. Darin existieren mehrere gleichnamige Funktionsdefinitionen. In JavaScript gewinnt jeweils die **letzte** Definition in der Datei. Die aktuell wirksamen Ergänzungen stehen daher weit unten vor dem abschließenden `})();`.

Bei Änderungen nicht blind frühere Varianten einer Funktion ändern. Stattdessen erst die letzte Definition von `renderAll`, `renderReports`, `renderPlan`, `show`, `setup` oder der betroffenen Funktion suchen. Langfristig wäre eine behutsame Bereinigung in getrennte Module sinnvoll, aber nur mit umfangreichen Tests, weil die App produktive lokale Daten speichern kann.

## 4. Datenmodell im lokalen Speicher

Der Zustand wird in einem Objekt `state` gespeichert. Relevante Felder:

- `patients`: Patientenstammdaten inklusive `name`, `address`, `phone`, `notes`, `special`, `materials`, `priority`, `selected`, `status`, `visit`, `visits`, `order`, `favorite`, `archived`, `recurrence`, `dailyNote`, `nextHint`, `photo`.
- `materials`: Materialstammdaten inklusive `name`, `stock`, `minimum`, `favorite`, `archived`.
- `tourStartedAt`, `workOffset`, `pauseLog`, `dayClosed`: Arbeits-/Tourstatus.
- `kilometers`, `kilometerLog`: Tageskilometer und Verlauf.
- `weekPlans`, `dayPlans`, `calendarEvents`: Planung und Kalender.
- `materialBookings`: Material zum Nachbestellen, jeweils mit Patient, Artikel und Anzahl.
- `reports`: explizit gespeicherte Tagesberichte.
- `deletedReportDays`: ausgeblendete, noch nicht gespeicherte Tagesberichtsvorschauen.
- `settings`: Pflegekraft, Firma, Sprache, Logo sowie Backup-/Release-Präferenzen.
- `backups`: lokale Momentaufnahmen vor Änderungen.

`save(reason)` schreibt den Zustand automatisch in `localStorage` und legt eine lokale Momentaufnahme an. Änderungen sollten immer über `save(...)` gesichert werden.

## 5. Bereits umgesetzte Funktionen

### Startseite und Navigation

- Begrüßung abhängig von Tageszeit sowie aktuelles Datum.
- Karten für Patienten heute/morgen/übermorgen, Material, erledigte Besuche und Arbeitszeit.
- Große Aktion „Tag starten“; bei aktiver Tour ein Status „Tour läuft“.
- Ausklappbare linke Seitenleiste mit funktionierendem Scrollen und klickbaren Einträgen.
- Eigenes Home-Symbol in der globalen Kopfzeile.
- Mobile untere Navigation.
- Dunkelmodus und responsive Darstellung.

### Tour, Patienten und Zeit

- Tagesplanung, Auswahl von Patienten, Prioritäten, Uhrzeit, Notizen und geplantem Material.
- Wiederkehrende Besuche und Vorschläge für den aktuellen Tag.
- Tourreihenfolge sowie Sortierung nach Priorität/Entfernung.
- Besuch starten, Ankunft erfassen, Besuch beenden, Chronik und Materialerfassung.
- Ankunftsprotokoll für Abfahrt, Ankunft und Kilometer je Besuch.
- Arbeitszeit, Besuchszeit, Pausen sowie Tagesabschluss.
- Tourabschluss-Zusammenfassung mit Tagesplan ansehen/speichern/löschen und Rückkehr zur Startseite.
- Täglicher Status-Reset: Beim Wechsel des Kalendertags werden aktive Tourdaten zurückgesetzt, Stammdaten und Besuchshistorie bleiben erhalten.

### Material und Berichte

- Materialstammdaten, Lagerbestand, Mindestbestand und Warnungen.
- Materialverbrauch pro Besuch und Materialliste für den Tag.
- Zusätzliche Nachbestellliste für die Pflegetasche: Patient, Material und Menge; separate Teilen-Funktion.
- Tagesbericht mit Patienten, Besuchszeiten, verwendetem Material, Nachbestellung, Kilometern und Arbeitszeit.
- CSV-Export, gestaltete Druckansicht/PDF und systemnahe Teilen-Funktion.
- Gespeicherte Tagesberichte können mit Sicherheitsabfrage gelöscht werden.
- Die aktuelle, noch nicht gespeicherte Berichtsvorschau kann ebenfalls mit Sicherheitsabfrage ausgeblendet werden. Das entfernt **nicht** die Besuche oder das Material; die Vorschau kann danach wieder eingeblendet oder neu gespeichert werden.

### PflegePilot und Suche

- Lokaler PflegePilot ohne externe KI-Verbindung.
- Antworten zu Tour, offenen Patienten, Material, Kilometern, Arbeitszeit und Berichten.
- Fehlertolerante Patienten-/Materialsuche.
- Änderungen durch PflegePilot sollen eine explizite Bestätigung benötigen; bei späteren Erweiterungen dieses Sicherheitsprinzip beibehalten.

### PWA und Veröffentlichung

- Manifest, Icons und Service Worker vorhanden.
- Offline-Cache ist aktiv.
- Android/iPhone: über Browser „Zum Startbildschirm hinzufügen“.
- Service-Worker-Cache aktuell: `fiamed-pflege-pwa-v9`.

## 6. Wichtige Entscheidungen und behobene Probleme

| Thema | Entscheidung bzw. Fehlerbehebung |
|---|---|
| Datenschutz | Daten ausschließlich lokal; keine automatische Cloud-Synchronisierung. |
| Kartenfunktion | Wurde auf ausdrücklichen Wunsch vollständig entfernt. Keine Kartenbibliothek, Geolocation oder Routenlogik erneut hinzufügen, außer nach neuer Freigabe. |
| Seitenleiste | Hintergrund beim Öffnen nur abdunkeln, nicht unbrauchbar verschwimmen; Sidebar selbst muss klickbar und scrollbar bleiben. |
| Tourende | „Tour beenden“ darf nie erneut die Vorbereitungscheckliste öffnen; es zeigt die Zusammenfassung. |
| Toursteuerung | „Tour anhalten/fortsetzen“ und „Tour beenden“ stehen auf der Startseite beim Status „Tour läuft“, nicht im Kopf der Tourseite. |
| Tageswechsel | Tagesstatus wird beim echten Datumswechsel zurückgesetzt, damit erledigte Besuche nicht am Folgetag weiter angezeigt werden. |
| Tagesbericht | Der Bericht ist eine Vorschau, bis „Tagesbericht erstellen“ gewählt wird. Die Löschaktion erklärt bzw. unterscheidet diesen Zustand. |
| Mobile | Google Pixel 9 Pro war besonders wichtig: große Touch-Ziele, keine seitliche Überlappung, untere Navigation mit Safe-Area-Abstand. |
| PWA-Updates | Nach jeder Auslieferung Cache-Version im Service Worker erhöhen; Nutzer müssen die installierte App ggf. komplett schließen und erneut öffnen. |
| Speicherung | Nach jeder Änderung `save(...)` nutzen und betroffene Ansichten direkt neu rendern. |
| Leere Ansichten | Es gab früher weiße/leere Ansichten. Eine robuste Render-Schicht (`renderSafely`/`normaliseViewState`) soll verhindern, dass ein einzelner Fehler die gesamte Ansicht leer lässt. |

## 7. Bekannte Grenzen / offene Verbesserungschancen

1. Es gibt keine echte Synchronisation zwischen Geräten. Export/Import ist erforderlich.
2. PflegePilot ist regelbasiert und lokal, keine echte Sprach-KI. Er soll nur sichere, erklärbare Aktionen ausführen.
3. Apple-Karten-Links funktionieren je nach Plattform; Android nutzt den System-/Browser-Kartenanbieter.
4. Viele Funktionen in `app.js` sind historisch dupliziert. Refactoring nur schrittweise und mit Datensicherung.
5. Die eigenständige Datei `FiaMed-Pflege.html` muss nach Änderungen an HTML/CSS/JS neu generiert werden, wenn sie weiter verteilt werden soll.
6. Der Service Worker muss nach jeder Änderung an veröffentlichten Dateien eine neue Cache-Version erhalten.

## 8. Arbeitsregeln für die Weiterentwicklung

1. Zuerst eine vollständige Sicherung des Ordners erstellen.
2. Bestehende Funktionen niemals unbemerkt entfernen.
3. Bei destruktiven Aktionen immer eine verständliche Bestätigung anzeigen.
4. Bei Änderungen an Daten `save(...)` aufrufen und die betroffenen Ansichten aktualisieren.
5. Mindestens JavaScript-Syntax, lokale Dateiverweise, PWA-Cache und Release-ZIP prüfen.
6. Auf schmalem Android-Viewport prüfen: keine horizontalen Überläufe, Buttons mindestens gut antippbar, untere Navigation darf Inhalte nicht verdecken.
7. Nach Änderung den Release-Ordner aktualisieren und neu zippen.

## 9. Veröffentlichung über Netlify

1. Den Ordner `Release` öffnen.
2. Seinen **Inhalt** oder den kompletten Ordner bei Netlify Drop hochladen.
3. Nach Veröffentlichung den Link auf Android/Chrome testen.
4. Bei installierter PWA: App komplett schließen und neu öffnen, damit der neue Service Worker übernommen wird.
5. Da Daten lokal gespeichert werden, hat jedes Gerät seinen eigenen Datenbestand.

## 10. Prüfliste vor einer neuen Release

- `app.js` und `service-worker.js` auf Syntax prüfen.
- `index.html` auf vorhandene CSS-, JS-, Manifest- und Icon-Dateien prüfen.
- Alle Einträge im Service-Worker-Cache müssen als Dateien existieren.
- Patient speichern, Besuch starten/beenden, Kilometer speichern und Material speichern testen.
- Tagesbericht erstellen, Vorschau löschen, gespeicherten Bericht löschen und Teilen/Druckansicht testen.
- Tour anhalten/fortsetzen/beenden testen.
- Startseite, Tagesplan, Patienten, Material, Bericht, Einstellungen und Kalender auf Desktop und Mobilbreite kontrollieren.
- `Release` aktualisieren, `Release.zip` erzeugen und Archivtest ausführen.

