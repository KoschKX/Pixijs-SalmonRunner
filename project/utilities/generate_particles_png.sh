#!/bin/sh
# Shell script to generate foam and splash PNGs using Node.js
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../tools"
node generate_particles_png.js
