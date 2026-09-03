#!/bin/bash
# Build the scroll-film videos from the source clips.
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

# Encoding settings. Bump DES_W/MOB_W once every clip is 1080p.
DES_W=1600; DES_H=900      # desktop landscape size
MOB_W=630;  MOB_H=1120     # mobile 9:16 portrait size

# The flight is 3 clips: vd_1 (real temple exterior) -> new_vd_2 (pillared hall
# approaching the sanctum) -> new_vd_3 (deity darshan closeup).
srcmap() { case "$1" in 1) echo "$VID/vd_1.mp4";; 2) echo "$VID/new_vd_2.mp4";; 3) echo "$VID/new_vd_3.mp4";; esac; }

echo "Sources:"
for i in 1 2 3; do echo "  clip $i -> $(srcmap $i)"; done

# Normalise each clip to 1920x1080 so xfade (which needs matching sizes) works.
norm() { ffmpeg -v error -y -i "$(srcmap $1)" -vf "scale=1920:1080:flags=lanczos,setsar=1" -an "$WORK/n$1.mp4"; }
for i in 1 2 3; do norm "$i"; done

# Probe each clip's real duration so the xfade offsets self-tune to the mapped
# clips — full clip lengths are used, no hand-edited trim/offset numbers.
dur() { ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$1"; }
D1=$(dur "$WORK/n1.mp4"); D2=$(dur "$WORK/n2.mp4"); D3=$(dur "$WORK/n3.mp4")
XF1=0.45; XF2=0.30   # transition durations (clip1->2 fadeblack, clip2->3 fade)
# Each xfade starts XF before the running timeline ends so it finishes exactly at
# the outgoing clip's tail. OFF1 = D1-XF1; OFF2 = (D1+D2-XF1)-XF2.
OFF1=$(awk "BEGIN{printf \"%.3f\", $D1-$XF1}")
OFF2=$(awk "BEGIN{printf \"%.3f\", $D1+$D2-$XF1-$XF2}")
echo "durations: $D1 / $D2 / $D3  offsets: $OFF1 / $OFF2"

# Cut + transitions. clip1->clip2 fadeblack (doorway dip -> stepping inside);
# clip2->clip3 a short dissolve into the deity.
ffmpeg -v error -y \
  -i "$WORK/n1.mp4" -i "$WORK/n2.mp4" -i "$WORK/n3.mp4" \
  -filter_complex "
  [0:v]trim=0:$D1,setpts=PTS-STARTPTS[v0];
  [1:v]trim=0:$D2,setpts=PTS-STARTPTS[v1];
  [2:v]trim=0:$D3,setpts=PTS-STARTPTS[v2];
  [v0][v1]xfade=transition=fadeblack:duration=$XF1:offset=$OFF1[x1];
  [x1][v2]xfade=transition=fade:duration=$XF2:offset=$OFF2,format=yuv420p[out]" \
  -map "[out]" -an -c:v libx264 -crf 18 -preset slow "$WORK/master.mp4"

DUR=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$WORK/master.mp4")
echo "master: ${DUR}s"

# Scrub-optimised encodes. Dense keyframes (-g 8) and no B-frames (-bf 0) so a
# scroll seek decodes at most a handful of frames past the nearest keyframe —
# that decode cost is what makes or breaks video scrubbing.
ffmpeg -v error -y -i "$WORK/master.mp4" \
  -vf "scale=$DES_W:$DES_H:flags=lanczos,setsar=1,format=yuv420p" \
  -an -c:v libx264 -crf 23 -preset slow -g 8 -bf 0 -movflags +faststart \
  public/film/d-scrub.mp4
ffmpeg -v error -y -i "$WORK/master.mp4" \
  -vf "crop=in_h*9/16:in_h,scale=$MOB_W:$MOB_H:flags=lanczos,setsar=1,format=yuv420p" \
  -an -c:v libx264 -crf 23 -preset slow -g 8 -bf 0 -movflags +faststart \
  public/film/m-scrub.mp4

# Playback-quality render + poster
ffmpeg -v error -y -i "$WORK/master.mp4" -c:v libx264 -crf 23 -preset slow -movflags +faststart -an public/film/film.mp4
ffmpeg -v error -y -i "$WORK/master.mp4" -vframes 1 -q:v 3 public/film/poster.jpg

echo "desktop $(du -sh public/film/d-scrub.mp4 | cut -f1)  mobile $(du -sh public/film/m-scrub.mp4 | cut -f1)"
