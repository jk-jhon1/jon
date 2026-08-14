# 🎵 SETUP ÁUDIO - ARASON

## ✅ O QUE FOI FEITO

Adicionei **áudio de floresta** como som de fundo do jogo com as seguintes características:

✨ **Áudio integrado:**
- Som de ambiente da floresta tocando continuamente durante o jogo
- Volume balanceado (40%) para não abafar sons de combate
- Pausa automática ao abrir inventário
- Retomada automática ao fechar inventário
- Carregamento automático com fallback inteligente

🐛 **Melhorias corrigidas:**
- Tratamento robusto de erros de carregamento
- Suporte para múltiplos caminhos de arquivo
- Console logs para debug
- Compatibilidade com diferentes ambientes

## 🚀 COMO USAR

### ⚠️ IMPORTANTE: O jogo PRECISA ser acessado via HTTP

**Por quê?** O navegador bloqueia áudio de arquivos locais por razões de segurança.

### 1️⃣ Iniciar o Servidor Local

Escolha UMA das opções abaixo:

#### 📌 Opção A: Script Automático (Recomendado)

**No Linux/Mac:**
```bash
chmod +x start-server.sh
./start-server.sh
```

**No Windows:**
Clique duplo em `start-server.bat`

#### 📌 Opção B: Comando Manual

Abra terminal/prompt de comando na pasta do jogo:

```bash
python3 -m http.server 8000
```

#### 📌 Opção C: Outras ferramentas

**Node.js:**
```bash
npx http-server
```

**PHP:**
```bash
php -S localhost:8000
```

### 2️⃣ Acessar o Jogo

Abra no navegador:
```
http://localhost:8000
```

### 3️⃣ Testar o Áudio

Antes de jogar, teste o áudio aqui:
```
http://localhost:8000/teste-audio.html
```

## 📂 ARQUIVOS ADICIONADOS/MODIFICADOS

### Novos Arquivos:
- ✅ `floresta.mp3` - Áudio de fundo (5.8 MB)
- ✅ `start-server.sh` - Script para iniciar servidor (Linux/Mac)
- ✅ `start-server.bat` - Script para iniciar servidor (Windows)
- ✅ `teste-audio.html` - Página para testar áudio
- ✅ `SETUP.md` - Este arquivo

### Arquivos Modificados:
- 📝 `game.js` - Adicionado sistema de áudio com controles
- 📝 `README.md` - Atualizado com instruções de áudio

## 🎮 COMO FUNCIONA O ÁUDIO NO JOGO

### Reprodução
1. Ao abrir o jogo, o áudio tenta reproduzir automaticamente
2. Se o navegador bloquear (autoplay), toca no primeiro clique
3. Toca continuamente em loop durante o jogo

### Pausa
- Áudio pausa automaticamente ao pressionar `E` (abrir inventário)
- Retoma automaticamente ao fechar inventário

### Debug
Abra o console (F12) para ver mensagens:
- 🎵 "Carregando áudio de: ..." - Tentando carregar
- ✅ "Áudio carregado!" - Sucesso
- ⚠️ "Erro ao carregar áudio" - Problema no carregamento
- 🎵 "Áudio iniciado" - Começou a tocar

## 🐛 SOLUÇÃO DE PROBLEMAS

### ❌ Erro: "CORS" ou "Access-Control"
**Solução:** Certifique-se de que está usando `http://localhost` e não `file://`

### ❌ Áudio não toca
1. Abra http://localhost:8000/teste-audio.html
2. Se o teste funcionar, o problema é com as permissões do navegador
3. Clique em qualquer lugar da tela para "desbloquear" o áudio

### ❌ Servidor não inicia
1. Verifique se a porta 8000 não está em uso: `lsof -i :8000`
2. Tente outra porta: `python3 -m http.server 9000`
3. Acesse: `http://localhost:9000`

### ❌ File Not Found (404)
Certifique-se de que:
- `floresta.mp3` está na raiz do projeto
- Está acessando via http (não file://)
- Não há espaços ou caracteres especiais nos nomes de arquivo

## 📊 ESPECIFICAÇÕES DO ÁUDIO

| Propriedade | Valor |
|-----------|-------|
| Arquivo | floresta.mp3 |
| Tamanho | 5.8 MB |
| Codec | MPEG Layer III |
| Bitrate | 320 kbps |
| Taxa de Amostragem | 44.1 kHz |
| Canais | Estéreo |
| Loop | Contínuo |
| Volume Padrão | 40% |

## 💡 DICAS

1. **Para melhor experiência:** Use fone de ouvido
2. **Se estiver lento:** Reduza qualidade gráfica (redimensione janela)
3. **Para compartilhar:** Certifique-se de incluir `floresta.mp3` ao enviar os arquivos
4. **Para publicar online:** Upload todos os arquivos incluindo o MP3

## 🔗 ARQUIVO GAME.JS

O código adicionado está em `game.js` linha ~65:

```javascript
// ==========================================
// SISTEMA DE ÁUDIO DE FUNDO
// ==========================================
const audioFundo = new Audio();
audioFundo.src = "./floresta.mp3";
audioFundo.loop = true;
audioFundo.volume = 0.4;
// ... (resto do código)
```

## ✨ PRÓXIMAS MELHORIAS

Ideias para o futuro:
- [ ] Mais faixas de áudio (combate, vitória, derrota)
- [ ] Efeitos sonoros de ataque
- [ ] Sistema de volume ajustável no jogo
- [ ] Controle de música por menu de pausa
- [ ] Diferentes áudios por bioma

---

**Desenvolvido com ❤️ | Áudio integrado com sucesso! 🎵**
