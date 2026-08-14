# ⚔️ ARASON - Jogo de Combate 3D em Tempo Real

Um jogo de ação 3D em primeira pessoa com **mecânicas de combate realistas**, gráficos 3D aprimorados e sistema de combate dinâmico.

## 🎮 Características Principais

### 🎨 Gráficos 3D Melhorados
- **Modelos humanoides realistas** para jogador e inimigos (cabeça, tronco, braços, pernas)
- **Terreno procedural** com variação de altura
- **Iluminação dinâmica** com sombras em tempo real
- **400 árvores** renderizadas eficientemente com InstancedMesh
- **Efeitos visuais** de impacto e crítico

### 🎵 Áudio Ambiente
- **Som de fundo de floresta** durante todo o jogo
- **Controle automático** de pausa ao abrir/fechar inventário
- **Volume balanceado** para não abafar outros sons

### ⚡ Mecânicas de Combate Realistas

#### Sistema de Crítico
- **Chance base de 15%** de crítico aumentável com combo
- **Bônus de 2.2x dano** em acertos críticos
- **Efeitos visuais** de sangue/impacto em críticos

#### Sistema de Parry/Defesa
- **Defesa normal** reduz dano em 40%
- **Parry perfeito** (timing correto) reduz dano em 80% e restaura +15 stamina
- **Tempo de resposta** de 0.3s para parry bem-sucedido

#### Knockback e Física
- **Knockback proporcional ao dano** aplicado aos inimigos
- **Deceleração gradual** (85% por frame) para movimentos realistas
- **Sistema de stun** baseado no dano recebido (até 0.6s)

#### Sistema de Armadura
- **Jogador**: 5 de armadura
- **Inimigos**: 10 de armadura (reduz dano mínimo em 10)
- **Dano mínimo garantido**: 5 HP por ataque

### 🔗 Sistema de Combo
- Aumenta até **2.25x dano** com combo 10x
- **Bonus de drops** ao derrotar inimigos com combo ativo
- Reset se não atacar por 1.2 segundos

### 🎯 4 Armas Distintas
1. **LÂMINA** (35 dano, alcance médio, rápida)
2. **BASTÃO** (65 dano, alcance curto, lenta)
3. **ARCO** (50 dano, projétil, até 15 flechas)
4. **MACHADO** (20 dano, colhe madeira, velocidade média)

### 📊 Sistema de Inventário
- **Minecraft-style** com 15 slots
- Crafting de flechas (1⚙️ + 1🪵 = 5 flechas)
- Crafting de poções (3⚙️ = 1 poção)
- Coleta automática de drops próximos

## 🎮 Controles

| Ação | Tecla |
|------|-------|
| Mover | WASD |
| Correr | Shift |
| Pular | Espaço |
| Câmera | Mouse |
| Atacar | Clique Esquerdo |
| Defender/Parry | Clique Direito |
| Trocar Arma | 1, 2, 3, 4 |
| Usar Poção | Q |
| Abrir Inventário | E |

## 📈 Estatísticas do Jogador

- **HP**: 150 (cor dinâmica: verde → amarelo → vermelho)
- **Stamina**: 100 (regenera 25/s em repouso)
- **Armadura**: 5 (reduz dano)

## 👹 IA dos Inimigos

- **20 inimigos** gerados aleatoriamente
- **HP**: 150 (armadura 10)
- **Velocidade variável** baseada em stun
- **Ataque inteligente** com cooldown de 1.5s + variância
- **Knockback** compatível com sistema do jogador
- **Perseguição** com desvio de obstáculos

## 📋 Melhorias Implementadas

### Antes
- Modelos simples de caixas
- Crítico básico sem efeito visual
- Defesa simples sem parry timing
- Sem knockback ou stun

### Depois ✨
- ✅ Modelos humanoides 3D realistas
- ✅ Sistema de crítico com efeito visual
- ✅ Parry com timing e bônus de stamina
- ✅ Knockback com deceleração física
- ✅ Sistema de stun e recuperação
- ✅ Animações melhoradas de ataque
- ✅ HP e armadura para inimigos
- ✅ Diferentes tipos de dano
- ✅ Barra de HP dinâmica (cores)
- ✅ UI melhorada na tela inicial
- ✅ Áudio de fundo ambiente

## 🔧 Tecnologia

- **Three.js** para renderização 3D
- **JavaScript vanilla** (sem frameworks)
- **WebGL** com otimizações de performance
- **Pointer Lock API** para controle de câmera
- **Web Audio API** para áudio ambiente

## 🚀 Performance

- Renderização otimizada com `InstancedMesh`
- Límite de pixel ratio para dispositivos de alta DPI
- Fog exponencial para render distance
- Colisão AABB otimizada
- Clock.getDelta() com limite de 0.1s para estabilidade

## 📝 Como Jogar

### ⚠️ IMPORTANTE: Configurar o Servidor Local

Para que o **áudio de fundo** funcione corretamente, você PRECISA rodar o jogo através de um servidor HTTP local:

#### 🖥️ No Linux/Mac:
```bash
chmod +x start-server.sh
./start-server.sh
```

#### 🖥️ No Windows:
Clique duas vezes em `start-server.bat` ou abra o PowerShell no diretório e execute:
```cmd
start-server.bat
```

#### 🖥️ Manual (Qualquer Sistema):
Abra o terminal/prompt de comando na pasta do jogo e execute:
```bash
python3 -m http.server 8000
```

Depois acesse: **http://localhost:8000**

### ▶️ Jogando

1. Inicie o servidor (veja acima)
2. Abra **http://localhost:8000** no navegador
3. Clique em "INICIAR JOGO"
4. Clique na tela para trancar o mouse
5. Use WASD para se mover
6. Clique com o botão esquerdo para atacar
7. Clique com o botão direito para se defender
8. Colete recursos (⚙️ e 🪵) e craft itens

## 🎵 Áudio

O jogo inclui **som de floresta atmosférico** que toca continuamente durante o gameplay:

- 🎧 Volume automático em 30% para não abafar sons de combate
- ⏸️ Pausa automaticamente ao abrir o inventário
- ▶️ Retoma quando fecha o inventário
- 📁 Arquivo: `floresta.mp3`

## ⚙️ Requisitos

- Navegador moderno com suporte WebGL (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Python 3 (para rodar o servidor local)
- Áudio do computador habilitado

## 📂 Estrutura de Arquivos

```
├── index.html          # Página principal
├── game.js             # Lógica do jogo (principal)
├── style.css           # Estilos CSS
├── floresta.mp3        # Áudio de fundo
├── start-server.sh     # Script para Linux/Mac
├── start-server.bat    # Script para Windows
└── README.md          # Este arquivo
```

## 🐛 Solução de Problemas

### ❌ O áudio não está tocando

**Solução**: Certifique-se de que está rodando em um servidor HTTP (não diretamente como `file://`):

1. Abra o console do navegador (F12)
2. Procure por mensagens de erro sobre áudio
3. Certifique-se de que `floresta.mp3` está na raiz do projeto
4. Reinicie o servidor com `./start-server.sh` ou `start-server.bat`

### ❌ Erro "Three.js não carregado"

**Solução**: O arquivo não conseguiu carregar o Three.js do CDN:

1. Verifique sua conexão com a internet
2. Tente recarregar a página
3. Verifique se há bloqueadores de conteúdo/ad-blockers

### ❌ O jogo está muito lento

**Solução**:

1. Feche outras abas do navegador
2. Reduza a resolução da janela
3. Tente em outro navegador (Chrome geralmente é mais rápido)

---

**Desenvolvido com ❤️ para combate em tempo real realista**
