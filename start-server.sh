#!/bin/bash

# Script para iniciar o servidor local e abrir o jogo

echo "🎮 Iniciando servidor do jogo ARASON..."
echo ""

# Verifica se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Por favor, instale Python3."
    exit 1
fi

# Inicia o servidor HTTP
echo "🚀 Servidor HTTP iniciado em http://127.0.0.1:8000"
echo "📂 Diretório: $(pwd)"
echo ""
echo "🎵 Áudio de fundo: HABILITADO"
echo "🎮 Abra o navegador em: http://localhost:8000"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

python3 -m http.server 8000 --bind 127.0.0.1
