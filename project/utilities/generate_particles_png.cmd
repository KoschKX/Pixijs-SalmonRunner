@echo off
REM Windows batch script to generate foam and splash PNGs using Node.js
pushd %~dp0
cd ../tools
node generate_particles_png.js
popd
