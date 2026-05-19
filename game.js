window.addEventListener('DOMContentLoaded', () => {
    
    // Configurações
    const configGlobal = { sensibilidade: 0.0022 };
    
    const domInicial = document.getElementById("tela-inicial");
    const domBtnIniciar = document.getElementById("btn-iniciar");
    
    domBtnIniciar.addEventListener("click", () => {
        domInicial.style.opacity = "0";
        setTimeout(() => { domInicial.classList.add("hidden"); inicializarMotorJogo(); }, 500);
    });

    function inicializarMotorJogo() {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x05070a);
        scene.fog = new THREE.FogExp2(0x05070a, 0.015);

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const clock = new THREE.Clock();
        let tempoAcumulado = 0;
        const _vA = new THREE.Vector3(); const _vB = new THREE.Vector3(); const _fwd = new THREE.Vector3();

        // Iluminação
        scene.add(new THREE.AmbientLight(0x0a1520, 0.6));
        const sunLight = new THREE.DirectionalLight(0x00aaff, 0.8);
        sunLight.position.set(30, 70, 20); scene.add(sunLight);

        // Chão e Cenário
        const floorGeo = new THREE.PlaneGeometry(160, 160, 20, 20);
        for (let i = 0; i < floorGeo.attributes.position.count; i++) {
            let vx = floorGeo.attributes.position.getX(i); let vy = floorGeo.attributes.position.getY(i);
            floorGeo.attributes.position.setZ(i, Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.7);
        }
        floorGeo.computeVertexNormals();
        const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }));
        floor.rotation.x = -Math.PI / 2; scene.add(floor);

        // --- ARSENAL ---
        const arsenal = [
            { id: 0, nome: "Lâmina Digital", danoBase: 25, alcance: 5.5, velocidade: 0.4, custoStamina: 15 },
            { id: 1, nome: "Martelo de Matriz", danoBase: 58, alcance: 4.5, velocidade: 0.8, custoStamina: 35 },
            { id: 2, nome: "Adagas de Cache", danoBase: 13, alcance: 4.0, velocidade: 0.2, custoStamina: 6 }
        ];

        // --- CONSTRUÇÃO DO JOGADOR ---
        const playerGroup = new THREE.Group();
        const holoMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.35 });
        const holoGlowMat = new THREE.MeshStandardMaterial({ color: 0x00aeff, emissive: 0x004466, transparent: true, opacity: 0.6 });

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.5, 10), holoMat);
        torso.position.y = 1.5; torso.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.38, 1.48, 8), holoGlowMat));
        playerGroup.add(torso);

        const weaponHandGroup = new THREE.Group();
        weaponHandGroup.position.set(0.6, 1.2, -0.4);
        weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
        playerGroup.add(weaponHandGroup);

        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.04), new THREE.MeshBasicMaterial({color: 0x00ffff}));
        mSword.position.y = 1.2; weaponHandGroup.add(mSword);

        const mHammer = new THREE.Group();
        mHammer.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8), new THREE.MeshBasicMaterial({color: 0xff4444})));
        const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), new THREE.MeshBasicMaterial({color: 0xff4444}));
        hHead.position.y = 1.0; mHammer.add(hHead); mHammer.visible = false; weaponHandGroup.add(mHammer);

        const mDagger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.03), new THREE.MeshBasicMaterial({color: 0x44ff44}));
        mDagger.position.y = 0.5; mDagger.visible = false; weaponHandGroup.add(mDagger);

        const listaDeArmasMesh = [mSword, mHammer, mDagger];
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group();
        cameraPivot.position.set(0, 2.5, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0.4, 5.0); camera.lookAt(0, 1.9, -2);

        // --- SISTEMA DE INIMIGOS MÚLTIPLOS ---
        let inimigos = [];
        const matOgro = new THREE.MeshStandardMaterial({ color: 0x5a6344, roughness: 0.9 });
        const matDrone = new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0x550000 });
        const matGuarda = new THREE.MeshStandardMaterial({ color: 0x8888aa, metalness: 0.8, roughness: 0.2 });

        function spawnInimigo(tipo, px, pz) {
            let enemyGroup = new THREE.Group();
            let status = { vivo: true, alertado: false, cooldown: 0, timerDano: 0 };

            if (tipo === 'ogro') { // Boss Lento e Forte
                let corpo = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 2.6, 12), matOgro);
                corpo.position.y = 2.2; enemyGroup.add(corpo);
                status.hp = 800; status.hpMax = 800; status.vel = 5.0; status.danoBase = 25; status.alcance = 4.5; status.nome = "Ogro Esmagador";
            } 
            else if (tipo === 'drone') { // Rápido, Voador, Fraco
                let corpo = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), matDrone);
                corpo.position.y = 3.5; enemyGroup.add(corpo);
                status.hp = 150; status.hpMax = 150; status.vel = 12.0; status.danoBase = 10; status.alcance = 2.5; status.nome = "Drone Hacker";
            }
            else if (tipo === 'guarda') { // Equilibrado
                let corpo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 1.2), matGuarda);
                corpo.position.y = 1.5; enemyGroup.add(corpo);
                status.hp = 300; status.hpMax = 300; status.vel = 7.5; status.danoBase = 15; status.alcance = 3.5; status.nome = "Sentinela de Elite";
            }

            enemyGroup.position.set(px, 0, pz);
            scene.add(enemyGroup);
            inimigos.push({ mesh: enemyGroup, status: status, tipo: tipo });
        }

        // Spawn inicial
        spawnInimigo('ogro', 0, -30);
        spawnInimigo('drone', 15, -20);
        spawnInimigo('drone', -15, -20);
        spawnInimigo('guarda', 20, -10);

        // --- SISTEMA DE DROPS E INVENTÁRIO ---
        let dropsMundo = [];
        const dropMatPocao = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x005533 });
        const dropMatSucata = new THREE.MeshStandardMaterial({ color: 0xa8a29e, emissive: 0x333333 });
        
        // Inventário do Jogador
        const inventarioSlots = 15;
        let itensInventario = []; // Array de strings (ex: 'pocao', 'sucata_digital')

        function spawnDrop(px, pz) {
            const chance = Math.random();
            let tipoItem = chance > 0.6 ? 'pocao' : 'sucata_digital';
            
            let malhaDrop;
            if (tipoItem === 'pocao') {
                malhaDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), dropMatPocao);
            } else {
                malhaDrop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), dropMatSucata);
            }
            
            malhaDrop.position.set(px, 0.5, pz);
            scene.add(malhaDrop);
            dropsMundo.push({ mesh: malhaDrop, tipo: tipoItem });
        }

        // --- ESTADOS DO JOGADOR ---
        const playerState = { 
            hp: 100, hpMax: 100, stamina: 100, staminaMax: 100,
            defendendo: false, atacando: false, cooldownAtaque: 0.0, 
            armaEquipada: 0, pocoes: 3, combo: 0, comboTimer: 0.0, dashing: false, dashTimer: 0.0
        };

        const teclado = {};
        let mouseTravado = false;
        let inventarioAberto = false;

        // UI SETUP
        document.getElementById("game-hud").classList.remove("hidden");
        document.getElementById("reticula").classList.remove("hidden");
        document.getElementById("combat-log").classList.remove("hidden");
        const uiMouse = document.getElementById("travar-mouse-ui");
        const painelInv = document.getElementById("painel-inventario");
        uiMouse.classList.remove("hidden");

        // --- CONTROLES DE TECLADO ---
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase();
            teclado[key] = true;

            // SISTEMA DE INVENTÁRIO (E)
            if (key === 'e') {
                inventarioAberto = !inventarioAberto;
                painelInv.classList.toggle("hidden", !inventarioAberto);
                
                if (inventarioAberto) {
                    if (mouseTravado) document.exitPointerLock();
                    atualizarUIInventario();
                    logMsg("🎒 Inventário acedido. Sistema de combate em pausa tática.");
                } else {
                    document.body.requestPointerLock();
                    logMsg("⚔️ Retornando ao combate.");
                }
            }

            if (!mouseTravado || inventarioAberto) return;

            // Cura Rápida
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < playerState.hpMax) {
                playerState.pocoes--;
                playerState.hp = Math.min(playerState.hpMax, playerState.hp + 45);
                atualizarHUD();
                logMsg(`🧪 Cura aplicada! +45 HP. Poções: ${playerState.pocoes}`);
            }

            // Armas e Dash
            if (key === '1') trocarArma(0); if (key === '2') trocarArma(1); if (key === '3') trocarArma(2);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 20) {
                playerState.dashing = true; playerState.dashTimer = 0.22; playerState.stamina -= 20;
            }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function trocarArma(index) {
            if (playerState.atacando) return;
            playerState.armaEquipada = index;
            listaDeArmasMesh.forEach((mesh, idx) => mesh.visible = (idx === index));
            document.getElementById("lbl-arma").innerText = arsenal[index].nome;
        }

        uiMouse.addEventListener("click", () => {
            if(!inventarioAberto) document.body.requestPointerLock();
        });
        document.getElementById("btn-fechar-inv").addEventListener("click", () => {
            inventarioAberto = false; painelInv.classList.add("hidden"); document.body.requestPointerLock();
        });

        document.addEventListener("pointerlockchange", () => {
            mouseTravado = (document.pointerLockElement === document.body);
            if (!inventarioAberto) {
                uiMouse.style.opacity = mouseTravado ? "0" : "1";
                uiMouse.style.visibility = mouseTravado ? "hidden" : "visible";
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (!mouseTravado || inventarioAberto) return;
            playerGroup.rotation.y -= e.movementX * configGlobal.sensibilidade;
            cameraPivot.rotation.x -= e.movementY * configGlobal.sensibilidade;
            cameraPivot.rotation.x = Math.max(-0.3, Math.min(0.5, cameraPivot.rotation.x));
        });

        // --- SISTEMA DE COMBATE CONTRA MÚLTIPLOS ALVOS ---
        window.addEventListener("mousedown", (e) => {
            if (!mouseTravado || inventarioAberto) return;
            const arma = arsenal[playerState.armaEquipada];

            if (e.button === 0 && !playerState.atacando && playerState.cooldownAtaque <= 0.0 && playerState.stamina >= arma.custoStamina) {
                playerState.atacando = true;
                playerState.cooldownAtaque = arma.velocidade;
                playerState.stamina -= arma.custoStamina;
                playerGroup.getWorldPosition(_vA);
                
                _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                let acertouAlguem = false;

                // Avalia acerto em TODOS os inimigos vivos
                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    inimigo.mesh.getWorldPosition(_vB);
                    
                    if (_vA.distanceTo(_vB) < arma.alcance) {
                        let dirToEnemy = _vB.clone().sub(_vA).normalize();
                        if (_fwd.dot(dirToEnemy) > 0.6) { // Cone de ataque (Sweep)
                            acertouAlguem = true;
                            inimigo.status.alertado = true;
                            
                            let multiplicador = 1.0 + Math.min(playerState.combo * 0.12, 0.6);
                            let danoFinal = Math.floor((arma.danoBase + Math.random() * 8) * multiplicador);
                            
                            inimigo.status.hp -= danoFinal;
                            inimigo.status.timerDano = 0.15;

                            if (inimigo.status.hp <= 0) {
                                inimigo.status.vivo = false;
                                scene.remove(inimigo.mesh);
                                logMsg(`💀 ${inimigo.status.nome} eliminado!`);
                                spawnDrop(inimigo.mesh.position.x, inimigo.mesh.position.z);
                            }
                        }
                    }
                });

                if (acertouAlguem) {
                    playerState.combo++; playerState.comboTimer = 2.0;
                    document.getElementById("combo-counter").classList.remove("hidden");
                    document.getElementById("lbl-combo").innerText = playerState.combo;
                }
            } 
            else if (e.button === 2 && playerState.stamina >= 10) {
                playerState.defendendo = true;
                weaponHandGroup.position.set(0, 1.4, -0.5); weaponHandGroup.rotation.set(0, 0, Math.PI / 2);
            }
        });

        window.addEventListener("mouseup", (e) => {
            if (e.button === 2) {
                playerState.defendendo = false;
                weaponHandGroup.position.set(0.6, 1.2, -0.4); weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
            }
        });

        function atualizarHUD() {
            document.getElementById("lbl-player-hp").innerText = playerState.hp;
            document.getElementById("bar-player-hp").style.width = `${playerState.hp}%`;
            document.getElementById("bar-player-stamina").style.width = `${playerState.stamina}%`;
            document.getElementById("lbl-pocoes").innerText = playerState.pocoes;
            document.getElementById("lbl-total-itens").innerText = itensInventario.length;
        }

        function atualizarUIInventario() {
            const grid = document.getElementById("grid-inventario");
            grid.innerHTML = "";
            
            // Agrupar itens
            let contagem = {};
            itensInventario.forEach(item => { contagem[item] = (contagem[item] || 0) + 1; });

            // Renderizar Slots preenchidos
            for (let [item, qtd] of Object.entries(contagem)) {
                let icone = item === 'pocao' ? '🧪' : '⚙️';
                let div = document.createElement('div');
                div.className = 'slot-item';
                div.innerHTML = `${icone}<div class="item-qtd">x${qtd}</div>`;
                div.title = item === 'pocao' ? "Poção de Vida (Uso: Tecla Q)" : "Sucata Digital";
                
                // Exemplo de clique no inventário
                div.onclick = () => {
                    if (item === 'pocao' && playerState.hp < playerState.hpMax) {
                        playerState.pocoes++; // Move do inventario genérico para quick-slot
                        itensInventario.splice(itensInventario.indexOf('pocao'), 1);
                        atualizarUIInventario();
                        atualizarHUD();
                        logMsg("Poção equipada no cinto rápido.");
                    }
                };
                grid.appendChild(div);
            }

            // Renderizar Slots Vazios
            let preenchidos = Object.keys(contagem).length;
            for (let i = preenchidos; i < inventarioSlots; i++) {
                let divVazio = document.createElement('div');
                divVazio.className = 'slot-item'; divVazio.style.background = '#0f172a';
                grid.appendChild(divVazio);
            }
        }

        function logMsg(msg) { document.getElementById("combat-log").innerText = msg; }

        let shakeTimer = 0.0;

        // --- LOOP DE RENDERIZAÇÃO ---
        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            
            // Se o inventário está aberto, pausa a lógica do jogo
            if (inventarioAberto) {
                renderer.render(scene, camera);
                return; 
            }

            tempoAcumulado += delta; 

            if (mouseTravado) {
                // Stamina e Combos
                if (!playerState.atacando && !playerState.dashing && !playerState.defendendo && playerState.stamina < playerState.staminaMax) {
                    playerState.stamina = Math.min(playerState.staminaMax, playerState.stamina + (24 * delta));
                    atualizarHUD();
                }
                if (playerState.comboTimer > 0) {
                    playerState.comboTimer -= delta;
                    if (playerState.comboTimer <= 0) { playerState.combo = 0; document.getElementById("combo-counter").classList.add("hidden"); }
                }

                // Timers Jogador
                if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque -= delta;
                if (playerState.dashTimer > 0) playerState.dashTimer -= delta; else playerState.dashing = false;

                // Animação Arma
                if (playerState.atacando) {
                    weaponHandGroup.rotation.y -= arsenal[playerState.armaEquipada].velocidade * 55 * delta;
                    if (weaponHandGroup.rotation.y < -Math.PI / 1.6) {
                        playerState.atacando = false; weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
                    }
                }

                // Movimento do Jogador
                const mVel = (playerState.dashing ? 32.0 : 12.0) * delta;
                if (teclado['w']) playerGroup.translateZ(-mVel);
                if (teclado['s']) playerGroup.translateZ(mVel);
                if (teclado['a']) playerGroup.translateX(-mVel);
                if (teclado['d']) playerGroup.translateX(mVel);
                playerGroup.position.x = Math.max(-75, Math.min(75, playerGroup.position.x));
                playerGroup.position.z = Math.max(-75, Math.min(75, playerGroup.position.z));
                playerGroup.getWorldPosition(_vA);

                // --- LÓGICA DE COLETA DE DROPS ---
                for (let i = dropsMundo.length - 1; i >= 0; i--) {
                    let drop = dropsMundo[i];
                    drop.mesh.rotation.y += delta; // Rodar o item
                    drop.mesh.position.y = 0.5 + Math.sin(tempoAcumulado * 3) * 0.2; // Flutuar

                    if (_vA.distanceTo(drop.mesh.position) < 2.0) {
                        // Coletou!
                        if (itensInventario.length < inventarioSlots) {
                            itensInventario.push(drop.tipo);
                            scene.remove(drop.mesh);
                            dropsMundo.splice(i, 1);
                            
                            if(drop.tipo === 'pocao' && playerState.pocoes < 5) { // Auto-equip pocao se tiver espaco
                                playerState.pocoes++;
                                itensInventario.pop();
                            }
                            logMsg(`📦 Coletado: ${drop.tipo === 'pocao' ? 'Poção de Vida' : 'Sucata Digital'}`);
                            atualizarHUD();
                        } else {
                            logMsg("⚠️ Inventário Cheio!");
                        }
                    }
                }

                // --- IA DOS INIMIGOS (AGORA UM ARRAY) ---
                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    
                    if (inimigo.status.timerDano > 0) {
                        inimigo.status.timerDano -= delta;
                        inimigo.mesh.children[0].material.emissive.setHex(0x660000); // Pisca vermelho
                    } else {
                        inimigo.mesh.children[0].material.emissive.setHex(inimigo.tipo === 'drone' ? 0x550000 : 0x000000);
                    }

                    inimigo.mesh.getWorldPosition(_vB);
                    let distHeroi = _vA.distanceTo(_vB);

                    if (distHeroi < 35.0) inimigo.status.alertado = true;

                    if (inimigo.status.alertado) {
                        inimigo.mesh.lookAt(playerGroup.position.x, inimigo.mesh.position.y, playerGroup.position.z);

                        // Movimento em direção ao jogador
                        if (distHeroi > inimigo.status.alcance) {
                            inimigo.mesh.translateZ(inimigo.status.vel * delta);
                            // Animação de andar baseada no tipo
                            if (inimigo.tipo === 'drone') inimigo.mesh.position.y = 3.5 + Math.sin(tempoAcumulado * 5) * 0.5;
                        } else {
                            // Ataque do Inimigo
                            if (inimigo.status.cooldown > 0) inimigo.status.cooldown -= delta;
                            
                            if (inimigo.status.cooldown <= 0.0) {
                                inimigo.status.cooldown = (inimigo.tipo === 'drone') ? 0.8 : 1.5;

                                if (playerState.dashing) {
                                    logMsg(`💫 Esquivou do ataque de ${inimigo.status.nome}!`);
                                } else {
                                    let danoInimigo = inimigo.status.danoBase + Math.floor(Math.random() * 5);
                                    
                                    if (playerState.defendendo && playerState.stamina >= 20) {
                                        danoInimigo = Math.floor(danoInimigo * 0.2);
                                        playerState.stamina -= 20; 
                                    } else {
                                        playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                                        if (inimigo.tipo === 'ogro') shakeTimer = 0.3; // Ogro treme a tela
                                        logMsg(`🚨 Dano recebido de ${inimigo.status.nome}: -${danoInimigo} HP.`);
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
                });

                if (shakeTimer > 0) {
                    camera.position.x = (Math.random() - 0.5) * 0.16;
                    camera.position.y = 0.4 + (Math.random() - 0.5) * 0.16;
                    shakeTimer -= delta;
                } else {
                    camera.position.set(0, 0.4, 5.0);
                }
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
