@echo off
echo Starting Antigravity AI Playtester & Debugger...
cd %~dp0ai\v1\aiplay
npx electron . --game friendslop %*

