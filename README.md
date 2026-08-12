# ⚔️ ARASON - Jogo de Combate 3D em Tempo Real

Um jogo de ação 3D em primeira pessoa com **mecânicas de combate realistas**, gráficos 3D aprimorados e sistema de combate dinâmico.

## 🎮 Características Principais

### 🎨 Gráficos 3D Melhorados
- **Modelos humanoides realistas** para jogador e inimigos (cabeça, tronco, braços, pernas)
- **Terreno procedural** com variação de altura
- **Iluminação dinâmica** com sombras em tempo real
- **400 árvores** renderizadas eficientemente com InstancedMesh
- **Efeitos visuais** de impacto e crítico

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

## 🔧 Tecnologia

- **Three.js** para renderização 3D
- **JavaScript vanilla** (sem frameworks)
- **WebGL** com otimizações de performance
- **Pointer Lock API** para controle de câmera

## 🚀 Performance

- Renderização otimizada com `InstancedMesh`
- Límite de pixel ratio para dispositivos de alta DPI
- Fog exponencial para render distance
- Colisão AABB otimizada
- Clock.getDelta() com limite de 0.1s para estabilidade

## 📝 Como Jogar

1. Abra `index.html` em um navegador moderno
2. Clique em "INICIAR JOGO"
3. Clique na tela para trancar o mouse
4. Use WASD para se mover
5. Clique com o botão esquerdo para atacar
6. Clique com o botão direito para se defender
7. Colete recursos (⚙️ e 🪵) e craft itens

## ⚙️ Requisitos

- Navegador com suporte WebGL
- Three.js (CDN)
- JavaScript habilitado

---

**Desenvolvido com ❤️ para combate em tempo real realista**
        grade[2][3] = new Localizacao("Caverna Sombria", "Um lugar escuro. Você ouve rugidos lá de dentro.", "Goblin");
        grade[0][4] = new Localizacao("Castelo Abandonado", "Ruínas antigas guardadas por magia negra.", "Esqueleto");
    }

    public Localizacao getLocalizacao(int x, int y) {
        if (x >= 0 && x < largura && y >= 0 && y < altura) {
            return grade[x][y];
        }
        return null;
    }

    public int getLargura() { return largura; }
    public int getAltura() { return altura; }
}
package com.rpggame;

import com.rpggame.modelo.Player;
import com.rpggame.mundo.Localizacao;
import com.rpggame.mundo.Mapa;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        System.out.println("--- BEM-VINDO AO RPG DE MUNDO ABERTO ---");
        System.out.print("Digite o nome do seu herói: ");
        String nome = scanner.nextLine();
        
        Player player = new Player(nome);
        Mapa mapa = new Mapa(5, 5); // Mundo de tamanho 5x5
        
        boolean jogando = true;

        while (jogando) {
            Localizacao localAtual = mapa.getLocalizacao(player.getX(), player.getY());
            
            System.out.println("\n========================================");
            System.out.printf("Jogador: %s [HP: %d] | Posição: (%d, %d)\n", player.getNome(), player.getHp(), player.getX(), player.getY());
            System.out.println("Local: " + localAtual.getNome());
            System.out.println("Descrição: " + localAtual.getDescricao());
            
            if (!localAtual.getInimigoTipo().equals("Nenhum")) {
                System.out.println("⚠️ CUIDADO: Há um " + localAtual.getInimigoTipo() + " nesta área!");
            }
            System.out.println("========================================");
            System.out.print("Controles: [W] Cima | [S] Baixo | [A] Esquerda | [D] Direita | [Q] Sair\nEscolha sua ação: ");
            
            String acao = scanner.nextLine().trim().toLowerCase();
            
            if (acao.equals("q")) {
                jogando = false;
                System.out.println("Obrigado por jogar! Seu progresso foi salvo na memória.");
            } else if (acao.equals("w") || acao.equals("s") || acao.equals("a") || acao.equals("d")) {
                player.mover(acao, mapa.getLargura(), mapa.getAltura());
                
                // Sistema simples de encontro aleatório ou evento ao mover
                if (!mapa.getLocalizacao(player.getX(), player.getY()).getInimigoTipo().equals("Nenhum")) {
                    System.out.println("\n⚔️ Você entrou em combate! (Inimigo causou 15 de dano)");
                    player.receberDano(15);
                    if (player.getHp() <= 0) {
                        System.out.println("💀 Você morreu! Retornando à Vila Inicial...");
                        player.curar();
                        player.mover("s", mapa.getLargura(), mapa.getAltura()); // Move para longe por segurança
                    }
                }
            } else {
                System.out.println("Comando não reconhecido.");
            }
        }
        scanner.close();
    }
}
/bin/
/.settings/
/.idea/
*.class
.DS_Store
# Java Open World RPG Engine

   Um protótipo de RPG de mundo aberto baseado em texto e construído em Java pura. Este projeto foi estruturado utilizando conceitos de Programação Orientada a Objetos (POO) para ser facilmente expansível.

   ## 🚀 Funcionalidades
   - Sistema de coordenadas de mundo aberto ($X, Y$).
   - Locais dinâmicos com descrições e perigos específicos.
   - Sistema de movimentação cardinal (W, A, S, D).
   - Mecânica básica de dano e combate.

   ## 🛠️ Como Executar
   1. Clone o repositório: `git clone https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git`
   2. Abra o projeto na sua IDE de preferência (IntelliJ, Eclipse, VS Code).
   3. Execute a classe `Main.java`.
