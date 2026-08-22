# FiaMed Pflege-App

Lokale, responsive Pflege-Tour-App. **Bitte die gehostete `index.html`-Fassung benutzen**
(siehe `PWA-VEROEFFENTLICHEN.md`) — sie ist seit August 2026 mit einer PIN-Sperre und
Verschlüsselung der gespeicherten Daten geschützt.

> ⚠️ **Die eigenständige Datei `FiaMed-Pflege.html` ist NICHT geschützt.** Sie funktioniert
> zwar auch nach dem Teilen oder Entpacken zuverlässig, weil Design und Funktionen in einer
> einzigen Datei stecken — aber genau deshalb lässt sich die PIN-Sperre technisch nicht in
> sie einbauen, ohne die Datei komplett neu zu strukturieren. Bitte nicht mehr für echte
> Patientendaten verwenden, solange das nicht nachgezogen ist.

Alle Daten werden im lokalen Browser-Speicher gesichert (bei `index.html` verschlüsselt).
Für eine spätere native Mac-/iPhone-Version kann dieselbe Oberfläche z. B. mit Capacitor
verpackt werden; Apple-Karten-Links sind bereits integriert.

## Funktionen

- Dynamische Begrüßung, Tageskennzahlen und Dark Mode
- Tagesplanung mit frei auswählbaren Patienten und Prioritätssortierung
- Besuchsstatus und automatische Zeitmessung
- Patienten-, Material- und Kilometerverwaltung
- Automatisches lokales Speichern nach jeder Änderung
- PflegePilot: lokaler, fehlertoleranter Assistent für Tour, Patienten, Material und Berichte
- Globale Patientensuche mit Tippfehler-Toleranz
- Materialerfassung pro Besuch, Tagesmaterialliste und Statistik
- Tagesbericht mit CSV-Export, Druckansicht/PDF und nativer Teilen-Funktion
- Automatische lokale Sicherung vor jeder Änderung (letzte 12 Sicherungspunkte)
- Wochenübersicht mit Tagesplanung und Tourvorschlag
- Monatskalender für Besuchstage, freie Tage, Urlaub, Feiertage und Fortbildungen
- Materiallager mit Bestand, Mindestbestand und Warnungen
- Einstellungen für Pflegekraft, Firma, Logo, Sprache, Darstellung sowie Datenimport/-export
- Lokale Foto-Vorbereitung in den Patientendetails (Kamera oder Dateiauswahl)
- Tourplanung per Drag & Drop mit lokaler Reihenfolgenspeicherung
- Arbeitszeit mit Pausen-, Besuchs- und berechneter Fahrzeit
- Dashboard für Tages-, Wochen- und Monatskennzahlen
- Patienten- und Materialarchiv sowie Backup-Wiederherstellung
- Wiederkehrende Besuchsvorschläge und favorisierte Patienten bzw. Materialien
- Patientenchronik, Tagesabschluss und Materialstatistik nach Zeitraum
- FiaMed-Dashboard, Monatsübersicht, professionelle PDF-Druckansicht und Feierabend-Status
- Lernende Materialvorschläge aus der jeweiligen Patientenhistorie
- Kartenansicht der heutigen Tour, Tourvorbereitung, Fortschrittsanzeige und Nächster-Patienten-Navigation
