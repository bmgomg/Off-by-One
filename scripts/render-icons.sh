#!/bin/sh
# Renders the app icons from icon.html to PNG, and the SVG favicon, with headless Edge (or Chrome): sh scripts/render-icons.sh
# Rounded on transparency (favicon, PWA "any"), full bleed for iOS, maskable inside the 80% safe zone.
# (bump the ?v= on their links in src/app.html and static/manifest.json after a change, past browser caches)
cd "$(dirname "$0")"
BROWSER="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -f "$BROWSER" ] || BROWSER="/c/Program Files/Google/Chrome/Application/chrome.exe"
DIR="$(pwd -W)"
URL="file:///$(echo "$DIR" | sed 's/ /%20/g')"
STATIC="$DIR/../static"

render() { # page width height output [more browser flags]
	"$BROWSER" --headless=new --disable-gpu --disable-lcd-text --hide-scrollbars --force-device-scale-factor=1 \
		--allow-file-access-from-files --virtual-time-budget=3000 $5 \
		--window-size="$2,$3" --screenshot="$4" "$URL/$1" 2>/dev/null
}

mkdir -p "$STATIC/icons"
CLEAR=--default-background-color=00000000
render "icon.html#any-32" 32 32 "$STATIC/favicon.png" $CLEAR
render "icon.html#any-192" 192 192 "$STATIC/icons/icon-192.png" $CLEAR
render "icon.html#any-512" 512 512 "$STATIC/icons/icon-512.png" $CLEAR
render "icon.html#apple-180" 180 180 "$STATIC/icons/apple-touch-icon.png"
render "icon.html#maskable-192" 192 192 "$STATIC/icons/maskable-192.png"
render "icon.html#maskable-512" 512 512 "$STATIC/icons/maskable-512.png"

# the SVG favicon: icon.html#svg writes its source into the page; Edge's --dump-dom prints nothing while Edge is open, so Chrome first
DUMPER="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -f "$DUMPER" ] || DUMPER="$BROWSER"
"$DUMPER" --headless=new --disable-gpu --virtual-time-budget=2000 --dump-dom "$URL/icon.html#svg" 2>/dev/null |
	node -e "let s = ''; process.stdin.on('data', (d) => (s += d)).on('end', () => {
		const m = s.match(/<pre id=\"source\">([\s\S]*?)<\/pre>/);
		const svg = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '\"').replace(/&amp;/g, '&');
		process.stdout.write(svg.replace(/ width=\"512\" height=\"512\"/, '') + '\n');
	});" > "$STATIC/favicon.svg"
