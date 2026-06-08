@echo off
setlocal EnableDelayedExpansion

:: =================================================
:: EKMS API Test Automation - FULL SUITE
:: =================================================

echo ==================================================
echo   EKMS API Test Automation - FULL SUITE
echo ==================================================
echo Running all tests, generating PDF, and sending emails...

:: Resolve the directory of this script
set "PROJECT_ROOT=%~dp0"

:: ------------------------------------------------
:: Load environment variables from .env
:: ------------------------------------------------
powershell -NoProfile -Command "Get-Content \"%PROJECT_ROOT%.env\" | ForEach-Object { if ($_ -match '^\s*([^#][^=]+)=([^#]*)') { $key=$matches[1].Trim(); $val=$matches[2].Trim(); Set-Item -Path Env:\$key -Value $val } }"
if errorlevel 1 (
    echo [ERROR] Failed to load environment variables from .env
) else (
    echo [INFO] Environment variables loaded successfully
)

:: ------------------------------------------------
:: Clear previous Token + Response columns in Excel
:: so each run starts with a clean sheet
:: ------------------------------------------------
echo [INFO] Clearing previous Token and Response columns in Excel...
call npx ts-node "%PROJECT_ROOT%utils\clear_excel.ts"
if errorlevel 1 (
    echo [WARN] Could not clear Excel columns - continuing anyway
) else (
    echo [INFO] Excel columns cleared successfully
)

:: ------------------------------------------------
:: Clear previous Allure results and reports (optimized background cleanup)
:: ------------------------------------------------
echo [INFO] Clearing previous Allure results and reports...
if exist "%PROJECT_ROOT%allure-results" (
    set "TEMP_DIR=allure-results-old-!RANDOM!"
    rename "%PROJECT_ROOT%allure-results" "!TEMP_DIR!"
    start /b cmd /c "rmdir /s /q "%PROJECT_ROOT%!TEMP_DIR!"" >nul 2>&1
)
if exist "%PROJECT_ROOT%allure-report" (
    set "TEMP_DIR=allure-report-old-!RANDOM!"
    rename "%PROJECT_ROOT%allure-report" "!TEMP_DIR!"
    start /b cmd /c "rmdir /s /q "%PROJECT_ROOT%!TEMP_DIR!"" >nul 2>&1
)


:: ------------------------------------------------
:: Fetch a fresh OAuth2 token
:: ------------------------------------------------
echo [INFO] Fetching fresh token...
node "%PROJECT_ROOT%scripts\fetch_token.js"
if errorlevel 1 (
    echo [ERROR] Token fetch failed
    rem exit /b %ERRORLEVEL%
) else (
    echo [INFO] Token fetched successfully
)

:: ------------------------------------------------
:: Read the raw token from token.tmp and export as
:: TOKEN env var so ALL Playwright workers inherit it
:: and skip their own getAccessToken() call
:: ------------------------------------------------
if exist "%PROJECT_ROOT%token.tmp" (
    set /p TOKEN=<"%PROJECT_ROOT%token.tmp"
    set "TOKEN=!TOKEN!"
    echo [INFO] TOKEN env var set for Playwright workers
    del /f /q "%PROJECT_ROOT%token.tmp" >nul 2>&1
) else (
    echo [WARN] token.tmp not found - workers will fetch tokens independently
)

:: ------------------------------------------------
:: Execute the full pipeline controller
:: ------------------------------------------------
node "%PROJECT_ROOT%utils\test_pipeline_controller.js"
if errorlevel 1 (
    echo ⚠️ Test pipeline completed with failures
) else (
    echo 🎉 Test pipeline completed successfully
)

pause
exit
