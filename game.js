window.addEventListener('DOMContentLoaded', () => {
    
    // --- PARÂMETROS E CONFIGURAÇÕES MODIFICÁVEIS PELO MENU ---
    const configGlobal = {
        sensibilidade: 0.0022,
        apenasWireframe: false,
        jogoIniciado: false
    };

    // --- CONTROLE DE UI (TELA INICIAL E ABAS) ---
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

    // Disparador principal do jogo
    domBtnIniciar.addEventListener("click", () => {
        domInicial.style.opacity = "0";
        setTimeout(() => {
            domInicial.classList.add("hidden");
            inicializarMotorJogo(); // Inicializa gráficos e o sistema de áudio
        }, 500);
    });

    // --- CORE DO MOTOR 3D E SISTEMA DE ÁUDIO ---
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

        // --- ADIÇÃO DA MÚSICA DE FUNDO (WEB AUDIO API DO THREE.JS) ---
        const audioListener = new THREE.AudioListener();
        camera.add(audioListener); // Vincula o ouvido do sistema à câmara

        const musicaTema = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();

        // Carrega o arquivo local que salvaste
        audioLoader.load('musica-tema.mp3', function(buffer) {
            musicaTema.setBuffer(buffer);
            musicaTema.setLoop(true);
            musicaTema.setVolume(0.40); // Volume balanceado (40%) para não abafar os logs
            musicaTema.play();
            document.getElementById("combat-log").innerText = "🎵 Sincronização de Áudio: Tema 'Zero-Sum Decay' ativo.";
        }, 
        // Função de progresso (opcional)
        undefined,
        // Alerta caso o ficheiro não seja encontrado
        function(err) {
            console.log("Certifica-te de que guardaste o ficheiro como 'musica-tema.mp3' na mesma pasta.");
        });

        const clock = new THREE.Clock();
        let tempoAcumulado = 0;

        // Cache de vetores reutilizáveis
        const _vA = new THREE.Vector3();
        const _vB = new THREE.Vector3();
        const _fwd = new THREE.Vector3();

        // Iluminação Otimizada
        scene.add(new THREE.AmbientLight(0x0a1520, 0.6));
        const sunLight = new THREE.DirectionalLight(0x00aaff, 0.8);
        sunLight.position.set(30, 70, 20);
        scene.add(sunLight);

        // --- GERAÇÃO DE CENÁRIO ---
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

        // Pilares e Cristais espalhados
        const pilarGeo = new THREE.CylinderGeometry(0.6, 1.0, 14, 8);
        const pilarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const cristalGeo = new THREE.OctahedronGeometry(1.5, 0);
        const cristalMat = new THREE.MeshStandardMaterial({ color: 0x00d8ff, emissive: 0x003355 });

        for (let i = 0; i < 30; i++) {
            let x = (Math.random() - 0.5) * 130;
            let z = (Math.random() - 0.5) * 130;
            if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

            const mesh = (Math.random() > 0.5) ? new THREE.Mesh(pilarGeo, pilarMat) : new THREE.Mesh(cristalGeo, cristalMat);
            mesh.position.set(x, mesh.geometry.type === "CylinderGeometry" ? 7 : 1.5, z);
            scene.add(mesh);
        }

        // Partículas flutuantes
        const particlesGeo = new THREE.BufferGeometry();
        const pCount = 300;
        const pPoints = new Float32Array(pCount * 3);
        for(let i = 0; i < pCount * 3; i++) pPoints[i] = (Math.random() - 0.5) * 140;
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pPoints, 3));
        const particulas = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ size: 0.15, color: 0x00f0ff, transparent: true, opacity: 0.4 }));
        scene.add(particulas);

        // --- CONSTRUÇÃO DO JOGADOR (HOLOGRÁFICO ALADO) ---
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

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.3), new THREE.MeshBasicMaterial({color: 0x00ffff}));
        visor.position.set(0, 2.45, -0.22); 
        playerGroup.add(visor);

        const swordGroup = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.04), new THREE.MeshBasicMaterial({color: 0x00ffff}));
        blade.position.y = 1.2;
        swordGroup.add(blade);
        swordGroup.position.set(0.6, 1.2, -0.4);
        swordGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
        playerGroup.add(swordGroup);

        const wingGroupL = new THREE.Group();
        const wingGroupR = new THREE.Group();
        wingGroupL.position.set(-0.4, 2.0, 0.2);
        wingGroupR.position.set(0.4, 2.0, 0.2);
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

        // --- CONSTRUÇÃO DO INIMIGO (OGRO GUERREIRO DA IMAGEM) ---
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

        const boneShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), boneMat);
        boneShoulder.position.set(-1.2, 3.1, 0.1); boneShoulder.scale.set(1.2, 0.7, 0.8);
        enemyGroup.add(boneShoulder);

        const clubGroup = new THREE.Group();
        const clubBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.2, 3.8, 8), woodMat);
        clubBase.position.y = 1.4; clubGroup.add(clubBase);
        for(let i = 0; i < 5; i++) {
            let spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), boneMat);
            spike.position.set(Math.sin(i) * 0.4, 2.0 + (i*0.2), Math.cos(i) * 0.4);
            clubGroup.add(spike);
        }
        clubGroup.position.set(1.2, 3.6, -0.4); clubGroup.rotation.set(Math.PI / 2.3, 0, -Math.PI / 8);
        enemyGroup.add(clubGroup);

        const shieldGroup = new THREE.Group();
        const shieldBase = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.15, 12), woodMat);
        shieldBase.rotation.x = Math.PI / 2; shieldGroup.add(shieldBase);
        shieldGroup.position.set(-1.5, 1.9, 0.8); shieldGroup.rotation.set(0, Math.PI / 6, 0);
        enemyGroup.add(shieldGroup);

        scene.add(enemyGroup);
        enemyGroup.position.set(15, 0, -25);

        // --- SISTEMAS DE INTERFACE ATIVOS ---
        document.getElementById("game-hud").classList.remove("hidden");
        document.getElementById("reticula").classList.remove("hidden");
        document.getElementById("combat-log").classList.remove("hidden");
        const uiMouse = document.getElementById("travar-mouse-ui");
        uiMouse.classList.remove("hidden");

        const playerState = { hp: 100, hpMax: 100, defendendo: false, atacando: false, cooldownAtaque: 0.0, timerDanoGlow: 0.0 };
        const bossState = { hp: 500, hpMax: 500, vivo: true, cooldownAtaque: 0.0, alertado: false, timerDanoGlow: 0.0 };
        const teclado = {};
        let mouseTravado = false;

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
            playerGroup.rotation.y -= e.movementX * configGlobal.sensibilidade;
            cameraPivot.rotation.x -= e.movementY * configGlobal.sensibilidade;
            cameraPivot.rotation.x = Math.max(-0.3, Math.min(0.5, cameraPivot.rotation.x));
        });

        window.addEventListener("mousedown", (e) => {
            if (!mouseTravado || !bossState.vivo) return;

            if (e.button === 0 && !playerState.atacando && playerState.cooldownAtaque <= 0.0) {
                playerState.atacando = true;
                playerState.cooldownAtaque = 0.4;
                
                playerGroup.getWorldPosition(_vA);
                enemyGroup.getWorldPosition(_vB);
                
                if (_vA.distanceTo(_vB) < 5.5) {
                    _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);
                    _vB.sub(_vA).normalize();

                    if (_fwd.dot(_vB) > 0.82) {
                        bossState.alertado = true;
                        let dano = 22 + Math.floor(Math.random() * 12);
                        bossState.hp = Math.max(0, bossState.hp - dano);
                        bossState.timerDanoGlow = 0.12;
                        
                        document.getElementById("boss-hud").classList.remove("hidden");
                        atualizarHUD();
                        document.getElementById("combat-log").innerText = `💥 Golpe Crítico! Você cortou a defesa do Ogro aplicando ${dano} de dano.`;

                        if (bossState.hp <= 0 && bossState.vivo) {
                            bossState.vivo = false;
                            document.getElementById("combat-log").innerText = "✨ Vitória! O Ogro Esmagador foi banido de volta ao abismo.";
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

        // --- LOOP PRINCIPAL DE RENDERIZAÇÃO ---
        function animate() {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            tempoAcumulado += delta; 

            wingGroupL.rotation.y = Math.sin(tempoAcumulado * 4) * 0.3;
            wingGroupR.rotation.y = -Math.sin(tempoAcumulado * 4) * 0.3;

            const pos = particulas.geometry.attributes.position.array;
            for(let i = 1; i < pCount * 3; i += 3) {
                pos[i] -= 2.5 * delta;
                if(pos[i] < 0) pos[i] = 40;
            }
            particulas.geometry.attributes.position.needsUpdate = true;

            if (mouseTravado) {
                if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque -= delta;
                if (bossState.cooldownAtaque > 0) bossState.cooldownAtaque -= delta;
                if (bossState.timerDanoGlow > 0) bossState.timerDanoGlow -= delta;
                if (playerState.timerDanoGlow > 0) playerState.timerDanoGlow -= delta;

                skinMat.emissive.setHex(bossState.timerDanoGlow > 0 ? 0x550000 : 0x000000);
                holoMat.color.setHex(playerState.timerDanoGlow > 0 ? 0xff0055 : 0x00f3ff);

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
                    playerGroup.getWorldPosition(_vA);
                    enemyGroup.getWorldPosition(_vB);
                    let distHeroi = _vA.distanceTo(_vB);

                    if (distHeroi < 28.0) bossState.alertado = true;

                    if (bossState.alertado) {
                        document.getElementById("boss-hud").classList.remove("hidden");
                        enemyGroup.lookAt(playerGroup.position.x, enemyGroup.position.y, playerGroup.position.z);

                        if (distHeroi > 4.2) {
                            enemyGroup.translateZ(5.5 * delta);
                            clubGroup.rotation.x = (Math.PI / 2.3) + Math.sin(tempoAcumulado * 5) * 0.08;
                        } else {
                            if (bossState.cooldownAtaque <= 0.0) {
                                bossState.cooldownAtaque = 1.2;
                                
                                clubGroup.rotation.x -= 1.2;
                                setTimeout(() => { clubGroup.rotation.set(Math.PI / 2.3, 0, -Math.PI / 8); }, 200);

                                let danoInimigo = 20 + Math.floor(Math.random() * 12);
                                if (playerState.defendendo) {
                                    danoInimigo = Math.floor(danoInimigo * 0.15);
                                    document.getElementById("combat-log").innerText = `🛡️ Impacto Absorvido! O escudo aguentou a paulada. Recebeu ${danoInimigo} HP.`;
                                } else {
                                    playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                                    playerState.timerDanoGlow = 0.15;
                                    shakeTimer = 0.35;
                                    document.getElementById("combat-log").innerText = `🚨 O Ogro te esmagou com o porrete! Perdeu ${danoInimigo} HP.`;
                                    atualizarHUD();
                                }

                                if (playerState.hp <= 0) {
                                    document.getElementById("combat-log").innerText = "💀 Sua matriz holográfica desintegrou-se. Reiniciando...";
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
