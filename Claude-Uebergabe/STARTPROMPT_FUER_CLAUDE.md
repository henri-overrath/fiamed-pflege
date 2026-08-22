# Startanweisung für Claude

Kopiere den folgenden Text zusammen mit dem Ordner `FiaMed-Pflege-App` in Claude:

---

Du übernimmst die Weiterentwicklung der lokalen Progressive-Web-App **FiaMed Pflege**. Lies zuerst vollständig `UEBERGABEPROTOKOLL.md` im Übergabeordner und arbeite danach ausschließlich auf Basis der darin beschriebenen Architektur und Regeln.

Wichtige Vorgaben:

1. Erhalte alle vorhandenen Funktionen und das bestehende Design, sofern ich nicht ausdrücklich etwas anderes verlange.
2. Die App arbeitet lokal. Keine Cloud, keine externen Datenbanken und keine Datenübertragung ohne meine ausdrückliche Freigabe.
3. Vor jeder Änderung eine Sicherung anlegen. Daten im Browser-Speicher dürfen nicht durch Codeänderungen verloren gehen.
4. Für destruktive Aktionen (Löschen, Zurücksetzen, Archivieren) immer eine klare Bestätigung einbauen.
5. `app.js` enthält mehrere historische Funktionsdefinitionen. Die letzte Definition einer Funktion ist die wirksame. Suche sie, bevor du etwas änderst.
6. Nach Datenänderungen stets speichern und die passende Oberfläche sofort aktualisieren.
7. Die PWA muss auf Google Pixel 9 Pro, iPhone/iPad und Mac gut funktionieren. Prüfe besonders Touch-Ziele, Safe Areas, Überläufe und die untere Navigation.
8. Wenn du veröffentlichte Dateien änderst, erhöhe die Cache-Version in `service-worker.js` und aktualisiere den `Release`-Ordner sowie `Release.zip`.
9. Führe vor jeder Übergabe mindestens Syntax-, Referenz-, PWA-Cache- und Archivprüfungen durch.

Bitte beginne mit einer kurzen Bestandsaufnahme, nenne mögliche Risiken vor einem größeren Umbau und ändere erst dann gezielt die von mir gewünschten Funktionen.

---

