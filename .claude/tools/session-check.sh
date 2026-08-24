#!/bin/bash
# session-check.sh — Arbeitszeit-Begrenzung für Claude Code.
#
# Läuft als UserPromptSubmit-Hook bei jeder Eingabe und zählt die tatsächlich
# aktive Zeit pro Tag zusammen. Ist das Tageslimit erreicht, werden weitere
# Eingaben abgelehnt.
#
# Aktive Zeit heißt: Der Abstand zwischen zwei Eingaben wird nur dann voll
# gezählt, wenn er unter der Pausenschwelle liegt. Längere Pausen (Mittagessen,
# Schule, Rechner nur offen gelassen) zählen pauschal nur die Eingabe selbst.
#
# Der Zählerstand liegt außerhalb des Projektordners, damit er von einem
# git-Befehl nicht versehentlich zurückgesetzt oder mitversioniert wird.

set -u

STATE_FILE="${HOME}/.claude/.session-state"
IDLE_GAP=600          # ab 10 Minuten Abstand gilt es als Pause
PROMPT_COST=60        # Pauschale je Eingabe nach einer Pause
LIMIT_WEEKDAY=5400    # Mo–Fr: 1,5 Stunden
LIMIT_WEEKEND=9000    # Sa+So: 2,5 Stunden
WARN_EARLY=1800       # erste Erinnerung bei 30 Minuten Rest
WARN_LATE=600         # zweite Erinnerung bei 10 Minuten Rest

now=$(date +%s)
today=$(date +%Y-%m-%d)
weekday=$(date +%u)   # 1 = Montag ... 7 = Sonntag

if [ "$weekday" -ge 6 ]; then
  limit=$LIMIT_WEEKEND
else
  limit=$LIMIT_WEEKDAY
fi

saved_date=""
used=0
last=0
if [ -f "$STATE_FILE" ]; then
  IFS='|' read -r saved_date used last < "$STATE_FILE" 2>/dev/null || true
  case "$used" in ''|*[!0-9]*) used=0 ;; esac
  case "$last" in ''|*[!0-9]*) last=0 ;; esac
fi

# Neuer Tag: Zähler beginnt wieder bei null.
if [ "$saved_date" != "$today" ]; then
  used=0
  last=0
fi

if [ "$last" -gt 0 ]; then
  delta=$((now - last))
  if [ "$delta" -lt 0 ]; then
    delta=0                       # Uhr wurde zurückgestellt
  fi
  if [ "$delta" -le "$IDLE_GAP" ]; then
    used=$((used + delta))
  else
    used=$((used + PROMPT_COST))
  fi
fi

mkdir -p "$(dirname "$STATE_FILE")"
printf '%s|%s|%s\n' "$today" "$used" "$now" > "$STATE_FILE"

remaining=$((limit - used))
limit_minutes=$((limit / 60))

if [ "$remaining" -le 0 ]; then
  # Blockiert die Eingabe. Claude bekommt sie gar nicht erst zu sehen,
  # kann also auch nicht überredet werden, eine Ausnahme zu machen.
  printf '{"continue":false,"stopReason":"Feierabend fuer heute. Du hast deine %s Minuten Programmierzeit aufgebraucht. Morgen geht es weiter - dein Projekt bleibt genau so, wie du es verlassen hast. Wenn du wirklich noch etwas brauchst, frag Papa."}\n' "$limit_minutes"
  exit 0
fi

remaining_minutes=$(( (remaining + 59) / 60 ))

if [ "$remaining" -le "$WARN_LATE" ]; then
  printf '{"systemMessage":"Noch etwa %s Minuten fuer heute - such dir am besten einen guten Punkt zum Aufhoeren."}\n' "$remaining_minutes"
elif [ "$remaining" -le "$WARN_EARLY" ]; then
  printf '{"systemMessage":"Noch etwa %s Minuten Programmierzeit fuer heute."}\n' "$remaining_minutes"
fi

exit 0
