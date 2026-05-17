# jon
src/
└── com/
    └── rpggame/
        ├── Main.java
        ├── modelo/
        │   ├── Player.java
        │   └── Inimigo.java
        └── mundo/
            ├── Mapa.java
            └── Localizacao.java
            package com.rpggame.mundo;

public class Localizacao {
    private String nome;
    private String descricao;
    private String inimigoTipo;

    public Localizacao(String nome, String descricao, String inimigoTipo) {
        this.nome = nome;
        this.descricao = descricao;
        this.inimigoTipo = inimigoTipo;
    }

    public String getNome() { return nome; }
    public String getDescricao() { return descricao; }
    public String getInimigoTipo() { return inimigoTipo; }
}
package com.rpggame.mundo;

public class Mapa {
    private Localizacao[][] grade;
    private int largura, altura;

    public Mapa(int largura, int altura) {
        this.largura = largura;
        this.altura = altura;
        this.grade = new Localizacao[largura][altura];
        gerarMundo();
    }

    private void gerarMundo() {
        // Inicializa o mundo com planícies vazias
        for (int x = 0; x < largura; x++) {
            for (int y = 0; y < altura; y++) {
                grade[x][y] = new Localizacao("Planície Selvagem", "Grama alta se move com o vento.", "Nenhum");
            }
        }
        // Adiciona pontos de interesse específicos no mundo aberto
        grade[1][1] = new Localizacao("Vila Inicial", "Uma vila pacífica com tavernas e mercadores.", "Nenhum");
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
