// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D (THREE.JS) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a16); // Cor do céu noturno

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Iluminação do Mundo
const light = new THREE.AmbientLight(0xffffff, 0.5); // Luz ambiente
scene.add(light);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 15);
scene.add(dirLight);

// O Chão (Arena 3D)
const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x252535, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; // Deita o plano para virar chão
scene.add(floor);

// Obstáculos do Cenário (Pilares de Templo Antigo)
const pilares = [];
const pilarGeo = new THREE.CylinderGeometry(1, 1, 6, 8);
const pilarMat = new THREE.MeshStandardMaterial({ color: 0x444455 });

for(let i = 0; i < 6; i++) {
    const pilar = new THREE.Mesh(pilarGeo, pilarMat);
    pilar.position.set(Math.sin(i) * 15, 3, Math.cos(i) * 15);
    scene.add(pilar);
    pilares.push(pilar);
}

// O Jogador no mundo 3D (Representado por um Cubo estilizado)
const playerGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc });
const playerMesh = new THREE.Mesh(playerGeo, playerMat);
playerMesh.position.set(0, 1, 0);
scene.add(playerMesh);

// O Inimigo no mundo 3D (Representado por uma Esfera de Energia Espinhosa)
const enemyGeo = new THREE.OctahedronGeometry(2, 1);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xff3366, wireframe: false });
const enemyMesh = new THREE.Mesh(enemyGeo, enemyMat);
enemyMesh.position.set(0, 2, -18); // Fica afastado no início
scene.add(enemyMesh);

// Posicionamento da Câmera em 3ª Pessoa
camera.position.set(0, 8, 12);
camera.lookAt(playerMesh.position);

// --- 2. LOGICA E ESTADOS DE JOGO ---
let gameState = "EXPLORANDO"; // EXPLORANDO ou BATALHA

const heroi = {
    hp: 100, hpMax: 100,
    potcoes: 3,
    defendendo: false
};

let vilao = null; // Dados do monstro ativo no combate

const teclado = {};
window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

// --- 3. SISTEMA DE BATALHA AVANÇADO ---
function testarEncontroBatalha() {
    // Verifica a distância 3D entre o jogador e o monstro
    let distancia = playerMesh.position.distanceTo(enemyMesh.position);
    
    if (distancia < 3.5 && gameState === "EXPLORANDO") {
        iniciarCombate();
    }
}

function iniciarCombate() {
    gameState = "BATALHA";
    vilao = {
        nome: "Guardião de Pedra",
        hp: 120, hpMax: 120,
        ataque: 14,
        defendendo: false
    };

    // Atualiza Textos
    document.getElementById("lbl-monster-name").innerText = vilao.nome;
    document.getElementById("battle-log").innerText = `O ${vilao.nome} ruge! O combate por turnos começou.`;
    document.getElementById("battle-screen").classList.remove("hidden");
    
    atualizarPainelDados();
}

function atualizarPainelDados() {
    document.getElementById("lbl-player-hp").innerText = heroi.hp;
    document.getElementById("bar-player-player-hp")
    document.getElementById("bar-player-hp").style.width = `${(heroi.hp / heroi.hpMax) * 100}%`;
    document.getElementById("lbl-player-state").innerText = heroi.defendendo ? "🛡️ Postura Defensiva Ativa" : "";

    document.getElementById("lbl-monster-hp").innerText = vilao.hp;
    document.getElementById("bar-monster-hp").style.width = `${(vilao.hp / vilao.hpMax) * 100}%`;
    document.getElementById("lbl-monster-state").innerText = vilao.defendendo ? "🛡️ Monstro está resguardado" : "";
    document.getElementById("lbl-potions").innerText = heroi.potcoes;
}

// Ações do Menu de Luta
function comandar(acao) {
    if (gameState !== "BATALHA") return;

    let log = document.getElementById("battle-log");
    heroi.defendendo = false; // Reseta defesa do turno anterior

    // 1. TURNO DO JOGADOR
    if (acao === 'ataque_leve') {
        let dano = 12 + Math.floor(Math.random() * 5);
        if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
        vilao.hp = Math.max(0, vilao.hp - dano);
        log.innerText = `Você desferiu um Golpe Leve certeiro! Causou ${dano} de dano.`;
    } 
    else if (acao === 'ataque_pesado') {
        if (Math.random() > 0.5) { // 50% chance
            let dano = 28 + Math.floor(Math.random() * 10);
            if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
            vilao.hp = Math.max(0, vilao.hp - dano);
            log.innerText = `💥 CRÍTICO! Seu Ataque Pesado esmagou o rival causou ${dano} de dano!`;
        } else {
            log.innerText = `❌ Você errou o balanço do Ataque Pesado!`;
        }
    } 
    else if (acao === 'defender') {
        heroi.defendendo = true;
        log.innerText = `Você ergueu os braços e se preparou para o impacto (-50% de dano sofrido).`;
    } 
    else if (acao === 'curar') {
        if (heroi.potcoes > 0) {
            heroi.hp = Math.min(heroi.hpMax, heroi.hp + 40);
            heroi.potcoes--;
            log.innerText = `🧪 Você tomou um Elixir de Cura. Recuperou 40 de Vida!`;
        } else {
            log.innerText = `Você não tem mais poções restantes!`;
            return;
        }
    }

    atualizarPainelDados();

    // Verifica morte do Inimigo
    if (vilao.hp <= 0) {
        log.innerText = `🎉 Vitória! O ${vilao.nome} desmoronou em pedaços!`;
        setTimeout(finalizarCombate, 2000);
        return;
    }

    // Passa o Turno para o Monstro
    controlarBotoes(true);
    setTimeout(turnoDoMonstro, 1500);
}

function turnoDoMonstro() {
    if (gameState !== "BATALHA") return;
    let log = document.getElementById("battle-log");

    // IA do Monstro Inteligente
    let acaoMonstro = Math.random();
    
    if (acaoMonstro < 0.25 && vilao.hp < 40) {
        // Se a vida dele estiver baixa, ele tem chance de defender
        vilao.defendendo = true;
        log.innerText = `O ${vilao.nome} recuou e adotou uma postura rígida de carapaça.`;
    } else {
        // Atacar normalmente
        let dano = Math.floor(vilao.ataque * (0.8 + Math.random() * 0.4));
        if (heroi.defendendo) {
            dano = Math.floor(dano / 2);
            heroi.defendendo = false;
        }
        heroi.hp = Math.max(0, heroi.hp - dano);
        log.innerText = `👹 O ${vilao.nome} golpeou você de volta! Aplicou ${dano} de dano.`;
    }

    atualizarPainelDados();

    if (heroi.hp <= 0) {
        log.innerText = `💀 Você sucumbiu ao poder do monstro... Fim de jogo.`;
        setTimeout(() => location.reload(), 3000); // Reinicia o jogo
    } else {
        controlarBotoes(false);
    }
}

function controlarBotoes(status) {
    document.querySelectorAll(".battle-actions button").forEach(b => b.disabled = status);
}

function finalizarCombate() {
    document.getElementById("battle-screen").classList.add("hidden");
    scene.remove(enemyMesh); // Remove o monstro derrotado do mapa 3D
    gameState = "EXPLORANDO";
}

// --- 4. ENGINE LOOP (REDUÇÃO E FRAMES 3D) ---
function animate() {
    requestAnimationFrame(animate);

    if (gameState === "EXPLORANDO") {
        // Movimentação em 3 dimensões (X e Z controlam o plano do chão)
        if (teclado['w']) playerMesh.position.z -= 0.15;
        if (teclado['s']) playerMesh.position.z += 0.15;
        if (teclado['a']) playerMesh.position.x -= 0.15;
        if (teclado['d']) playerMesh.position.x += 0.15;

        // Câmera dinâmica segue o jogador em 3ª pessoa suavemente
        camera.position.x = playerMesh.position.x;
        camera.position.z = playerMesh.position.z + 12;
        camera.lookAt(playerMesh.position);

        // Animação sutil do Inimigo flutuando no cenário 3D
        enemyMesh.rotation.y += 0.02;
        enemyMesh.rotation.x += 0.01;

        testarEncontroBatalha();
    }

    renderer.render(scene, camera);
}

// Redimensionar tela do jogo caso o usuário mude o tamanho do navegador
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicialização
animate();
