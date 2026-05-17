// --- CONFIGURAÇÃO DO MUNDO (Antigo Mapa.java e Localizacao.java) ---
const mapaLargura = 5;
const mapaAltura = 5;

// Criando o mapa 5x5 dinamicamente
let mapa = [];
for (let x = 0; x < mapaLargura; x++) {
    mapa[x] = [];
    for (let y = 0; y < mapaAltura; y++) {
        mapa[x][y] = {
            nome: "Planície Selvagem",
            descricao: "Grama alta se move com o vento.",
            inimigo: "Nenhum"
        };
    }
}

// Inserindo pontos de interesse específicos
mapa[1][1] = { nome: "Vila Inicial", descricao: "Uma vila pacífica com tavernas e mercadores.", inimigo: "Nenhum" };
mapa[2][3] = { nome: "Caverna Sombria", descricao: "Um lugar escuro. Você ouve rugidos lá de dentro.", inimigo: "Goblin" };
mapa[0][4] = { nome: "Castelo Abandonado", descricao: "Ruínas antigas guardadas por magia negra.", inimigo: "Esqueleto" };

// --- ESTADO DO JOGADOR (Antigo Player.java) ---
let player = {
    nome: "Herói",
    hp: 100,
    hpMax: 100,
    x: 1, // Começa na Vila Inicial
    y: 1
};

// --- FUNÇÕES DO JOGO ---

// Atualiza a tela do HTML com as informações atuais do jogo
function atualizarTela() {
    document.getElementById("player-name").innerText = player.nome;
    document.getElementById("player-hp").innerText = player.hp;
    document.getElementById("player-pos").innerText = `${player.x}, ${player.y}`;

    let localAtual = mapa[player.x][player.y];
    document.getElementById("local-nome").innerText = localAtual.nome;
    document.getElementById("local-desc").innerText = localAtual.descricao;

    let aviso = document.getElementById("aviso-perigo");
    if (localAtual.inimigo !== "Nenhum") {
        aviso.innerText = `⚠️ CUIDADO: Há um ${localAtual.inimigo} nesta área!`;
    } else {
        aviso.innerText = "";
    }
}

// Adiciona mensagens no painel de eventos inferior
function adicionarLog(mensagem) {
    let logBox = document.getElementById("log-box");
    logBox.innerHTML += `<div>${mensagem}</div>`;
    logBox.scrollTop = logBox.scrollHeight; // Rola automaticamente para baixo
}

// Movimenta o jogador pelo mapa
function mover(direcao) {
    switch (direcao) {
        case "w": if (player.y > 0) player.y--; break; // Cima
        case "s": if (player.y < mapaAltura - 1) player.y++; break; // Baixo
        case "a": if (player.x > 0) player.x--; break; // Esquerda
        case "d": if (player.x < mapaLargura - 1) player.x++; break; // Direita
    }

    atualizarTela();
    verificarEventos();
}

// Verifica se há inimigos ou eventos na nova posição
function verificarEventos() {
    let localAtual = mapa[player.x][player.y];

    if (localAtual.inimigo !== "Nenhum") {
        adicionarLog(`⚔️ Você foi atacado por um ${localAtual.inimigo}! (-15 HP)`);
        player.hp -= 15;

        if (player.hp <= 0) {
            adicionarLog("💀 Você morreu! Retornando salvo para a Vila Inicial...");
            player.hp = player.hpMax;
            player.x = 1;
            player.y = 1;
            atualizarTela();
        }
    } else {
        adicionarLog(`Você caminhou até: ${localAtual.nome}`);
    }
}

// Captura as teclas do teclado físico do PC (W, A, S, D)
window.addEventListener("keydown", function(event) {
    const tecla = event.key.toLowerCase();
    if (["w", "a", "s", "d"].includes(tecla)) {
        mover(tecla);
    }
});

// Inicializa o jogo ao abrir a página
window.onload = function() {
    let nomeDigitado = prompt("Digite o nome do seu herói:", "Guerreiro");
    if (nomeDigitado) player.nome = nomeDigitado;
    atualizarTela();
    adicionarLog("O mundo aberto espera por você! Use as teclas W, A, S, D ou os botões.");
};
