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
        scene.background = new THREE.Color(0x0a0c10); // Fundo mais denso e escuro
        scene.fog = new THREE.FogExp2(0x0a0c10, 0.008); 

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Otimização para ecrãs de alta densidade
        
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        const clock = new THREE.Clock();
        let tempoAcumulado = 0;
        
        // OTIMIZAÇÃO: Vetores globais para evitar alocação de memória no ciclo de renderização
        const _vA = new THREE.Vector3(); 
        const _vB = new THREE.Vector3(); 
        const _fwd = new THREE.Vector3();
        const _dir = new THREE.Vector3();

        // --- ILUMINAÇÃO ---
        scene.add(new THREE.AmbientLight(0x1a202c, 1.2)); 
        const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        sunLight.position.set(40, 60, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024; // Otimizado (era 2048)
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 150;
        const d = 60;
        sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.001;
        scene.add(sunLight);

        // Chão
        const floorGeo = new THREE.PlaneGeometry(160, 160, 30, 30);
        for (let i = 0; i < floorGeo.attributes.position.count; i++) {
            let vx = floorGeo.attributes.position.getX(i); let vy = floorGeo.attributes.position.getY(i);
            floorGeo.attributes.position.setZ(i, Math.sin(vx * 0.1) * Math.cos(vy * 0.1) * 0.8);
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.7, metalness: 0.3 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // --- OTIMIZAÇÃO: MATERIAIS E GEOMETRIAS GLOBAIS ---
        // Em vez de criar um novo material/geometria por monstro, partilhamos o mesmo na memória da GPU
        
        // Materiais Jogador (Tons mais agressivos e escuros)
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.3 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xcc0000, emissiveIntensity: 2 });
        const wMatSword = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x660000, metalness: 1 });
        
        // Materiais Inimigos
        const matOgro = new THREE.MeshStandardMaterial({ color: 0x3d4230, roughness: 0.9 });
        const matDrone = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
        const matGuarda = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, metalness: 0.8, roughness: 0.3 });
        const matOlhoMal = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
        const matDano = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff0000, emissiveIntensity: 5 }); // Efeito de impacto

        // Geometrias Inimigos
        const geoOgroCorpo = new THREE.BoxGeometry(2.0, 2.6, 1.5);
        const geoOgroCabeca = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const geoOgroOlho = new THREE.BoxGeometry(0.8, 0.2, 0.2);
        const geoDroneCorpo = new THREE.OctahedronGeometry(0.8);
        const geoDroneNucleo = new THREE.SphereGeometry(0.4);
        const geoGuardaCorpo = new THREE.BoxGeometry(1.2, 2.0, 1.2);
        const geoGuardaVisor = new THREE.BoxGeometry(1.3, 0.3, 1.3);

        // Materiais e Geometrias de Drops
        const dropMatPocao = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x004422 });
        const dropMatSucata = new THREE.MeshStandardMaterial({ color: 0x888888, emissive: 0x222222, metalness: 1 });
        const geoPocao = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        const geoSucata = new THREE.BoxGeometry(0.4, 0.4, 0.4);

        // --- ARSENAL ---
        const arsenal = [
            { id: 0, nome: "Lâmina de Sangue", danoBase: 25, alcance: 5.5, velocidade: 0.4, custoStamina: 15 },
            { id: 1, nome: "Martelo de Matriz", danoBase: 58, alcance: 4.5, velocidade: 0.8, custoStamina: 35 },
            { id: 2, nome: "Adagas de Cache", danoBase: 13, alcance: 4.0, velocidade: 0.2, custoStamina: 6 }
        ];

        // --- CONSTRUÇÃO DO JOGADOR ---
        const playerGroup = new THREE.Group();
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.5), armorMat);
        torso.position.y = 1.4; torso.castShadow = true;
        const peitoralGlow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.55), glowMat);
        torso.add(peitoralGlow);
        playerGroup.add(torso);

        const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), armorMat);
        helmet.position.y = 2.5; helmet.castShadow = true;
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 0.5), glowMat);
        visor.position.set(0, 0.1, 0.1);
        helmet.add(visor);
        playerGroup.add(helmet);

        const weaponHandGroup = new THREE.Group();
        weaponHandGroup.position.set(0.7, 1.2, -0.4);
        weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
        playerGroup.add(weaponHandGroup);

        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.15), wMatSword);
        mSword.position.y = 1.3; mSword.castShadow = true; weaponHandGroup.add(mSword);

        const mHammer = new THREE.Group();
        const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 8), armorMat);
        hHandle.castShadow = true; mHammer.add(hHandle);
        const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: 0xaa2222, metalness: 0.5 }));
        hHead.position.y = 1.0; hHead.castShadow = true; mHammer.add(hHead);
        mHammer.visible = false; weaponHandGroup.add(mHammer);

        const mDagger = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.08), new THREE.MeshStandardMaterial({ color: 0xff8800, metalness: 1 }));
        mDagger.position.y = 0.5; mDagger.castShadow = true; mDagger.visible = false; weaponHandGroup.add(mDagger);

        const listaDeArmasMesh = [mSword, mHammer, mDagger];
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group();
        cameraPivot.position.set(0, 2.5, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0.4, 5.0); camera.lookAt(0, 1.9, -2);

        // --- SISTEMA DE INIMIGOS ---
        let inimigos = [];

        function spawnInimigo(tipo, px, pz) {
            let enemyGroup = new THREE.Group();
            let status = { vivo: true, alertado: false, cooldown: 0, timerDano: 0 };
            let malhaPrincipal;

            if (tipo === 'ogro') {
                malhaPrincipal = new THREE.Mesh(geoOgroCorpo, matOgro);
                malhaPrincipal.position.y = 1.3; malhaPrincipal.castShadow = true;
                
                let cabeca = new THREE.Mesh(geoOgroCabeca, matOgro);
                cabeca.position.set(0, 1.8, 0.2); cabeca.castShadow = true; // Ajuste na posição relativa
                
                let olho = new THREE.Mesh(geoOgroOlho, matOlhoMal);
                olho.position.set(0, 0.2, 0.45); cabeca.add(olho);
                
                malhaPrincipal.add(cabeca);
                enemyGroup.add(malhaPrincipal);
                status.hp = 800; status.hpMax = 800; status.vel = 5.0; status.danoBase = 25; status.alcance = 4.5; status.nome = "Colosso";
            } 
            else if (tipo === 'drone') {
                malhaPrincipal = new THREE.Mesh(geoDroneCorpo, matDrone);
                malhaPrincipal.position.y = 3.5; malhaPrincipal.castShadow = true;
                
                let nucleo = new THREE.Mesh(geoDroneNucleo, matOlhoMal);
                malhaPrincipal.add(nucleo);
                
                enemyGroup.add(malhaPrincipal);
                status.hp = 150; status.hpMax = 150; status.vel = 12.0; status.danoBase = 10; status.alcance = 2.5; status.nome = "Rastreador";
            }
            else if (tipo === 'guarda') {
                malhaPrincipal = new THREE.Mesh(geoGuardaCorpo, matGuarda);
                malhaPrincipal.position.y = 1.5; malhaPrincipal.castShadow = true;
                
                let visorGuarda = new THREE.Mesh(geoGuardaVisor, matOlhoMal);
                visorGuarda.position.y = 0.6; malhaPrincipal.add(visorGuarda);
                
                enemyGroup.add(malhaPrincipal);
                status.hp = 300; status.hpMax = 300; status.vel = 7.5; status.danoBase = 15; status.alcance = 3.5; status.nome = "Sentinela";
            }

            // Guardar a referência do material original para restaurar após tomar dano
            status.materialOriginal = malhaPrincipal.material;
            
            enemyGroup.position.set(px, 0, pz);
            scene.add(enemyGroup);
            inimigos.push({ mesh: enemyGroup, malhaPrincipal: malhaPrincipal, status: status, tipo: tipo });
        }

        spawnInimigo('ogro', 0, -30);
        spawnInimigo('drone', 15, -20);
        spawnInimigo('drone', -15, -20);
        spawnInimigo('guarda', 20, -10);

        // --- SISTEMA DE DROPS E INVENTÁRIO ---
        let dropsMundo = [];
        const inventarioSlots = 15;
        let itensInventario = []; 

        function spawnDrop(px, pz) {
            const chance = Math.random();
            let tipoItem = chance > 0.6 ? 'pocao' : 'sucata_digital';
            
            // Reutilizando geometrias e materiais
            let malhaDrop = new THREE.Mesh(
                tipoItem === 'pocao' ? geoPocao : geoSucata,
                tipoItem === 'pocao' ? dropMatPocao : dropMatSucata
            );
            
            malhaDrop.position.set(px, 0.5, pz);
            malhaDrop.castShadow = true;
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

        document.getElementById("game-hud").classList.remove("hidden");
        document.getElementById("reticula").classList.remove("hidden");
        document.getElementById("combat-log").classList.remove("hidden");
        const uiMouse = document.getElementById("travar-mouse-ui");
        const painelInv = document.getElementById("painel-inventario");
        uiMouse.classList.remove("hidden");

        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase();
            teclado[key] = true;

            if (key === 'e') {
                inventarioAberto = !inventarioAberto;
                painelInv.classList.toggle("hidden", !inventarioAberto);
                
                if (inventarioAberto) {
                    if (mouseTravado) document.exitPointerLock();
                    atualizarUIInventario();
                    logMsg("🎒 Inventário aberto.");
                } else {
                    document.body.requestPointerLock();
                    logMsg("⚔️ De volta ao combate.");
                }
            }

            if (!mouseTravado || inventarioAberto) return;

            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < playerState.hpMax) {
                playerState.pocoes--;
                playerState.hp = Math.min(playerState.hpMax, playerState.hp + 45);
                atualizarHUD();
                logMsg(`🧪 Cura aplicada! Poções restantes: ${playerState.pocoes}`);
            }

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
            // Correção de bug: garantir que o movement existe
            const movX = e.movementX || 0;
            const movY = e.movementY || 0;
            playerGroup.rotation.y -= movX * configGlobal.sensibilidade;
            cameraPivot.rotation.x -= movY * configGlobal.sensibilidade;
            cameraPivot.rotation.x = Math.max(-0.3, Math.min(0.5, cameraPivot.rotation.x));
        });

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

                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    inimigo.mesh.getWorldPosition(_vB);
                    
                    if (_vA.distanceTo(_vB) < arma.alcance) {
                        // OTIMIZAÇÃO: Usar vector pre-alocado em vez de .clone()
                        _dir.subVectors(_vB, _vA).normalize();
                        
                        if (_fwd.dot(_dir) > 0.6) { 
                            acertouAlguem = true;
                            inimigo.status.alertado = true;
                            
                            let multiplicador = 1.0 + Math.min(playerState.combo * 0.12, 0.6);
                            let danoFinal = Math.floor((arma.danoBase + Math.random() * 8) * multiplicador);
                            
                            inimigo.status.hp -= danoFinal;
                            inimigo.status.timerDano = 0.15;
                            inimigo.malhaPrincipal.material = matDano; // Efeito visual imediato

                            if (inimigo.status.hp <= 0) {
                                inimigo.status.vivo = false;
                                scene.remove(inimigo.mesh);
                                logMsg(`💀 ${inimigo.status.nome} destruído!`);
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
                weaponHandGroup.position.set(0.7, 1.2, -0.4); weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
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
            
            let contagem = {};
            itensInventario.forEach(item => { contagem[item] = (contagem[item] || 0) + 1; });

            for (let [item, qtd] of Object.entries(contagem)) {
                let icone = item === 'pocao' ? '🩸' : '⚙️'; // Alterado ícone da poção para combinar com o tema
                let div = document.createElement('div');
                div.className = 'slot-item';
                div.innerHTML = `${icone}<div class="item-qtd">x${qtd}</div>`;
                div.title = item === 'pocao' ? "Seringa de Cura (Uso: Tecla Q)" : "Sucata";
                
                div.onclick = () => {
                    if (item === 'pocao' && playerState.hp < playerState.hpMax) {
                        // Correção de Bug: splice estava vulnerável se o array mudasse, agora usa indexOf seguro
                        const index = itensInventario.indexOf('pocao');
                        if (index > -1) {
                            playerState.pocoes++; 
                            itensInventario.splice(index, 1);
                            atualizarUIInventario();
                            atualizarHUD();
                            logMsg("Cura equipada nos atalhos.");
                        }
                    }
                };
                grid.appendChild(div);
            }

            let preenchidos = Object.keys(contagem).length;
            for (let i = preenchidos; i < inventarioSlots; i++) {
                let divVazio = document.createElement('div');
                divVazio.className = 'slot-item'; divVazio.style.background = '#0d1117'; // Fundo mais escuro no inventário
                grid.appendChild(divVazio);
            }
        }

        function logMsg(msg) { document.getElementById("combat-log").innerText = msg; }

        let shakeTimer = 0.0;

        function animate() {
            requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1); // Limitador para evitar saltos gigantes se a aba perder o foco
            
            if (inventarioAberto) {
                renderer.render(scene, camera);
                return; 
            }

            tempoAcumulado += delta; 

            if (mouseTravado) {
                if (!playerState.atacando && !playerState.dashing && !playerState.defendendo && playerState.stamina < playerState.staminaMax) {
                    playerState.stamina = Math.min(playerState.staminaMax, playerState.stamina + (24 * delta));
                    atualizarHUD();
                }
                if (playerState.comboTimer > 0) {
                    playerState.comboTimer -= delta;
                    if (playerState.comboTimer <= 0) { playerState.combo = 0; document.getElementById("combo-counter").classList.add("hidden"); }
                }

                if (playerState.cooldownAtaque > 0) playerState.cooldownAtaque -= delta;
                if (playerState.dashTimer > 0) playerState.dashTimer -= delta; else playerState.dashing = false;

                if (playerState.atacando) {
                    weaponHandGroup.rotation.y -= arsenal[playerState.armaEquipada].velocidade * 55 * delta;
                    if (weaponHandGroup.rotation.y < -Math.PI / 1.6) {
                        playerState.atacando = false; weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
                    }
                }

                const mVel = (playerState.dashing ? 32.0 : 12.0) * delta;
                if (teclado['w']) playerGroup.translateZ(-mVel);
                if (teclado['s']) playerGroup.translateZ(mVel);
                if (teclado['a']) playerGroup.translateX(-mVel);
                if (teclado['d']) playerGroup.translateX(mVel);
                playerGroup.position.x = Math.max(-75, Math.min(75, playerGroup.position.x));
                playerGroup.position.z = Math.max(-75, Math.min(75, playerGroup.position.z));
                playerGroup.getWorldPosition(_vA);

                // Lógica de Drops
                for (let i = dropsMundo.length - 1; i >= 0; i--) {
                    let drop = dropsMundo[i];
                    drop.mesh.rotation.y += delta; 
                    drop.mesh.position.y = 0.5 + Math.sin(tempoAcumulado * 3) * 0.2; 

                    if (_vA.distanceTo(drop.mesh.position) < 2.0) {
                        if (itensInventario.length < inventarioSlots) {
                            itensInventario.push(drop.tipo);
                            scene.remove(drop.mesh);
                            dropsMundo.splice(i, 1);
                            
                            if(drop.tipo === 'pocao' && playerState.pocoes < 5) { 
                                playerState.pocoes++;
                                itensInventario.pop();
                            }
                            logMsg(`📦 Coletado: ${drop.tipo === 'pocao' ? 'Cura' : 'Sucata'}`);
                            atualizarHUD();
                        }
                    }
                }

                // Lógica dos Inimigos
                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    
                    if (inimigo.status.timerDano > 0) {
                        inimigo.status.timerDano -= delta;
                    } else if (inimigo.malhaPrincipal.material === matDano) {
                        // Restaura o material original após o hit piscar
                        inimigo.malhaPrincipal.material = inimigo.status.materialOriginal;
                    }

                    inimigo.mesh.getWorldPosition(_vB);
                    let distHeroi = _vA.distanceTo(_vB);

                    if (distHeroi < 35.0) inimigo.status.alertado = true;

                    if (inimigo.status.alertado) {
                        inimigo.mesh.lookAt(playerGroup.position.x, inimigo.mesh.position.y, playerGroup.position.z);

                        if (distHeroi > inimigo.status.alcance) {
                            inimigo.mesh.translateZ(inimigo.status.vel * delta);
                            if (inimigo.tipo === 'drone') inimigo.mesh.position.y = 3.5 + Math.sin(tempoAcumulado * 5) * 0.5;
                        } else {
                            if (inimigo.status.cooldown > 0) inimigo.status.cooldown -= delta;
                            
                            if (inimigo.status.cooldown <= 0.0) {
                                inimigo.status.cooldown = (inimigo.tipo === 'drone') ? 0.8 : 1.5;

                                if (playerState.dashing) {
                                    logMsg(`💫 Esquiva perfeita!`);
                                } else {
                                    let danoInimigo = inimigo.status.danoBase + Math.floor(Math.random() * 5);
                                    
                                    if (playerState.defendendo && playerState.stamina >= 20) {
                                        danoInimigo = Math.floor(danoInimigo * 0.2);
                                        playerState.stamina -= 20; 
                                    } else {
                                        playerState.hp = Math.max(0, playerState.hp - danoInimigo);
                                        if (inimigo.tipo === 'ogro') shakeTimer = 0.3; 
                                        logMsg(`🚨 Sangramento causado por ${inimigo.status.nome}: -${danoInimigo} HP.`);
                                    }
                                    atualizarHUD();
                                }

                                if (playerState.hp <= 0) {
                                    logMsg("💀 MORTO EM COMBATE. Reiniciando...");
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
