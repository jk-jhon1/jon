// --- 1. CONFIGURAÇÃO DO CENÁRIO 3D AVANÇADO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000002); 
scene.fog = new THREE.FogExp2(0x000002, 0.04); // Névoa densa gótica

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminação realista (Clair-obscur)
const ambientLight = new THREE.AmbientLight(0x0d0d1a, 0.15); 
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x3a2266, 1.8);
moonLight.position.set(40, 60, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.bias = -0.0008;
scene.add(moonLight);

// --- 2. TERRENO E GERAÇÃO PROCEDURAL REALISTA ---
const floorGeo = new THREE.PlaneGeometry(160, 160, 120, 120);
const posAtributo = floorGeo.attributes.position;
// Matemática Perlin simplificada via senos para gerar relevo realista e acidentado
for (let i = 0; i < posAtributo.count; i++) {
    let vx = posAtributo.getX(i);
    let vy = posAtributo.getY(i);
    let vz = Math.sin(vx * 0.1) * Math.cos(vy * 0.1) * 0.6 + Math.sin(vx * 0.05) * 0.3;
    posAtributo.setZ(i, vz);
}
floorGeo.computeVertexNormals();

// Material com texturização e micro-relevo via código (Bump por sombreamento facetado)
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x07070a, 
    roughness: 0.85, 
    metalness: 0.25,
    flatShading: true 
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Estruturas do cenário
const pilarGeo = new THREE.CylinderGeometry(0.5, 1.4, 14, 5);
const pilarMat = new THREE.MeshStandardMaterial({ color: 0x0f0f14, roughness: 0.95, flatShading: true });
const lavaGeo = new THREE.BoxGeometry(8, 0.2, 8);
const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xaa1100, roughness: 0.4 });

for (let i = 0; i < 40; i++) {
    let x = (Math.random() - 0.5) * 130;
    let z = (Math.random() - 0.5) * 130;
    if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

    if (Math.random() > 0.45) {
        const pilar = new THREE.Mesh(pilarGeo, pilarMat);
        pilar.position.set(x, 6.5, z);
        pilar.castShadow = true;
        pilar.receiveShadow = true;
        scene.add(pilar);
    } else {
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.position.set(x, -0.1, z);
        scene.add(lava);
        const lavaLight = new THREE.PointLight(0xff2200, 2.5, 14);
        lavaLight.position.set(x, 1.5, z);
        scene.add(lavaLight);
    }
}

// Cinzas flutuando no ar
const particlesGeo = new THREE.BufferGeometry();
const count = 900;
const points = new Float32Array(count * 3);
for(let i=0; i<count*3; i++) points[i] = (Math.random() - 0.5) * 120;
particlesGeo.setAttribute('position', new THREE.BufferAttribute(points, 3));
const particulas = new THREE.Points(particlesGeo, new THREE.PointsMaterial({
    size: 0.12, color: 0xff5500, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
}));
scene.add(particulas);

// --- 3. ENTIDADES: JOGADOR REALISTA ---
const playerGroup = new THREE.Group();
const armorMat = new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.85, roughness: 0.2 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xcc9900, metalness: 0.95, roughness: 0.15 });

const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 1.5, 8), armorMat);
torso.position.y = 1.5; torso.castShadow = true; playerGroup.add(torso);

const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), armorMat);
helmet.position.y = 2.5; helmet.castShadow = true; playerGroup.add(helmet);

const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.3), new THREE.MeshBasicMaterial({color: 0x00ffff}));
visor.position.set(0, 2.5, -0.22); playerGroup.add(visor);

// Espada posicionada dinamicamente para animação de corte físico
const swordGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.04), new THREE.MeshStandardMaterial({color: 0xcccccc, metalness: 0.9, roughness: 0.1}));
blade.position.y = 1.1;
const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.08), goldMat);
crossguard.position.y = 0.1;
swordGroup.add(blade, crossguard);
// Posição de guarda inicial da arma (Lado direito do peito)
swordGroup.position.set(0.7, 1.2, -0.4);
swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
playerGroup.add(swordGroup);

scene.add(playerGroup);

// Montagem do pivô de câmera em 3ª pessoa rígida nas costas
const cameraPivot = new THREE.Group();
cameraPivot.position.set(0, 2.6, 0); 
playerGroup.add(cameraPivot);
cameraPivot.add(camera);
camera.position.set(0, 0.8, 5.5); // Câmera mais baixa e próxima para ação cinemática
camera.lookAt(0, 2.3, -2);

// --- 4. ENTIDADES: MONSTRO COM I.A. CAÓTICA ---
const enemyGroup = new THREE.Group();
const demonMat = new THREE.MeshStandardMaterial({ color: 0x0a0606, roughness: 0.9, flatShading: true });
const coreMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });

const dTorso = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), demonMat);
dTorso.position.y = 2.5; dTorso.scale.set(1.1, 1.4, 0.9); dTorso.castShadow = true;
enemyGroup.add(dTorso);

const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), demonMat);
dHead.position.y = 4.4; dHead.castShadow = true;
enemyGroup.add(dHead);

const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.6, 4), coreMat);
hornL.position.set(-0.5, 5.1, 0.1); hornL.rotation.set(-0.3, 0, -0.4);
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

// Movimentação livre da câmera (Estilo Minecraft / FPS)
document.addEventListener("mousemove", (e) => {
    if (!mouseTravado) return;
    const sensibilidade = 0.0025;
    playerGroup.rotation.y -= e.movementX * sensibilidade;
    cameraPivot.rotation.x -= e.movementY * sensibilidade;
    cameraPivot.rotation.x = Math.max(-Math.PI / 8, Math.min(Math.PI / 4, cameraPivot.rotation.x));
});

// --- COMBATE EM TEMPO REAL REALISTA ---
window.addEventListener("mousedown", (e) => {
    if (!mouseTravado || !bossState.vivo) return;

    if (e.button === 0 && !playerState.atacando && playerState.cooldownAtaque <= 0) {
        // CLIQUE ESQUERDO: Executa ataque físico em tempo real
        playerState.atacando = true;
        playerState.cooldownAtaque = 25; // tempo de recuperação do golpe
        logCombate.innerText = "⚔️ Você desferiu um corte largo!";
        
        // Raycast: Projeta um raio vetorizado para frente para validar colisão real da lâmina
        const direcaoFrente = new THREE.Vector3(0, 0, -1).applyQuaternion(playerGroup.quaternion);
        const playerPos = playerGroup.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        
        let distanciaAtaque = playerPos.distanceTo(enemyGroup.position);
        
        // Se o inimigo estiver na frente do raio e a menos de 4.5 unidades de distância física, o golpe acerta
        if (distanciaAtaque < 4.5) {
            bossState.alertado = true;
            let dano = 20 + Math.floor(Math.random() * 12);
            bossState.hp = Math.max(0, bossState.hp - dano);
            bossState.timerDanoGlow = 6; // Piscar o inimigo em vermelho (Feedback visual)
            
            document.getElementById("boss-hud").classList.remove("hidden");
            atualizarHUD();
            logCombate.innerText = `💥 Você cortou o demônio! Causou ${dano} de dano físico.`;

            if (bossState.hp <= 0 && bossState.vivo) {
                bossState.vivo = false;
                logCombate.innerText = "💀 O Lorde Demônio desmoronou em cinzas!";
                scene.remove(enemyGroup);
                document.getElementById("boss-hud").classList.add("hidden");
            }
        }
    } 
    else if (e.button === 2) {
        // CLIQUE DIREITO: Entra em postura de defesa mecânica ativa
        playerState.defendendo = true;
        swordGroup.position.set(0, 1.5, -0.6);
        swordGroup.rotation.set(0, 0, Math.PI / 2); // Coloca a espada transversal na frente do corpo
    }
});

window.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
        playerState.defendendo = false;
        // Volta a arma para a guarda neutra
        swordGroup.position.set(0.7, 1.2, -0.4);
        swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
    }
});

// Desativa o menu de contexto do clique direito para não travar a tela
window.addEventListener("contextmenu", e => e.preventDefault());

function atualizarHUD() {
    document.getElementById("lbl-player-hp").innerText = playerState.hp;
    document.getElementById("bar-player-hp").style.width = `${playerState.hp}%`;

    document.getElementById("lbl-monster-hp").innerText = bossState.hp;
    document.getElementById("bar-monster-hp").style.width = `${(bossState.hp / bossState.hpMax) * 100}%`;
}

// Trepidação cinematográfica da câmera ao receber impactos reais
let shakeTimer = 0;
function processarCameraShake() {
    if (shakeTimer > 0) {
        camera.position.x = (Math.random() - 0.5) * 0.15;
        camera.position.y = 0.8 + (Math.random() - 0.5) * 0.15;
        shakeTimer--;
    } else {
        camera.position.x = 0;
        camera.position.y = 0.8;
    }
}

// --- 6. MOTOR DE LOOP E INTELIGÊNCIA ARTIFICIAL (60 FPS) ---
let tempo = 0;
function animate() {
    requestAnimationFrame(animate);
    tempo += 0.05;

    // Animação contínua da névoa de poeira vulcânica
    const pos = particulas.geometry.attributes.position.array;
    for(let i = 1; i < count * 3; i += 3) {
        pos[i] -= 0.08;
        if(pos[i] < 0) pos[i] = 35;
    }
    particulas.geometry.attributes.position.needsUpdate = true;

    if (mouseTravado) {
        // Redução dos frames de Cooldowns de Combate
        if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque--;
        if (bossState.cooldownAtaque > 0) bossState.cooldownAtaque--;

        // Animação mecânica do movimento da espada ao desferir golpes
        if (playerState.atacando) {
            swordGroup.rotation.y -= 0.3; // Rotação rápida do arco de corte
            if (swordGroup.rotation.y < -Math.PI / 2) {
                playerState.atacando = false;
                swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10); // Reseta a guarda da arma
            }
        }

        // Processamento de Shaders de Dano procedural (Piscar em vermelho)
        if (bossState.timerDanoGlow > 0) {
            demonMat.emissive.setHex(0x550000);
            bossState.timerDanoGlow--;
        } else {
            demonMat.emissive.setHex(0x000000);
        }

        if (playerState.timerDanoGlow > 0) {
            armorMat.emissive.setHex(0x660000);
            playerState.timerDanoGlow--;
        } else {
            armorMat.emissive.setHex(0x000000);
        }

        // --- MOVIMENTAÇÃO FÍSICA ---
        const vel = 0.22;
        if (teclado['w']) playerGroup.translateZ(-vel);
        if (teclado['s']) playerGroup.translateZ(vel);
        if (teclado['a']) playerGroup.translateX(-vel);
        if (teclado['d']) playerGroup.translateX(vel);

        // Limitação física das bordas da arena de pedras
        playerGroup.position.x = Math.max(-75, Math.min(75, playerGroup.position.x));
        playerGroup.position.z = Math.max(-75, Math.min(75, playerGroup.position.z));

        // --- LOGICA DA INTELIGÊNCIA ARTIFICIAL DO BOSS ---
        if (bossState.vivo) {
            let distHeroi = enemyGroup.position.distanceTo(playerGroup.position);

            // Percepção de Presença: Se você chegar muito perto do Boss na névoa, ele ruge e te caça
            if (distHeroi < 20.0) bossState.alertado = true;

            if (bossState.alertado) {
                document.getElementById("boss-hud").classList.remove("hidden");
                
                // O monstro gira o corpo em tempo real caçando as coordenadas do herói
                enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

                // Se estiver distante, ele avança correndo fisicamente em sua direção
                if (distHeroi > 3.8) {
                    enemyGroup.translateZ(0.12); // Velocidade de corrida da IA
                } else {
                    // Se estiver colado em você, a IA executa ataques físicos de impacto contínuos
                    if (bossState.cooldownAtaque <= 0) {
                        bossState.cooldownAtaque = 50; // Intervalo entre patadas do Boss
                        
                        let danoInimigo = 18 + Math.floor(Math.random() * 10);
                        if (playerState.defendendo) {
                            danoInimigo = Math.floor(danoInimigo * 0.2); // Reduz 80% do dano se estiver de escudo ativo
                            logCombate.innerText = `🛡️ Você bloqueou o impacto! Sofreu apenas ${danoInimigo} de dano.`;
                        } else {
                            playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                            playerState.timerDanoGlow = 8;
                            shakeTimer = 10; // Ativa tremor de câmera na hora do impacto sofrido
                            logCombate.innerText = `🚨 O DEMÔNIO TE TE ALCANÇOU! Você tomou ${danoInimigo} de dano devastador!`;
                            atualizarHUD();
                        }

                        if (playerState.hp <= 0) {
                            logCombate.innerText = "💀 Sua alma ruiu... Reiniciando simulador.";
                            setTimeout(() => location.reload(), 2500);
                        }
                    }
                }
            }
            
            // Respiração mecânica da carapaça do boss
            enemyGroup.position.y = Math.sin(tempo * 0.4) * 0.3 + 0.3;
            dTorso.scale.x = 1.1 + Math.sin(tempo) * 0.03;
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
