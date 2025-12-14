#!/bin/bash
# generate_all_hitboxes.sh
# Find all *_hbox.png files in the assets directory and generate *_hbox.json if missing

ASSETS_DIR="$(dirname "$0")/../assets"
SCRIPT_DIR="$(dirname "$0")"
EXTRACT_SCRIPT="$SCRIPT_DIR/extract_hitboxes.js"

# For each _hbox.png, use the image height as both frameWidth and frameHeight (using Node.js)
find "$ASSETS_DIR" -type f -name '*_hbox.png' | while read -r PNG; do
  HEIGHT=$(node -e "console.log(require('pngjs').PNG.sync.read(require('fs').readFileSync('$PNG')).height)")
  if [ -z "$HEIGHT" ]; then
    echo "Could not determine height for $PNG. Skipping."
    continue
  fi
  JSON="${PNG%.png}.json"
  echo "Overwriting $(basename "$JSON") with new hitbox data from $(basename "$PNG") using frameWidth=$HEIGHT, frameHeight=$HEIGHT..."
  node "$EXTRACT_SCRIPT" "$PNG" $HEIGHT $HEIGHT
done
echo "All hitbox JSONs have been overwritten with new data."
