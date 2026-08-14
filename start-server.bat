@echo off
REM Script para iniciar o servidor local no Windows

echo.
echo 🎮 Iniciando servidor do jogo ARASON...
echo.

REM Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado. Por favor, instale Python 3.
    echo 📥 Baixe em: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 🚀 Servidor HTTP iniciado em http://127.0.0.1:8000
echo 📂 Diretório: %cd%
echo.
echo 🎵 Áudio de fundo: HABILITADO
echo 🎮 Abra o navegador em: http://localhost:8000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

python -m http.server 8000 --bind 127.0.0.1

pause
