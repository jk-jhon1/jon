// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D REALISTA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103); 
scene.fog = new THREE.FogExp2(0x010103, 0.035); // Névoa densa realista

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// Ativando sombras de alta qualidade no motor de renderização
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x111122, 0.2); 
scene.add(ambientLight);

// Luz da "Lua" que gera as sombras principais
const moonLight = new THREE.DirectionalLight(0x442277, 1.5);
moonLight.position.set(30, 50, 30);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048; // Resolução da sombra
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 150;
moonLight.shadow.camera.left = -60;
moonLight.shadow.camera.right = 60;
moonLight.shadow.camera.top = 60;
moonLight.shadow.camera.bottom = -60;
moonLight.shadow.bias = -0.001; // Evita falhas gráficas na sombra
scene.add(moonLight);

const portalLight = new THREE.PointLight(0x00aaff, 2, 40);
portalLight.position.set(0, 5, 0);
scene.add(portalLight);

// --- 2. MAPA COM RELEVO ROCHOSO ---
// Usamos mais segmentos (100x100) para poder amassar o chão
const floorGeo = new THREE.PlaneGeometry(150, 150, 100, 100);
const posAtributo = floorGeo.attributes.position;
// Deformando os vértices para criar pedras e buracos
for (let i = 0; i < posAtributo.count; i++) {
    let z = posAtributo.getZ(i);
    // Cria ondas irregulares simulando terreno natural
    z += Math.random() * 0.4;
    posAtributo.setZ(i, z);
}
floorGeo.computeVertexNormals();

const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x0a0a0e, 
    roughness: 0.8, 
    metalness: 0.2,
    flatShading: true // Dá um aspecto rochoso/facetado realista
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true; // Chão recebe sombras
scene.add(floor);

// Obstáculos e Lava
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

// --- SISTEMA DE PARTÍCULAS (Cinzas Vulcânicas no ar) ---
const particlesGeo = new THREE.BufferGeometry();
const particlesCount = 800;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100; // Espalha num raio de 100
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMat = new THREE.PointsMaterial({
    size: 0.15,
    color: 0xff7700,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending // Faz brilhar como fogo
});
const particulas = new THREE.Points(particlesGeo, particlesMat);
scene.add(particulas);


// --- 3. MODELO DO JOGADOR MAIS PROPORCIONAL E DETALHADO ---
const playerGroup = new THREE.Group();
const armorMat = new THREE.MeshStandardMaterial({ color: 0x112244, metalness: 0.8, roughness: 0.3 }); 
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 1.0, roughness: 0.2 });

// Tronco mais modelado
const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.6, 8), armorMat);
torso.position.y = 1.6;
torso.castShadow = true;
playerGroup.add(torso);

// Ombreiras Góticas
const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), goldMat);
shoulderL.position.set(-0.8, 2.2, 0);
shoulderL.castShadow = true;
playerGroup.add(shoulderL);
const shoulderR = shoulderL.clone(); shoulderR.position.x = 0.8;
playerGroup.add(shoulderR);

// Elmo com viseira brilhante
const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 8), armorMat);
helmet.position.y = 2.8;
helmet.castShadow = true;
playerGroup.add(helmet);
const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), new THREE.MeshBasicMaterial({color: 0x00ffff}));
visor.position.set(0, 2.85, -0.2); // Rosto para frente (Z negativo)
playerGroup.add(visor);

// Asas de energia mais complexas
const wingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.5 });
const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4, 3), wingMat);
wingL.position.set(-1.0, 2.5, 0.5);
wingL.rotation.set(0, 0, Math.PI / 3);
playerGroup.add(wingL);
const wingR = wingL.clone(); wingR.position.x = 1.0; wingR.rotation.z = -Math.PI / 3;
playerGroup.add(wingR);

// Espada Larga e Realista
const swordGroup = new THREE.Group();
const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), goldMat);
const guard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), goldMat);
guard.position.y = 0.3;
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.05), new THREE.MeshStandardMaterial({color: 0xdddddd, metalness: 1, roughness: 0.1}));
blade.position.y = 1.6;
swordGroup.add(grip, guard, blade);
swordGroup.position.set(0.6, 1.2, -0.5);
swordGroup.rotation.x = Math.PI / 2; // Apontando para frente
swordGroup.castShadow = true;
playerGroup.add(swordGroup);

scene.add(playerGroup);
playerGroup.position.set(0, 0, 0);

// --- NOVA CÂMERA (ESTILO MINECRAFT / TERCEIRA PESSOA DINÂMICA) ---
const cameraPivot = new THREE.Group();
cameraPivot.position.set(0, 3, 0); 
playerGroup.add(cameraPivot); 

cameraPivot.add(camera);
camera.position.set(0, 2, 8); 
camera.lookAt(0, 0, 0); 

// --- SISTEMA DE MOUSE (POINTER LOCK) ---
let mouseTravado = false;
const uiTravarMouse = document.getElementById("travar-mouse-ui");

uiTravarMouse.addEventListener("click", () => { document.body.requestPointerLock(); });

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
demonTorso.scale.set(1, 1.2, 0.8); // Achata e estica pra parecer um peitoral musculoso
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

// Olhos brilhantes do monstro
const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 0xff0000}));
eyeL.position.set(-0.3, 4.6, -0.7);
enemyGroup.add(eyeL);
const eyeR = eyeL.clone(); eyeR.position.x = 0.3;
enemyGroup.add(eyeR);

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
    if (distancia < 5.0 && gameState === "EXPLORANDO") {
        iniciarCombate();
    }
}

function iniciarCombate() {
    gameState = "BATALHA";
    if (document.pointerLockElement) document.exitPointerLock();
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
        log.innerText = `Você cravou a espada! Desferiu ${dano} de dano.`;
    } else if (acao === 'ataque_pesado') {
        if (Math.random() > 0.45) {
            let dano = 40 + Math.floor(Math.random() * 15);
            if (vilao.defendendo) { dano = Math.floor(dano / 2); vilao.defendendo = false; }
            vilao.hp = Math.max(0, vilao.hp - dano);
            log.innerText = `💥 IMPACTO SUPREMO! Você causou um rombo de ${dano} de dano!`;
        } else {
            log.innerText = `❌ O ataque falhou! O Boss repeliu sua espada.`;
        }
    } else if (acao === 'defender') {
        heroi.defendendo = true;
        log.innerText = `Você conjurou a Barreira Mágica (-50% de dano).`;
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
        log.innerText = `O demônio enrijece seus músculos incandecentes.`;
    } else {
        let dano = Math.floor(vilao.ataque * (0.8 + Math.random() * 0.5));
        if (heroi.defendendo) { dano = Math.floor(dano / 2); heroi.defendendo = false; }
        heroi.hp = Math.max(0, heroi.hp - dano);
        log.innerText = `🔥 CEIFADOR DO INFERNO! O ataque rasgou ${dano} do seu HP!`;
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
    uiTravarMouse.classList.remove("hidden");
}

// --- 6. ENGINE LOOP ---
let tempo = 0;
function animate() {
    requestAnimationFrame(animate);
    tempo += 0.05;

    // Anima a chuva de cinzas vulcânicas
    const pos = particulas.geometry.attributes.position.array;
    for(let i = 1; i < particlesCount * 3; i += 3) {
        pos[i] -= 0.05; // Partículas caem lentamente
        if(pos[i] < 0) { // Se tocarem no chão, voltam pro céu
            pos[i] = 40; 
        }
    }
    particulas.geometry.attributes.position.needsUpdate = true;
    particulas.rotation.y += 0.001; // Gira o campo de cinzas com o vento

    if (gameState === "EXPLORANDO" && mouseTravado) {
        const velocidade = 0.25;

        // Movimentação
        if (teclado['w'] || teclado['arrowup']) playerGroup.translateZ(-velocidade);
        if (teclado['s'] || teclado['arrowdown']) playerGroup.translateZ(velocidade);
        if (teclado['a'] || teclado['arrowleft']) playerGroup.translateX(-velocidade);
        if (teclado['d'] || teclado['arrowright']) playerGroup.translateX(velocidade);

        // Caminhar ajusta levemente a altura do jogador (Bobbing de passos)
        if (teclado['w'] || teclado['s'] || teclado['a'] || teclado['d']) {
            playerGroup.position.y = Math.abs(Math.sin(tempo * 2)) * 0.3;
        } else {
            playerGroup.position.y = 0;
        }

        playerGroup.position.x = Math.max(-70, Math.min(70, playerGroup.position.x));
        playerGroup.position.z = Math.max(-70, Math.min(70, playerGroup.position.z));

        // Animação do Monstro Respirando e flutuando
        enemyGroup.position.y = Math.sin(tempo * 0.5) * 0.5;
        demonTorso.scale.x = 1 + Math.sin(tempo) * 0.05; // Respiração peitoral

        // O Monstro sempre vira o rosto para encarar o jogador na neblina!
        enemyGroup.lookAt(playerGroup.position);

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
