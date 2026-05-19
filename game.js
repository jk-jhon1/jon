// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D ILUMINADO E SUAVE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce6f5); // Céu claro diurno
scene.fog = new THREE.FogExp2(0xdce6f5, 0.015); // Névoa suave e clara de horizonte

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminação Global Clara (Elimina sombras densas e escuras)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); 
scene.add(ambientLight);

// Luz Solar Principal
const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
sunLight.position.set(40, 80, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// --- 2. TERRENO E GEOMETRIA SUAVE ---
const floorGeo = new THREE.PlaneGeometry(160, 160, 60, 60);
const posAtributo = floorGeo.attributes.position;
// Ondulações suaves como colinas limpas
for (let i = 0; i < posAtributo.count; i++) {
    let vx = posAtributo.getX(i);
    let vy = posAtributo.getY(i);
    let vz = Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.8;
    posAtributo.setZ(i, vz);
}
floorGeo.computeVertexNormals();

// flatShading: false faz com que o chão fique totalmente liso e sem faces duras
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x8fa878, // Gramado/Terreno claro
    roughness: 0.9, 
    metalness: 0.0,
    flatShading: false 
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Estruturas do cenário: Pilares agora são colunas lisas de mármore azulado
const pilarGeo = new THREE.CylinderGeometry(0.8, 1.2, 14, 16); // Mais segmentos para ser arredondado
const pilarMat = new THREE.MeshStandardMaterial({ color: 0xdae3f0, roughness: 0.4, flatShading: false });
const cristalGeo = new THREE.OctahedronGeometry(2, 0); // Cristais no lugar da lava escura
const cristalMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0044aa, roughness: 0.1 });

for (let i = 0; i < 40; i++) {
    let x = (Math.random() - 0.5) * 130;
    let z = (Math.random() - 0.5) * 130;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

    if (Math.random() > 0.45) {
        const pilar = new THREE.Mesh(pilarGeo, pilarMat);
        pilar.position.set(x, 7, z);
        pilar.castShadow = true;
        pilar.receiveShadow = true;
        scene.add(pilar);
    } else {
        const cristal = new THREE.Mesh(cristalGeo, cristalMat);
        cristal.position.set(x, 1.5, z);
        cristal.castShadow = true;
        scene.add(cristal);
        
        const cristalLight = new THREE.PointLight(0x00aaff, 1.5, 12);
        cristalLight.position.set(x, 3, z);
        scene.add(cristalLight);
    }
}

// Partículas flutuantes agora são dentes-de-leão / esferas mágicas de luz branca
const particlesGeo = new THREE.BufferGeometry();
const count = 500;
const points = new Float32Array(count * 3);
for(let i=0; i<count*3; i++) points[i] = (Math.random() - 0.5) * 120;
particlesGeo.setAttribute('position', new THREE.BufferAttribute(points, 3));
const particulas = new THREE.Points(particlesGeo, new THREE.PointsMaterial({
    size: 0.2, color: 0xffffff, transparent: true, opacity: 0.8
}));
scene.add(particulas);

// --- 3. ENTIDADES: JOGADOR ---
const playerGroup = new THREE.Group();
const armorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.2, flatShading: false });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2, flatShading: false });

const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 1.5, 16), armorMat);
torso.position.y = 1.5; torso.castShadow = true; playerGroup.add(torso);

const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), armorMat);
helmet.position.y = 2.5; helmet.castShadow = true; playerGroup.add(helmet);

const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.3), new THREE.MeshBasicMaterial({color: 0x3b82f6}));
visor.position.set(0, 2.5, -0.22); playerGroup.add(visor);

// Espada Sagrada Luminosa
const swordGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.04), new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0x93c5fd, metalness: 0.2}));
blade.position.y = 1.1;
const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), goldMat);
crossguard.position.y = 0.1;
swordGroup.add(blade, crossguard);
swordGroup.position.set(0.7, 1.2, -0.4);
swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
playerGroup.add(swordGroup);

scene.add(playerGroup);

// Câmera em 3ª pessoa estável
const cameraPivot = new THREE.Group();
cameraPivot.position.set(0, 2.6, 0); 
playerGroup.add(cameraPivot);
cameraPivot.add(camera);
camera.position.set(0, 0.5, 5.0);
camera.lookAt(0, 2.0, -2);

// --- 4. ENTIDADES: GUARDIÃO DE CRISTAL (Antigo Monstro) ---
const enemyGroup = new THREE.Group();
const golemMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, flatShading: false });
const energyCoreMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8 });

const dTorso = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), golemMat);
dTorso.position.y = 2.5; dTorso.scale.set(1.1, 1.4, 0.9); dTorso.castShadow = true;
enemyGroup.add(dTorso);

const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), golemMat);
dHead.position.y = 4.2; dHead.castShadow = true;
enemyGroup.add(dHead);

const hornL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 1.2, 8), energyCoreMat);
hornL.position.set(-0.5, 4.8, 0.1); hornL.rotation.set(-0.3, 0, -0.4);
enemyGroup.add(hornL);
const hornR = hornL.clone(); hornR.position.x = 0.5; hornR.rotation.z = 0.4;
enemyGroup.add(hornR);

scene.add(enemyGroup);
enemyGroup.position.set(20, 0, -30);

// --- 5. LÓGICA DE ATRIBUTOS E INPUTS ---
const playerState = { hp: 100, hpMax: 100, defendendo: false, atacando: false, cooldownAtaque: 0, timerDanoGlow: 0 };
const bossState = { hp: 500, hpMax: 500, vivo: true, cooldownAtaque: 0, alertado: false, timerDanoGlow: 0 };

const teclado = {};
let mouseTravado = false;
const uiMouse = document.getElementById("travar-mouse-ui");
const logCombate = document.getElementById("combat-log");

window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

uiMouse.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("pointerlockchange", () => {
    mouseTravado = (document.pointerLockElement === document.body);
    uiMouse.style.opacity = mouseTravado ? "0" : "1";
    uiMouse.style.pointerEvents = mouseTravado ? "none" : "auto";
});

document.addEventListener("mousemove", (e) => {
    if (!mouseTravado) return;
    const sensibilidade = 0.0025;
    playerGroup.rotation.y -= e.movementX * sensibilidade;
    cameraPivot.rotation.x -= e.movementY * sensibilidade;
    cameraPivot.rotation.x = Math.max(-Math.PI / 8, Math.min(Math.PI / 4, cameraPivot.rotation.x));
});

// --- COMBATE EM TEMPO REAL ---
window.addEventListener("mousedown", (e) => {
    if (!mouseTravado || !bossState.vivo) return;

    if (e.button === 0 && !playerState.atacando && playerState.cooldownAtaque <= 0) {
        playerState.atacando = true;
        playerState.cooldownAtaque = 22;
        logCombate.innerText = "⚔️ Golpe de luz deferido!";
        
        const playerPos = playerGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        let distanciaAtaque = playerPos.distanceTo(enemyGroup.position);
        
        if (distanciaAtaque < 4.8) {
            bossState.alertado = true;
            let dano = 25 + Math.floor(Math.random() * 10);
            bossState.hp = Math.max(0, bossState.hp - dano);
            bossState.timerDanoGlow = 6;
            
            document.getElementById("boss-hud").classList.remove("hidden");
            atualizarHUD();
            logCombate.innerText = `💥 Você atingiu o Titã! Causou ${dano} de dano bônus.`;

            if (bossState.hp <= 0 && bossState.vivo) {
                bossState.vivo = false;
                logCombate.innerText = "✨ O Guardião purificou-se e desapareceu!";
                scene.remove(enemyGroup);
                document.getElementById("boss-hud").classList.add("hidden");
            }
        }
    } 
    else if (e.button === 2) {
        playerState.defendendo = true;
        swordGroup.position.set(0, 1.5, -0.6);
        swordGroup.rotation.set(0, 0, Math.PI / 2);
    }
});

window.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
        playerState.defendendo = false;
        swordGroup.position.set(0.7, 1.2, -0.4);
        swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
    }
});

window.addEventListener("contextmenu", e => e.preventDefault());

function atualizarHUD() {
    document.getElementById("lbl-player-hp").innerText = playerState.hp;
    document.getElementById("bar-player-hp").style.width = `${playerState.hp}%`;

    document.getElementById("lbl-monster-hp").innerText = bossState.hp;
    document.getElementById("bar-monster-hp").style.width = `${(bossState.hp / bossState.hpMax) * 100}%`;
}

let shakeTimer = 0;
function processarCameraShake() {
    if (shakeTimer > 0) {
        camera.position.x = (Math.random() - 0.5) * 0.08; // Balanço menor, mais suave
        camera.position.y = 0.5 + (Math.random() - 0.5) * 0.08;
        shakeTimer--;
    } else {
        camera.position.x = 0;
        camera.position.y = 0.5;
    }
}

// --- 6. LOOP DE ATUALIZAÇÃO DA FILTRAGEM DE TEXTURAS ---
function animate() {
    requestAnimationFrame(animate);

    // Movimentação flutuante e calma das esferas de luz
    const pos = particulas.geometry.attributes.position.array;
    for(let i = 1; i < count * 3; i += 3) {
        pos[i] -= 0.03;
        if(pos[i] < 0) pos[i] = 35;
    }
    particulas.geometry.attributes.position.needsUpdate = true;

    if (mouseTravado) {
        if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque--;
        if (bossState.cooldownAtaque > 0) bossState.cooldownAtaque--;

        if (playerState.atacando) {
            swordGroup.rotation.y -= 0.35;
            if (swordGroup.rotation.y < -Math.PI / 2) {
                playerState.atacando = false;
                swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
            }
        }

        // Respostas de brilho ao tomar dano (Transparência/Emissão)
        if (bossState.timerDanoGlow > 0) {
            golemMat.emissive.setHex(0x3b82f6); // Pisca em azul brilhante
            bossState.timerDanoGlow--;
        } else {
            golemMat.emissive.setHex(0x000000);
        }

        if (playerState.timerDanoGlow > 0) {
            armorMat.emissive.setHex(0x3b82f6);
            playerState.timerDanoGlow--;
        } else {
            armorMat.emissive.setHex(0x000000);
        }

        // Movimentação fluida
        const vel = 0.22;
        if (teclado['w']) playerGroup.translateZ(-vel);
        if (teclado['s']) playerGroup.translateZ(vel);
        if (teclado['a']) playerGroup.translateX(-vel);
        if (teclado['d']) playerGroup.translateX(vel);

        playerGroup.position.x = Math.max(-75, Math.min(75, playerGroup.position.x));
        playerGroup.position.z = Math.max(-75, Math.min(75, playerGroup.position.z));

        // IA DO GUARDIÃO
        if (bossState.vivo) {
            let distHeroi = enemyGroup.position.distanceTo(playerGroup.position);

            if (distHeroi < 25.0) bossState.alertado = true;

            if (bossState.alertado) {
                document.getElementById("boss-hud").classList.remove("hidden");
                enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

                if (distHeroi > 4.0) {
                    enemyGroup.translateZ(0.10); // Corrida balanceada
                } else {
                    if (bossState.cooldownAtaque <= 0) {
                        bossState.cooldownAtaque = 55;
                        
                        let danoInimigo = 15 + Math.floor(Math.random() * 8);
                        if (playerState.defendendo) {
                            danoInimigo = Math.floor(danoInimigo * 0.15);
                            logCombate.innerText = `🛡️ Ataque absorvido com sucesso! (${danoInimigo} de dano sofrido)`;
                        } else {
                            playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                            playerState.timerDanoGlow = 8;
                            shakeTimer = 8;
                            logCombate.innerText = `🚨 O Guardião descarregou energia física! Sofreu ${danoInimigo} de dano.`;
                            atualizarHUD();
                        }

                        if (playerState.hp <= 0) {
                            logCombate.innerText = "💀 Você desmaiou. Reiniciando a área...";
                            setTimeout(() => location.reload(), 2500);
                        }
                    }
                }
            }
        }

        processarCameraShake();
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
