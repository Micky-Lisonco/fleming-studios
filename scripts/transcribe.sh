#!/usr/bin/env bash
#
# transcribe.sh — turn the interview audio into timed transcripts.
#
# This footage is an interview: the cameraman asks, Fien answers. The cut
# is therefore decided by what is said and exactly when, not by what looks
# good — so every clip needs a transcript with timecodes before a single
# edit is chosen.
#
# Output is one .srt per clip in out/transcripts/. They are plain text and
# a few KB each, so they travel anywhere.
#
# Usage:
#   ./scripts/transcribe.sh            # after make-proxies.sh
#   MODEL=large-v3 ./scripts/transcribe.sh
#
# Needs whisper. Either works:
#   pipx install openai-whisper        # or: pip install openai-whisper
#   brew install whisper-cpp
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUDIO_DIR="$ROOT/out/audio"
SRT_DIR="$ROOT/out/transcripts"

# Flemish. Forcing the language stops whisper guessing wrong on short or
# noisy clips, which it does often enough to matter.
LANG_CODE="${LANG_CODE:-nl}"
MODEL="${MODEL:-medium}"

if [ ! -d "$AUDIO_DIR" ]; then
  echo "No audio yet — run ./scripts/make-proxies.sh first." >&2
  exit 1
fi

mkdir -p "$SRT_DIR"

if command -v whisper >/dev/null 2>&1; then
  ENGINE=whisper
elif command -v whisper-cli >/dev/null 2>&1; then
  ENGINE=whisper-cpp
elif command -v whisper-cpp >/dev/null 2>&1; then
  ENGINE=whisper-cpp
else
  cat >&2 <<'MSG'
whisper not found. Install one of:

  pipx install openai-whisper      (or: pip install openai-whisper)
  brew install whisper-cpp

Then re-run. If you would rather not install anything, any transcription
service that exports .srt works too — drop the files in out/transcripts/
named to match the clips and everything downstream is the same.
MSG
  exit 1
fi

echo "Engine: $ENGINE   model: $MODEL   language: $LANG_CODE"
echo

for AUDIO in "$AUDIO_DIR"/*.mp3; do
  [ -e "$AUDIO" ] || { echo "No audio files found in $AUDIO_DIR" >&2; exit 1; }
  STEM="$(basename "${AUDIO%.*}")"

  if [ -s "$SRT_DIR/$STEM.srt" ]; then
    echo "$STEM — already done, skipping"
    continue
  fi

  echo "$STEM — transcribing"
  case "$ENGINE" in
    whisper)
      whisper "$AUDIO" --model "$MODEL" --language "$LANG_CODE" \
        --output_format srt --output_dir "$SRT_DIR" --verbose False
      ;;
    whisper-cpp)
      BIN="$(command -v whisper-cli || command -v whisper-cpp)"
      "$BIN" -f "$AUDIO" -l "$LANG_CODE" -osrt -of "$SRT_DIR/$STEM"
      ;;
  esac
done

echo
echo "Transcripts: $SRT_DIR"
echo
echo "Send out/transcripts/ and out/lookbook/ — text and small images."
echo "That is enough to pick the soundbites and build the edit."
