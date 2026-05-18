// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D (DARK FANTASY) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205); 
scene.fog = new THREE.FogExp2(0x020205, 0.04); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x111122, 0.3); 
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x442266, 1.2);
moonLight.position.set(20, 40, 20);
scene.add(moonLight);

const portalLight = new THREE.PointLight(0x00ffff, 3, 30);
portalLight.position.set(0, 4, 0);
scene.add(portalLight);

// --- 2. MAPA GIGANTE ---
const floorGeo = new THREE.PlaneGeometry(150, 150);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.9, metalness: 0.1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const pilarGeo = new THREE.CylinderGeometry(0.8, 1.2, 8, 5); 
const pilarMat = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 1.0 });

const lavaGeo = new THREE.BoxGeometry(6, 0.1, 6);
const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0x991100, roughness: 0.5 });

for (let i = 0; i < 45; i++) {
    let x = (Math.random() - 0.5) * 130;
    let z = (Math.random() - 0.5) * 130;
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue; 

    if (Math.random() > 0.4) {
        const pilar = new THREE.Mesh(pilarGeo, pilarMat);
        pilar.position.set(x, 4, z);
        scene.add(pilar);
    } else {
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.position.set(x, 0.05, z);
        scene.add(lava);

        const lavaLight = new THREE.PointLight(0xff3300, 1.5, 12);
        lavaLight.position.set(x, 1.5, z);
        scene.add(lavaLight);
    }
}

// --- 3. MODELO DO JOGADOR ---
const playerGroup = new THREE.Group();
const armorMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, metalness: 0.95, roughness: 0.05 }); 
const trimMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.1 });

const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1), armorMat);
torso.position.y = 1.4;
playerGroup.add(torso);

const shoulderL = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 4), trimMat);
shoulderL.position.set(-1, 2.2, 0);
shoulderL.rotation.z = Math.PI / 3;
playerGroup.add(shoulderL);
const shoulderR = shoulderL.clone(); shoulderR.position.x = 1; shoulderR.rotation.z = -Math.PI / 3;
playerGroup.add(shoulderR);

const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), armorMat);
helmet.position.y = 2.6;
playerGroup.add(helmet);

const wingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 });
const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 4, 4), wingMat);
wingL.position.set(-1.4, 2.4, -0.5);
wingL.rotation.set(0, 0, Math.PI / 2.5);
playerGroup.add(wingL);
const wingR = wingL.clone(); wingR.position.x = 1.4; wingR.rotation.z = -Math.PI / 2.5;
playerGroup.add(wingR);

const sword = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 0.6), trimMat);
sword.position.set(0.7, 1.8, 0.6);
sword.rotation.z = -Math.PI / 5;
playerGroup.add(sword);

scene.add(playerGroup);
playerGroup.position.set(0, 0, 0);

// --- NOVA CÂMERA (ESTILO MINECRAFT / TERCEIRA PESSOA DINÂMICA) ---
// Criamos um pivô (pescoço) para a câmera girar para cima e para baixo
const cameraPivot = new THREE.Group();
cameraPivot.position.set(0, 3, 0); // Altura da cabeça/ombros do jogador
playerGroup.add(cameraPivot); // A câmera agora é parte do corpo do jogador

cameraPivot.add(camera);
camera.position.set(0, 3, 12); // Posição fixa atrás do jogador
camera.lookAt(0, 0, 0); // Olha sempre para frente em relação ao corpo

// --- SISTEMA DE MOUSE (POINTER LOCK) ---
let mouseTravado = false;
const uiTravarMouse = document.getElementById("travar-mouse-ui");

uiTravarMouse.addEventListener("click", () => {
    document.body.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === document.body) {
        mouseTravado = true;
        uiTravarMouse.classList.add("hidden");
    } else {
        mouseTravado = false;
        if(gameState === "EXPLORANDO") uiTravarMouse.classList.remove("hidden");
    }
});

// Ler o movimento do mouse para girar o jogador e a câmera
document.addEventListener("mousemove", (e) => {
    if (!mouseTravado || gameState !== "EXPLORANDO") return;

    const sensibilidade = 0.003;

    // Gira o CORPO inteiro do jogador para Esquerda/Direita (Eixo Y)
    playerGroup.rotation.y -= e.movementX * sensibilidade;

    // Gira apenas a CÂMERA (Pivô) para Cima/Baixo (Eixo X)
    cameraPivot.rotation.x -= e.movementY * sensibilidade;
    
    // Limite para a câmera não dar uma cambalhota por cima do herói
    cameraPivot.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, cameraPivot.rotation.x));
});


// --- 4. MODELO DO MONSTRO ---
const enemyGroup = new THREE.Group();
const demonMat = new THREE.MeshStandardMaterial({ color: 0x110c0c, roughness: 0.9 });
const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, roughness: 0.3 });

const demonTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.8, 3, 6), demonMat);
demonTorso.position.y = 2;
enemyGroup.add(demonTorso);

const demonHead = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), demonMat);
demonHead.position.y = 3.8;
enemyGroup.add(demonHead);

const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2, 4), magmaMat);
hornL.position.set(-0.8, 4.4, 0.4);
hornL.rotation.set(Math.PI / 3, 0, -Math.PI / 5);
enemyGroup.add(hornL);
const hornR = hornL.clone(); hornR.position.x = 0.8; hornR.rotation.z = Math.PI / 5;
enemyGroup.add(hornR);

const dWingMat = new THREE.MeshStandardMaterial({ color: 0x0a0505, roughness: 1.0 });
const dWingL = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2, 0.15), dWingMat);
dWingL.position.set(-3, 3, -0.6);
dWingL.rotation.y = Math.PI / 5;
enemyGroup.add(dWingL);
const dWingR = dWingL.clone(); dWingR.position.x = 3; dWingR.rotation.y = -Math.PI / 5;
enemyGroup.add(dWingR);

scene.add(enemyGroup);
enemyGroup.position.set(15, 0, -25);

// --- 5. SISTEMA DE JOGO E COMBATE ---
let gameState = "EXPLORANDO";
const heroi = { hp: 100, hpMax: 100, potcoes: 3, defendendo: false };
let vilao = null;

const teclado = {};
window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

function testarEncontroBatalha() {
    let distancia = playerGroup.position.distanceTo(enemyGroup.position);
    if (distancia < 4.5 && gameState === "EXPLORANDO") {
        iniciarCombate();
    }
}

function iniciarCombate() {
    gameState = "BATALHA";
    
    // Libera o mouse do jogador para ele poder clicar nos botões de ataque!
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    uiTravarMouse.classList.add("hidden");

    vilao = { nome: "Barrog, o Destruidor", hp: 180, hpMax: 180, ataque: 18, defendendo: false };

    document.getElementById("lbl-monster-name").innerText = vilao.nome;
    document.getElementById("battle-log").innerText = `⚠️ ENCONTRO CHEFE: ${vilao.nome} interceptou você na névoa!`;
    document.getElementById("battle-screen").classList.remove("hidden");
    atualizarPainelDados();
}

function atualizarPainelDados() {
    document.getElementById("lbl-player-hp").innerText = heroi.hp;
    document.getElementById("bar-player-hp").style.width = `${(heroi.hp / heroi.hpMax) * 100}%`;
    document.getElementById("lbl-player-state").innerText = heroi.defendendo ? "🛡️ Escudo de Almas Ativo" : "";

    document.getElementById("lbl-monster-hp").innerText = vilao.hp;
    document.getElementById("bar-monster-hp").style.width = `${(vilao.hp / vilao.hpMax) * 100}%`;
    document.getElementById("lbl-monster-state").innerText = vilao.defendendo ? "🛡️ Chefe em Carapaça de Ferro" : "";
    document.getElementById("lbl-potions").innerText = heroi.potcoes;
}

function comandar(acao) {
    if (gameState !== "BATALHA") return;
    let log = document.getElementById("battle-log");
    heroi.defendendo = false;

    if (acao === 'ataque_leve') {
        let dano = 15 + Math.floor(Math.random() * 8);
        if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
        vilao.hp = Math.max(0, vilao.hp - dano);
        log.innerText = `Você usou a fúria das lâminas! Desferiu ${dano} de dano bento.`;
    } else if (acao === 'ataque_pesado') {
        if (Math.random() > 0.45) {
            let dano = 40 + Math.floor(Math.random() * 15);
            if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
            vilao.hp = Math.max(0, vilao.hp - dano);
            log.innerText = `💥 IMPACTO SUPREMO! Você causou um rombo de ${dano} de dano no demônio!`;
        } else {
            log.innerText = `❌ O ataque falhou! O Boss repeliu sua espada.`;
        }
    } else if (acao === 'defender') {
        heroi.defendendo = true;
        log.innerText = `Você conjurou a Barreira de Lorencia (-50% de dano).`;
    } else if (acao === 'curar') {
        if (heroi.potcoes > 0) {
            heroi.hp = Math.min(heroi.hpMax, heroi.hp + 50);
            heroi.potcoes--;
            log.innerText = `🧪 Poção Divina restaurou 50 pontos de Vida!`;
        } else {
            log.innerText = `Acabaram as poções!`; return;
        }
    }

    atualizarPainelDados();

    if (vilao.hp <= 0) {
        log.innerText = `🎉 GLÓRIA! Você baniu ${vilao.nome} de volta para o abismo!`;
        setTimeout(finalizarCombate, 2500);
        return;
    }

    controlarBotoes(true);
    setTimeout(turnoDoMonstro, 1200);
}

function turnoDoMonstro() {
    if (gameState !== "BATALHA") return;
    let log = document.getElementById("battle-log");

    if (vilao.hp < 60 && Math.random() < 0.35) {
        vilao.defendendo = true;
        log.innerText = `O demônio se envolve em suas asas góticas indestrutíveis.`;
    } else {
        let dano = Math.floor(vilao.ataque * (0.8 + Math.random() * 0.5));
        if (heroi.defendendo) { dano = Math.floor(dano / 2); heroi.defendendo = false; }
        heroi.hp = Math.max(0, heroi.hp - dano);
        log.innerText = `🔥 CEIFADOR DO INFERNO! O ataque do chefe arrancou ${dano} do seu HP!`;
    }

    atualizarPainelDados();

    if (heroi.hp <= 0) {
        log.innerText = `💀 Sua alma foi consumida pela escuridão...`;
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
    uiTravarMouse.classList.remove("hidden"); // Pede pro jogador trancar o mouse de novo
}

// --- 6. ENGINE LOOP ---
let tempo = 0;
function animate() {
    requestAnimationFrame(animate);
    tempo += 0.05;

    if (gameState === "EXPLORANDO" && mouseTravado) {
        const velocidade = 0.25;

        // O jogador agora se move de forma relativa à direção que ele está olhando!
        // Z Negativo (-velocidade) significa "frente" em Three.js
        if (teclado['w'] || teclado['arrowup']) playerGroup.translateZ(-velocidade);
        if (teclado['s'] || teclado['arrowdown']) playerGroup.translateZ(velocidade);
        if (teclado['a'] || teclado['arrowleft']) playerGroup.translateX(-velocidade);
        if (teclado['d'] || teclado['arrowright']) playerGroup.translateX(velocidade);

        // Travando o jogador dentro dos limites do mapa
        playerGroup.position.x = Math.max(-70, Math.min(70, playerGroup.position.x));
        playerGroup.position.z = Math.max(-70, Math.min(70, playerGroup.position.z));

        // Animação das asas respirando
        wingL.rotation.y = Math.sin(tempo) * 0.25;
        wingR.rotation.y = -Math.sin(tempo) * 0.25;

        dWingL.rotation.z = Math.sin(tempo) * 0.12;
        dWingR.rotation.z = -Math.sin(tempo) * 0.12;
        enemyGroup.position.y = 0.5 + Math.sin(tempo * 0.4) * 0.4; 

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
