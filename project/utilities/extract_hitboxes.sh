#!/bin/bash

# Usage: ./extract_hitboxes.sh <pngPath> <frameWidth> <frameHeight>

if [ "$#" -ne 3 ]; then
	echo "Usage: $0 <pngPath> <frameWidth> <frameHeight>"
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="$SCRIPT_DIR/../assets/utilities/extract_hitboxes.js"

node "$NODE_SCRIPT" "$1" "$2" "$3"
