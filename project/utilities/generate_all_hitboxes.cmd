@echo off
REM generate_all_hitboxes.cmd
REM Find all *_hbox.png files in the assets directory and generate *_hbox.json if missing

setlocal enabledelayedexpansion
set "ASSETS_DIR=%~dp0..\assets"
set "SCRIPT_DIR=%~dp0"
set "EXTRACT_SCRIPT=%SCRIPT_DIR%extract_hitboxes.js"

for /r "%ASSETS_DIR%" %%F in (*_hbox.png) do (
    set "JSON=%%~dpnF.json"
    echo Processing %%F ...
    node "%EXTRACT_SCRIPT%" "%%F"
)
echo All hitbox JSONs have been processed.
endlocal
