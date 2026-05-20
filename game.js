(function() {
    "use strict";

    // --- CORREÇÃO DO GATILHO DE INICIALIZAÇÃO ---
    // Se o DOM já estiver pronto, inicia direto. Se não, espera o evento.
    if (document.readyState === "complete" || document.readyState === "interactive") {
        gerenciarAbertura();
    } else {
        window.addEventListener('DOMContentLoaded', gerenciarAbertura);
    }

    function gerenciarAbertura() {
        const domInicial = document.getElementById("tela-inicial");
        const domBtnIniciar = document.getElementById("btn-iniciar");
        
        if (domBtnIniciar) {
            domBtnIniciar.addEventListener("click", () => {
                if (domInicial) domInicial.style.opacity = "0";
                setTimeout(() => { 
                    if (domInicial) domInicial.classList.add("hidden"); 
                    inicializarMotorJogo(); 
                }, 500);
            });
        } else {
            // Se não houver tela inicial no HTML, roda o jogo imediatamente para não travar
            inicializarMotorJogo();
        }
    }

    function inicializarMotorJogo() {
        // --- SETUP DA CENA (Cenário Claro) ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdbeafe); 
        scene.fog = new THREE.FogExp2(0xdbeafe, 0.005);

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        const clock = new THREE.Clock();
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _fwd = new THREE.Vector3(), _dir = new THREE.Vector3();
        
        // --- ESTADOS E ATRIBUTOS ---
        const playerState = { 
            hp: 100, hpMax: 100, stamina: 100, staminaMax: 100,
            defendendo: false, atacando: false, 
            armaEquipada: 0, pocoes: 3, combo: 0, comboTimer: 0.0, dashing: false, dashTimer: 0.0
        };
        
        const arsenal = [
            { nome: "Lâmina", dano: 25, alcance: 5.5, velocidade: 0.4, custoStamina: 15 },
            { nome: "Martelo", dano: 58, alcance: 4.5, velocidade: 0.8, custoStamina: 35 },
            { nome: "Adaga", dano: 13, alcance: 4.0, velocidade: 0.2, custoStamina: 6 }
        ];

        let inimigos = [], dropsMundo = [], itensInventario = [];
        let mouseTravado = false, inventarioAberto = false, shakeTimer = 0, tempoAcumulado = 0;
        const teclado = {};

        // --- ILUMINAÇÃO ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.7)); 
        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        sunLight.position.set(50, 70, 30);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; 
        sunLight.shadow.mapSize.height = 2048;
        const d = 75;
        sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);

        // --- CHÃO ---
        const floorGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
        for (let i = 0; i < floorGeo.attributes.position.count; i++) {
            let vx = floorGeo.attributes.position.getX(i); let vy = floorGeo.attributes.position.getY(i);
            floorGeo.attributes.position.setZ(i, Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.5);
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.2 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // --- MATERIAIS DOS PERSONAGENS (Sombrios) ---
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.15 });
        const knightGlowMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x990000, emissiveIntensity: 1.2 });
        const wMatSword = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 1, roughness: 0.1 });
        const matOgro = new THREE.MeshStandardMaterial({ color: 0x2d3522, roughness: 0.95 }); 
        const matDrone = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 1, roughness: 0.1 }); 
        const matGuarda = new THREE.MeshStandardMaterial({ color: 0x1e1e24, metalness: 0.9, roughness: 0.4 }); 
        const matOlhoMal = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.8 });
        const matDano = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff0000, emissiveIntensity: 4 });
        const geoMembro = new THREE.CylinderGeometry(0.15, 0.12, 1.2, 8); 

        // --- CONSTRUÇÃO DO JOGADOR ---
        const playerGroup = new THREE.Group();
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.6), armorMat);
        torso.position.y = 1.6; torso.castShadow = true;
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), armorMat);
        helmet.position.y = 2.7; helmet.castShadow = true;
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.4), knightGlowMat);
        visor.position.set(0, 0.1, 0.25); helmet.add(visor);
        playerGroup.add(torso, helmet);

        const pEsq = new THREE.Mesh(geoMembro, armorMat); pEsq.position.set(-0.35, 0.6, 0); pEsq.castShadow = true;
        const pDir = new THREE.Mesh(geoMembro, armorMat); pDir.position.set(0.35, 0.6, 0); pDir.castShadow = true;
        const bEsq = new THREE.Mesh(geoMembro, armorMat); bEsq.position.set(-0.65, 1.6, 0); bEsq.rotation.z = Math.PI / 8; bEsq.castShadow = true;
        playerGroup.add(pEsq, pDir, bEsq);

        const weaponHandGroup = new THREE.Group();
        weaponHandGroup.position.set(0.65, 1.6, -0.4);
        weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
        playerGroup.add(weaponHandGroup);

        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), armorMat); hand.castShadow = true;
        
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.2), wMatSword); mSword.position.y = 1.3; mSword.castShadow = true;
        
        const mHammer = new THREE.Group();
        const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8), armorMat); hHandle.castShadow = true; mHammer.add(hHandle);
        const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0xaa2222, metalness: 0.5 }));
        hHead.position.y = 1.0; hHead.castShadow = true; mHammer.add(hHead);
        mHammer.visible = false;
        
        const mDagger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.08), new THREE.MeshStandardMaterial({ color: 0xff8800, metalness: 1 }));
        mDagger.position.y = 0.5; mDagger.castShadow = true; mDagger.visible = false;

        weaponHandGroup.add(hand, mSword, mHammer, mDagger);
        const listaDeArmasMesh = [mSword, mHammer, mDagger];

        scene.add(playerGroup);

        const cameraPivot = new THREE.Group();
        cameraPivot.position.set(0, 2.7, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 5.5); camera.lookAt(0, 2.2, -2);

        // --- SISTEMA DE INIMIGOS ---
        function spawnInimigo(tipo, px, pz) {
            let enemyGroup = new THREE.Group();
            let status = { vivo: true, alertado: false, cooldown: 0, timerDano: 0 };
            let malhaPrincipal;

            if (tipo === 'ogro') {
                malhaPrincipal = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 1.8), matOgro);
                malhaPrincipal.position.y = 1.4; malhaPrincipal.castShadow = true;
                let cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), matOgro);
                cabeca.position.set(0, 2.1, 0.3); cabeca.castShadow = true;
                let olho = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.2), matOlhoMal);
                olho.position.set(0, 0.2, 0.6); cabeca.add(olho);
                malhaPrincipal.add(cabeca);
                const mOgro = new THREE.CylinderGeometry(0.3, 0.25, 1.8, 8);
                const pE = new THREE.Mesh(mOgro, matOgro); pE.position.set(-0.7, -1.3, 0); pE.castShadow = true;
                const pD = new THREE.Mesh(mOgro, matOgro); pD.position.set(0.7, -1.3, 0); pD.castShadow = true;
                const bE = new THREE.Mesh(mOgro, matOgro); bE.position.set(-1.4, 0.8, 0); bE.rotation.z = Math.PI / 6; bE.castShadow = true;
                const bD = new THREE.Mesh(mOgro, matOgro); bD.position.set(1.4, 0.8, 0); bD.rotation.z = -Math.PI / 6; bD.castShadow = true;
                malhaPrincipal.add(pE, pD, bE, bD);
                enemyGroup.add(malhaPrincipal);
                status.hp = 800; status.hpMax = 800; status.vel = 5.0; status.danoBase = 25; status.alcance = 4.8; status.nome = "Colosso";
            } 
            else if (tipo === 'drone') {
                malhaPrincipal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), matDrone);
                malhaPrincipal.position.y = 3.5; malhaPrincipal.castShadow = true;
                let nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.4), matOlhoMal); malhaPrincipal.add(nucleo);
                const taserGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6);
                const t1 = new THREE.Mesh(taserGeo, matOlhoMal); t1.position.set(-0.6, -0.6, 0.4); t1.rotation.set(0.5, 0, 0.5);
                const t2 = new THREE.Mesh(taserGeo, matOlhoMal); t2.position.set(0.6, -0.6, 0.4); t2.rotation.set(0.5, 0, -0.5);
                malhaPrincipal.add(t1, t2);
                enemyGroup.add(malhaPrincipal);
                status.hp = 150; status.hpMax = 150; status.vel = 12.0; status.danoBase = 10; status.alcance = 2.5; status.nome = "Drone";
            }
            else if (tipo === 'guarda') {
                malhaPrincipal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 2.0, 10), matGuarda);
                malhaPrincipal.position.y = 1.7; malhaPrincipal.castShadow = true;
                let visorGuarda = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), matOlhoMal);
                visorGuarda.position.y = 0.7; malhaPrincipal.add(visorGuarda);
                const pG = new THREE.CylinderGeometry(0.2, 0.18, 1.4, 8);
                const p1 = new THREE.Mesh(pG, matGuarda); p1.position.set(-0.3, -1.0, 0); p1.castShadow = true;
                const p2 = new THREE.Mesh(pG, matGuarda); p2.position.set(0.3, -1.0, 0); p2.castShadow = true;
                const b1 = new THREE.Mesh(pG, matGuarda); b1.position.set(-0.8, 0.3, 0); b1.rotation.z = Math.PI / 10; b1.castShadow = true;
                const b2 = new THREE.Mesh(pG, matGuarda); b2.position.set(0.8, 0.3, 0); b2.rotation.z = -Math.PI / 10; b2.castShadow = true;
                malhaPrincipal.add(p1, p2, b1, b2);
                enemyGroup.add(malhaPrincipal);
                status.hp = 300; status.hpMax = 300; status.vel = 7.5; status.danoBase = 15; status.alcance = 3.5; status.nome = "Sentinela";
            }

            status.materialOriginal = malhaPrincipal.material;
            enemyGroup.position.set(px, 0, pz);
            scene.add(enemyGroup);
            inimigos.push({ mesh: enemyGroup, malhaPrincipal: malhaPrincipal, status: status, tipo: tipo });
        }

        spawnInimigo('ogro', 0, -30); spawnInimigo('drone', 15, -20);
        spawnInimigo('drone', -15, -20); spawnInimigo('guarda', 20, -10);

        // --- SPAWN DROPS ---
        const geoPocao = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const geoSucata = new THREE.OctahedronGeometry(0.3);

        function spawnDrop(px, pz) {
            const tipoItem = Math.random() > 0.5 ? 'pocao' : 'sucata_digital';
            let malhaDrop = new THREE.Mesh(
                tipoItem === 'pocao' ? geoPocao : geoSucata,
                tipoItem === 'pocao' ? new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x004422 }) : new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1 })
            );
            malhaDrop.position.set(px, 0.5, pz); malhaDrop.castShadow = true;
            scene.add(malhaDrop); dropsMundo.push({ mesh: malhaDrop, tipo: tipoItem });
        }

        // --- CACHE SEGURO DE INTERFACE GRAPHICA ---
        const uiElements = {
            hud: document.getElementById("game-hud"), reticula: document.getElementById("reticula"),
            combatLog: document.getElementById("combat-log"), uiMouse: document.getElementById("travar-mouse-ui"),
            painelInv: document.getElementById("painel-inventario"), hpBar: document.getElementById("bar-player-hp"),
            stmBar: document.getElementById("bar-player-stamina"), lblPocoes: document.getElementById("lbl-pocoes"),
            lblItens: document.getElementById("lbl-total-itens")
        };

        if(uiElements.hud) uiElements.hud.classList.remove("hidden");
        if(uiElements.reticula) uiElements.reticula.classList.remove("hidden");
        if(uiElements.combatLog) uiElements.combatLog.classList.remove("hidden");
        if(uiElements.uiMouse) uiElements.uiMouse.classList.remove("hidden");

        // Captura de Inputs
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase(); teclado[key] = true;

            if (key === 'e' && uiElements.painelInv) {
                inventarioAberto = !inventarioAberto;
                uiElements.painelInv.classList.toggle("hidden", !inventarioAberto);
                if (inventarioAberto) {
                    if (mouseTravado) document.exitPointerLock();
                    atualizarUIInventario(); logMsg("🎒 Inventário aberto.");
                } else {
                    document.body.requestPointerLock(); logMsg("⚔️ De volta ao combate.");
                }
            }
            if (!mouseTravado || inventarioAberto) return;
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < playerState.hpMax) { 
                playerState.pocoes--; playerState.hp = Math.min(100, playerState.hp + 45); 
                atualizarHUD(); logMsg("🧪 Seringa de Cura usada."); 
            }
            if (key === '1') trocarArma(0); if (key === '2') trocarArma(1); if (key === '3') trocarArma(2);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 20) { 
                playerState.dashing = true; playerState.dashTimer = 0.22; playerState.stamina -= 20; 
            }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function trocarArma(index) {
            playerState.armaEquipada = index;
            listaDeArmasMesh.forEach((mesh, idx) => mesh.visible = (idx === index));
            logMsg(`⚔️ Equipado: ${arsenal[index].nome}`);
        }

        if(uiElements.uiMouse) uiElements.uiMouse.addEventListener("click", () => { if(!inventarioAberto) document.body.requestPointerLock(); });
        
        // CORREÇÃO: Verificação segura para evitar quebra caso o botão fechar não exista
        const btnFechar = document.getElementById("btn-fechar-inv");
        if(btnFechar && uiElements.painelInv) {
            btnFechar.addEventListener("click", () => { 
                inventarioAberto = false; 
                uiElements.painelInv.classList.add("hidden"); 
                document.body.requestPointerLock(); 
            });
        }

        document.addEventListener("pointerlockchange", () => {
            mouseTravado = (document.pointerLockElement === document.body);
            if(uiElements.uiMouse) {
                uiElements.uiMouse.style.opacity = mouseTravado ? "0" : "1";
                uiElements.uiMouse.style.visibility = mouseTravado ? "hidden" : "visible";
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (!mouseTravado || inventarioAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.0022;
            cameraPivot.rotation.x -= e.movementY * 0.0022;
            cameraPivot.rotation.x = Math.max(-0.3, Math.min(0.5, cameraPivot.rotation.x));
        });

        // --- SISTEMA DE COMBATE ---
        window.addEventListener("mousedown", (e) => {
            if (!mouseTravado || inventarioAberto) return;
            const arma = arsenal[playerState.armaEquipada];

            if (e.button === 0 && !playerState.atacando && playerState.stamina >= arma.custoStamina) {
                playerState.atacando = true;
                playerState.stamina -= arma.custoStamina;
                playerGroup.getWorldPosition(_vA);
                _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    inimigo.mesh.getWorldPosition(_vB);
                    if (_vA.distanceTo(_vB) < arma.alcance) {
                        _dir.subVectors(_vB, _vA).normalize();
                        if (_fwd.dot(_dir) > 0.6) { 
                            let danoFinal = Math.floor(arma.dano * (1 + Math.min(playerState.combo * 0.1, 0.5)));
                            inimigo.status.hp -= danoFinal;
                            inimigo.status.timerDano = 0.15;
                            inimigo.malhaPrincipal.material = matDano;
                            logMsg(`💥 Hit! ${danoFinal} de dano no ${inimigo.status.nome}.`);
                            
                            if (inimigo.status.hp <= 0) { 
                                inimigo.status.vivo = false; scene.remove(inimigo.mesh); 
                                logMsg(`💀 ${inimigo.status.nome} destruído!`); 
                                spawnDrop(inimigo.mesh.position.x, inimigo.mesh.position.z); 
                            }
                        }
                    }
                });
            } else if (e.button === 2 && playerState.stamina >= 10) { 
                playerState.defendendo = true; 
                weaponHandGroup.position.set(0, 1.4, -0.5); weaponHandGroup.rotation.set(0, 0, Math.PI / 2); 
            }
        });

        window.addEventListener("mouseup", (e) => { 
            if (e.button === 2) { 
                playerState.defendendo = false; 
                weaponHandGroup.position.set(0.65, 1.6, -0.4); weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10); 
            } 
        });

        // --- SINCRONIZAÇÃO DE HUD ---
        function atualizarHUD() {
            if(uiElements.hpBar) uiElements.hpBar.style.width = `${playerState.hp}%`;
            if(uiElements.stmBar) uiElements.stmBar.style.width = `${playerState.stamina}%`;
            if(uiElements.lblPocoes) uiElements.lblPocoes.innerText = playerState.pocoes;
            if(uiElements.lblItens) uiElements.lblItens.innerText = itensInventario.length;
        }

        function atualizarUIInventario() {
            const grid = document.getElementById("grid-inventario");
            if(!grid) return;
            grid.innerHTML = "";
            let contagem = {};
            itensInventario.forEach(item => contagem[item] = (contagem[item] || 0) + 1);

            for (let [item, qtd] of Object.entries(contagem)) {
                let div = document.createElement('div');
                div.className = 'slot-item';
                div.innerHTML = `${item === 'pocao' ? '🧪' : '⚙️'}<div class="item-qtd">x${qtd}</div>`;
                div.onclick = () => { 
                    if (item === 'pocao' && playerState.hp < playerState.hpMax) { 
                        const index = itensInventario.indexOf('pocao'); 
                        itensInventario.splice(index, 1); playerState.pocoes++; 
                        atualizarUIInventario(); atualizarHUD(); 
                    } 
                };
                grid.appendChild(div);
            }
            for (let i = grid.children.length; i < 15; i++) { 
                let div = document.createElement('div'); div.className = 'slot-item'; 
                div.style.background = '#0d1117'; grid.appendChild(div); 
            }
        }

        function logMsg(msg) { if(uiElements.combatLog) uiElements.combatLog.innerText = msg; }

        // --- LOOP DE RENDERIZAÇÃO ---
        function animate() {
            requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1);
            if (inventarioAberto) { renderer.render(scene, camera); return; }
            tempoAcumulado += delta;

            if (mouseTravado) {
                if (!playerState.atacando && !playerState.defendendo && playerState.stamina < playerState.staminaMax) { 
                    playerState.stamina = Math.min(playerState.staminaMax, playerState.stamina + (25 * delta)); atualizarHUD(); 
                }
                
                // Animação rítmica dos membros inferiores (pernas)
                const wingDelta = Math.sin(tempoAcumulado * 5) * 0.15;
                pEsq.rotation.x = -wingDelta; pDir.rotation.x = wingDelta;

                if (playerState.dashTimer > 0) playerState.dashTimer -= delta; else playerState.dashing = false;
                
                if (playerState.atacando) { 
                    weaponHandGroup.rotation.y -= arsenal[playerState.armaEquipada].velocidade * 25 * delta; 
                    if (weaponHandGroup.rotation.y < -1.5) { 
                        playerState.atacando = false; weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10); 
                    } 
                }

                const mVel = (playerState.dashing ? 30 : 12) * delta;
                if (teclado['w']) playerGroup.translateZ(-mVel); if (teclado['s']) playerGroup.translateZ(mVel);
                if (teclado['a']) playerGroup.translateX(-mVel); if (teclado['d']) playerGroup.translateX(mVel);
                playerGroup.getWorldPosition(_vA);

                // Verificação de Coleta de Itens
                for (let i = dropsMundo.length - 1; i >= 0; i--) {
                    let drop = dropsMundo[i]; drop.mesh.rotation.y += delta;
                    if (_vA.distanceTo(drop.mesh.position) < 2) { 
                        if (itensInventario.length < 15) { 
                            itensInventario.push(drop.tipo); scene.remove(drop.mesh); dropsMundo.splice(i, 1); 
                            logMsg(`📦 Coletado: ${drop.tipo === 'pocao' ? 'Cura' : 'Sucata'}`); atualizarHUD(); 
                        } 
                    }
                }

                // Inteligência Artificial e Dano de Inimigos
                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    if (inimigo.status.timerDano > 0) { inimigo.status.timerDano -= delta; } 
                    else { inimigo.malhaPrincipal.material = inimigo.status.materialOriginal; }
                    
                    inimigo.mesh.getWorldPosition(_vB);
                    let distHeroi = _vA.distanceTo(_vB);

                    if (distHeroi < 30) inimigo.status.alertado = true;
                    if (inimigo.status.alertado) {
                        inimigo.mesh.lookAt(playerGroup.position.x, inimigo.mesh.position.y, playerGroup.position.z);
                        if (distHeroi > inimigo.status.alcance) { 
                            inimigo.mesh.translateZ(inimigo.status.vel * delta); 
                        } else {
                            if (inimigo.status.cooldown > 0) inimigo.status.cooldown -= delta;
                            if (inimigo.status.cooldown <= 0) {
                                inimigo.status.cooldown = 1.5;
                                if (playerState.dashing) { logMsg("💨 Esquivou!"); } else {
                                    let dano = inimigo.status.danoBase + Math.floor(Math.random() * 5);
                                    if (playerState.defendendo) { 
                                        dano = Math.floor(dano * 0.2); playerState.stamina -= 15; logMsg(`🛡️ Bloqueado! ${dano} recebido.`); 
                                    } else { 
                                        playerState.hp -= dano; logMsg(`🚨 Dano recebido de ${inimigo.status.nome}: ${dano} HP.`); shakeTimer = 0.3; 
                                    }
                                    atualizarHUD();
                                }
                                if (playerState.hp <= 0) { logMsg("💀 MORTO."); setTimeout(() => location.reload(), 2000); }
                            }
                        }
                    }
                });

                // Efeito Tremor de Tela
                if (shakeTimer > 0) { camera.position.x = (Math.random() - 0.5) * 0.2; shakeTimer -= delta; } 
                else { camera.position.set(0, 0, 5.5); }
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
})();
