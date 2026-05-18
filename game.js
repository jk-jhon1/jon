// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D (DARK FANTASY) ---
const scene = new THREE.Scene();

// NÉVOA: O segredo do clima Dark Fantasy (esconde o horizonte na escuridão)
scene.background = new THREE.Color(0x020205); 
scene.fog = new THREE.FogExp2(0x020205, 0.04); // Névoa densa preta/roxa ativa

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ILUMINAÇÃO SOMBRIA
// Luz ambiente quase nula para dar o clima de masmorra/subterrâneo
const ambientLight = new THREE.AmbientLight(0x111122, 0.3); 
scene.add(ambientLight);

// Luz Direcional simulando uma lua sangrenta ou energia oculta
const moonLight = new THREE.DirectionalLight(0x442266, 1.2);
moonLight.position.set(20, 40, 20);
scene.add(moonLight);

// Luzes de Ponto (Tochas de Fogo/Lava e Portais Mágicos)
const portalLight = new THREE.PointLight(0x00ffff, 3, 30);
portalLight.position.set(0, 4, 0);
scene.add(portalLight);

// --- 2. CRIAÇÃO DE UM MAPA GIGANTE (150x150) ---
// Chão de Pedra Escura
const floorGeo = new THREE.PlaneGeometry(150, 150);
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x0a0a0f, 
    roughness: 0.9, 
    metalness: 0.1 
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Elementos de Cenário Espalhados (Pilares Góticos e Poças de Magma)
const pilares = [];
const pilarGeo = new THREE.CylinderGeometry(0.8, 1.2, 8, 5); // Pilares sextavados/góticos
const pilarMat = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 1.0 });

const lavaGeo = new THREE.BoxGeometry(6, 0.1, 6);
const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0x991100, roughness: 0.5 });

// Geração procedural do mapa para preencher o espaço gigante
for (let i = 0; i < 45; i++) {
    // Evita colocar obstáculos muito colados no centro (onde o jogador nasce)
    let x = (Math.random() - 0.5) * 130;
    let z = (Math.random() - 0.5) * 130;
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue; 

    if (Math.random() > 0.4) {
        // Spawna Pilar Gótico
        const pilar = new THREE.Mesh(pilarGeo, pilarMat);
        pilar.position.set(x, 4, z);
        scene.add(pilar);
        pilares.push(pilar);
    } else {
        // Spawna Poça de Magma Incandescente com luz própria
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.position.set(x, 0.05, z);
        scene.add(lava);

        const lavaLight = new THREE.PointLight(0xff3300, 1.5, 12);
        lavaLight.position.set(x, 1.5, z);
        scene.add(lavaLight);
    }
}

// --- 3. MODELO DO JOGADOR (Cavaleiro Alado Set +15) ---
const playerGroup = new THREE.Group();
const armorMat = new THREE.MeshStandardMaterial({ color: 0x0055ff, metalness: 0.95, roughness: 0.05 }); // Armadura azul espelhada
const trimMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.1 });

// Peitoral e Ombreiras
const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1), armorMat);
torso.position.y = 1.4;
playerGroup.add(torso);

const shoulderL = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 4), trimMat);
shoulderL.position.set(-1, 2.2, 0);
shoulderL.rotation.z = Math.PI / 3;
playerGroup.add(shoulderL);
const shoulderR = shoulderL.clone(); shoulderR.position.x = 1; shoulderR.rotation.z = -Math.PI / 3;
playerGroup.add(shoulderR);

// Elmo Fechado
const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), armorMat);
helmet.position.y = 2.6;
playerGroup.add(helmet);

// Asas de Plasma (Brilho intenso azul)
const wingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 });
const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 4, 4), wingMat);
wingL.position.set(-1.4, 2.4, -0.5);
wingL.rotation.set(0, 0, Math.PI / 2.5);
playerGroup.add(wingL);
const wingR = wingL.clone(); wingR.position.x = 1.4; wingR.rotation.z = -Math.PI / 2.5;
playerGroup.add(wingR);

// Espada Gigante Iluminada nas costas
const sword = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 0.6), trimMat);
sword.position.set(0.7, 1.8, 0.6);
sword.rotation.z = -Math.PI / 5;
playerGroup.add(sword);

scene.add(playerGroup);
playerGroup.position.set(0, 0, 0);

// --- 4. MODELO DO MONSTRO (Lorde Demônio de Mu Origin) ---
const enemyGroup = new THREE.Group();
const demonMat = new THREE.MeshStandardMaterial({ color: 0x110c0c, roughness: 0.9 });
const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff0000, roughness: 0.3 });

// Corpo Robusto
const demonTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.8, 3, 6), demonMat);
demonTorso.position.y = 2;
enemyGroup.add(demonTorso);

// Cabeça e Chifres Gigantes
const demonHead = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), demonMat);
demonHead.position.y = 3.8;
enemyGroup.add(demonHead);

const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2, 4), magmaMat);
hornL.position.set(-0.8, 4.4, 0.4);
hornL.rotation.set(Math.PI / 3, 0, -Math.PI / 5);
enemyGroup.add(hornL);
const hornR = hornL.clone(); hornR.position.x = 0.8; hornR.rotation.z = Math.PI / 5;
enemyGroup.add(hornR);

// Asas de Vampiro Gigantescas (Estilo Asas de Demônio de Mu)
const dWingMat = new THREE.MeshStandardMaterial({ color: 0x0a0505, roughness: 1.0 });
const dWingL = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2, 0.15), dWingMat);
dWingL.position.set(-3, 3, -0.6);
dWingL.rotation.y = Math.PI / 5;
enemyGroup.add(dWingL);
const dWingR = dWingL.clone(); dWingR.position.x = 3; dWingR.rotation.y = -Math.PI / 5;
enemyGroup.add(dWingR);

scene.add(enemyGroup);
// Inicializa o Boss um pouco distante do ponto inicial
enemyGroup.position.set(15, 0, -25);

// Câmera posicionada em terceira pessoa gótica (mais inclinada de cima)
camera.position.set(0, 11, 15);
camera.lookAt(playerGroup.position);

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
    vilao = {
        nome: "Barrog, o Destruidor",
        hp: 180, hpMax: 180,
        ataque: 18,
        defendendo: false
    };

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
    } 
    else if (acao === 'ataque_pesado') {
        if (Math.random() > 0.45) {
            let dano = 40 + Math.floor(Math.random() * 15);
            if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
            vilao.hp = Math.max(0, vilao.hp - dano);
            log.innerText = `💥 IMPACTO SUPREMO! Você causou um rombo de ${dano} de dano no demônio!`;
        } else {
            log.innerText = `❌ O ataque falhou! O Boss repeliu sua espada.`;
        }
    } 
    else if (acao === 'defender') {
        heroi.defendendo = true;
        log.innerText = `Você conjurou a Barreira de Lorencia (-50% de dano).`;
    } 
    else if (acao === 'curar') {
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
}

// --- 6. ENGINE LOOP ---
let tempo = 0;
function animate() {
    requestAnimationFrame(animate);
    tempo += 0.05;

    if (gameState === "EXPLORANDO") {
        // Movimentação livre pelo mapa gigante de 150x150
        if (teclado['w'] || teclado['arrowup']) playerGroup.position.z -= 0.2;
        if (teclado['s'] || teclado['arrowdown']) playerGroup.position.z += 0.2;
        if (teclado['a'] || teclado['arrowleft']) playerGroup.position.x -= 0.2;
        if (teclado['d'] || teclado['arrowright']) playerGroup.position.x += 0.2;

        // Limites invisíveis do mapa para o jogador não cair no vazio infinito
        playerGroup.position.x = Math.max(-70, Math.min(70, playerGroup.position.x));
        playerGroup.position.z = Math.max(-70, Math.min(70, playerGroup.position.z));

        // Câmera gótica suave perseguindo o Herói
        camera.position.x = playerGroup.position.x;
        camera.position.z = playerGroup.position.z + 14;
        camera.lookAt(playerGroup.position);

        // Respirações e asas batendo em sincronia macabra
        wingL.rotation.y = Math.sin(tempo) * 0.25;
        wingR.rotation.y = -Math.sin(tempo) * 0.25;

        dWingL.rotation.z = Math.sin(tempo) * 0.12;
        dWingR.rotation.z = -Math.sin(tempo) * 0.12;
        enemyGroup.position.y = 0.5 + Math.sin(tempo * 0.4) * 0.4; // O Boss levita lentamente

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
