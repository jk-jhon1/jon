const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajusta o tamanho da tela do jogo
canvas.width = 800;
canvas.height = 600;

// --- CONFIGURAÇÃO DO MUNDO EM TILES ---
const TILE_SIZE = 48; // Tamanho de cada bloco na tela
const MAP_COLS = 30;  // Largura do mundo (30 blocos)
const MAP_ROWS = 30;  // Altura do mundo (30 blocos)

// Identificadores de Terrenos (ID)
const TILE_GRAMA = 0;
const TILE_ESTRADA = 1;
const TILE_AGUA = 2;
const TILE_MURO = 3;

// Paleta de cores dos terrenos
const CORES_TERRENO = {
    [TILE_GRAMA]: "#4ade80",   // Verde vivo
    [TILE_ESTRADA]: "#eab308", // Amarelo/Areia
    [TILE_AGUA]: "#3b82f6",    // Azul
    [TILE_MURO]: "#64748b"     // Cinza pedra
};

// Gerando um mapa matriz dinâmico (30x30)
let mapa = [];
for (let r = 0; r < MAP_ROWS; r++) {
    mapa[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
        // Padrão básico: Tudo grama
        let tile = TILE_GRAMA;

        // Criando rios (Água) nas bordas do mapa
        if (c === 0 || r === 0 || c === MAP_COLS - 1 || r === MAP_ROWS - 1) tile = TILE_AGUA;
        
        // Criando uma estrada horizontal no meio do mapa
        if (r === 15 && c > 2 && c < 27) tile = TILE_ESTRADA;

        // Criando o "Castelo Abandonado" (Muros) no topo do mapa
        if (r >= 5 && r <= 8 && c >= 12 && c <= 17) {
            tile = TILE_MURO;
            // Deixa uma entrada/porta no castelo
            if (r === 8 && c === 14) tile = TILE_ESTRADA; 
        }

        mapa[r][c] = tile;
    }
}

// --- ENTIDADES: JOGADOR ---
const player = {
    x: 7 * TILE_SIZE, // Posição inicial no mundo real (pixels)
    y: 15 * TILE_SIZE,
    largura: 32,
    altura: 40,
    velocidade: 5,
    direcao: "down", // 'up', 'down', 'left', 'right'
    frame: 0,        // Para controle de animação futura
    hp: 100,
    localAtual: "Planície"
};

// --- SISTEMA DE CÂMERA ---
const camera = {
    x: 0,
    y: 0,
    atualizar: function() {
        // Centraliza a câmera no jogador
        this.x = player.x - canvas.width / 2 + player.largura / 2;
        this.y = player.y - canvas.height / 2 + player.altura / 2;

        // Prende a câmera nos limites máximos do mapa para não mostrar o "vazio"
        const maxCamX = (MAP_COLS * TILE_SIZE) - canvas.width;
        const maxCamY = (MAP_ROWS * TILE_SIZE) - canvas.height;

        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > maxCamX) this.x = maxCamX;
        if (this.y > maxCamY) this.y = maxCamY;
    }
};

// Controles do Teclado
const teclado = {};
window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

// --- DETECÇÃO DE COLISÃO COM O CENÁRIO ---
function podeMoverPara(novoX, novoY) {
    // Encontra os cantos do corpo do jogador no mapa de matriz
    let cEsquerda = Math.floor(novoX / TILE_SIZE);
    let cDireita = Math.floor((novoX + player.largura) / TILE_SIZE);
    let tTopo = Math.floor(novoY / TILE_SIZE);
    let tBase = Math.floor((novoY + player.altura) / TILE_SIZE);

    // Se sair dos limites da matriz, bloqueia
    if (cEsquerda < 0 || cDireita >= MAP_COLS || tTopo < 0 || tBase >= MAP_ROWS) return false;

    // Verifica se algum dos cantos colide com Água ou Muro
    let tileTopoEsq = mapa[tTopo][cEsquerda];
    let tileTopoDir = mapa[tTopo][cDireita];
    let tileBaseEsq = mapa[tBase][cEsquerda];
    let tileBaseDir = mapa[tBase][cDireita];

    if (tileTopoEsq === TILE_AGUA || tileTopoEsq === TILE_MURO ||
        tileTopoDir === TILE_AGUA || tileTopoDir === TILE_MURO ||
        tileBaseEsq === TILE_AGUA || tileBaseEsq === TILE_MURO ||
        tileBaseDir === TILE_AGUA || tileBaseDir === TILE_MURO) {
        return false; // Bloqueado por colisão física
    }

    return true;
}

// --- ATUALIZAÇÃO DA LÓGICA ---
function update() {
    let proximoX = player.x;
    let proximoY = player.y;

    if (teclado['w'] || teclado['arrowup']) { proximoY -= player.velocidade; player.direcao = "up"; }
    if (teclado['s'] || teclado['arrowdown']) { proximoY += player.velocidade; player.direcao = "down"; }
    if (teclado['a'] || teclado['arrowleft']) { proximoX -= player.velocidade; player.direcao = "left"; }
    if (teclado['d'] || teclado['arrowright']) { proximoX += player.velocidade; player.direcao = "right"; }

    // Aplica o movimento se não houver colisão física
    if (podeMoverPara(proximoX, player.y)) player.x = proximoX;
    if (podeMoverPara(player.x, proximoY)) player.y = proximoY;

    // Atualiza Câmera
    camera.atualizar();

    // Identifica Zona Atual do Mundo para a Interface (HUD)
    let pColuna = Math.floor((player.x + player.largura/2) / TILE_SIZE);
    let pLinha = Math.floor((player.y + player.altura/2) / TILE_SIZE);
    let tileAtual = mapa[pLinha][pColuna];

    let localTexto = "Planície Selvagem";
    if (tileAtual === TILE_ESTRADA) localTexto = "Estrada do Rei";
    if (pLinha >= 5 && pLinha <= 8 && pColuna >= 12 && pColuna <= 17) localTexto = "Castelo Abandonado";

    document.getElementById("txt-local").innerText = localTexto;
}

// --- RENDERIZAÇÃO GRÁFICA ---
function draw() {
    // Limpa a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. DESENHAR O MAPA (Apenas o que aparece na visão da câmera para poupar memória)
    let colInicial = Math.floor(camera.x / TILE_SIZE);
    let colFinal = colInicial + Math.ceil(canvas.width / TILE_SIZE) + 1;
    let linhaInicial = Math.floor(camera.y / TILE_SIZE);
    let linhaFinal = linhaInicial + Math.ceil(canvas.height / TILE_SIZE) + 1;

    // Proteção contra estouro de limites na renderização
    if (colFinal > MAP_COLS) colFinal = MAP_COLS;
    if (linhaFinal > MAP_ROWS) linhaFinal = MAP_ROWS;

    for (let r = linhaInicial; r < linhaFinal; r++) {
        for (let c = colInicial; c < colFinal; c++) {
            let tipoTile = mapa[r][c];
            
            // Posição na tela = Posição no mundo - Posição da Câmera
            let posX = (c * TILE_SIZE) - camera.x;
            let posY = (r * TILE_SIZE) - camera.y;

            ctx.fillStyle = CORES_TERRENO[tipoTile];
            ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);

            // Adiciona pequenos detalhes visuais de "grade/pixel art" nos blocos
            ctx.strokeStyle = "rgba(0,0,0,0.03)";
            ctx.strokeRect(posX, posY, TILE_SIZE, TILE_SIZE);
        }
    }

    // 2. DESENHAR O JOGADOR (Estilo Sprite 2D Procedural)
    let pTelaX = player.x - camera.x;
    let pTelaY = player.y - camera.y;

    // Corpo/Capa do personagem
    ctx.fillStyle = "#1e3a8a"; // Azul escuro
    ctx.fillRect(pTelaX, pTelaY + 10, player.largura, player.altura - 10);

    // Cabeça
    ctx.fillStyle = "#fbcfe8"; // Pele
    ctx.fillRect(pTelaX + 4, pTelaY, player.largura - 8, 14);

    // Olhos baseado na direção que ele está olhando
    ctx.fillStyle = "#000"; // Cor do olho
    if (player.direcao === "down") {
        ctx.fillRect(pTelaX + 8, pTelaY + 6, 4, 4);
        ctx.fillRect(pTelaX + 20, pTelaY + 6, 4, 4);
    } else if (player.direcao === "up") {
        // De costas não vê os olhos
    } else if (player.direcao === "left") {
        ctx.fillRect(pTelaX + 4, pTelaY + 6, 4, 4);
    } else if (player.direcao === "right") {
        ctx.fillRect(pTelaX + 24, pTelaY + 6, 4, 4);
    }
}

// --- LOOP PRINCIPAL DO MOTOR ---
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
