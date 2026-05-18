// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D (THREE.JS) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208); // Céu dark gótico

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Iluminação Épica (Luzes coloridas simulando portais/magia de Mu)
const light = new THREE.AmbientLight(0xffffff, 0.2); 
scene.add(light);

const blueLight = new THREE.PointLight(0x00aaff, 2, 50);
blueLight.position.set(0, 5, 0);
scene.add(blueLight);

const redLight = new THREE.PointLight(0xff3300, 2, 50);
redLight.position.set(0, 5, -18);
scene.add(redLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 15);
scene.add(dirLight);

// O Chão (Arena Subterrânea / Dungeon)
const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9, metalness: 0.2 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- CONSTRUÇÃO DO HERÓI (Estilo Cavaleiro de Mu Origin com Asas Épicas) ---
const playerGroup = new THREE.Group(); // Agrupa todas as partes do herói

// Armadura Reluzente (Metalness alto e Roughness baixo para brilhar como Set +15)
const armorMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.9, roughness: 0.1 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.1 });

// Corpo/Peitoral
const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1), armorMat);
torso.position.y = 1.4;
playerGroup.add(torso);

// Ombreiras Gigantes (Clássico de Mu)
const shoulderL = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 4), trimMat);
shoulderL.position.set(-0.9, 2.1, 0);
shoulderL.rotation.z = Math.PI / 4;
playerGroup.add(shoulderL);

const shoulderR = shoulderL.clone();
shoulderR.position.x = 0.9;
shoulderR.rotation.z = -Math.PI / 4;
playerGroup.add(shoulderR);

// Cabeça / Elmo Alado
const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), armorMat);
helmet.position.y = 2.6;
playerGroup.add(helmet);
const crest = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 4), trimMat);
crest.position.set(0, 3.1, 0);
playerGroup.add(crest);

// ASAS DE ENERGIA (O maior símbolo de Mu Origin)
const wingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.7 });
const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3, 4), wingMat);
wingL.position.set(-1.2, 2.2, -0.6);
wingL.rotation.set(0, 0, Math.PI / 3);
playerGroup.add(wingL);

const wingR = wingL.clone();
wingR.position.x = 1.2;
wingR.rotation.z = -Math.PI / 3;
playerGroup.add(wingR);

// Espada Colossal Reluzente nas Costas/Mão
const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.5), trimMat);
swordBlade.position.set(0.8, 1.5, 0.6);
swordBlade.rotation.z = -Math.PI / 6;
playerGroup.add(swordBlade);

scene.add(playerGroup);
playerGroup.position.set(0, 0, 0);


// --- CONSTRUÇÃO DO MONSTRO (Estilo Kundun / Demônio de Kanturu de Mu Origin) ---
const enemyGroup = new THREE.Group();
const demonMat = new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.7 });
const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff1100, metalness: 0.3 });

// Corpo Massivo
const demonTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 2.5, 6), demonMat);
demonTorso.position.y = 1.8;
enemyGroup.add(demonTorso);

// Chifres Longos e Curvados
const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.5, 4), magmaMat);
hornL.position.set(-0.6, 3.6, 0.3);
hornL.rotation.set(Math.PI / 4, 0, -Math.PI / 6);
enemyGroup.add(hornL);

const hornR = hornL.clone();
hornR.position.x = 0.6;
hornR.rotation.z = Math.PI / 6;
enemyGroup.add(hornR);

// Cabeça Demoníaca
const demonHead = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), demonMat);
demonHead.position.y = 3.2;
enemyGroup.add(demonHead);

// Asas de Morcego / Gárgula escuras
const demonWingMat = new THREE.MeshStandardMaterial({ color: 0x110505, roughness: 0.9 });
const dWingL = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.1), demonWingMat);
dWingL.position.set(-2.2, 2.5, -0.5);
dWingL.rotation.y = Math.PI / 6;
enemyGroup.add(dWingL);

const dWingR = dWingL.clone();
dWingR.position.x = 2.2;
dWingR.rotation.y = -Math.PI / 6;
enemyGroup.add(dWingR);

scene.add(enemyGroup);
enemyGroup.position.set(0, 0, -18);

// Posicionamento da Câmera
camera.position.set(0, 8, 12);
camera.lookAt(playerGroup.position);

// --- 2. LÓGICA E ESTADOS DE JOGO ---
let gameState = "EXPLORANDO";

const heroi = {
    hp: 100, hpMax: 100,
    potcoes: 3,
    defendendo: false
};

let vilao = null;
const teclado = {};
window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

// --- 3. SISTEMA DE BATALHA AVANÇADO ---
function testarEncontroBatalha() {
    let distancia = playerGroup.position.distanceTo(enemyGroup.position);
    if (distancia < 4.0 && gameState === "EXPLORANDO") {
        iniciarCombate();
    }
}

function iniciarCombate() {
    gameState = "BATALHA";
    vilao = {
        nome: "Lord Kundun (Avatar)",
        hp: 150, hpMax: 150,
        ataque: 16,
        defendendo: false
    };

    document.getElementById("lbl-monster-name").innerText = vilao.nome;
    document.getElementById("battle-log").innerText = `O terrível ${vilao.nome} surgiu das profundezas!`;
    document.getElementById("battle-screen").classList.remove("hidden");
    
    atualizarPainelDados();
}

function atualizarPainelDados() {
    document.getElementById("lbl-player-hp").innerText = heroi.hp;
    document.getElementById("bar-player-hp").style.width = `${(heroi.hp / heroi.hpMax) * 100}%`;
    document.getElementById("lbl-player-state").innerText = heroi.defendendo ? "🛡️ Defesa de Vidro Ativa" : "";

    document.getElementById("lbl-monster-hp").innerText = vilao.hp;
    document.getElementById("bar-monster-hp").style.width = `${(vilao.hp / vilao.hpMax) * 100}%`;
    document.getElementById("lbl-monster-state").innerText = vilao.defendendo ? "🛡️ Boss está em postura rígida" : "";
    document.getElementById("lbl-potions").innerText = heroi.potcoes;
}

function comandar(acao) {
    if (gameState !== "BATALHA") return;

    let log = document.getElementById("battle-log");
    heroi.defendendo = false;

    if (acao === 'ataque_leve') {
        let dano = 15 + Math.floor(Math.random() * 6);
        if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
        vilao.hp = Math.max(0, vilao.hp - dano);
        log.innerText = `Você usou o Corte de Energia! Causou ${dano} de dano em área.`;
        // Pequeno efeito visual de tremor no Boss
        enemyGroup.position.x += 0.5; setTimeout(() => enemyGroup.position.x -= 0.5, 100);
    } 
    else if (acao === 'ataque_pesado') {
        if (Math.random() > 0.4) {
            let dano = 35 + Math.floor(Math.random() * 15);
            if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
            vilao.hp = Math.max(0, vilao.hp - dano);
            log.innerText = `💥 EXPLO de FORÇA! Seu ataque estraçalhou a armadura dele por ${dano} de dano!`;
            enemyGroup.position.z -= 1; setTimeout(() => enemyGroup.position.z += 1, 150);
        } else {
            log.innerText = `❌ O Boss esquivou do seu golpe devastador!`;
        }
    } 
    else if (acao === 'defender') {
        heroi.defendendo = true;
        log.innerText = `Você ativou o Escudo Espiritual (-50% de dano sofrido).`;
    } 
    else if (acao === 'curar') {
        if (heroi.potcoes > 0) {
            heroi.hp = Math.min(heroi.hpMax, heroi.hp + 45);
            heroi.potcoes--;
            log.innerText = `🧪 Poção Completa consumida. +45 de Vida!`;
        } else {
            log.innerText = `Sem poções no inventário!`;
            return;
        }
    }

    atualizarPainelDados();

    if (vilao.hp <= 0) {
        log.innerText = `🎉 Vitória Épica! O ${vilao.nome} virou cinzas douradas!`;
        setTimeout(finalizarCombate, 2000);
        return;
    }

    controlarBotoes(true);
    setTimeout(turnoDoMonstro, 1200);
}

function determinarAcaoBoss() {
    if (vilao.hp < 50 && Math.random() < 0.4) {
        return "DEFENDER";
    }
    return "ATACAR";
}

function turnoDoMonstro() {
    if (gameState !== "BATALHA") return;
    let log = document.getElementById("battle-log");

    let acao = determinarAcaoBoss();
    
    if (acao === "DEFENDER") {
        vilao.defendendo = true;
        log.innerText = `O ${vilao.nome} canalizou uma aura de chamas negras protetora.`;
    } else {
        let dano = Math.floor(vilao.ataque * (0.8 + Math.random() * 0.5));
        if (heroi.defendendo) {
            dano = Math.floor(dano / 2);
            heroi.defendendo = false;
        }
        heroi.hp = Math.max(0, heroi.hp - dano);
        log.innerText = `👹 FOGO DO INFERNO! O ${vilao.nome} te incinerou causando ${dano} de dano!`;
        
        // Efeito visual de dano na tela piscando a luz azul
        blueLight.color.setHex(0xff0000); setTimeout(() => blueLight.color.setHex(0x00aaff), 200);
    }

    atualizarPainelDados();

    if (heroi.hp <= 0) {
        log.innerText = `💀 Você tombou perante as forças de Kundun...`;
        setTimeout(() => location.reload(), 3000);
    } else {
        controlarBotoes(false);
    }
}

function controlarBotoes(status) {
    document.querySelectorAll(".battle-actions button").forEach(b => b.disabled = status);
}

function finalizarCombate() {
    document.getElementById("battle-screen").classList.add("hidden");
    scene.remove(enemyGroup);
    gameState = "EXPLORANDO";
}

// --- 4. ENGINE LOOP ---
let tempo = 0;
function animate() {
    requestAnimationFrame(animate);
    tempo += 0.05;

    if (gameState === "EXPLORANDO") {
        if (teclado['w'] || teclado['arrowup']) playerGroup.position.z -= 0.18;
        if (teclado['s'] || teclado['arrowdown']) playerGroup.position.z += 0.18;
        if (teclado['a'] || teclado['arrowleft']) playerGroup.position.x -= 0.18;
        if (teclado['d'] || teclado['arrowright']) playerGroup.position.x += 0.18;

        // Câmera segue o jogador
        camera.position.x = playerGroup.position.x;
        camera.position.z = playerGroup.position.z + 12;
        camera.lookAt(playerGroup.position);

        // Animação das asas do herói (Efeito de bater asas flutuando suavemente)
        wingL.rotation.y = Math.sin(tempo) * 0.2;
        wingR.rotation.y = -Math.sin(tempo) * 0.2;

        // Animação das asas e rotação do Boss de Mu
        dWingL.rotation.z = Math.sin(tempo) * 0.1;
        dWingR.rotation.z = -Math.sin(tempo) * 0.1;
        enemyGroup.position.y = 0 + Math.sin(tempo * 0.5) * 0.3; // Flutuação macabra

        testarEncontroBatalha();
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
