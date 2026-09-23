@echo off
title Passive Shelter Designer - Local Server
echo ==============================================================================
echo       PASSIVE SHELTER DESIGNER - LOCAL WEB SERVER LAUNCHER
echo ==============================================================================
echo Starting local web server on http://localhost:8080/ ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
