@echo off
echo =========================================
echo   Pushing to GitHub and Hugging Face
echo =========================================

REM Check if a commit message was provided
set MSG=%~1
if "%MSG%"=="" (
    set MSG=Update repository
)

echo.
echo [1] Adding changed files...
git add .

echo.
echo [2] Committing with message: "%MSG%"
git commit -m "%MSG%"

echo.
echo [3] Pushing to GitHub (origin)...
git push origin main

echo.
echo [4] Pushing to Hugging Face (hf)...
git push -f hf main

echo.
echo =========================================
echo   Done!
echo =========================================
pause
