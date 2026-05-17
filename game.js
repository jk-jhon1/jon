const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// --- MÁQUINA DE ESTADO DO JOGO ---
let gameState = "EXPLORANDO"; // "EXPLORANDO" ou "BATALHA"

// --- CONFIGURAÇÃO DO MUNDO ---
const TILE_SIZE = 48;
const MAP_COLS = 30;
const MAP_ROWS = 30;

const TILE_GRAMA = 0;
const TILE_ESTRADA = 1;
const TILE_AGUA = 2;
const TILE_MURO = 3;

const CORES_TERRENO = {
    [TILE_GRAMA]: "#4ade80",
    [TILE_ESTRADA]: "#eab308",
    [TILE_AGUA]: "#3b82f6",
    [TILE_MURO]: "#64748b"
};

// Gerando o Mapa
let mapa = [];
for (let r = 0; r < MAP_ROWS; r++) {
    mapa[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
        let tile = TILE_GRAMA;
        if (c === 0 || r === 0 || c === MAP_COLS - 1 || r === MAP_ROWS - 1) tile = TILE_AGUA;
        if (r === 15 && c > 2 && c < 27) tile = TILE_ESTRADA;
        if (r >= 5 && r <= 8 && c >= 12 && c <= 17) {
            tile = TILE_MURO;
            if (r === 8 && c === 14) tile = TILE_ESTRADA; 
        }
        mapa[r][c] = tile;
    }
}

// --- ENTIDADES ---
const player = {
    x: 7 * TILE_SIZE,
    y: 15 * TILE_SIZE,
    largura: 32,
    altura: 40,
    velocidade: 4,
    direcao: "down",
    hp: 100,
    hpMax: 100,
    ataque: 15,
    localAtual: "Planície Selvagem"
};

// Objeto para controlar o inimigo atual na batalha
let inimigoAtual = null;

const monstrosDisponiveis = [
    { nome: "Goblin", hp: 40, hpMax: 40, ataque: 8 },
    { nome: "Orc", hp: 65, hpMax: 65, ataque: 12 },
    { nome: "Esqueleto", hp: 50, hpMax: 50, ataque: 10 }
];

// --- CÂMERA ---
const camera = {
    x: 0, y: 0,
    atualizar: function() {
        this.x = player.x - canvas.width / 2 + player.largura / 2;
        this.y = player.y - canvas.height / 2 + player.altura / 2;
        const maxCamX = (MAP_COLS * TILE_SIZE) - canvas.width;
        const maxCamY = (MAP_ROWS * TILE_SIZE) - canvas.height;
        if (this.x < 0) this.x = 0; if (this.y < 0) this.y = 0;
        if (this.x > maxCamX) this.x = maxCamX; if (this.y > maxCamY) this.y = maxCamY;
    }
};

const teclado = {};
window.addEventListener('keydown', e => { if(gameState === "EXPLORANDO") teclado[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

function podeMoverPara(novoX, novoY) {
    let cEsquerda = Math.floor(novoX / TILE_SIZE);
    let cDireita = Math.floor((novoX + player.largura) / TILE_SIZE);
    let tTopo = Math.floor(novoY / TILE_SIZE);
    let tBase = Math.floor((novoY + player.altura) / TILE_SIZE);

    if (cEsquerda < 0 || cDireita >= MAP_COLS || tTopo < 0 || tBase >= MAP_ROWS) return false;

    return !(mapa[tTopo][cEsquerda] === TILE_AGUA || mapa[tTopo][cEsquerda] === TILE_MURO ||
             mapa[tTopo][cDireita] === TILE_AGUA || mapa[tTopo][cDireita] === TILE_MURO ||
             mapa[tBase][cEsquerda] === TILE_AGUA || mapa[tBase][cEsquerda] === TILE_MURO ||
             mapa[tBase][cDireita] === TILE_AGUA || mapa[tBase][cDireita] === TILE_MURO);
}

// --- SISTEMA DE ENCONTRO ALEATÓRIO ---
function checarEncontroMonstro(tile) {
    // Só encontra monstros na Grama Brava (Grama Comum), não na Estrada
    if (tile === TILE_GRAMA) {
        if (Math.random() < 0.01) { // 1% de chance por frame de movimento
            iniciarBatalha();
        }
    }
}

// --- FUNÇÕES DE BATALHA (LÓGICA POR TURNO) ---
function iniciarBatalha() {
    gameState = "BATALHA";
    teclado = {}; // Limpa comandos de andar
    
    // Escolhe um monstro aleatório da lista
    let modelo = monstrosDisponiveis[Math.floor(Math.random() * monstrosDisponiveis.length)];
    inimigoAtual = { ...modelo }; // Copia profunda do objeto do monstro

    // Exibe a tela de batalha e popula os dados na tela
    document.getElementById("battle-screen").classList.remove("hidden");
    document.getElementById("monster-name").innerText = inimigoAtual.nome;
    document.getElementById("battle-log").innerText = `Um ${inimigoAtual.nome} selvagem bloqueia seu caminho!`;
    
    atualizarUiBatalha();
}

function atualizarUiBatalha() {
    // Atualiza a barra de vida do jogador no HUD geral e na batalha
    let pctPlayer = (player.hp / player.hpMax) * 100;
    document.getElementById("hp-bar").style.width = pctPlayer + "%";
    document.getElementById("battle-player-hp").style.width = pctPlayer + "%";
    document.getElementById("lbl-player-hp").innerText = player.hp;

    // Atualiza barra de vida do monstro
    let pctMonster = (inimigoAtual.hp / inimigoAtual.hpMax) * 100;
    document.getElementById("battle-monster-hp").style.width = pctMonster + "%";
    document.getElementById("lbl-monster-hp").innerText = inimigoAtual.hp;
}

// Turno do Jogador: Ação Atacar
function atacar() {
    if (gameState !== "BATALHA" || inimigoAtual.hp <= 0) return;

    // Turno do Jogador
    let danoJogador = Math.floor(player.ataque * (0.8 + Math.random() * 0.4)); // Dano com variação
    inimigoAtual.hp = Math.max(0, inimigoAtual.hp - danoJogador);
    document.getElementById("battle-log").innerText = `Você atacou o ${inimigoAtual.nome} e causou ${danoJogador} de dano!`;
    atualizarUiBatalha();

    if (inimigoAtual.hp <= 0) {
        vitoriaBatalha();
    } else {
        // Bloqueia botões temporariamente e passa para o turno do monstro
        desativarBotoesBatalha(true);
        setTimeout(turnoDoInimigo, 1200);
    }
}

// Turno do Jogador: Ação Curar
function curar() {
    if (gameState !== "BATALHA") return;
    
    player.hp = Math.min(player.hpMax, player.hp + 30);
    document.getElementById("battle-log").innerText = `Você bebeu uma poção e recuperou 30 de HP!`;
    atualizarUiBatalha();

    desativarBotoesBatalha(true);
    setTimeout(turnoDoInimigo, 1200);
}

// Turno do Jogador: Ação Fugir
function fugir() {
    if (Math.random() > 0.4) {
        document.getElementById("battle-log").innerText = "Você conseguiu escapar com segurança!";
        setTimeout(encerrarBatalha, 1000);
    } else {
        document.getElementById("battle-log").innerText = "Você falhou ao tentar fugir!";
        desativarBotoesBatalha(true);
        setTimeout(turnoDoInimigo, 1200);
    }
}

// Vez do Monstro agir
function turnoDoInimigo() {
    if (gameState !== "BATALHA" || player.hp <= 0) return;

    let danoInimigo = Math.floor(inimigoAtual.ataque * (0.8 + Math.random() * 0.4));
    player.hp = Math.max(0, player.hp - danoInimigo);
    document.getElementById("battle-log").innerText = `O ${inimigoAtual.nome} contra-atacou e te deu ${danoInimigo} de dano!`;
    atualizarUiBatalha();

    if (player.hp <= 0) {
        derrotaBatalha();
    } else {
        desativarBotoesBatalha(false);
    }
}

function vitoriaBatalha() {
    document.getElementById("battle-log").innerText = `🎉 Vitória! Você derrotou o ${inimigoAtual.nome}!`;
    setTimeout(encerrarBatalha, 1500);
}

function derrotaBatalha() {
    document.getElementById("battle-log").innerText = `💀 Você foi nocauteado... Teleportando de volta para a segurança.`;
    player.hp = player.hpMax; // Restaura a vida
    player.x = 7 * TILE_SIZE; // Retorna ao ponto inicial
    player.y = 15 * TILE_SIZE;
    setTimeout(encerrarBatalha, 2000);
}

function encerrarBatalha() {
    document.getElementById("battle-screen").classList.add("hidden");
    desativarBotoesBatalha(false);
    gameState = "EXPLORANDO";
}

function desativarBotoesBatalha(status) {
    const botoes = document.querySelectorAll(".battle-actions button");
    botoes.forEach(b => b.disabled = status);
}

// --- ATUALIZAÇÃO DA EXPLORAÇÃO ---
function update() {
    if (gameState !== "EXPLORANDO") return;

    let proximoX = player.x;
    let proximoY = player.y;
    let andou = false;

    if (teclado['w'] || teclado['arrowup']) { proximoY -= player.velocidade; player.direcao = "up"; andou = true; }
    if (teclado['s'] || teclado['arrowdown']) { proximoY += player.velocidade; player.direcao = "down"; andou = true; }
    if (teclado['a'] || teclado['arrowleft']) { proximoX -= player.velocidade; player.direcao = "left"; andou = true; }
    if (teclado['d'] || teclado['arrowright']) { proximoX += player.velocidade; player.direcao = "right"; andou = true; }

    if (podeMoverPara(proximoX, player.y)) player.x = proximoX;
    if (podeMoverPara(player.x, proximoY)) player.y = proximoY;

    camera.atualizar();

    // Identificação de Zona e Encontros
    let pColuna = Math.floor((player.x + player.largura/2) / TILE_SIZE);
    let pLinha = Math.floor((player.y + player.altura/2) / TILE_SIZE);
    let tileAtual = mapa[pLinha][pColuna];

    let localTexto = "Planície Selvagem";
    if (tileAtual === TILE_ESTRADA) localTexto = "Estrada do Rei";
    if (pLinha >= 5 && pLinha <= 8 && pColuna >= 12 && pColuna <= 17) localTexto = "Castelo Abandonado";

    document.getElementById("txt-local").innerText = localTexto;

    // Se o jogador estiver andando, roda o dado para ver se acha monstro
    if (andou) {
        checarEncontroMonstro(tileAtual);
    }
}

// --- RENDERIZAÇÃO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let colInicial = Math.floor(camera.x / TILE_SIZE);
    let colFinal = Math.min(MAP_COLS, colInicial + Math.ceil(canvas.width / TILE_SIZE) + 1);
    let linhaInicial = Math.floor(camera.y / TILE_SIZE);
    let linhaFinal = Math.min(MAP_ROWS, linhaInicial + Math.ceil(canvas.height / TILE_SIZE) + 1);

    for (let r = linhaInicial; r < linhaFinal; r++) {
        for (let c = colInicial; c < colFinal; c++) {
            let tipoTile = mapa[r][c];
            let posX = (c * TILE_SIZE) - camera.x;
            let posY = (r * TILE_SIZE) - camera.y;

            ctx.fillStyle = CORES_TERRENO[tipoTile];
            ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "rgba(0,0,0,0.03)";
            ctx.strokeRect(posX, posY, TILE_SIZE, TILE_SIZE);
        }
    }

    // Desenhar Player
    let pTelaX = player.x - camera.x;
    let pTelaY = player.y - camera.y;

    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(pTelaX, pTelaY + 10, player.largura, player.altura - 10);
    ctx.fillStyle = "#fbcfe8";
    ctx.fillRect(pTelaX + 4, pTelaY, player.largura - 8, 14);

    ctx.fillStyle = "#000";
    if (player.direcao === "down") {
        ctx.fillRect(pTelaX + 8, pTelaY + 6, 4, 4);
        ctx.fillRect(pTelaX + 20, pTelaY + 6, 4, 4);
    } else if (player.direcao === "left") {
        ctx.fillRect(pTelaX + 4, pTelaY + 6, 4, 4);
    } else if (player.direcao === "right") {
        ctx.fillRect(pTelaX + 24, pTelaY + 6, 4, 4);
    }
}

// Loop Principal
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
