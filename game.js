// --- CONFIGURAÇÃO BÁSICA ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const logPanel = document.getElementById('log-panel');

// Tamanho de cada "quadrado" (tile) no mundo
const TILE_SIZE = 32; 

// --- MAPA E MUNDO (Representação Simplificada) ---
// Em um jogo real, usaríamos uma matriz (grid) e imagens de tileset.
// Aqui vamos desenhar formas simples para representar os locais da imagem.

const locais = [
    { nome: "Vila Inicial", x: 600, y: 300, w: 150, h: 150, cor: "#8b4513", perigo: false },
    { nome: "Caverna Sombria", x: 50, y: 400, w: 200, h: 150, cor: "#222", perigo: true },
    { nome: "Castelo Abandonado", x: 300, y: 50, w: 200, h: 120, cor: "#555", perigo: true }
];

// --- ESTADO DO JOGADOR ---
const player = {
    x: canvas.width / 2, // Começa no centro
    y: canvas.height / 2,
    size: 20,
    speed: 4,
    color: "#00aaff", // Azul do herói
    localAtual: "Planície Selvagem"
};

// Gerenciamento de Teclas Pressionadas
const keys = {
    w: false, a: false, s: false, d: false
};

// --- ENTRADAS DO TECLADO ---
window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
    }
});

window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = false;
    }
});

// --- LÓGICA DO JOGO (ATUALIZAÇÃO) ---
function update() {
    let movendo = false;

    // Movimentação do Jogador
    if (keys.w && player.y > 0) { player.y -= player.speed; movendo = true; }
    if (keys.s && player.y < canvas.height - player.size) { player.y += player.speed; movendo = true; }
    if (keys.a && player.x > 0) { player.x -= player.speed; movendo = true; }
    if (keys.d && player.x < canvas.width - player.size) { player.x += player.speed; movendo = true; }

    // Verificação de Colisão/Localização
    let localEncontrado = "Planície Selvagem";
    let estaEmPerigo = false;

    for (let local of locais) {
        if (player.x < local.x + local.w &&
            player.x + player.size > local.x &&
            player.y < local.y + local.h &&
            player.y + player.size > local.y) {
            localEncontrado = local.nome;
            estaEmPerigo = local.perigo;
            break;
        }
    }

    // Atualiza a UI se o local mudar
    if (localEncontrado !== player.localAtual) {
        player.localAtual = localEncontrado;
        logPanel.innerText = `Você entrou em: ${localEncontrado}`;
        if (estaEmPerigo) {
            logPanel.style.color = "#ff4444"; // Vermelho para perigo
            logPanel.innerText += " (⚠️ CUIDADO: Monstros!)";
        } else {
            logPanel.style.color = "white";
        }
    }
}

// --- DESENHO DO JOGO (RENDERIZAÇÃO) ---
function draw() {
    // 1. Limpar o Canvas (Grama de fundo)
    ctx.fillStyle = "#35a035"; // Verde grama
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Desenhar a Grid (Opcional, ajuda na noção de espaço)
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    for (let x = 0; x < canvas.width; x += TILE_SIZE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += TILE_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 3. Desenhar Locais de Interesse
    locais.forEach(local => {
        ctx.fillStyle = local.cor;
        ctx.fillRect(local.x, local.y, local.w, local.h);
        
        // Texto do Local
        ctx.fillStyle = "white";
        ctx.font = "14px Courier New";
        ctx.fillText(local.nome, local.x + 5, local.y + 20);
    });

    // 4. Desenhar o Jogador
    ctx.fillStyle = player.color;
    // Desenha como um círculo para destacar da grade
    ctx.beginPath();
    ctx.arc(player.x + player.size/2, player.y + player.size/2, player.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Contorno do jogador
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- LOOP PRINCIPAL ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop); // Chama o próximo quadro
}

// Iniciar o jogo
gameLoop();
