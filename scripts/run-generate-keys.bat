@echo off
echo Running generate-keys.js...
node "%~dp0generate-keys.js"
if ERRORLEVEL 1 (
  echo.
  echo Le script a rencontré une erreur.
  pause
  exit /b 1
)
echo.
echo Clés générées (si pas d'erreur). Appuie sur une touche pour fermer.
pause
