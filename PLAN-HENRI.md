# Henris Plan — was als Nächstes gebaut wird

Hallo Henri! 👋 Hier stehen Ideen für deine App. Du musst sie **nicht der Reihe nach**
machen — such dir aus, worauf du Lust hast.

**So geht's:** Du sagst deinem Claude einfach den Satz, der bei „Sag zu Claude" steht.
Er baut es dann mit dir zusammen.

---

## ✅ Das hast du schon geschafft

Das ist inzwischen eine richtig lange Liste — alles mit echten Pull Requests, so wie
Profis das machen. 👏

- Die Wochenplanung repariert (zeigte vorher einen Fehler statt der Woche)
- Alten Karten-Code aufgeräumt
- 🎉 Konfetti + „Feierabend!" beim letzten Patienten des Tages
- Die Reihenfolge im Tagesplan stimmt jetzt mit der Tour überein
- Die Wochenansicht zeigt jetzt den echten Tagesplan (auch vergangene Tage)
- „Neue Tour heute starten" statt nur „Tour löschen" — Besuchsdokumentation bleibt erhalten
- Leere Tagesplanung zeigt jetzt einen Hinweis + „Ersten Patienten anlegen"
- 📦 Material-Schnellerfassung — schlankes Fenster statt komplettem Formular
- Archivierte Patienten sind wieder aktivierbar (Checkbox „Archivierte anzeigen")
- Der Tour-Fortschrittsbalken hat endlich ein richtiges Design
- Der kaputte Stern hinter dem „Tour beenden"-Knopf ist weg
- Das Wort „Abrechnung" aus dem Tagesbericht entfernt — **das hast du selbst erkannt**,
  weil es gegen eine Regel in dieser Datei verstößt. Genau so soll das laufen! 🎯
- Neue Materialien gelten nicht mehr sofort fälschlich als „knapp"
- 📞 Anruf- und Navigations-Knopf direkt auf der Patientenkarte
- „Für nächstes Mal mitbringen" — Notizfeld beim Patienten
- 📱 Seitliches Wegwischen auf dem Handy behoben (echter Bug, den du auf deinem eigenen
  iPhone gefunden hast — [PR #18](https://github.com/henri-overrath/fiamed-pflege/pull/18))
- ✉️ Neuer Menüpunkt „Fehler melden" — öffnet die Mail-App, ohne dass die Tante irgendwas
  selbst eintippen muss ([PR #19](https://github.com/henri-overrath/fiamed-pflege/pull/19))

**15 Verbesserungen — und mit den beiden letzten hast du zum ersten Mal ganz allein einen
echten Bug gefunden und ein eigenes Feature gebaut.** Ernsthaft beeindruckend. 👏

---

## 🩹 Wundfotos — das hat sich deine Tante wirklich gewünscht!

Sie will Fotos von Wunden direkt beim Patienten speichern können, um sie später
gesammelt auszudrucken oder zu verschicken (z. B. an ihre Chefin). Das ist kein
ausgedachtes Beispiel — das kommt direkt von ihr. Papa hat das rechtlich geprüft
(Datenschutz): grundsätzlich geht das gut, wenn du dich an die Reihenfolge und die
Leitplanken unten hältst.

**Das hier ist größer als die anderen Aufgaben — deshalb in sechs kleinen Schritten,
einer nach dem anderen.** Nach jedem Schritt kurz ausprobieren, bevor der nächste kommt.

### Schritt 1 — Mehrere Fotos statt nur einem

**Sag zu Claude:**
> „Ein Patient soll jetzt mehrere Wundfotos haben können, nicht nur eins. Jedes Foto
> bekommt automatisch Datum und Uhrzeit, und ich kann eine kurze Notiz dazuschreiben,
> z. B. ‚Tag 3, Wundrand gerötet'. Ein bereits gespeichertes einzelnes Altfoto soll beim
> nächsten Öffnen automatisch in die neue Liste übernommen werden, damit nichts verloren geht."

**Testen:** Bei einem Patienten mit alter Einzelfoto-Version die App öffnen — das alte
Foto muss noch da sein. Dann ein zweites Foto hinzufügen — beide müssen sichtbar bleiben.

### Schritt 2 — Fotos automatisch verkleinern

**Sag zu Claude:**
> „Bevor ein Foto gespeichert wird, soll es automatisch verkleinert werden, z. B. auf
> maximal 1600 Pixel an der längeren Seite. Sonst wird der Speicherplatz im Browser zu
> schnell voll."

**Warum das wichtig ist:** Ohne das würden ein paar Dutzend Fotos schon reichen, um den
gesamten Speicherplatz der App zu sprengen — dann geht plötzlich gar nichts mehr.

### Schritt 3 — Fotogalerie beim Patienten

**Sag zu Claude:**
> „Zeig alle Wundfotos eines Patienten als kleine Vorschaubilder an, sortiert nach Datum,
> neuestes zuerst. Antippen soll das Foto groß anzeigen, mit einem Löschen-Knopf."

### Schritt 4 — Fotos gebündelt drucken

**Sag zu Claude:**
> „Baue eine Druckansicht, die mehrere ausgewählte Wundfotos eines Patienten zusammen mit
> Datum und Notiz sauber auf einer Seite zeigt — ähnlich wie die bestehende
> Tagesbericht-Druckansicht."

### Schritt 5 — Fotos gebündelt teilen (mit Warnhinweis!)

**Sag zu Claude:**
> „Baue einen Teilen-Knopf für mehrere ausgewählte Wundfotos, der sie über die normale
> Teilen-Funktion des Handys verschickt. Zeig VORHER immer diesen Hinweis: ‚Wundfotos sind
> besonders sensible Gesundheitsdaten. Bitte nur über einen sicheren, dienstlich erlaubten
> Weg verschicken — keine private WhatsApp.' Erst wenn ich das bestätige, öffnet sich die
> Teilen-Auswahl."

**Warum genau dieser Hinweis wichtig ist:** Ein Wundfoto ist viel sensibler als ein Name
in einer Liste — man erkennt sofort, dass es medizinische Dokumentation ist. WhatsApp ist
dafür beruflich nicht geeignet (Metadaten gehen an Meta in den USA). Der Hinweis verbietet
nichts, er erinnert nur kurz daran, bevor deine Tante den Weg selbst auswählt.

### Schritt 6 — Kleiner Sicherheitstipp beim Fotografieren

**Sag zu Claude:**
> „Zeig über dem Foto-Knopf einen kurzen Hinweis: ‚Nur die Wunde selbst fotografieren —
> keine Gesichter oder Namensschilder im Bild.'"

### ⛔ Was hier niemals dazukommen darf

Egal wie hilfreich es klingt: **niemals** automatisches Ausmessen, Bewerten oder
Klassifizieren einer Wunde, und **niemals** ein Verbandmittel oder eine Behandlung aus
einem Foto vorschlagen. Das würde die App rechtlich zu einem Medizinprodukt machen —
das braucht dann ein monatelanges amtliches Zulassungsverfahren. Steht auch nochmal genau
so in dieser Datei weiter unten unter „Harte Regeln" und im Abschnitt „🩹 Wundfotos".

---

## ⭐ 1. Die Tour-Karten sollen mehr zeigen

**Sag zu Claude:**
> „Zeig auf den Karten in der Tour-Ansicht auch die geplante Uhrzeit, das geplante Material
> und die Notiz an."

**Warum das gut ist:** Deine Tante gibt am Abend vorher ein, wann sie bei wem ist und was sie
mitnehmen muss. Die App speichert das auch alles brav — aber sie **zeigt es unterwegs nicht an**!
Auf der Karte steht nur der Name. Wenn du das reinbaust, sieht deine Tante endlich alles,
während sie im Auto sitzt.

**Das ist immer noch die nützlichste Idee auf dieser Liste.** 🥇

---

## 🩺 2. PflegePilot rät manchmal falsch

**Sag zu Claude:**
> „Der PflegePilot soll nur noch die vier vorgeschlagenen Knöpfe anbieten. Das freie
> Eingabefeld für eigene Fragen soll raus."

**Warum das gut ist:** Auf die Frage „Wie viele Patienten habe ich heute noch offen?" hat
der PflegePilot statt einer Antwort einfach irgendeine Patientenkarte geöffnet — er hat
versucht, einen Namen aus der Frage herauszulesen, und lag daneben. Die vier Knöpfe
funktionieren zuverlässig, die freie Texteingabe rät zu oft falsch. Weniger ist hier mehr.

---

## 🏠 3. Nächster Patient groß auf der Startseite

**Sag zu Claude:**
> „Zeig oben auf der Startseite groß an, welcher Patient als Nächstes dran ist und um wie
> viel Uhr."

**Warum das gut ist:** Deine Tante öffnet die App oft nur kurz, um nachzusehen, wer als
Nächstes kommt. Aktuell muss sie dafür erst in den Tagesplan wechseln. Ein Blick auf die
Startseite sollte reichen.

---

## 🔍 Noch mehr Ideen, wenn dir danach ist

**Sag zu Claude — such dir was aus:**

> „Mach die Schrift und die Knöpfe größer, damit man sie mit Handschuhen gut treffen kann."

> „Begrüße die Pflegekraft mit ihrem Namen aus den Einstellungen, nicht nur mit
> ‚Guten Morgen'."

---

## 🚧 Das macht Papa — nicht du

Diese Sachen sind langweilig und kompliziert, dafür ist Papa da:

- Anmeldung mit Passwort
- Daten verschlüsseln
- Server und Datenbanken
- Die App ins Internet stellen
- Alles mit Datenschutz und Gesetzen

Wenn dein Claude sagt „das sollte Papa machen" — dann stimmt das. 😊

---

## ⚠️ Zwei Regeln, die immer gelten

1. **Niemals echte Namen von echten Patienten in den Code schreiben.** Immer nur ausgedachte
   Namen wie „Frau Muster" oder „Herr Beispiel". Alles, was im Code steht, kann später jeder
   im Internet lesen — und Patientendaten sind streng geheim.
2. **Keine Daten ins Internet schicken.** Alles bleibt auf dem Handy oder Computer.
   Wenn du etwas bauen willst, wo Daten verschickt werden — erst Papa fragen.

Viel Spaß beim Bauen! 🚀
