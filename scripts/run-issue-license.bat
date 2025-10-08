@echo off
echo Running issue-license.js with provided args...
node "%~dp0issue-license.js" %*
if ERRORLEVEL 1 (
  echo.
  echo Le script a rencontré une erreur.
  pause
  exit /b 1
)
echo.
echo Script terminé. Appuie sur une touche pour fermer.
pause
