#!/usr/bin/env bash
#
# analyse-footage.sh — read the masters where they sit and write a report.
#
# Nothing is copied, nothing is uploaded, nothing is transcoded. It reads
# the files on whatever drive they live on and writes a few hundred KB of
# text describing them: codec, resolution, frame rate, colour handling,
# rotation, exposure and audio loudness — everything needed to decide how
# the footage should be treated, without the footage going anywhere.
#
# Usage:
#   ./scripts/analyse-footage.sh /Volumes/YourDrive/oxygen-shoot
#   SAMPLE=120 ./scripts/analyse-footage.sh /Volumes/...   # longer sample
#
# Needs ffmpeg (which brings ffprobe). On a Mac: brew install ffmpeg
#
set -euo pipefail

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "usage: $0 /path/to/footage   (an external drive path is fine)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out/analysis"
REPORT="$OUT/report.txt"
JSON="$OUT/footage.json"

# Seconds sampled per clip for the picture and loudness statistics. The
# metadata below is read from the container and is always for the whole
# file; only the measured stats use the sample.
SAMPLE="${SAMPLE:-60}"

mkdir -p "$OUT"
: > "$REPORT"
echo "[" > "$JSON"

FIRST=1
N=0

exec 3>&1
{
  echo "FOOTAGE ANALYSIS"
  echo "Source:  $SRC"
  echo "Sampled: ${SAMPLE}s per clip for measured statistics"
  echo "Date:    $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo
} >> "$REPORT"

while IFS= read -r FILE; do
  N=$((N + 1))
  BASE="$(basename "$FILE")"
  echo "[$N] $BASE" >&3

  # ── container and stream metadata: instant, whole-file, exact ──
  META=$(ffprobe -v error -print_format json -show_format -show_streams "$FILE")

  read -r V_CODEC W H FPS DUR BITRATE PIXFMT PRIMARIES TRANSFER SPACE ROTATION A_CODEC A_CH A_RATE <<EOF
$(printf '%s' "$META" | python3 -c '
import json, sys
m = json.load(sys.stdin)
v = next((s for s in m["streams"] if s["codec_type"] == "video"), {})
a = next((s for s in m["streams"] if s["codec_type"] == "audio"), {})
fr = v.get("r_frame_rate", "0/1")
try:
    num, den = fr.split("/"); fps = round(int(num)/int(den), 3) if int(den) else 0
except Exception:
    fps = 0
rot = 0
for sd in v.get("side_data_list", []) or []:
    if "rotation" in sd:
        rot = sd["rotation"]
fields = [
    v.get("codec_name", "?"), v.get("width", 0), v.get("height", 0), fps,
    m.get("format", {}).get("duration", "0"),
    m.get("format", {}).get("bit_rate", "0"),
    v.get("pix_fmt", "?"), v.get("color_primaries", "unset"),
    v.get("color_transfer", "unset"), v.get("color_space", "unset"), rot,
    a.get("codec_name", "none"), a.get("channels", 0), a.get("sample_rate", "0"),
]
print(" ".join(str(f) for f in fields))
')
EOF

  MB=$(python3 -c "import os;print(f'{os.path.getsize(\"$FILE\")/1048576:.0f}')")

  # ── measured: audio loudness, so the interview can be levelled ──
  LOUD=$(ffmpeg -nostdin -hide_banner -t "$SAMPLE" -i "$FILE" \
          -af loudnorm=print_format=json -f null - 2>&1 \
          | awk '/^\{/,/^\}/' | tail -20 || true)
  LUFS=$(printf '%s' "$LOUD" | sed -n 's/.*"input_i"[^"]*"\([^"]*\)".*/\1/p' | head -1)
  LRA=$(printf '%s'  "$LOUD" | sed -n 's/.*"input_lra"[^"]*"\([^"]*\)".*/\1/p' | head -1)
  PEAK=$(printf '%s' "$LOUD" | sed -n 's/.*"input_tp"[^"]*"\([^"]*\)".*/\1/p' | head -1)

  # ── measured: picture, to spot flat/log or crushed footage ──
  STATS=$(ffmpeg -nostdin -hide_banner -t "$SAMPLE" -i "$FILE" \
           -vf "signalstats,metadata=print:file=-" -f null - 2>/dev/null \
           | awk -F= '
             /YAVG/ {y+=$2; yn++}
             /SATAVG/ {s+=$2; sn++}
             /YMIN/ {if(min==""||$2<min) min=$2}
             /YMAX/ {if(max==""||$2>max) max=$2}
             END {printf "%.1f %.1f %s %s", (yn?y/yn:0), (sn?s/sn:0), (min==""?"?":min), (max==""?"?":max)}' || true)
  Y_AVG=$(echo "$STATS"  | cut -d' ' -f1)
  SAT_AVG=$(echo "$STATS" | cut -d' ' -f2)
  Y_MIN=$(echo "$STATS"  | cut -d' ' -f3)
  Y_MAX=$(echo "$STATS"  | cut -d' ' -f4)

  # ── the notes that actually decide how we treat the clip ──
  NOTES=""
  case "$TRANSFER" in
    arib-std-b67|smpte2084) NOTES="$NOTES HDR ($TRANSFER) — needs a tone-map to Rec.709 or it renders washed out and dull;" ;;
  esac
  case "$PIXFMT" in
    *10le|*10be) NOTES="$NOTES 10-bit — fine, but the delivery is 8-bit yuv420p;" ;;
  esac
  [ "${ROTATION:-0}" != "0" ] && NOTES="$NOTES rotation ${ROTATION}° in metadata — check orientation before cropping;"
  awk -v y="$Y_AVG" 'BEGIN{ if (y+0 > 0 && y+0 < 70) exit 0; exit 1 }' && NOTES="$NOTES low average luma ($Y_AVG) — underexposed or log, will need a lift;"
  awk -v s="$SAT_AVG" 'BEGIN{ if (s+0 > 0 && s+0 < 45) exit 0; exit 1 }' && NOTES="$NOTES low saturation ($SAT_AVG) — looks like a flat/log profile awaiting a LUT;"
  awk -v l="$LUFS" 'BEGIN{ if (l != "" && l+0 < -26) exit 0; exit 1 }' && NOTES="$NOTES quiet dialogue (${LUFS} LUFS) — needs bringing up to about -14 for social;"
  awk -v p="$PEAK" 'BEGIN{ if (p != "" && p+0 > -1) exit 0; exit 1 }' && NOTES="$NOTES peaks at ${PEAK} dBTP — risk of clipping;"
  [ "$A_CODEC" = "none" ] && NOTES="$NOTES NO AUDIO — cannot carry a soundbite;"
  [ -z "$NOTES" ] && NOTES=" nothing flagged."

  {
    printf '%s\n' "── [$N] $BASE"
    printf '   video    %s %sx%s @ %s fps, %s, %s\n' "$V_CODEC" "$W" "$H" "$FPS" "$PIXFMT" "$(python3 -c "print(f'{int($BITRATE)/1e6:.1f} Mb/s' if '$BITRATE'.isdigit() else '? Mb/s')")"
    printf '   colour   primaries=%s transfer=%s space=%s\n' "$PRIMARIES" "$TRANSFER" "$SPACE"
    printf '   length   %ss, %s MB\n' "$(printf '%.0f' "$DUR" 2>/dev/null || echo '?')" "$MB"
    printf '   audio    %s, %s ch @ %s Hz — %s LUFS, range %s LU, peak %s dBTP\n' "$A_CODEC" "$A_CH" "$A_RATE" "${LUFS:-?}" "${LRA:-?}" "${PEAK:-?}"
    printf '   picture  luma avg %s (min %s, max %s), saturation avg %s\n' "$Y_AVG" "$Y_MIN" "$Y_MAX" "$SAT_AVG"
    printf '   notes   %s\n\n' "$NOTES"
  } >> "$REPORT"

  [ $FIRST -eq 0 ] && echo "," >> "$JSON"
  FIRST=0
  cat >> "$JSON" <<JSONROW
  {"n": $N, "file": "$BASE", "codec": "$V_CODEC", "width": $W, "height": $H,
   "fps": $FPS, "durationSec": ${DUR:-0}, "bitrate": ${BITRATE:-0}, "pixFmt": "$PIXFMT",
   "colorPrimaries": "$PRIMARIES", "colorTransfer": "$TRANSFER", "colorSpace": "$SPACE",
   "rotation": ${ROTATION:-0}, "audioCodec": "$A_CODEC", "audioChannels": ${A_CH:-0},
   "lufs": "${LUFS:-}", "lra": "${LRA:-}", "truePeak": "${PEAK:-}",
   "lumaAvg": "${Y_AVG:-}", "satAvg": "${SAT_AVG:-}", "notes": "$(printf '%s' "$NOTES" | sed 's/"/\\"/g')"}
JSONROW

done < <(find "$SRC" -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' -o -iname '*.mxf' -o -iname '*.avi' -o -iname '*.mkv' -o -iname '*.braw' -o -iname '*.insv' \) | sort)

echo "]" >> "$JSON"

{
  echo
  echo "── $N clips analysed ──"
} >> "$REPORT"

echo
echo "Report: $REPORT"
echo "JSON:   $JSON"
echo
echo "Both are plain text and small. Send them and I can tell you exactly"
echo "how the footage should be treated — nothing else needs to move."
