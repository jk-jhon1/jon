(function() {
    "use strict";

    // Inicialização assíncrona blindada para o universo ARYSONY
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
                if (domInicial) {
                    domInicial.style.opacity = "0";
                    setTimeout(() => { 
                        domInicial.classList.add("hidden"); 
                        inicializarMotorJogo(); 
                    }, 500);
                }
            });
        } else {
            inicializarMotorJogo();
        }
    }

    function inicializarMotorJogo() {
        // Fallbacks de segurança para elementos da interface (UI)
        const obterElementoSeguro = (id) => document.getElementById(id) || { style: {}, classList: { add:()=>{}, remove:()=>{}, toggle:()=>{} }, innerText: "" };

        const uiElements = {
            hud: obterElementoSeguro("game-hud"),
            reticula: obterElementoSeguro("reticula"),
            combatLog: obterElementoSeguro("combat-log"),
            uiMouse: obterElementoSeguro("travar-mouse-ui"),
            painelInv: obterElementoSeguro("painel-inventario"),
            hpBar: obterElementoSeguro("bar-player-hp"),
            stmBar: obterElementoSeguro("bar-player-stamina"),
            lblPocoes: obterElementoSeguro("lbl-pocoes"),
            lblItens: obterElementoSeguro("lbl-total-itens"),
            gridInv: document.getElementById("grid-inventario")
        };

        uiElements.hud.classList.remove("hidden");
        uiElements.reticula.classList.remove("hidden");
        uiElements.combatLog.classList.remove("hidden");
        uiElements.uiMouse.classList.remove("hidden");

        // --- INSTANCIAMENTO E AMBIENTE THREE.JS ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a); 
        scene.fog = new THREE.FogExp2(0x0f172a, 0.008);

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        const clock = new THREE.Clock();
        
        // Memória Alocada (Evita re-alocação no loop principal para não travar frames)
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _fwd = new THREE.Vector3(), _dir = new THREE.Vector3();
        const direcaoMovimento = new THREE.Vector3();

        // Sistemas de Iluminação Dinâmica
        scene.add(new THREE.AmbientLight(0xffffff, 0.45)); 
        const sunLight = new THREE.DirectionalLight(0x818cf8, 1.2);
        sunLight.position.set(40, 60, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        const d = 80;
        sunLight.shadow.camera.left = -d; sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d; sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0006;
        scene.add(sunLight);

        // Terreno Relevo Otimizado
        const floorGeo = new THREE.PlaneGeometry(300, 300, 20, 20);
        const posAttr = floorGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            posAttr.setZ(i, Math.sin(vx * 0.05) * Math.cos(vy * 0.05) * 0.4);
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.6, metalness: 0.1 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Paleta de Materiais
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8, roughness: 0.2 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, emissive: 0x4f46e5, emissiveIntensity: 1.5 });
        const weaponMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.1 });
        const matOgro = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }); 
        const matDrone = new THREE.MeshStandardMaterial({ color: 0x030712, metalness: 0.9, roughness: 0.1 }); 
        const matGuarda = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 }); 
        const matOlhoMal = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 2.0 });
        const matDano = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5 });
        const geoMembro = new THREE.CylinderGeometry(0.14, 0.11, 1.2, 8); 
        const geoPocao = new THREE.CylinderGeometry(0.1, 0.15, 0.4, 6);
        const geoSucata = new THREE.BoxGeometry(0.3, 0.3, 0.3);

        // --- CONSTRUÇÃO DO JOGADOR ARYSONY ---
        const playerGroup = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.5), armorMat); torso.position.y = 1.5; torso.castShadow = true;
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), armorMat); helmet.position.y = 2.5; helmet.castShadow = true;
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.35), glowMat); visor.position.set(0, 0.08, 0.24); helmet.add(visor);
        playerGroup.add(torso, helmet);

        const pEsq = new THREE.Mesh(geoMembro, armorMat); pEsq.position.set(-0.3, 0.6, 0); pEsq.castShadow = true;
        const pDir = new THREE.Mesh(geoMembro, armorMat); pDir.position.set(0.3, 0.6, 0); pDir.castShadow = true;
        const bEsq = new THREE.Mesh(geoMembro, armorMat); bEsq.position.set(-0.6, 1.5, 0); bEsq.rotation.z = Math.PI / 8; bEsq.castShadow = true;
        playerGroup.add(pEsq, pDir, bEsq);

        const weaponHandGroup = new THREE.Group();
        weaponHandGroup.position.set(0.6, 1.5, -0.3);
        weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10);
        playerGroup.add(weaponHandGroup);

        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), armorMat); hand.castShadow = true;
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.18), weaponMat); mSword.position.y = 1.2; mSword.castShadow = true;
        
        const mHammer = new THREE.Group();
        const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 8), armorMat); hHandle.castShadow = true; mHammer.add(hHandle);
        const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.85), new THREE.MeshStandardMaterial({ color: 0x4f46e5, metalness: 0.6 }));
        hHead.position.y = 0.9; hHead.castShadow = true; mHammer.add(hHead); mHammer.visible = false;
        
        const mDagger = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.06), new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.8 }));
        mDagger.position.y = 0.4; mDagger.castShadow = true; mDagger.visible = false;

        weaponHandGroup.add(hand, mSword, mHammer, mDagger);
        const listaDeArmasMesh = [mSword, mHammer, mDagger];
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group();
        cameraPivot.position.set(0, 2.5, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 5.0); camera.lookAt(0, 2.0, -2);

        // --- PROPRIEDADES DA SIMULAÇÃO ---
        const playerState = { 
            hp: 100, hpMax: 100, stamina: 100, staminaMax: 100,
            defendendo: false, atacando: false, 
            armaEquipada: 0, pocoes: 3, dashing: false, dashTimer: 0.0
        };
        
        const arsenal = [
            { nome: "Cyber-Lâmina", dano: 28, alcance: 5.8, velocidade: 5.5, custoStamina: 12 },
            { nome: "Trissecador", dano: 62, alcance: 4.8, velocidade: 3.2, custoStamina: 30 },
            { nome: "Ferrão Sombrio", dano: 15, alcance: 4.2, velocidade: 9.0, custoStamina: 5 }
        ];

        let inimigos = [], dropsMundo = [], itensInventario = [];
        let mouseTravado = false, inventarioAberto = false, shakeTimer = 0, tempoAcumulado = 0;
        const teclado = {};

        // Inteligência Artificial Otimizada
        function spawnInimigo(tipo, px, pz) {
            const enemyGroup = new THREE.Group();
            const status = { vivo: true, alertado: false, cooldown: 0, timerDano: 0 };
            let malhaPrincipal;

            if (tipo === 'ogro') {
                malhaPrincipal = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 1.6), matOgro); malhaPrincipal.position.y = 1.3; malhaPrincipal.castShadow = true;
                const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 10), matOgro); cabeca.position.set(0, 2.0, 0.25);
                const olho = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.18), matOlhoMal); olho.position.set(0, 0.15, 0.55); cabeca.add(olho); malhaPrincipal.add(cabeca);
                const mOgro = new THREE.CylinderGeometry(0.28, 0.22, 1.6, 8);
                const pE = new THREE.Mesh(mOgro, matOgro); pE.position.set(-0.6, -1.2, 0); const pD = new THREE.Mesh(mOgro, matOgro); pD.position.set(0.6, -1.2, 0);
                malhaPrincipal.add(pE, pD);
                status.hp = 650; status.vel = 5.5; status.danoBase = 22; status.alcance = 4.5; status.nome = "Mestre de Carga";
            } else if (tipo === 'drone') {
                malhaPrincipal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), matDrone); malhaPrincipal.position.y = 3.2; malhaPrincipal.castShadow = true;
                const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.35), matOlhoMal); malhaPrincipal.add(nucleo);
                status.hp = 120; status.vel = 11.0; status.danoBase = 8; status.alcance = 2.8; status.nome = "Infiltrador S.A";
            } else if (tipo === 'guarda') {
                malhaPrincipal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.9, 10), matGuarda); malhaPrincipal.position.y = 1.6; malhaPrincipal.castShadow = true;
                const visorGuarda = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), matOlhoMal); visorGuarda.position.y = 0.65; malhaPrincipal.add(visorGuarda);
                status.hp = 250; status.vel = 8.0; status.danoBase = 14; status.alcance = 3.6; status.nome = "Defensor ARYSONY";
            }

            status.materialOriginal = malhaPrincipal.material;
            enemyGroup.position.set(px, 0, pz); enemyGroup.add(malhaPrincipal);
            scene.add(enemyGroup); inimigos.push({ mesh: enemyGroup, malhaPrincipal: malhaPrincipal, status: status });
        }

        // População Inicial do Campo
        spawnInimigo('ogro', 0, -35); spawnInimigo('drone', 18, -25);
        spawnInimigo('drone', -18, -25); spawnInimigo('guarda', 22, -15);

        function spawnDrop(px, pz) {
            const tipoItem = Math.random() > 0.45 ? 'pocao' : 'sucata_digital';
            const malhaDrop = new THREE.Mesh(
                tipoItem === 'pocao' ? geoPocao : geoSucata,
                tipoItem === 'pocao' ? new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x064e3b }) : new THREE.MeshStandardMaterial({ color: 0x818cf8, metalness: 0.8 })
            );
            malhaDrop.position.set(px, 0.5, pz); malhaDrop.castShadow = true;
            scene.add(malhaDrop); dropsMundo.push({ mesh: malhaDrop, tipo: tipoItem });
        }

        // --- CAPTURA DE INPUTS ---
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase(); teclado[key] = true;

            if (key === 'e') {
                inventarioAberto = !inventarioAberto;
                uiElements.painelInv.classList.toggle("hidden", !inventarioAberto);
                if (inventarioAberto) {
                    if (mouseTravado) document.exitPointerLock();
                    atualizarUIInventario(); logMsg("🎒 Compartimento de carga inspecionado.");
                } else {
                    document.body.requestPointerLock(); logMsg("⚔️ Armamento pronto.");
                }
            }
            if (!mouseTravado || inventarioAberto) return;
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < playerState.hpMax) { 
                playerState.pocoes--; playerState.hp = Math.min(100, playerState.hp + 40); atualizarHUD(); logMsg("🧪 Seringa injetada com sucesso."); 
            }
            if (key === '1') trocarArma(0); if (key === '2') trocarArma(1); if (key === '3') trocarArma(2);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 18) { 
                playerState.dashing = true; playerState.dashTimer = 0.2; playerState.stamina -= 18; 
            }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function trocarArma(index) {
            playerState.armaEquipada = index;
            listaDeArmasMesh.forEach((mesh, idx) => mesh.visible = (idx === index));
            logMsg(`⚔️ Ativo: ${arsenal[index].nome}`);
        }

        uiElements.uiMouse.addEventListener("click", () => { if(!inventarioAberto) document.body.requestPointerLock(); });
        
        const btnFechar = document.getElementById("btn-fechar-inv");
        if(btnFechar) {
            btnFechar.addEventListener("click", () => { inventarioAberto = false; uiElements.painelInv.classList.add("hidden"); document.body.requestPointerLock(); });
        }

        document.addEventListener("pointerlockchange", () => {
            mouseTravado = (document.pointerLockElement === document.body);
            uiElements.uiMouse.style.opacity = mouseTravado ? "0" : "1";
            uiElements.uiMouse.style.visibility = mouseTravado ? "hidden" : "visible";
        });

        document.addEventListener("mousemove", (e) => {
            if (!mouseTravado || inventarioAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002;
            cameraPivot.rotation.x -= e.movementY * 0.002;
            cameraPivot.rotation.x = Math.max(-0.4, Math.min(0.6, cameraPivot.rotation.x));
        });

        // Mecânica de Impactos Otimizada
        window.addEventListener("mousedown", (e) => {
            if (!mouseTravado || inventarioAberto) return;
            const arma = arsenal[playerState.armaEquipada];

            if (e.button === 0 && !playerState.atacando && playerState.stamina >= arma.custoStamina) {
                playerState.atacando = true; playerState.stamina -= arma.custoStamina;
                playerGroup.getWorldPosition(_vA); _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    inimigo.mesh.getWorldPosition(_vB);
                    if (_vA.distanceTo(_vB) < arma.alcance) {
                        _dir.subVectors(_vB, _vA).normalize();
                        if (_fwd.dot(_dir) > 0.65) { 
                            let danoFinal = Math.floor(arma.dano * (1 + (Math.random() * 0.2)));
                            inimigo.status.hp -= danoFinal; inimigo.status.timerDano = 0.12; inimigo.malhaPrincipal.material = matDano;
                            logMsg(`💥 Impacto! ${danoFinal} de dano infligido.`);
                            if (inimigo.status.hp <= 0) { 
                                inimigo.status.vivo = false; scene.remove(inimigo.mesh); logMsg(`💀 ${inimigo.status.nome} neutralizado.`); spawnDrop(inimigo.mesh.position.x, inimigo.mesh.position.z); 
                            }
                        }
                    }
                });
            } else if (e.button === 2 && playerState.stamina >= 8) { 
                playerState.defendendo = true; weaponHandGroup.position.set(0, 1.3, -0.4); weaponHandGroup.rotation.set(0, 0, Math.PI / 2); 
            }
        });

        window.addEventListener("mouseup", (e) => { 
            if (e.button === 2) { playerState.defendendo = false; weaponHandGroup.position.set(0.6, 1.5, -0.3); weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10); } 
        });

        function atualizarHUD() {
            uiElements.hpBar.style.width = `${playerState.hp}%`; uiElements.stmBar.style.width = `${playerState.stamina}%`;
            uiElements.lblPocoes.innerText = playerState.pocoes; uiElements.lblItens.innerText = itensInventario.length;
        }

        function atualizarUIInventario() {
            if(!uiElements.gridInv) return; uiElements.gridInv.innerHTML = "";
            let contagem = {}; itensInventario.forEach(item => contagem[item] = (contagem[item] || 0) + 1);

            for (let [item, qtd] of Object.entries(contagem)) {
                let div = document.createElement('div'); div.className = 'slot-item';
                div.innerHTML = `${item === 'pocao' ? '🧪' : '⚙️'}<div class="item-qtd">x${qtd}</div>`;
                div.onclick = () => { 
                    if (item === 'pocao' && playerState.hp < playerState.hpMax) { 
                        const index = itensInventario.indexOf('pocao'); itensInventario.splice(index, 1); playerState.pocoes++; atualizarUIInventario(); atualizarHUD(); 
                    } 
                };
                uiElements.gridInv.appendChild(div);
            }
            for (let i = uiElements.gridInv.children.length; i < 15; i++) { 
                let div = document.createElement('div'); div.className = 'slot-item'; div.style.background = '#060813'; uiElements.gridInv.appendChild(div); 
            }
        }

        function logMsg(msg) { uiElements.combatLog.innerText = msg; }

        // --- LOOP PRINCIPAL (60 FPS ESTÁVEIS) ---
        function animate() {
            requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1);
            if (inventarioAberto) { renderer.render(scene, camera); return; }
            tempoAcumulado += delta;

            if (mouseTravado) {
                // Recuperação de Estâmina Ativa
                if (!playerState.atacando && !playerState.defendendo && playerState.stamina < playerState.staminaMax) { 
                    playerState.stamina = Math.min(playerState.staminaMax, playerState.stamina + (28 * delta)); atualizarHUD(); 
                }
                
                // Animação Rítmica de Movimentação
                const pernaGiro = Math.sin(tempoAcumulado * 6) * 0.18;
                pEsq.rotation.x = -pernaGiro; pDir.rotation.x = pernaGiro;

                if (playerState.dashTimer > 0) playerState.dashTimer -= delta; else playerState.dashing = false;
                
                // Rotação Mecânica de Ataque
                if (playerState.atacando) { 
                    weaponHandGroup.rotation.y -= arsenal[playerState.armaEquipada].velocidade * delta * 4; 
                    if (weaponHandGroup.rotation.y < -1.6) { playerState.atacando = false; weaponHandGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 10); } 
                }

                // Vetores de Translação Físicos
                direcaoMovimento.set(0, 0, 0);
                if (teclado['w']) direcaoMovimento.z -= 1;
                if (teclado['s']) direcaoMovimento.z += 1;
                if (teclado['a']) direcaoMovimento.x -= 1;
                if (teclado['d']) direcaoMovimento.x += 1;
                direcaoMovimento.normalize();

                const mVel = (playerState.dashing ? 32 : 13) * delta;
                playerGroup.translateOnAxis(direcaoMovimento, mVel);
                playerGroup.getWorldPosition(_vA);

                // Verificação de Coleta de Drops por Proximidade
                for (let i = dropsMundo.length - 1; i >= 0; i--) {
                    let drop = dropsMundo[i]; drop.mesh.rotation.y += delta * 2;
                    if (_vA.distanceTo(drop.mesh.position) < 1.8) { 
                        if (itensInventario.length < 15) { 
                            itensInventario.push(drop.tipo); scene.remove(drop.mesh); dropsMundo.splice(i, 1); logMsg(`📦 Item realocado.`); atualizarHUD(); 
                        } 
                    }
                }

                // Inteligência Artificial de Perseguição e Ataque
                inimigos.forEach(inimigo => {
                    if (!inimigo.status.vivo) return;
                    if (inimigo.status.timerDano > 0) { inimigo.status.timerDano -= delta; } else { inimigo.malhaPrincipal.material = inimigo.status.materialOriginal; }
                    
                    inimigo.mesh.getWorldPosition(_vB); let distHeroi = _vA.distanceTo(_vB);
                    if (distHeroi < 35) inimigo.status.alertado = true;
                    if (inimigo.status.alertado) {
                        inimigo.mesh.lookAt(playerGroup.position.x, inimigo.mesh.position.y, playerGroup.position.z);
                        if (distHeroi > inimigo.status.alcance) { inimigo.mesh.translateZ(inimigo.status.vel * delta); } else {
                            if (inimigo.status.cooldown > 0) inimigo.status.cooldown -= delta;
                            if (inimigo.status.cooldown <= 0) {
                                inimigo.status.cooldown = 1.4;
                                if (playerState.dashing) { logMsg("💨 Manobra evasiva executada!"); } else {
                                    let dano = inimigo.status.danoBase + Math.floor(Math.random() * 4);
                                    if (playerState.defendendo) { dano = Math.floor(dano * 0.15); playerState.stamina -= 12; logMsg(`🛡️ Impacto Retido.`); } 
                                    else { playerState.hp -= dano; logMsg(`🚨 Alerta! Sob ataque de ${inimigo.status.nome}: -${dano} HP.`); shakeTimer = 0.25; }
                                    atualizarHUD();
                                }
                                if (playerState.hp <= 0) { logMsg("💀 ARYSONY FOI DESATIVADO."); setTimeout(() => location.reload(), 2000); }
                            }
                        }
                    }
                });

                // Efeito Estável de Vibração de Câmera (Camera Shake FX)
                if (shakeTimer > 0) { camera.position.x = (Math.random() - 0.5) * 0.25; shakeTimer -= delta; } else { camera.position.set(0, 0, 5.0); }
            }
            renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
        animate();
    }
})();
