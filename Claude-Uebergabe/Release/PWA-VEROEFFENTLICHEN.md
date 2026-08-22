# FiaMed Pflege online veröffentlichen

## Live-Adresse (seit 22.08.2026)

**https://henri-overrath.github.io/fiamed-pflege/**

Läuft über GitHub Pages, automatisch veröffentlicht bei jedem Push auf `main`
(`.github/workflows/deploy-pages.yml` deployt den Inhalt von `Claude-Uebergabe/Release/`).
Kein manuelles Hochladen nötig — im Unterschied zum früher dokumentierten Netlify-Drop-Weg,
bei dem ein vergessener manueller Schritt schon einmal zu einer veralteten, kaputten
Live-Version geführt hat.

**Voraussetzung dafür war, dass das Repository öffentlich ist** (GitHub Pages für private
Repos ist bei einem kostenlosen GitHub-Konto nicht enthalten). Deshalb wichtig: **niemals**
echte Patientendaten in den Code schreiben (siehe `CLAUDE.md`) — alles, was im Repo liegt,
ist jetzt für jeden mit dem Link einsehbar. Die App-*Daten* selbst bleiben davon unberührt:
die liegen ausschließlich lokal und verschlüsselt im Browser-Speicher der jeweiligen
Pflegekraft, nie im Repo.

## Alternative: Netlify Drop (manuell, falls GitHub Pages mal ausfällt)

1. Bei [Netlify Drop](https://app.netlify.com/drop) anmelden oder ein kostenloses Konto erstellen.
2. Den Ordner **Claude-Uebergabe/Release** in das Upload-Feld ziehen.
3. Nach wenigen Sekunden zeigt Netlify einen Link an.
4. Den Link auf Android oder iPhone in Chrome beziehungsweise Safari öffnen.
5. Im Browser-Menü **Zum Startbildschirm hinzufügen** wählen.

**Achtung:** Dieser Weg aktualisiert sich **nicht** automatisch — nach jeder Codeänderung
müsste der Ordner erneut von Hand hochgeladen werden. Nur als Rückfallebene gedacht.

## Wichtiger Hinweis zu Daten

Patienten-, Tour- und Materialdaten werden nur im Browser-Speicher des jeweiligen Geräts gesichert (seit August 2026 verschlüsselt hinter einer PIN). Sie werden nicht über den Link zwischen Geräten synchronisiert. Für ein neues Gerät bitte die Funktion **Daten exportieren** und anschließend **Daten importieren** verwenden.

## Beim ersten Öffnen

Die App fragt beim ersten Start nach einer PIN (4–8 Ziffern) und zeigt dabei einen
**Wiederherstellungscode** an — den unbedingt notieren und sicher aufbewahren. Es gibt keine
Mail-Zurücksetzung, weil bewusst kein Server im Spiel ist. Bei jedem weiteren Öffnen wird die
PIN abgefragt.
