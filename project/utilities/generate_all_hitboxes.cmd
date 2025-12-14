@echo off
REM generate_all_hitboxes.cmd
REM Find all *_hbox.png files in the assets directory and generate *_hbox.json if missing

setlocal enabledelayedexpansion
set "ASSETS_DIR=%~dp0..\assets"
set "SCRIPT_DIR=%~dp0"
set "EXTRACT_SCRIPT=%SCRIPT_DIR%extract_hitboxes.js"

for /r "%ASSETS_DIR%" %%F in (*_hbox.png) do (
    for /f "delims=" %%H in ('node -e "console.log(require('pngjs').PNG.sync.read(require('fs').readFileSync('%%F')).height)"') do set HEIGHT=%%H
    if not defined HEIGHT (
        echo Could not determine height for %%F. Skipping.
        goto :continue
    )
    set "JSON=%%~dpnF.json"
    echo Overwriting %%~nxF with new hitbox data from %%~nxF using frameWidth=!HEIGHT!, frameHeight=!HEIGHT!...
    node "%EXTRACT_SCRIPT%" "%%F" !HEIGHT! !HEIGHT!
    :continue
)
echo All hitbox JSONs have been overwritten with new data.
endlocal
