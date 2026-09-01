#!/bin/bash
# Build the low-resolution proxy atlases for the scroll film.
#
# Why: the sharp sets are 218 separate webp files (~15 MB desktop, ~6 MB
# mobile). Until they arrive the scrubber can only show the nearest frame it
# happens to have, so a fast scroll snaps between frames 16 apart and reads as
# choppy. Each atlas packs every frame of a set into ONE small sheet — a single
# ~1.4 MB request that gives complete, gap-free coverage in about a second. The
# sharp frames then stream in behind it and replace the proxy tile by tile.
#
# Run after scripts/build-film.sh (or any time the frame sets change).
# Usage: bash scripts/build-proxy-atlas.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/opt/homebrew/bin:$PATH"
command -v cwebp  >/dev/null || { echo "cwebp not found — brew install webp"; exit 1; }
command -v dwebp  >/dev/null || { echo "dwebp not found — brew install webp"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found — brew install ffmpeg"; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Tile size is a deliberate floor: big enough that a blurred upscale reads as
# "soft" rather than "broken", small enough that the whole film fits in one
# request. COLS is chosen so the sheet stays well inside webp's 16383px limit.
COLS=12
ATLAS_Q=45
# The proxy is only ever drawn upscaled ~5x behind the sharp frame, so its
# high-frequency detail is invisible but expensive. A sub-pixel blur before
# encoding strips exactly that and takes ~35% off the sheet for free.
ATLAS_BLUR=0.6

build() {
  local set=$1 tw=$2 th=$3
  local src="public/film/$set"
  local count
  count=$(ls "$src"/*.webp | wc -l | tr -d ' ')
  local rows=$(( (count + COLS - 1) / COLS ))

  echo "atlas $set: $count frames -> ${COLS}x${rows} grid of ${tw}x${th} tiles"

  rm -rf "$WORK/$set"; mkdir -p "$WORK/$set"
  local i=0
  for f in "$src"/*.webp; do
    i=$((i + 1))
    dwebp -quiet "$f" -o "$WORK/$set/full.png"
    ffmpeg -v error -y -i "$WORK/$set/full.png" \
      -vf "scale=${tw}:${th}:flags=lanczos" -pix_fmt rgb24 \
      "$WORK/$set/$(printf %03d $i).png"
    rm -f "$WORK/$set/full.png"
  done

  ffmpeg -v error -y -i "$WORK/$set/%03d.png" \
    -filter_complex "tile=${COLS}x${rows}:padding=0:color=black,gblur=sigma=${ATLAS_BLUR}" \
    -frames:v 1 -pix_fmt rgb24 "$WORK/$set-atlas.png"
  cwebp -quiet -q "$ATLAS_Q" -m 6 "$WORK/$set-atlas.png" -o "public/film/$set-atlas.webp"

  echo "  -> public/film/$set-atlas.webp  $(( $(stat -f%z "public/film/$set-atlas.webp") / 1024 ))K  ($(( tw * COLS ))x$(( th * rows ))px)"
}

# Desktop tiles stay 16:9, mobile tiles stay 9:16 — same aspect as their set.
build d 320 180
build m 180 320

echo
echo "Atlas grid is COLS=$COLS — keep FILM_ATLAS.cols in data/journey.ts in step."
