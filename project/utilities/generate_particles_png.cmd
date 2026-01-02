@echo off
REM Windows batch script to generate foam, splash, and water circle PNGs using Node.js
pushd %~dp0
cd .
node generate_particles_png.js
node generate_water_circles_png.js
popd
