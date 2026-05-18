// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D REALISTA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103); 
scene.fog = new THREE.FogExp2(0x010103, 0.035); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x111122, 0.2); 
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x442277, 1.5);
moonLight.position.set(30, 50, 30);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048; 
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 150;
moonLight.shadow.camera.left = -60;
moonLight.shadow.camera.right = 60;
moonLight.shadow.camera.top = 60;
moonLight.shadow.camera.bottom = -60;
moonLight.shadow.bias = -0.001; 
scene.add(moonLight);

const portalLight = new THREE.PointLight(0x00aaff, 2, 40);
portalLight.position.set(0, 5, 0);
scene.add(portalLight);

// --- 2. MAPA COM RELEVO ROCHOSO ---
const floorGeo = new THREE.PlaneGeometry(150, 150, 100, 100);
const posAtributo = floorGeo.attributes.position;
for (let i = 0; i < posAtributo.count; i++) {
    let z = posAtributo.getZ(i);
    z += Math.random() * 0.4;
    posAtributo.setZ(i, z);
}
floorGeo.computeVertexNormals();

const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x0a0a0e, 
    roughness: 0.8, 
    metalness: 0.2,
    flatShading: true 
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true; 
scene.add(floor);

const pilarGeo = new THREE.CylinderGeometry(0.6, 1.5, 12, 6); 
const pilarMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9, flatShading: true });
const lavaGeo = new THREE.BoxGeometry(7, 0.5, 7);
const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff1100, roughness: 0.2 });

for (let i = 0; i < 40; i++) {
    let x = (Math.random() - 0.5) * 120;
    let z = (Math.random() - 0.5) * 120;
    if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; 

    if (Math.random() > 0.4) {
        const pilar = new THREE.Mesh(pilarGeo, pilarMat);
        pilar.position.set(x, 5, z);
        pilar.castShadow = true;
        pilar.receiveShadow = true;
        scene.add(pilar);
    } else {
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.position.set(x, 0, z);
        scene.add(lava);

        const lavaLight = new THREE.PointLight(0xff3300, 2, 15);
        lavaLight.position.set(x, 2, z);
        scene.add(lavaLight);
    }
}

// --- SISTEMA DE PARTÍCULAS (Cinzas) ---
const particlesGeo = new THREE.BufferGeometry();
const particlesCount = 800;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100; 
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMat = new THREE.PointsMaterial({
    size: 0.15,
    color: 0xff7700,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending 
});
const particulas = new THREE.Points(particlesGeo, particlesMat);
scene.add(particulas);

// --- 3. MODELO DO JOGADOR ---
const playerGroup = new THREE.Group();
const armorMat = new THREE.MeshStandardMaterial({ color: 0x112244, metalness: 0.8, roughness: 0.3 }); 
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 1.0, roughness: 0.2 });

const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.6, 8), armorMat);
torso.position.y = 1.6;
torso.castShadow = true;
playerGroup.add(torso);

const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), goldMat);
shoulderL.position.set(-0.8, 2.2, 0);
shoulderL.castShadow = true;
playerGroup.add(shoulderL);
const shoulderR = shoulderL.clone(); shoulderR.position.x = 0.8;
playerGroup.add(shoulderR);

const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 8), armorMat);
helmet.position.y = 2.8;
helmet.castShadow = true;
playerGroup.add(helmet);
const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), new THREE.MeshBasicMaterial({color: 0x00ffff}));
visor.position.set(0, 2.85, -0.2); 
playerGroup.add(visor);

const wingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.5 });
const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4, 3), wingMat);
wingL.position.set(-1.0, 2.5, 0.5);
wingL.rotation.set(0, 0, Math.PI / 3);
playerGroup.add(wingL);
const wingR = wingL.clone(); wingR.position.x = 1.0; wingR.rotation.z = -Math.PI / 3;
playerGroup.add(wingR);

const swordGroup = new THREE.Group();
const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), goldMat);
const guard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), goldMat);
guard.position.y = 0.3;
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.05), new THREE.MeshStandardMaterial({color: 0xdddddd, metalness: 1, roughness: 0.1}));
blade.position.y = 1.6;
swordGroup.add(grip, guard, blade);
swordGroup.position.set(0.6, 1.2, -0.5);
swordGroup.rotation.x = Math.PI / 2; 
swordGroup.castShadow = true;
playerGroup.add(swordGroup);

scene.add(playerGroup);
playerGroup.position.set(0, 0, 0);

// --- NAVEGAÇÃO DA CÂMERA (PIVÔ) ---
const cameraPivot = new THREE.Group();
cameraPivot.position.set(0, 3, 0); 
playerGroup.add(cameraPivot); 
cameraPivot.add(camera);
camera.position.set(0, 2, 8); 
camera.lookAt(0, 0, 0); 

// --- CONTROLE DE MOUSE (POINTER LOCK) ---
let mouseTravado = false;
const uiTravarMouse = document.getElementById("travar-mouse-ui");

uiTravarMouse.addEventListener("click", () => { 
    if(gameState === "EXPLORANDO") document.body.requestPointerLock(); 
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

document.addEventListener("mousemove", (e) => {
    if (!mouseTravado || gameState !== "EXPLORANDO") return;
    const sensibilidade = 0.003;
    playerGroup.rotation.y -= e.movementX * sensibilidade;
    cameraPivot.rotation.x -= e.movementY * sensibilidade;
    cameraPivot.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 3, cameraPivot.rotation.x));
});

// --- 4. MODELO DO MONSTRO REALISTA ---
const enemyGroup = new THREE.Group();
const demonMat = new THREE.MeshStandardMaterial({ color: 0x0d0808, roughness: 0.9, flatShading: true });
const magmaMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0x880000, roughness: 0.5 });

const demonTorso = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 12), demonMat);
demonTorso.position.y = 2.5;
demonTorso.scale.set(1, 1.2, 0.8); 
demonTorso.castShadow = true;
enemyGroup.add(demonTorso);

const demonHead = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 1.2, 8), demonMat);
demonHead.position.y = 4.5;
demonHead.castShadow = true;
enemyGroup.add(demonHead);

const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.8, 6), magmaMat);
hornL.position.set(-0.6, 5.2, 0);
hornL.rotation.set(-Math.PI / 6, 0, -Math.PI / 4);
hornL.castShadow = true;
enemyGroup.add(hornL);
const hornR = hornL.clone(); hornR.position.x = 0.6; hornR.rotation.z = Math.PI / 4;
enemyGroup.add(hornR);

const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 0xff0000}));
eyeL.position.set(-0.3, 4.6, -0.7);
enemyGroup.add(eyeL);
const eyeR = eyeL.clone(); eyeR.position.x = 0.3;
enemyGroup.add(eyeR);

scene.add(enemyGroup);
enemyGroup.position.set(15, 0, -25);

// --- 5. LÓGICA DO JOGO E EVENTOS ---
let gameState = "EXPLORANDO";
const heroi = { hp: 100, hpMax: 100, potcoes: 3, defendendo: false };
let vilao = null;

const teclado = {};
window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

function testarEncontroBatalha() {
    let distancia = playerGroup.position.distanceTo(enemyGroup.position);
    if (distancia < 5.0 && gameState === "EXPLORANDO") {
        iniciarCombate();
    }
}

function iniciarCombate() {
    gameState = "BATALHA";
    mouseTravado = false;
    if (document.pointerLockElement) document.exitPointerLock();
    uiTravarMouse.classList.add("hidden");

    vilao = { nome: "Barrog, o Destruidor", hp: 180, hpMax: 180, ataque: 18, defendendo: false };
    document.getElementById("lbl-monster-name").innerText = vilao.nome;
    document.getElementById("battle-log").innerText = `⚠️ CHEFE INTERCEPTADO: O Lorde Demônio bloqueia o seu caminho!`;
    document.getElementById("battle-screen").classList.remove("hidden");
    atualizarPainelDados();
}

function atualizarPainelDados() {
    document.getElementById("lbl-player-hp").innerText = heroi.hp;
    document.getElementById("bar-player-hp").style.width = `${(heroi.hp / heroi.hpMax) * 100}%`;
    document.getElementById("lbl-player-state").innerText = heroi.defendendo ? "🛡️ Barreira Ativa (-50%)" : "";

    // Corrigido seletores de ID que antes puxavam IDs duplicados
    document.querySelectorAll("#lbl-monster-hp")[0].innerText = vilao.hp;
    document.getElementById("bar-monster-hp").style.width = `${(vilao.hp / vilao.hpMax) * 100}%`;
    document.getElementById("lbl-monster-state").innerText = vilao.defendendo ? "🛡️ Boss Protegido" : "";
    document.getElementById("lbl-potions").innerText = heroi.potcoes;
}

// Vinculando funções globais para os botões do HTML funcionarem sem erros
window.comandar = function(acao) {
    if (gameState !== "BATALHA") return;
    let log = document.getElementById("battle-log");
    heroi.defendendo = false;

    if (acao === 'ataque_leve') {
        let dano = 15 + Math.floor(Math.random() * 8);
        if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
        vilao.hp = Math.max(0, vilao.hp - dano);
        log.innerText = `Você desferiu um golpe preciso! Tirou ${dano} de HP do Boss.`;
    } else if (acao === 'ataque_pesado') {
        if (Math.random() > 0.40) {
            let dano = 40 + Math.floor(Math.random() * 15);
            if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
            vilao.hp = Math.max(0, vilao.hp - dano);
            log.innerText = `💥 IMPACTO CRÍTICO! Sua espada causou ${dano} de dano massivo!`;
        } else {
            log.innerText = `❌ Você errou a investida! O Boss se esquivou.`;
        }
    } else if (acao === 'defender') {
        heroi.defendendo = true;
        log.innerText = `Você levantou seu escudo mágico para mitigar o próximo dano.`;
    } else if (acao === 'curar') {
        if (heroi.potcoes > 0) {
            heroi.hp = Math.min(heroi.hpMax, heroi.hp + 50);
            heroi.potcoes--;
            log.innerText = `🧪 O Elixir restaurou 50 pontos da sua Vida!`;
        } else {
            log.innerText = `Você não tem mais frascos de Elixir!`; return;
        }
    }

    atualizarPainelDados();

    if (vilao.hp <= 0) {
        log.innerText = `🎉 VITÓRIA! Você baniu o monstro para os confins do abismo!`;
        setTimeout(finalizarCombate, 2500);
        return;
    }

    controlarBotoes(true);
    setTimeout(turnoDoMonstro, 1200);
}

function turnoDoMonstro() {
    if (gameState !== "BATALHA") return;
    let log = document.getElementById("battle-log");

    if (vilao.hp < 70 && Math.random() < 0.35) {
        vilao.defendendo = true;
        log.innerText = `O Boss entra em postura defensiva rochosa.`;
    } else {
        let dano = Math.floor(vilao.ataque * (0.8 + Math.random() * 0.5));
        if (heroi.defendendo) { dano = Math.floor(dano / 2); heroi.defendendo = false; }
        heroi.hp = Math.max(0, heroi.hp - dano);
        log.innerText = `🔥 GOLPE DO CAOS! O demônio contra-atacou causando ${dano} de dano!`;
    }

    atualizarPainelDados();

    if (heroi.hp <= 0) {
        log.innerText = `💀 Você pereceu perante as chamas góticas... Reiniciando.`;
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
    controlarBotoes(false);
    uiTravarMouse.classList.remove("hidden");
}

// --- 6. GAME LOOP ANIMATE ---
let tempo = 0;
function animate() {
    requestAnimationFrame(animate);
    tempo += 0.05;

    // Movimentação das cinzas vulcânicas
    const pos = particulas.geometry.attributes.position.array;
    for(let i = 1; i < particlesCount * 3; i += 3) {
        pos[i] -= 0.06;
        if(pos[i] < 0) pos[i] = 40; 
    }
    particulas.geometry.attributes.position.needsUpdate = true;
    particulas.rotation.y += 0.0008;

    if (gameState === "EXPLORANDO" && mouseTravado) {
        const velocidade = 0.25;

        if (teclado['w'] || teclado['arrowup']) playerGroup.translateZ(-velocidade);
        if (teclado['s'] || teclado['arrowdown']) playerGroup.translateZ(velocidade);
        if (teclado['a'] || teclado['arrowleft']) playerGroup.translateX(-velocidade);
        if (teclado['d'] || teclado['arrowright']) playerGroup.translateX(velocidade);

        // Balanço de passos (Bobbing) ao andar
        if (teclado['w'] || teclado['s'] || teclado['a'] || teclado['d']) {
            playerGroup.position.y = Math.abs(Math.sin(tempo * 2.5)) * 0.25;
        } else {
            playerGroup.position.y = 0;
        }

        // Delimita o mapa gigante
        playerGroup.position.x = Math.max(-70, Math.min(70, playerGroup.position.x));
        playerGroup.position.z = Math.max(-70, Math.min(70, playerGroup.position.z));

        // Asas batendo
        wingL.rotation.y = Math.sin(tempo) * 0.25;
        wingR.rotation.y = -Math.sin(tempo) * 0.25;

        enemyGroup.position.y = Math.sin(tempo * 0.5) * 0.4 + 0.5;
        demonTorso.scale.x = 1 + Math.sin(tempo) * 0.04; 

        // Monstro rastreia o jogador com o olhar
        enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

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
