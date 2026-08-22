# CLAUDE.md — FiaMed Pflege

> Diese Datei wird von Claude Code automatisch geladen — auf Henris Mac genauso wie auf Papas.
> Sie sorgt dafür, dass beide in dieselbe Richtung bauen.

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

## Wie mit Henri gearbeitet wird

- **Auf Deutsch, und in einfachen Worten.** Erkläre kurz, was du gerade machst und warum.
- **Kleine Schritte.** Lieber eine Sache fertig als drei angefangen.
- **Zeigen, nicht nur beschreiben.** Nach einer Änderung sagen, wo man sie in der App sieht.
- **Nichts kaputtmachen:** Vorhandene Funktionen bleiben, außer Henri will es ausdrücklich anders.
- Wenn etwas nicht geht, ehrlich sagen — und einen einfacheren Weg vorschlagen.

## Harte Regeln (nicht verletzen)

1. **Niemals echte Patientendaten in den Code schreiben.** Keine echten Namen, Adressen,
   Telefonnummern oder Diagnosen — auch nicht als Beispiel oder Testdaten. Nur erfundene Namen
   (Frau Muster, Herr Beispiel). Alles, was im Code steht, landet auf GitHub und im Internet.
2. **Alle Daten bleiben auf dem Gerät.** Keine Cloud, kein Server, keine Datenbank im Internet,
   keine Anmeldung, kein Hochladen von Daten — **außer Papa hat es ausdrücklich freigegeben**.
   Das ist kein Techniklimit, sondern Gesetz: Gesundheitsdaten dürfen nicht einfach weggeschickt werden.
3. **Keine Wund-Vermessung oder Wund-Bewertung.** Fotos aufnehmen, speichern und anzeigen ist
   erlaubt. Sobald die App eine Wunde **automatisch ausmisst, bewertet oder eine Behandlung
   vorschlägt**, wird sie rechtlich zum Medizinprodukt (MDR Regel 11) — das ist dann ein
   monatelanges Zulassungsverfahren. Diese Grenze nie überschreiten.
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
- **Service Worker:** Nach jeder Änderung an veröffentlichten Dateien die Cache-Version in
  `service-worker.js` hochzählen (`fiamed-pflege-pwa-v9` → `v10`), sonst sehen Nutzer die alte Version.
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
