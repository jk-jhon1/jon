// Aguarda o carregamento do DOM para garantir estabilidade absoluta das UIs
window.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. PROPRIEDADES DO SISTEMA E MOTOR GRÁFICO ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a); 
    scene.fog = new THREE.FogExp2(0x05070a, 0.015);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    let tempoAcumulado = 0; 

    const _vectorScratchA = new THREE.Vector3();
    const _vectorScratchB = new THREE.Vector3();
    const _forwardVector = new THREE.Vector3();

    const ambientLight = new THREE.AmbientLight(0x0a1520, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x00aaff, 0.8);
    sunLight.position.set(30, 70, 20);
    scene.add(sunLight);

    // Lanterna de ambiente para destacar o Ogro
    const orcLight = new THREE.DirectionalLight(0xfffaed, 0.5);
    orcLight.position.set(-30, 50, -20);
    scene.add(orcLight);

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

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const pilarGeo = new THREE.CylinderGeometry(0.7, 1.1, 14, 12);
    const pilarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const cristalGeo = new THREE.OctahedronGeometry(1.8, 0);
    const cristalMat = new THREE.MeshStandardMaterial({ color: 0x00d8ff, emissive: 0x004466, roughness: 0.1 });

    for (let i = 0; i < 35; i++) {
        let x = (Math.random() - 0.5) * 130;
        let z = (Math.random() - 0.5) * 130;
        if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

        if (Math.random() > 0.45) {
            const pilar = new THREE.Mesh(pilarGeo, pilarMat);
            pilar.position.set(x, 7, z);
            scene.add(pilar);
        } else {
            const cristal = new THREE.Mesh(cristalGeo, cristalMat);
            cristal.position.set(x, 1.5, z);
            scene.add(cristal);
            const cristalLight = new THREE.PointLight(0x00bfff, 1.2, 10);
            cristalLight.position.set(x, 3, z);
            scene.add(cristalLight);
        }
    }

    const particlesGeo = new THREE.BufferGeometry();
    const pCount = 500;
    const pPoints = new Float32Array(pCount * 3);
    for(let i = 0; i < pCount * 3; i++) pPoints[i] = (Math.random() - 0.5) * 140;
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPoints, 3));
    const particulas = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ size: 0.15, color: 0x00f0ff, transparent: true, opacity: 0.4 }));
    scene.add(particulas);

    // --- 3. JOGADOR (HERÓI HOLOGRÁFICO ALADO) ---
    const playerGroup = new THREE.Group();
    const holoMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.35 });
    const holoGlowMat = new THREE.MeshStandardMaterial({ color: 0x00aeff, emissive: 0x005577, transparent: true, opacity: 0.7, roughness: 0.1 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.5, 12), holoMat);
    torso.position.y = 1.5; 
    const torsoGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 1.48, 8), holoGlowMat);
    torso.add(torsoGlow);
    playerGroup.add(torso);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 12), holoMat);
    helmet.position.y = 2.45;
    const helmetGlow = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 8), holoGlowMat);
    helmet.add(helmetGlow);
    playerGroup.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.3), new THREE.MeshBasicMaterial({color: 0x00ffff}));
    visor.position.set(0, 2.45, -0.22); 
    playerGroup.add(visor);

    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.04), new THREE.MeshBasicMaterial({color: 0x00ffff}));
    blade.position.y = 1.2;
    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), holoMat);
    crossguard.position.y = 0.1;
    swordGroup.add(blade, crossguard);
    swordGroup.position.set(0.6, 1.2, -0.4);
    swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
    playerGroup.add(swordGroup);

    const wingGroupL = new THREE.Group();
    const wingGroupR = new THREE.Group();
    wingGroupL.position.set(-0.4, 2.0, 0.2);
    wingGroupR.position.set(0.4, 2.0, 0.2);
    const penaGeo = new THREE.BoxGeometry(1.5, 0.15, 0.02);
    for(let i = 0; i < 6; i++) {
        let penaL = new THREE.Mesh(penaGeo, holoMat); penaL.position.set(-0.7, -i * 0.18, 0); penaL.rotation.z = Math.PI / 8 + (i * 0.08); wingGroupL.add(penaL);
        let penaR = new THREE.Mesh(penaGeo, holoMat); penaR.position.set(0.7, -i * 0.18, 0); penaR.rotation.z = -Math.PI / 8 - (i * 0.08); wingGroupR.add(penaR);
    }
    playerGroup.add(wingGroupL, wingGroupR);
    scene.add(playerGroup);

    const cameraPivot = new THREE.Group();
    cameraPivot.position.set(0, 2.5, 0); 
    playerGroup.add(cameraPivot);
    cameraPivot.add(camera);
    camera.position.set(0, 0.4, 5.0);
    camera.lookAt(0, 1.9, -2);

    // --- 4. INIMIGO COMPLETO (OGRO GUERREIRO DA IMAGEM) ---
    const enemyGroup = new THREE.Group();
    
    // Materiais orgânicos e rústicos do Ogro
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5a6344, roughness: 0.85 }); // Pele verde-oliva robusta
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3d2516, roughness: 0.9 }); // Couros e cintos
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x523624, roughness: 0.95 }); // Porrete e base do escudo
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xdecaa5, roughness: 0.7 }); // Ombreira de crânio e dentes/espinhos
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x4f4f4f, metalness: 0.6, roughness: 0.5 }); // Detalhes de ferro

    // Corpo musculoso avantajado e largo
    const ogreTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 2.6, 16), skinMat);
    ogreTorso.position.y = 2.2;
    ogreTorso.scale.set(1.4, 1.0, 1.1); // Tronco largo característico
    enemyGroup.add(ogreTorso);

    // Cabeça forte com mandíbula pronunciada
    const ogreHead = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 14), skinMat);
    ogreHead.position.set(0, 3.7, 0.1);
    ogreHead.scale.set(1.1, 1.2, 1.1);
    enemyGroup.add(ogreHead);

    // Ombreira de Crânio de Javali (Lado Esquerdo do Ogro - Direito do jogador olhando de frente)
    const boneShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), boneMat);
    boneShoulder.position.set(-1.2, 3.1, 0.1);
    boneShoulder.scale.set(1.2, 0.7, 0.8);
    enemyGroup.add(boneShoulder);
    // Presas projetadas da ombreira
    const horn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 0.6, 6), boneMat);
    horn1.position.set(-1.5, 3.3, 0.4);
    horn1.rotation.set(0.4, 0, -0.6);
    enemyGroup.add(horn1);

    // Cinto largo de couro
    const ogreBelt = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.4, 16), leatherMat);
    ogreBelt.position.y = 1.3;
    enemyGroup.add(ogreBelt);

    // Braço Direito (Segurando o porrete apoiado no ombro)
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 1.6, 8), skinMat);
    armR.position.set(1.3, 2.9, 0.3);
    armR.rotation.set(-Math.PI / 3, 0, Math.PI / 6);
    enemyGroup.add(armR);

    // PORRETE GIGANTE COM ESPINHOS (Arma principal)
    const clubGroup = new THREE.Group();
    const clubBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 3.8, 12), woodMat);
    clubBase.position.y = 1.4;
    clubGroup.add(clubBase);
    // Reforços de ferro e espinhos no porrete
    for(let i = 0; i < 8; i++) {
        let spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), boneMat);
        spike.position.set(Math.sin(i) * 0.45, 2.2 + (i*0.15), Math.cos(i) * 0.45);
        spike.lookAt(Math.sin(i)*2, 2.2 + (i*0.15), Math.cos(i)*2);
        spike.rotation.x += Math.PI/2;
        clubGroup.add(spike);
    }
    clubGroup.position.set(1.2, 3.6, -0.4);
    clubGroup.rotation.set(Math.PI / 2.3, 0, -Math.PI / 8); // Apoiado transversalmente no ombro
    enemyGroup.add(clubGroup);

    // ESCUDO DE MADEIRA COM ESPINHOS (Mão Esquerda)
    const shieldGroup = new THREE.Group();
    const shieldBase = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.15, 16), woodMat);
    shieldBase.rotation.x = Math.PI / 2;
    shieldGroup.add(shieldBase);
    const shieldBrim = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.1, 0.18, 16, 1, true), ironMat);
    shieldBrim.rotation.x = Math.PI / 2;
    shieldGroup.add(shieldBrim);
    // Espinhos pontiagudos ao redor do escudo
    for(let i = 0; i < 6; i++) {
        let angle = (i / 6) * Math.PI * 2;
        let shieldSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), boneMat);
        shieldSpike.position.set(Math.sin(angle) * 1.05, Math.cos(angle) * 1.05, 0);
        shieldSpike.rotation.set(0, 0, -angle);
        shieldGroup.add(shieldSpike);
    }
    shieldGroup.position.set(-1.5, 1.9, 0.8);
    shieldGroup.rotation.set(0, Math.PI / 6, 0);
    enemyGroup.add(shieldGroup);

    scene.add(enemyGroup);
    enemyGroup.position.set(15, 0, -25);

    // Altera o rótulo do monstro dinamicamente no HUD HTML
    const lblBoss = document.getElementById("lbl-monster-name");
    if(lblBoss) lblBoss.innerText = "OGRO ESMAGADOR";

    // --- 5. LÓGICA DE ESTADOS E ENTRADAS ---
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
            logCombate.innerText = "⚡ Pulso da lâmina de dados ativado!";
            
            playerGroup.getWorldPosition(_vectorScratchA);
            enemyGroup.getWorldPosition(_vectorScratchB);
            let distanciaFisica = _vectorScratchA.distanceTo(_vectorScratchB);
            
            if (distanciaFisica < 5.5) { // Alcance levemente maior devido ao tamanho do Ogro
                _forwardVector.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);
                _vectorScratchB.sub(_vectorScratchA).normalize();
                let produtoEscalar = _forwardVector.dot(_vectorScratchB);

                if (produtoEscalar > 0.82) {
                    bossState.alertado = true;
                    let dano = 22 + Math.floor(Math.random() * 12);
                    bossState.hp = Math.max(0, bossState.hp - dano);
                    bossState.timerDanoGlow = 0.12;
                    
                    document.getElementById("boss-hud").classList.remove("hidden");
                    atualizarHUD();
                    logCombate.innerText = `💥 Ruído Crítico! Você cortou a defesa do Ogro aplicando ${dano} de dano.`;

                    if (bossState.hp <= 0 && bossState.vivo) {
                        bossState.vivo = false;
                        logCombate.innerText = "✨ Alvo Destruído. O Ogro desabou em combate!";
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
            camera.position.x = (Math.random() - 0.5) * 0.15;
            camera.position.y = 0.4 + (Math.random() - 0.5) * 0.15;
            shakeTimer -= delta;
        } else {
            camera.position.set(0, 0.4, 5.0);
        }
    }

    // --- 6. CORE GAME LOOP (FPS INDEPENDENTE) ---
    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        tempoAcumulado += delta; 

        // Animação das asas holográficas do herói
        if(wingGroupL && wingGroupR) {
            wingGroupL.rotation.y = Math.sin(tempoAcumulado * 4) * 0.3;
            wingGroupR.rotation.y = -Math.sin(tempoAcumulado * 4) * 0.3;
        }

        // Partículas cibernéticas
        if (particulas && particulas.geometry.attributes.position) {
            const pos = particulas.geometry.attributes.position.array;
            for(let i = 1; i < pCount * 3; i += 3) {
                pos[i] -= 2.5 * delta;
                if(pos[i] < 0) pos[i] = 40;
            }
            particulas.geometry.attributes.position.needsUpdate = true;
        }

        if (mouseTravado) {
            if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque -= delta;
            if (bossState.cooldownAtaque > 0) bossState.cooldownAtaque -= delta;
            if (bossState.timerDanoGlow > 0) bossState.timerDanoGlow -= delta;
            if (playerState.timerDanoGlow > 0) playerState.timerDanoGlow -= delta;

            // Flash visual vermelho quando o Ogro apanha
            if(bossState.timerDanoGlow > 0) {
                skinMat.emissive.setHex(0x550000);
            } else {
                skinMat.emissive.setHex(0x000000);
            }
            
            // Efeito visual piscando no holograma do herói
            if (playerState.timerDanoGlow > 0) {
                holoMat.color.setHex(0xff0055);
            } else {
                holoMat.color.setHex(0x00f3ff);
            }

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

                if (distHeroi < 28.0) bossState.alertado = true;

                if (bossState.alertado) {
                    document.getElementById("boss-hud").classList.remove("hidden");
                    enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

                    // Movimento de aproximação do Ogro
                    if (distHeroi > 4.2) {
                        enemyGroup.translateZ(5.5 * delta); // Velocidade pesada
                        // Respiração/Animação de corrida pesada balançando o porrete
                        clubGroup.rotation.x = (Math.PI / 2.3) + Math.sin(tempoAcumulado * 5) * 0.08;
                    } else {
                        // IA de Ataque do Ogro (Pancada com Porrete)
                        if (bossState.cooldownAtaque <= 0.0) {
                            bossState.cooldownAtaque = 1.2; // Ataques lentos, porém devastadores
                            
                            // Animação rápida de golpe com o porrete
                            clubGroup.rotation.x -= 1.2;
                            setTimeout(() => { clubGroup.rotation.set(Math.PI / 2.3, 0, -Math.PI / 8); }, 200);

                            let danoInimigo = 20 + Math.floor(Math.random() * 12); // Dano massivo
                            if (playerState.defendendo) {
                                danoInimigo = Math.floor(danoInimigo * 0.15);
                                logCombate.innerText = `🛡️ Impacto Retido! O escudo laser aguentou a marretada, sofrendo ${danoInimigo} HP.`;
                            } else {
                                playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                                playerState.timerDanoGlow = 0.15;
                                shakeTimer = 0.35; // Tremor de tela mais violento devido ao porrete
                                logCombate.innerText = `🚨 Golpe esmagador do Ogro! O impacto removeu ${danoInimigo} HP.`;
                                atualizarHUD();
                            }

                            if (playerState.hp <= 0) {
                                logCombate.innerText = "💀 Sua matriz de dados foi totalmente pulverizada pelo Ogro. Reiniciando...";
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
