#!/bin/sh
# Renders the itch.io stills with headless Edge (or Chrome), as Dark Matter's: sh scripts/render-cover.sh [output folder]
# (the cover, 630 × 500, the Embed BG, 640 × 360, the social media image, 1200 × 630, the page's background tile,
# 1024 × 1024, and the rules graphic, 450 × 400 at twice that; the cover, Embed BG and Wide Cover GIFs are
# render-cover-gif.mjs's)
cd "$(dirname "$0")"
BROWSER="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -f "$BROWSER" ] || BROWSER="/c/Program Files/Google/Chrome/Application/chrome.exe"
DIR="$(pwd -W)"
URL="file:///$(echo "$DIR" | sed 's/ /%20/g')"
OUT="${1:-$DIR/../itch}"

render() { # page width height output [scale]
	"$BROWSER" --headless=new --disable-gpu --disable-lcd-text --hide-scrollbars --force-device-scale-factor="${5:-1}" \
		--allow-file-access-from-files --virtual-time-budget=3000 \
		--window-size="$2,$3" --screenshot="$OUT/$4" "$URL/$1" 2>/dev/null
}

mkdir -p "$OUT"
render cover.html 630 500 cover.png
render "cover.html#embed" 640 360 embed-bg.png
render "cover.html#social" 1200 630 social.png
render tile.html 1024 1024 tile.png
render rules-2.html 450 400 rules-2.png 2
