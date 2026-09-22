#!/usr/bin/env bash
#
# make-proxies.sh — turn heavy camera masters into light editing proxies.
#
# The masters never need to leave your machine. This makes a small stand-in
# for each clip that is good enough to cut against, plus a filmstrip and a
# manifest so the edit can be designed precisely before anything is uploaded.
#
# When the cut is locked, you flip one line in remotion/edit.ts and render
# against the masters locally at full quality.
#
# Usage:
#   ./scripts/make-proxies.sh /path/to/masters
#   QUALITY=low ./scripts/make-proxies.sh /path/to/masters   # if files land over 30 MB
#
# Requires ffmpeg. On a Mac: brew install ffmpeg
#
set -euo pipefail

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "usage: $0 /path/to/folder-of-masters" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROXY_DIR="$ROOT/public/media-proxy"
LOOK_DIR="$ROOT/out/lookbook"
AUDIO_DIR="$ROOT/out/audio"
SRT_DIR="$ROOT/out/transcripts"
MANIFEST="$LOOK_DIR/manifest.json"

mkdir -p "$PROXY_DIR" "$LOOK_DIR" "$AUDIO_DIR" "$SRT_DIR"

# QUALITY=low halves the bitrate if a clip lands over the 30 MB upload ceiling.
case "${QUALITY:-normal}" in
  low)  HEIGHT=480; VBR=500k;  MAXRATE=700k  ;;
  *)    HEIGHT=640; VBR=900k;  MAXRATE=1200k ;;
esac

echo "Proxying from: $SRC"
echo "Quality:       ${QUALITY:-normal} (${HEIGHT}p, ${VBR})"
echo

echo "[" > "$MANIFEST"
FIRST=1
COUNT=0
OVERSIZE=0

# Sorted so numbering is stable between runs.
find "$SRC" -maxdepth 1 -type f \
  \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' -o -iname '*.mxf' -o -iname '*.avi' -o -iname '*.mkv' \) \
  | sort | while IFS= read -r FILE; do

  COUNT=$((COUNT + 1))
  BASE="$(basename "$FILE")"
  STEM="$(printf '%02d' "$COUNT")-$(echo "${BASE%.*}" | tr ' ' '-' | tr -cd '[:alnum:]-_' | cut -c1-40)"

  # ── probe the master ──────────────────────────────────────────────
  PROBE=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,r_frame_rate \
    -show_entries format=duration,size \
    -of default=noprint_wrappers=1:nokey=0 "$FILE")

  W=$(echo "$PROBE"    | sed -n 's/^width=//p')
  H=$(echo "$PROBE"    | sed -n 's/^height=//p')
  RFR=$(echo "$PROBE"  | sed -n 's/^r_frame_rate=//p')
  DUR=$(echo "$PROBE"  | sed -n 's/^duration=//p')
  SIZE=$(echo "$PROBE" | sed -n 's/^size=//p')
  FPS=$(awk -F'/' '{ if ($2 > 0) printf "%.3f", $1/$2; else print 0 }' <<< "$RFR")

  printf '%s  %sx%s  %ss  %.1f MB\n' "$STEM" "$W" "$H" "${DUR%%.*}" "$(bc -l <<< "$SIZE/1048576")"

  # ── the proxy ─────────────────────────────────────────────────────
  # Same framing and duration as the master, just small. Cutting against
  # this gives frame numbers that map straight onto the full-res file.
  ffmpeg -nostdin -y -loglevel error -i "$FILE" \
    -vf "scale=-2:${HEIGHT}" \
    -c:v libx264 -preset veryfast -b:v "$VBR" -maxrate "$MAXRATE" -bufsize 2M \
    -pix_fmt yuv420p -movflags +faststart \
    -c:a aac -b:a 64k -ac 1 \
    "$PROXY_DIR/$STEM.mp4"

  PSIZE=$(wc -c < "$PROXY_DIR/$STEM.mp4")
  PMB=$(bc -l <<< "scale=1; $PSIZE/1048576")
  if [ "$PSIZE" -gt 31457280 ]; then
    echo "    ⚠  proxy is ${PMB} MB — over the 30 MB ceiling. Re-run with QUALITY=low"
    OVERSIZE=$((OVERSIZE + 1))
  fi

  # ── audio: needed because this is interview footage ──────────────
  # The edit is driven by what Fien says, not by pretty pictures, so the
  # words have to be readable before a single cut is chosen. Mono 64k is
  # plenty for transcription and keeps the files tiny.
  ffmpeg -nostdin -y -loglevel error -i "$FILE" \
    -vn -c:a libmp3lame -b:a 64k -ac 1 -ar 16000 \
    "$AUDIO_DIR/$STEM.mp3" 2>/dev/null || true

  # ── filmstrip: six frames across the clip, one small jpeg ─────────
  ffmpeg -nostdin -y -loglevel error -i "$FILE" \
    -vf "select='not(mod(n\,floor(n_frames/6)))',scale=-2:240,tile=6x1" \
    -frames:v 1 -q:v 4 "$LOOK_DIR/$STEM.jpg" 2>/dev/null || true

  # ── manifest row ──────────────────────────────────────────────────
  [ $FIRST -eq 0 ] && echo "," >> "$MANIFEST"
  FIRST=0
  cat >> "$MANIFEST" <<JSON
  {"id": "$STEM", "master": "$BASE", "proxy": "media-proxy/$STEM.mp4",
   "width": $W, "height": $H, "fps": $FPS, "duration": ${DUR:-0}, "masterBytes": ${SIZE:-0}}
JSON
done

echo "]" >> "$MANIFEST"

echo
echo "Proxies:     $PROXY_DIR"
echo "Filmstrips:  $LOOK_DIR"
echo "Audio:       $AUDIO_DIR"
echo "Manifest:    $MANIFEST"
echo
echo "─────────────────────────────────────────────────────────────"
echo "NEXT: transcribe. This is interview footage, so the words decide"
echo "the cut — filmstrips alone cannot show what Fien actually says."
echo
echo "  ./scripts/transcribe.sh"
echo
echo "Then send out/transcripts/ and out/lookbook/ — both are text and"
echo "small images, a few MB in total. That is everything needed to"
echo "choose the soundbites and build the edit."
echo "─────────────────────────────────────────────────────────────"
