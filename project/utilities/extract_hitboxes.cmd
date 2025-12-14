@echo off
REM extract_hitboxes.cmd
REM Usage: extract_hitboxes.cmd <pngPath> <frameWidth> <frameHeight>

if "%~3"=="" (
    echo Usage: %~nx0 ^<pngPath^> ^<frameWidth^> ^<frameHeight^>
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "NODE_SCRIPT=%SCRIPT_DIR%extract_hitboxes.js"

node "%NODE_SCRIPT%" "%~1" "%~2" "%~3"
