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

## Auf einem echten Emulator bestätigt (02.09.2026)

- PIN einrichten funktioniert (WebCrypto/PBKDF2/AES-GCM aus `lock.js` läuft im Android-WebView)
- `tel:` (Anrufen), `mailto:` („Fehler melden") und Teilen (`navigator.share()` bzw.
  Zwischenablage-Fallback) wurden alle im Emulator ausprobiert und funktionieren

Noch nicht getestet: echtes Gerät (nur Emulator bisher), Verhalten bei sehr schlechtem/keinem
Empfang mitten in der Nutzung (sollte wegen der festen Bündelung egal sein, aber nie live
beobachtet).

## Release-APK bauen (signiert, installierbar als Update)

Ein `assembleDebug`-Build reicht zum Ausprobieren, aber Android markiert Debug-Builds anders
und sie lassen sich nicht sauber als Update installieren. Für eine echte Weitergabe:

```bash
export JAVA_HOME="$HOME/.local-jdks/jdk-21.0.12.1+1/Contents/Home"
cd android-app/android
./gradlew assembleRelease
```

Ergebnis liegt unter `android/app/build/outputs/apk/release/app-release.apk`.

**Voraussetzung:** `android/keystore.properties` + `android/keystore/fiamed-release.jks`
müssen vorhanden sein (beide bewusst NICHT im Git-Repo, siehe `.gitignore` — dieses Repo ist
öffentlich). Ohne die beiden Dateien bricht `assembleRelease` mit einer klaren Fehlermeldung
ab; `assembleDebug` funktioniert davon unabhängig immer.

### ⚠️ Diese beiden Dateien unbedingt sichern (z. B. Passwort-Manager + externe Sicherung)

**Ohne sie kann kein künftiges Update mehr signiert werden.** Android erkennt eine neue APK
nur dann als Update einer bestehenden Installation, wenn sie mit demselben Schlüssel signiert
ist. Geht der Schlüssel verloren, bliebe nur: Tante muss die App komplett deinstallieren und
neu installieren — und verliert dabei alle lokalen Daten (Patienten, Touren, PIN), weil die
Verschlüsselung an die Installation gebunden ist.

## Verteilung ohne Play Store

Fertige APK als GitHub-Release hochladen (kostenlos, kein zusätzliches Hosting nötig,
unabhängig von der eigentlichen Web-App/GitHub-Pages-Seite):

```bash
gh release create android-v1.1 android/app/build/outputs/apk/release/app-release.apk \
  --title "FiaMed Pflege – Android-App v1.1" \
  --notes "Was ist neu: ..."
```

(Versionsnummer in `android/app/build.gradle` bei `versionCode`/`versionName` vorher
hochzählen — Android installiert eine APK mit gleichem oder niedrigerem `versionCode` nicht
als Update.)

Der Tante dann den Direktlink zur Datei schicken (z. B. per WhatsApp-Nachricht als Text-Link,
nicht als Dateianhang — manche Messenger blockieren APK-Anhänge direkt). Sie öffnet den Link
im Handy-Browser, tippt die heruntergeladene Datei an, erlaubt einmalig „Installation aus
dieser Quelle", fertig. Bei jedem weiteren Update reicht: neuen Link schicken, sie installiert
einfach darüber — ihre Daten bleiben erhalten.

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
