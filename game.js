// Aguarda o carregamento do DOM para garantir estabilidade absoluta
window.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. PROPRIEDADES DO SISTEMA E MOTOR GRÁFICO ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce6f5);
    scene.fog = new THREE.FogExp2(0xdce6f5, 0.015);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    // Cache de vetores para otimização de memória da GPU
    const _vectorScratchA = new THREE.Vector3();
    const _vectorScratchB = new THREE.Vector3();
    const _forwardVector = new THREE.Vector3();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.1);
    sunLight.position.set(30, 70, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // --- 2. GERAÇÃO DE CENÁRIO ---
    const floorGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
    const posAtributo = floorGeo.attributes.position;

    for (let i = 0; i < posAtributo.count; i++) {
        let vx = posAtributo.getX(i);
        let vy = posAtributo.getY(i);
        let vz = Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.7;
        posAtributo.setZ(i, vz);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8fa878, roughness: 0.9, metalness: 0.0, flatShading: false });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const pilarGeo = new THREE.CylinderGeometry(0.7, 1.1, 14, 12);
    const pilarMat = new THREE.MeshStandardMaterial({ color: 0xdae3f0, roughness: 0.4, flatShading: false });
    const cristalGeo = new THREE.OctahedronGeometry(1.8, 0);
    const cristalMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0033aa, roughness: 0.1 });

    for (let i = 0; i < 35; i++) {
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
            
            const cristalLight = new THREE.PointLight(0x00aaff, 1.2, 10);
            cristalLight.position.set(x, 3, z);
            scene.add(cristalLight);
        }
    }

    const particlesGeo = new THREE.BufferGeometry();
    const pCount = 400;
    const pPoints = new Float32Array(pCount * 3);
    for(let i = 0; i < pCount * 3; i++) pPoints[i] = (Math.random() - 0.5) * 120;
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPoints, 3));
    const particulas = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ size: 0.18, color: 0xffffff, transparent: true, opacity: 0.6 }));
    scene.add(particulas);

    // --- 3. CONFIGURAÇÃO DO JOGADOR ---
    const playerGroup = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.4, roughness: 0.2, flatShading: false });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2, flatShading: false });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.5, 12), armorMat);
    torso.position.y = 1.5; torso.castShadow = true; playerGroup.add(torso);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 12), armorMat);
    helmet.position.y = 2.45; helmet.castShadow = true; playerGroup.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.3), new THREE.MeshBasicMaterial({color: 0x3b82f6}));
    visor.position.set(0, 2.45, -0.22); playerGroup.add(visor);

    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.04), new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0x93c5fd, metalness: 0.1}));
    blade.position.y = 1.1;
    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), goldMat);
    crossguard.position.y = 0.1;
    swordGroup.add(blade, crossguard);
    swordGroup.position.set(0.6, 1.2, -0.4);
    swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
    playerGroup.add(swordGroup);

    scene.add(playerGroup);

    const cameraPivot = new THREE.Group();
    cameraPivot.position.set(0, 2.5, 0); 
    playerGroup.add(cameraPivot);
    cameraPivot.add(camera);
    camera.position.set(0, 0.4, 5.0);
    camera.lookAt(0, 1.9, -2);

    // --- 4. CONFIGURAÇÃO DO INIMIGO ---
    const enemyGroup = new THREE.Group();
    const golemMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, flatShading: false });
    const energyCoreMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8 });

    const dTorso = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 12), golemMat);
    dTorso.position.y = 2.5; dTorso.scale.set(1.1, 1.4, 0.9); dTorso.castShadow = true;
    enemyGroup.add(dTorso);

    const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), golemMat);
    dHead.position.y = 4.1; dHead.castShadow = true;
    enemyGroup.add(dHead);

    const hornL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.1, 6), energyCoreMat);
    hornL.position.set(-0.45, 4.6, 0.1); hornL.rotation.set(-0.3, 0, -0.4);
    enemyGroup.add(hornL);
    const hornR = hornL.clone(); hornR.position.x = 0.45; hornR.rotation.z = 0.4;
    enemyGroup.add(hornR);

    scene.add(enemyGroup);
    enemyGroup.position.set(15, 0, -25);

    // --- 5. LÓGICA DE JOGO E COMANDOS ---
    const playerState = { hp: 100, hpMax: 100, defendendo: false, atacando: false, cooldownAtaque: 0.0, timerDanoGlow: 0.0 };
    const bossState = { hp: 500, hpMax: 500, vivo: true, cooldownAtaque: 0.0, alertado: false, timerDanoGlow: 0.0 };

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
        uiMouse.style.visibility = mouseTravado ? "hidden" : "visible";
    });

    document.addEventListener("mousemove", (e) => {
        if (!mouseTravado) return;
        const sensibilidade = 0.0022;
        playerGroup.rotation.y -= e.movementX * sensibilidade;
        cameraPivot.rotation.x -= e.movementY * sensibilidade;
        cameraPivot.rotation.x = Math.max(-0.3, Math.min(0.5, cameraPivot.rotation.x));
    });

    window.addEventListener("mousedown", (e) => {
        if (!mouseTravado || !bossState.vivo) return;

        if (e.button === 0 && !playerState.atacando && playerState.cooldownAtaque <= 0.0) {
            playerState.atacando = true;
            playerState.cooldownAtaque = 0.4;
            logCombate.innerText = "⚔️ Investida com lâmina de luz!";
            
            playerGroup.getWorldPosition(_vectorScratchA);
            enemyGroup.getWorldPosition(_vectorScratchB);
            let distanciaFisica = _vectorScratchA.distanceTo(_vectorScratchB);
            
            if (distanciaFisica < 4.8) {
                _forwardVector.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);
                _vectorScratchB.sub(_vectorScratchA).normalize();
                let produtoEscalar = _forwardVector.dot(_vectorScratchB);

                if (produtoEscalar > 0.86) {
                    bossState.alertado = true;
                    let dano = 22 + Math.floor(Math.random() * 12);
                    bossState.hp = Math.max(0, bossState.hp - dano);
                    bossState.timerDanoGlow = 0.12;
                    
                    document.getElementById("boss-hud").classList.remove("hidden");
                    atualizarHUD();
                    logCombate.innerText = `💥 Impacto Direto! Você causou ${dano} de dano ao Titã.`;

                    if (bossState.hp <= 0 && bossState.vivo) {
                        bossState.vivo = false;
                        logCombate.innerText = "✨ O Guardião desintegrou-se em pura energia vital!";
                        scene.remove(enemyGroup);
                        document.getElementById("boss-hud").classList.add("hidden");
                    }
                }
            }
        } 
        else if (e.button === 2) {
            playerState.defendendo = true;
            swordGroup.position.set(0, 1.4, -0.5);
            swordGroup.rotation.set(0, 0, Math.PI / 2);
        }
    });

    window.addEventListener("mouseup", (e) => {
        if (e.button === 2) {
            playerState.defendendo = false;
            swordGroup.position.set(0.6, 1.2, -0.4);
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

    let shakeTimer = 0.0;
    function processarCameraShake(delta) {
        if (shakeTimer > 0) {
            camera.position.x = (Math.random() - 0.5) * 0.12;
            camera.position.y = 0.4 + (Math.random() - 0.5) * 0.12;
            shakeTimer -= delta;
        } else {
            camera.position.set(0, 0.4, 5.0);
        }
    }

    // --- 6. LOOP DE RENDERIZAÇÃO E MOVIMENTO ---
    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        // Animação de Partículas em Tempo Real
        const pos = particulas.geometry.attributes.position.array;
        for(let i = 1; i < pCount * 3; i += 3) {
            pos[i] -= 1.8 * delta;
            if(pos[i] < 0) pos[i] = 35;
        }
        particulas.geometry.attributes.position.needsUpdate = true;

        if (mouseTravado) {
            if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque -= delta;
            if (bossState.cooldownAtaque > 0) bossState.cooldownAtaque -= delta;
            if (bossState.timerDanoGlow > 0) bossState.timerDanoGlow -= delta;
            if (playerState.timerDanoGlow > 0) playerState.timerDanoGlow -= delta;

            golemMat.emissive.setHex(bossState.timerDanoGlow > 0 ? 0x3b82f6 : 0x000000);
            armorMat.emissive.setHex(playerState.timerDanoGlow > 0 ? 0xef4444 : 0x000000);

            if (playerState.atacando) {
                swordGroup.rotation.y -= 22 * delta;
                if (swordGroup.rotation.y < -Math.PI / 1.8) {
                    playerState.atacando = false;
                    swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
                }
            }

            const mVel = 12.5 * delta;
            if (teclado['w']) playerGroup.translateZ(-mVel);
            if (teclado['s']) playerGroup.translateZ(mVel);
            if (teclado['a']) playerGroup.translateX(-mVel);
            if (teclado['d']) playerGroup.translateX(mVel);

            playerGroup.position.x = Math.max(-75, Math.min(75, playerGroup.position.x));
            playerGroup.position.z = Math.max(-75, Math.min(75, playerGroup.position.z));

            if (bossState.vivo) {
                playerGroup.getWorldPosition(_vectorScratchA);
                enemyGroup.getWorldPosition(_vectorScratchB);
                let distHeroi = _vectorScratchA.distanceTo(_vectorScratchB);

                if (distHeroi < 25.0) bossState.alertado = true;

                if (bossState.alertado) {
                    document.getElementById("boss-hud").classList.remove("hidden");
                    enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

                    if (distHeroi > 3.8) {
                        enemyGroup.translateZ(6.5 * delta);
                    } else {
                        if (bossState.cooldownAtaque <= 0.0) {
                            bossState.cooldownAtaque = 0.9;
                            
                            let danoInimigo = 14 + Math.floor(Math.random() * 8);
                            if (playerState.defendendo) {
                                danoInimigo = Math.floor(danoInimigo * 0.15);
                                logCombate.innerText = `🛡️ Bloqueio Crítico! Absorveu o impacto sofrendo apenas ${danoInimigo} HP.`;
                            } else {
                                playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                                playerState.timerDanoGlow = 0.15;
                                shakeTimer = 0.2;
                                logCombate.innerText = `🚨 O Guardião desferiu uma pancada energética! - ${danoInimigo} HP.`;
                                atualizarHUD();
                            }

                            if (playerState.hp <= 0) {
                                logCombate.innerText = "💀 Conexão perdida. Força vital zerada. Reiniciando...";
                                setTimeout(() => location.reload(), 2000);
                            }
                        }
                    }
                }
            }

            processarCameraShake(delta);
        }

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
});
