@echo off
echo Starting Antigravity AI Playtester and Debugger...
cd %~dp0ai\v1\aiplay
npx electron . --game friendslop %*

