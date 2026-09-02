# FiaMed Pflege — Android-App

Native Android-Hülle um die bestehende Web-App, gebaut mit [Capacitor](https://capacitorjs.com).
**Dieser Ordner enthält keine App-Logik.** `app.js`, `lock.js`, `share.js` usw. bleiben
unverändert in `../Claude-Uebergabe/FiaMed-Pflege-App/` — genau dort, wo Papa und Henri
immer schon gearbeitet haben. Dieser Ordner packt sie nur in eine installierbare APK.

## Grundsatzentscheidung: Dateien liegen fest in der App, nicht online nachgeladen

`capacitor.config.json` zeigt mit `webDir` direkt auf `../Claude-Uebergabe/FiaMed-Pflege-App`.
Beim Bauen kopiert Capacitor diese Dateien **fest in die APK** (`assets/public/…`), statt sie
zur Laufzeit von GitHub Pages nachzuladen.

**Warum:** Die Tante arbeitet unterwegs bei Patienten, oft mit schlechtem Empfang. Eine App,
die zum Starten erst online sein muss, wäre schlechter als die heutige PWA. Passt außerdem zur
bestehenden Regel „Alle Daten bleiben auf dem Gerät" aus `CLAUDE.md`.

**Kehrseite:** Updates kommen nicht mehr automatisch wie bei GitHub Pages. Nach jeder Änderung
an der Web-App muss eine neue APK gebaut und neu installiert werden (siehe unten).

## Nach jeder Änderung an der Web-App

```bash
cd android-app
npm run sync          # kopiert den aktuellen Stand aus Claude-Uebergabe/FiaMed-Pflege-App/ ins Android-Projekt
npm run build:debug   # baut eine neue Test-APK
```

Die fertige APK liegt danach unter `android/app/build/outputs/apk/debug/app-debug.apk` und kann
per Kabel, AirDrop-Ersatz (z. B. Nearby Share) oder E-Mail-Anhang auf das Handy der Tante.
**Kein Play Store nötig** — eine APK lässt sich direkt installieren (einmalig „Installation aus
unbekannten Quellen erlauben", Android fragt automatisch danach).

## Falls das Icon sich mal ändert

`assets/icon.png` ist die Quelle (aktuell eine Kopie von `icon-512.png` aus der Web-App).
Nach dem Austauschen:

```bash
npm run icons
```

Erzeugt automatisch alle Auflösungen und einen Splashscreen dazu.

## Voraussetzungen auf diesem Rechner

- **Java:** Kein System-Java installiert. Ein portables JDK 21 (Temurin, LTS) liegt unter
  `~/.local-jdks/jdk-21.0.12.1+1/` — Android Studios eigenes mitgeliefertes Java ist Version 25,
  zu neu für die aktuelle Gradle-Version (Fehler „Unsupported class file major version 69").
  Für Kommandozeilen-Builds:
  ```bash
  export JAVA_HOME="$HOME/.local-jdks/jdk-21.0.12.1+1/Contents/Home"
  ```
  **In Android Studio selbst ist das kein Problem** — dort unter „Preferences → Build,
  Execution, Deployment → Build Tools → Gradle → Gradle JDK" ein passendes JDK auswählen
  (Studio bietet i. d. R. mehrere zur Auswahl an, notfalls „Download JDK…" mit Version 21).
- **Android SDK:** liegt unter `~/Library/Android/sdk`, `platform-tools` + Plattform 37 +
  Build-Tools 36 sind schon installiert.
- **Noch kein Emulator eingerichtet.** Muss einmalig in Android Studio passieren
  (Tools → Device Manager → „Create device") — das kann nicht per Kommandozeile erledigt
  werden, ohne ein komplettes System-Image herunterzuladen.

## Was geprüft, aber nicht auf einem echten Gerät/Emulator getestet werden konnte

- **Build erfolgreich:** `./gradlew assembleDebug` läuft fehlerfrei durch, alle Web-Dateien
  (`app.js`, `lock.js`, `share.js`, …) stecken nachweislich in der erzeugten APK.
- **`tel:`/`mailto:`/Karten-Links geprüft (im Quellcode, nicht live):** Capacitors
  `Bridge.launchIntent()` öffnet jede URL, die nicht zur App selbst gehört, über
  `Intent.ACTION_VIEW` — das ist der Standard-Mechanismus, über den Android `tel:` an die
  Telefon-App und `mailto:` an die Mail-App weiterreicht. Anrufen, Navigation und
  „Fehler melden" sollten also ohne weitere Konfiguration funktionieren.
- **`navigator.share()` (Tourenpaket senden, Tagesbericht/Nachbestellung teilen) — unklar,
  ob Android-WebView das zuverlässig unterstützt.** Die App hat bereits einen sauberen
  Fallback (`if(navigator.share) … else … Zwischenablage`), der greift, wenn die Funktion
  fehlt. Ob sie im WebView vorhanden, aber unzuverlässig ist, lässt sich nur auf einem
  echten Gerät/Emulator sehen — **bitte einmal ausprobieren**, sobald ein Emulator läuft.
  Falls es hakt: `@capacitor/share` ist die offizielle, zuverlässige Lösung dafür (noch
  nicht eingebaut).

## So testest du es selbst

1. `android-app/` in Android Studio öffnen (`npm run open` oder Ordner `android-app/android`
   direkt öffnen).
2. Einmalig einen Emulator anlegen: Tools → Device Manager → „Create device" → ein
   Pixel-Gerät, aktuelles Android-Image herunterladen (braucht etwas Zeit und Speicherplatz).
3. Auf „Run" (▶) klicken.
4. In der App: PIN einrichten, Testpatienten anlegen, „Ich bin da" antippen (Telefon-App
   sollte sich öffnen), „Fehler melden" antippen (Mail-App sollte sich öffnen), einen
   Tagesbericht teilen (prüfen, ob die native Teilen-Auswahl erscheint oder ob es in die
   Zwischenablage kopiert).
