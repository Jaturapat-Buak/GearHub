@echo off
echo Installing dependencies...
call npm install

echo Starting GearHub server...
node index.js

pause