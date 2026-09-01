#!/bin/bash
# Build the scroll-film frame sequences from the source clips.
#
# For each clip it prefers video/vd_N_up.mp4 (upscaled 1080p) when present and
# falls back to video/vd_N.mp4 (720p). All clips are normalised to a common
# 1920x1080 canvas before the trim + transition concat, so 720p and 1080p
# sources can be mixed while you upscale them one at a time.
#
# Usage: bash scripts/build-film.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VID=video
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# Frame/encoding settings. Bump DES_W/MOB_W once every clip is 1080p.
FPS=10
DES_W=1600; DES_H=900      # desktop landscape frame size
MOB_W=630;  MOB_H=1120     # mobile 9:16 portrait frame size
DES_Q=72; MOB_Q=64

# Using the normal 720p clips. (An external upscale of vd_1 added artifacts, and
# the framed-window layout keeps 720p sharp without upscaling.)
# Clip 4 is new_vd.mp4 — regenerated from vd_3's end frame, so it continues the
# same temple straight into the deity darshan. It replaces the old vd_4 AND vd_5
# (both were a different-looking temple), so the flight is now 4 clips.
srcmap() { case "$1" in 1) echo "$VID/vd_1.mp4";; 2) echo "$VID/vd_2.mp4";; 3) echo "$VID/vd_3.mp4";; 4) echo "$VID/new_vd.mp4";; esac; }

echo "Sources:"
for i in 1 2 3 4; do echo "  clip $i -> $(srcmap $i)"; done

# Normalise each clip to 1920x1080 so xfade (which needs matching sizes) works.
norm() { ffmpeg -v error -y -i "$(srcmap $1)" -vf "scale=1920:1080:flags=lanczos,setsar=1" -an "$WORK/n$1.mp4"; }
for i in 1 2 3 4; do norm "$i"; done

# Cut + transitions. vd_1->vd_2 daylight fade; vd_2->vd_3 fadeblack (threshold
# into the interior); vd_3->new_vd a short dissolve — they share the same frame
# so the camera flows straight from the hall into the sanctum with no dark dip.
ffmpeg -v error -y \
  -i "$WORK/n1.mp4" -i "$WORK/n2.mp4" -i "$WORK/n3.mp4" -i "$WORK/n4.mp4" \
  -filter_complex "
  [0:v]trim=0:6.0,setpts=PTS-STARTPTS[v0];
  [1:v]trim=2.0:5.0,setpts=PTS-STARTPTS[v1];
  [2:v]trim=0:6.5,setpts=PTS-STARTPTS[v2];
  [3:v]trim=0:10.0,setpts=PTS-STARTPTS[v3];
  [v0][v1]xfade=transition=fade:duration=0.45:offset=5.55[x1];
  [x1][v2]xfade=transition=fadeblack:duration=0.45:offset=8.10[x2];
  [x2][v3]xfade=transition=fade:duration=0.30:offset=14.30,format=yuv420p[out]" \
  -map "[out]" -an -c:v libx264 -crf 18 -preset slow "$WORK/master.mp4"

DUR=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$WORK/master.mp4")
echo "master: ${DUR}s"

# Extract + encode frames
rm -rf "$WORK/d" "$WORK/m"; mkdir -p "$WORK/d" "$WORK/m" public/film/d public/film/m
ffmpeg -v error -y -i "$WORK/master.mp4" -vf "fps=$FPS,scale=$DES_W:$DES_H:flags=lanczos,unsharp=5:5:0.6" "$WORK/d/%03d.png"
ffmpeg -v error -y -i "$WORK/master.mp4" -vf "fps=$FPS,crop=in_h*9/16:in_h,scale=$MOB_W:$MOB_H:flags=lanczos,unsharp=5:5:0.6" "$WORK/m/%03d.png"

rm -f public/film/d/*.webp public/film/m/*.webp
for f in "$WORK"/d/*.png; do cwebp -quiet -q $DES_Q "$f" -o "public/film/d/$(basename "${f%.png}").webp"; done
for f in "$WORK"/m/*.png; do cwebp -quiet -q $MOB_Q "$f" -o "public/film/m/$(basename "${f%.png}").webp"; done

# mp4 render + poster
ffmpeg -v error -y -i "$WORK/master.mp4" -c:v libx264 -crf 23 -preset slow -movflags +faststart -an public/film/film.mp4
ffmpeg -v error -y -i "$WORK/master.mp4" -vframes 1 -q:v 3 public/film/poster.jpg

N=$(ls public/film/d | wc -l | tr -d ' ')
echo "frames: $N  |  desktop $(du -sh public/film/d | cut -f1)  mobile $(du -sh public/film/m | cut -f1)"
echo "If frame count changed, update FILM_FRAME_COUNT in data/journey.ts (currently expects it)."
