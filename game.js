window.addEventListener('DOMContentLoaded', () => {
    
    // --- PARÂMETROS GLOBAIS ---
    const configGlobal = {
        sensibilidade: 0.0022,
        apenasWireframe: false,
        jogoIniciado: false
    };

    // --- MANIPULAÇÃO DE UI DE ENTRADA ---
    const domInicial = document.getElementById("tela-inicial");
    const domOpcoes = document.getElementById("painel-opcoes");
    const domBtnIniciar = document.getElementById("btn-iniciar");
    const domBtnOpcoes = document.getElementById("btn-opcoes");
    const domBtnFecharOpcoes = document.getElementById("btn-fechar-opcoes");

    domBtnOpcoes.addEventListener("click", () => domOpcoes.classList.remove("hidden"));
    domBtnFecharOpcoes.addEventListener("click", () => {
        const valorSens = document.getElementById("slider-sens").value;
        configGlobal.sensibilidade = 0.0011 * valorSens;
        configGlobal.apenasWireframe = document.getElementById("check-wireframe").checked;
        domOpcoes.classList.add("hidden");
    });

    domBtnIniciar.addEventListener("click", () => {
        domInicial.style.opacity = "0";
        setTimeout(() => {
            domInicial.classList.add("hidden");
            inicializarMotorJogo(); 
        }, 500);
    });

    // --- ENGINE PRINCIPAL ---
    function inicializarMotorJogo() {
        configGlobal.jogoIniciado = true;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x05070a);
        scene.fog = new THREE.FogExp2(0x05070a, 0.015);

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(renderer.domElement);

        // --- SISTEMA DE ÁUDIO NATIVO ---
        const audioListener = new THREE.AudioListener();
        camera.add(audioListener);
        const musicaTema = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();

        audioLoader.load('musica-tema.mp3', function(buffer) {
            musicaTema.setBuffer(buffer);
            musicaTema.setLoop(true);
            musicaTema.setVolume(0.35);
            musicaTema.play();
            logMsg("🎵 Sistema de Áudio: Tema de combate sincronizado.");
        }, undefined, function(err) {
            console.log("Para ouvir a música, salve o arquivo como 'musica-tema.mp3' na mesma pasta.");
        });

        const clock = new THREE.Clock();
        let tempoAcumulado = 0;

        // Cache de vetores contra vazamento de memória (Garbage Collection)
        const _vA = new THREE.Vector3();
        const _vB = new THREE.Vector3();
        const _fwd = new THREE.Vector3();

        // Iluminação
        scene.add(new THREE.AmbientLight(0x0a1520, 0.6));
        const sunLight = new THREE.DirectionalLight(0x00aaff, 0.8);
        sunLight.position.set(30, 70, 20);
        scene.add(sunLight);

        // --- GERADOR DE CENÁRIO OTIMIZADO ---
        const floorGeo = new THREE.PlaneGeometry(160, 160, 20, 20);
        const posAtributo = floorGeo.attributes.position;
        for (let i = 0; i < posAtributo.count; i++) {
            let vx = posAtributo.getX(i);
            let vy = posAtributo.getY(i);
            posAtributo.setZ(i, Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.7);
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Cristais e Elementos de Ambiente
        const cristalGeo = new THREE.OctahedronGeometry(1.5, 0);
        const cristalMat = new THREE.MeshStandardMaterial({ color: 0x00d8ff, emissive: 0x003355 });
        for (let i = 0; i < 25; i++) {
            let x = (Math.random() - 0.5) * 120;
            let z = (Math.random() - 0.5) * 120;
            if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
            const mesh = new THREE.Mesh(cristalGeo, cristalMat);
            mesh.position.set(x, 1.5, z);
            scene.add(mesh);
        }

        // Partículas de dados flutuantes
        const particlesGeo = new THREE.BufferGeometry();
        const pCount = 250;
        const pPoints = new Float32Array(pCount * 3);
        for(let i = 0; i < pCount * 3; i++) pPoints[i] = (Math.random() - 0.5) * 140;
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPoints, 3));
        const particulas = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ size: 0.15, color: 0x00f0ff, transparent: true, opacity: 0.4 }));
        scene.add(particulas);

        // --- BANCO DE DADOS DO ARSENAL ---
        const arsenal = [
            { id: 0, nome: "Lâmina Digital", danoBase: 25, alcance: 5.5, velocidade: 0.4, custoStamina: 15 },
            { id: 1, nome: "Martelo de Matriz", danoBase: 58, alcance: 4.5, velocidade: 0.8, custoStamina: 35 },
            { id: 2, nome: "Adagas de Cache", danoBase: 13, alcance: 4.0, velocidade: 0.2, custoStamina: 6 }
        ];

        // --- CONSTRUÇÃO DO HEROI HOLOGRÁFICO ---
        const playerGroup = new THREE.Group();
        const holoMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.35 });
        const holoGlowMat = new THREE.MeshStandardMaterial({ color: 0x00aeff, emissive: 0x004466, transparent: true, opacity: configGlobal.apenasWireframe ? 0.0 : 0.6 });

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.5, 10), holoMat);
        torso.position.y = 1.5;
        torso.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 1.48, 8), holoGlowMat));
        playerGroup.add(torso);

        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 10), holoMat);
        helmet.position.y = 2.45;
        helmet.add(new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 8), holoGlowMat));
        playerGroup.add(helmet);

        // Suporte de Armas Dinâmico (Ancorado no braço direito do pivô)
        const weaponHandGroup = new THREE.Group();
        weaponHandGroup.position.set(0.6, 1.2, -0.4);
        weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
        playerGroup.add(weaponHandGroup);

        // Malhas das Armas Físicas carregadas em Cache
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.04), new THREE.MeshBasicMaterial({color: 0x00ffff}));
        mSword.position.y = 1.2;
        weaponHandGroup.add(mSword);

        const mHammer = new THREE.Group();
        const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8), new THREE.MeshBasicMaterial({color: 0xff4444}));
        hHandle.position.y = 1.0;
        const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), new THREE.MeshBasicMaterial({color: 0xff4444}));
        hHead.position.y = 2.0;
        mHammer.add(hHandle, hHead); mHammer.visible = false; weaponHandGroup.add(mHammer);

        const mDagger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.03), new THREE.MeshBasicMaterial({color: 0x44ff44}));
        mDagger.position.y = 0.5; mDagger.visible = false; weaponHandGroup.add(mDagger);

        const listaDeArmasMesh = [mSword, mHammer, mDagger];

        // Asas Estilizadas
        const wingGroupL = new THREE.Group(); const wingGroupR = new THREE.Group();
        wingGroupL.position.set(-0.4, 2.0, 0.2); wingGroupR.position.set(0.4, 2.0, 0.2);
        const penaGeo = new THREE.BoxGeometry(1.4, 0.12, 0.02);
        for(let i = 0; i < 5; i++) {
            let pL = new THREE.Mesh(penaGeo, holoMat); pL.position.set(-0.7, -i * 0.18, 0); pL.rotation.z = Math.PI / 8 + (i * 0.08); wingGroupL.add(pL);
            let pR = new THREE.Mesh(penaGeo, holoMat); pR.position.set(0.7, -i * 0.18, 0); pR.rotation.z = -Math.PI / 8 - (i * 0.08); wingGroupR.add(pR);
        }
        playerGroup.add(wingGroupL, wingGroupR);
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group();
        cameraPivot.position.set(0, 2.5, 0);
        playerGroup.add(cameraPivot);
        cameraPivot.add(camera);
        camera.position.set(0, 0.4, 5.0);
        camera.lookAt(0, 1.9, -2);

        // --- CONSTRUÇÃO DO BOSS (OGRO) ---
        const enemyGroup = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0x5a6344, roughness: 0.9 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x523624, roughness: 0.9 });
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xdecaa5, roughness: 0.8 });

        const ogreTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 2.6, 12), skinMat);
        ogreTorso.position.y = 2.2; ogreTorso.scale.set(1.4, 1.0, 1.1);
        enemyGroup.add(ogreTorso);

        const ogreHead = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 10), skinMat);
        ogreHead.position.set(0, 3.7, 0.1);
        enemyGroup.add(ogreHead);

        const clubGroup = new THREE.Group();
        const clubBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 3.8, 8), woodMat);
        clubBase.position.y = 1.4; clubGroup.add(clubBase);
        clubGroup.position.set(1.2, 3.6, -0.4); clubGroup.rotation.set(Math.PI / 2.3, 0, -Math.PI / 8);
        enemyGroup.add(clubGroup);

        scene.add(enemyGroup);
        enemyGroup.position.set(12, 0, -25);

        // --- GERENCIADOR DE ESTADOS GERAIS ---
        const playerState = { 
            hp: 100, hpMax: 100, stamina: 100, staminaMax: 100,
            defendendo: false, atacando: false, cooldownAtaque: 0.0, timerDanoGlow: 0.0,
            armaEquipada: 0, pocoes: 3, combo: 0, comboTimer: 0.0,
            dashing: false, dashTimer: 0.0
        };

        const bossState = { hp: 1000, hpMax: 1000, vivo: true, cooldownAtaque: 0.0, alertado: false, timerDanoGlow: 0.0 };
        const teclado = {};
        let mouseTravado = false;

        // Ativação das Interfaces de Jogo Ativo
        document.getElementById("game-hud").classList.remove("hidden");
        document.getElementById("reticula").classList.remove("hidden");
        document.getElementById("combat-log").classList.remove("hidden");
        const uiMouse = document.getElementById("travar-mouse-ui");
        uiMouse.classList.remove("hidden");

        // --- SISTEMA DE ESCUTA DE ENTRADAS ---
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase();
            teclado[key] = true;

            if (!mouseTravado) return;

            // Inventário: Poção de Cura (Q)
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < playerState.hpMax) {
                playerState.pocoes--;
                playerState.hp = Math.min(playerState.hpMax, playerState.hp + 45);
                document.getElementById("lbl-pocoes").innerText = playerState.pocoes;
                atualizarHUD();
                logMsg(`🧪 Injetando cura na matriz! +45 HP. Poções restantes: ${playerState.pocoes}`);
            }

            // Sistema Avançado: Troca de Armas (1, 2, 3)
            if (key === '1') trocarArmaMatriz(0);
            if (key === '2') trocarArmaMatriz(1);
            if (key === '3') trocarArmaMatriz(2);

            // Mecânica Avançada: Esquiva / Dash (Shift)
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 20) {
                playerState.dashing = true;
                playerState.dashTimer = 0.22; 
                playerState.stamina -= 20;
                atualizarHUD();
                logMsg("💨 Deslocamento quântico (Dash)! Temporariamente invulnerável.");
            }
        });

        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function trocarArmaMatriz(index) {
            if (playerState.atacando) return;
            playerState.armaEquipada = index;
            listaDeArmasMesh.forEach((mesh, idx) => { mesh.visible = (idx === index); });
            document.getElementById("lbl-arma").innerText = arsenal[index].nome;
            logMsg(`Equipamento modificado para: ${arsenal[index].nome}`);
        }

        uiMouse.addEventListener("click", () => document.body.requestPointerLock());
        document.addEventListener("pointerlockchange", () => {
            mouseTravado = (document.pointerLockElement === document.body);
            uiMouse.style.opacity = mouseTravado ? "0" : "1";
            uiMouse.style.visibility = mouseTravado ? "hidden" : "visible";
        });

        document.addEventListener("mousemove", (e) => {
            if (!mouseTravado) return;
            playerGroup.rotation.y -= e.movementX * configGlobal.sensibilidade;
            cameraPivot.rotation.x -= e.movementY * configGlobal.sensibilidade;
            cameraPivot.rotation.x = Math.max(-0.3, Math.min(0.5, cameraPivot.rotation.x));
        });

        // Mecânica de Ataque e Defesa pelo Mouse
        window.addEventListener("mousedown", (e) => {
            if (!mouseTravado || !bossState.vivo) return;
            const arma = arsenal[playerState.armaEquipada];

            // Clique Esquerdo: Atacar
            if (e.button === 0 && !playerState.atacando && playerState.cooldownAtaque <= 0.0 && playerState.stamina >= arma.custoStamina) {
                playerState.atacando = true;
                playerState.cooldownAtaque = arma.velocidade;
                playerState.stamina -= arma.custoStamina;
                atualizarHUD();

                playerGroup.getWorldPosition(_vA);
                enemyGroup.getWorldPosition(_vB);
                
                if (_vA.distanceTo(_vB) < arma.alcance) {
                    _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);
                    _vB.sub(_vA).normalize();

                    if (_fwd.dot(_vB) > 0.75) {
                        bossState.alertado = true;
                        playerState.combo++;
                        playerState.comboTimer = 2.0;

                        document.getElementById("combo-counter").classList.remove("hidden");
                        document.getElementById("lbl-combo").innerText = playerState.combo;

                        let multiplicador = 1.0 + Math.min(playerState.combo * 0.12, 0.6);
                        let danoFinal = Math.floor((arma.danoBase + Math.random() * 8) * multiplicador);

                        bossState.hp = Math.max(0, bossState.hp - danoFinal);
                        bossState.timerDanoGlow = 0.12;
                        
                        document.getElementById("boss-hud").classList.remove("hidden");
                        atualizarHUD();
                        logMsg(`💥 COMBO x${playerState.combo}! Cortou o Ogro com ${danoFinal} de dano.`);

                        if (bossState.hp <= 0 && bossState.vivo) {
                            bossState.vivo = false;
                            logMsg("✨ VICTORY: O Ogro desmoronou em fragmentos digitais!");
                            scene.remove(enemyGroup);
                            document.getElementById("boss-hud").classList.add("hidden");
                            document.getElementById("combo-counter").classList.add("hidden");
                        }
                    }
                }
            } 
            // Clique Direito: Bloquear
            else if (e.button === 2 && playerState.stamina >= 10) {
                playerState.defendendo = true;
                weaponHandGroup.position.set(0, 1.4, -0.5);
                weaponHandGroup.rotation.set(0, 0, Math.PI / 2);
            }
        });

        window.addEventListener("mouseup", (e) => {
            if (e.button === 2) {
                playerState.defendendo = false;
                weaponHandGroup.position.set(0.6, 1.2, -0.4);
                weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
            }
        });

        window.addEventListener("contextmenu", e => e.preventDefault());

        function atualizarHUD() {
            document.getElementById("lbl-player-hp").innerText = playerState.hp;
            document.getElementById("bar-player-hp").style.width = `${playerState.hp}%`;
            document.getElementById("bar-player-stamina").style.width = `${playerState.stamina}%`;
            document.getElementById("lbl-monster-hp").innerText = bossState.hp;
            document.getElementById("bar-monster-hp").style.width = `${(bossState.hp / bossState.hpMax) * 100}%`;
        }

        function logMsg(msg) {
            document.getElementById("combat-log").innerText = msg;
        }

        let shakeTimer = 0.0;
        function processarCameraShake(delta) {
            if (shakeTimer > 0) {
                camera.position.x = (Math.random() - 0.5) * 0.16;
                camera.position.y = 0.4 + (Math.random() - 0.5) * 0.16;
                shakeTimer -= delta;
            } else {
                camera.position.set(0, 0.4, 5.0);
            }
        }

        // --- CICLO LOOP DE RENDERIZAÇÃO ---
        function animate() {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            tempoAcumulado += delta; 

            wingGroupL.rotation.y = Math.sin(tempoAcumulado * 4) * 0.3;
            wingGroupR.rotation.y = -Math.sin(tempoAcumulado * 4) * 0.3;

            const pos = particulas.geometry.attributes.position.array;
            for(let i = 1; i < pCount * 3; i += 3) {
                pos[i] -= 3.0 * delta;
                if(pos[i] < 0) pos[i] = 45;
            }
            particulas.geometry.attributes.position.needsUpdate = true;

            if (mouseTravado) {
                // Recuperação de Energia Ativa
                if (!playerState.atacando && !playerState.dashing && !playerState.defendendo && playerState.stamina < playerState.staminaMax) {
                    playerState.stamina = Math.min(playerState.staminaMax, playerState.stamina + (24 * delta));
                    atualizarHUD();
                }

                // Decaimento do Combo
                if (playerState.comboTimer > 0) {
                    playerState.comboTimer -= delta;
                    if (playerState.comboTimer <= 0) {
                        playerState.combo = 0;
                        document.getElementById("combo-counter").classList.add("hidden");
                    }
                }

                // Processamento de Timers
                if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque -= delta;
                if (bossState.cooldownAtaque > 0) bossState.cooldownAtaque -= delta;
                if (bossState.timerDanoGlow > 0) bossState.timerDanoGlow -= delta;
                if (playerState.dashTimer > 0) playerState.dashTimer -= delta; else playerState.dashing = false;

                skinMat.emissive.setHex(bossState.timerDanoGlow > 0 ? 0x660000 : 0x000000);

                // Animação Procedural do Balanço de Ataque
                if (playerState.atacando) {
                    const velGiro = arsenal[playerState.armaEquipada].velocidade * 55;
                    weaponHandGroup.rotation.y -= velGiro * delta;
                    if (weaponHandGroup.rotation.y < -Math.PI / 1.6) {
                        playerState.atacando = false;
                        weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
                    }
                }

                // Cálculo Vetorial de Vetores de Movimentação (Inclusão de velocidade de Dash)
                const mVel = (playerState.dashing ? 32.0 : 12.0) * delta;
                if (teclado['w']) playerGroup.translateZ(-mVel);
                if (teclado['s']) playerGroup.translateZ(mVel);
                if (teclado['a']) playerGroup.translateX(-mVel);
                if (teclado['d']) playerGroup.translateX(mVel);

                // Limites da Arena (Paredes Invisíveis)
                playerGroup.position.x = Math.max(-75, Math.min(75, playerGroup.position.x));
                playerGroup.position.z = Math.max(-75, Math.min(75, playerGroup.position.z));

                // IA DO OGRO INIMIGO
                if (bossState.vivo) {
                    playerGroup.getWorldPosition(_vA);
                    enemyGroup.getWorldPosition(_vB);
                    let distHeroi = _vA.distanceTo(_vB);

                    if (distHeroi < 30.0) bossState.alertado = true;

                    if (bossState.alertado) {
                        document.getElementById("boss-hud").classList.remove("hidden");
                        enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

                        if (distHeroi > 4.4) {
                            enemyGroup.translateZ(6.2 * delta); // Corre em direção ao jogador
                            clubGroup.rotation.x = (Math.PI / 2.3) + Math.sin(tempoAcumulado * 6) * 0.1;
                        } else {
                            // Lógica de Ataque do Ogro
                            if (bossState.cooldownAtaque <= 0.0) {
                                bossState.cooldownAtaque = 1.4;
                                clubGroup.rotation.x -= 1.3;
                                setTimeout(() => { clubGroup.rotation.set(Math.PI / 2.3, 0, -Math.PI / 8); }, 200);

                                if (playerState.dashing) {
                                    logMsg("💫 ESQUIVA PERFEITA! A clava do Ogro cortou o vento.");
                                } else {
                                    let danoInimigo = 24 + Math.floor(Math.random() * 12);
                                    
                                    if (playerState.defendendo && playerState.stamina >= 25) {
                                        danoInimigo = Math.floor(danoInimigo * 0.18);
                                        playerState.stamina -= 25; 
                                        logMsg(`🛡️ Bloqueio com sucesso! Absorveu o choque da clava, -${danoInimigo} HP.`);
                                    } else {
                                        if (playerState.defendendo) logMsg("⚠️ Defesa Rompida! Sem energia na barra de Stamina.");
                                        playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                                        shakeTimer = 0.32; // Treme a tela
                                        logMsg(`🚨 DANO IMPACTANTE! Você foi esmagado e perdeu ${danoInimigo} HP.`);
                                    }
                                    atualizarHUD();
                                }

                                if (playerState.hp <= 0) {
                                    logMsg("💀 Matriz colapsada. Reiniciando o simulador...");
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
    }
});
