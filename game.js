(function() {
    "use strict";

    if (document.readyState === "complete" || document.readyState === "interactive") { initBoot(); } 
    else { window.addEventListener('DOMContentLoaded', initBoot); }

    function initBoot() {
        const domInicial = document.getElementById("tela-inicial");
        const btnIniciar = document.getElementById("btn-iniciar");
        if(btnIniciar) {
            btnIniciar.addEventListener("click", () => {
                domInicial.style.opacity = "0";
                setTimeout(() => { domInicial.classList.add("hidden"); iniciarEngine(); }, 400);
            });
        }
    }

    function iniciarEngine() {
        // Cache de referências DOM
        const ui = {
            hud: document.getElementById("game-hud"), reticula: document.getElementById("reticula"),
            log: document.getElementById("combat-log"), uiMouse: document.getElementById("travar-mouse-ui"),
            painelInv: document.getElementById("painel-inventario"), hpBar: document.getElementById("bar-player-hp"), 
            stmBar: document.getElementById("bar-player-stamina"), lblPocoes: document.getElementById("lbl-pocoes"), 
            lblFlechas: document.getElementById("lbl-flechas"), lblItens: document.getElementById("lbl-total-itens"), 
            lblCombo: document.getElementById("lbl-combo"), gridInv: document.getElementById("grid-inventario")
        };

        ui.hud.classList.remove("hidden"); ui.reticula.classList.remove("hidden"); 
        ui.log.classList.remove("hidden"); ui.uiMouse.classList.remove("hidden");

        // Configuração da Scena e Renderizador
        const scene = new THREE.Scene();
        const corCeu = 0x87CEEB; 
        scene.background = new THREE.Color(corCeu); 
        scene.fog = new THREE.FogExp2(corCeu, 0.006);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        document.body.appendChild(renderer.domElement);

        // Monitor de Desempenho (FPS)
        const stats = new Stats();
        stats.showPanel(0);
        stats.dom.style.position = 'absolute';
        stats.dom.style.left = 'auto'; stats.dom.style.top = 'auto';
        stats.dom.style.right = '10px'; stats.dom.style.bottom = '10px';
        stats.dom.style.zIndex = '1000';
        document.body.appendChild(stats.dom);

        const clock = new THREE.Clock();
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _dir = new THREE.Vector3();
        const _fwd = new THREE.Vector3(), _quat = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
        
        // Configuração Atmosférica de Luzes
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 1.0));
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.6); 
        sunLight.position.set(100, 200, 50); 
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10; sunLight.shadow.camera.far = 500;
        const dSide = 200;
        sunLight.shadow.camera.left = -dSide; sunLight.shadow.camera.right = dSide;
        sunLight.shadow.camera.top = dSide; sunLight.shadow.camera.bottom = -dSide;
        scene.add(sunLight);

        // Função Matemática do Terreno Procedural (Geração Elevada)
        function obterAlturaTerreno(x, z) {
            let elevacao = (Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15) + (Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2);
            let limiteMapa = Math.max(0, 1 - (Math.sqrt(x*x + z*z) / 250)); 
            return elevacao * limiteMapa;
        }

        const floorGeo = new THREE.PlaneGeometry(500, 500, 80, 80);
        const vertices = floorGeo.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            vertices.setZ(i, obterAlturaTerreno(vertices.getX(i), vertices.getY(i))); 
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b4522, roughness: 0.85, metalness: 0.05 });
        const floor = new THREE.Mesh(floorGeo, floorMat); 
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
        scene.add(floor);

        // População de Árvores por InstancedMesh (Otimização Gráfica)
        const qtdArvores = 400;
        const obstaculos = [];
        const arvoresTroncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 6), new THREE.MeshStandardMaterial({ color: 0x3d2817 }), qtdArvores);
        const arvoresFolhas = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 6, 6), new THREE.MeshStandardMaterial({ color: 0x1a3d1f }), qtdArvores);
        arvoresTroncos.castShadow = true; arvoresTroncos.receiveShadow = true;
        arvoresFolhas.castShadow = true; arvoresFolhas.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < qtdArvores; i++) {
            let angulo = Math.random() * Math.PI * 2;
            let raio = 20 + Math.random() * 210;
            let tx = Math.cos(angulo) * raio; let tz = Math.sin(angulo) * raio;
            let ty = obterAlturaTerreno(tx, tz);
            
            dummy.position.set(tx, ty + 2.5, tz); dummy.updateMatrix(); arvoresTroncos.setMatrixAt(i, dummy.matrix);
            dummy.position.set(tx, ty + 6.5, tz); dummy.updateMatrix(); arvoresFolhas.setMatrixAt(i, dummy.matrix);
            obstaculos.push({ pos: new THREE.Vector3(tx, ty, tz), raioSq: 2.5 }); 
        }
        scene.add(arvoresTroncos); scene.add(arvoresFolhas);

        // Definição de Materiais das Entidades
        const matArma = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }); 
        const matDrop = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1.0, roughness: 0.2 });
        
        // Instanciação do Jogador (Entidade Físico-Tática)
        const playerGroup = new THREE.Group(); 
        playerGroup.position.set(0, obterAlturaTerreno(0, 0), 0);
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group(); cameraPivot.position.set(0, 2.0, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 0);

        const weaponHand = new THREE.Group(); weaponHand.position.set(0.4, -0.4, -0.7); cameraPivot.add(weaponHand);
        
        // Modelos de Exibição das Armas
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.1), matArma); 
        mSword.position.set(0, 0.6, -0.4); mSword.rotation.x = -Math.PI/6; mSword.castShadow = true;
        
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), matArma); 
        mHammer.position.set(0, 0, -0.6); mHammer.visible = false; mHammer.castShadow = true;
        
        const mBow = new THREE.Group();
        const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), matArma); bowMain.rotation.x = Math.PI/2;
        mBow.add(bowMain); mBow.position.set(0, 0, -0.6); mBow.visible = false; mBow.castShadow = true;

        weaponHand.add(mSword, mHammer, mBow);
        const meshArmas = [mSword, mHammer, mBow];

        // Estado Estrutural do Operador
        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, pocoes: 3, flechas: 15,
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false, combo: 0, comboTimer: 0,
            velocityY: 0, isGrounded: true
        };
        const arsenal = [
            { tipo: 'melee', nome: "LÂMINA DE COMBATE", dano: 35, alcance: 4.5, custo: 15, vel: 18 },
            { tipo: 'melee', nome: "BASTÃO TÁTICO", dano: 65, alcance: 3.5, custo: 35, vel: 8 },
            { tipo: 'arco', nome: "ARCO COMPOSTO", dano: 50, custo: 0 }
        ];

        let inimigos = [], drops = [], itensInv = [], projeteis = [];
        let mouseTravado = false, invAberto = false, teclado = {};

        // Criação Anatômica dos Hostis (Humanoides Táticos)
        function criarHostil() {
            const grupo = new THREE.Group();
            const criarParte = (w, h, d, x, y, z) => {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matInimigo);
                mesh.position.set(x, y, z); mesh.castShadow = true; grupo.add(mesh);
            };
            criarParte(0.7, 0.9, 0.35, 0, 1.25, 0);    
            criarParte(0.3, 0.35, 0.3, 0, 1.85, 0);    
            criarParte(0.2, 0.7, 0.2, -0.45, 1.2, 0);  
            criarParte(0.2, 0.7, 0.2, 0.45, 1.2, 0);   
            criarParte(0.25, 0.8, 0.25, -0.18, 0.4, 0);
            criarParte(0.25, 0.8, 0.25, 0.18, 0.4, 0); 
            return grupo;
        }

        for(let i = 0; i < 20; i++) {
            const hostil = criarHostil();
            const angulo = Math.random() * Math.PI * 2;
            const raio = 40 + Math.random() * 160;
            const px = Math.cos(angulo) * raio; const pz = Math.sin(angulo) * raio;
            hostil.position.set(px, obterAlturaTerreno(px, pz), pz);
            scene.add(hostil);
            inimigos.push({ mesh: hostil, hp: 120, vivo: true, cooldown: 0 });
        }

        // Sistema de Controle de Inventário e Processamento de Forja
        document.getElementById("btn-craft-flecha").addEventListener("click", () => forjar('flecha', 2));
        document.getElementById("btn-craft-pocao").addEventListener("click", () => forjar('pocao', 3));

        function forjar(tipo, custo) {
            if (itensInv.filter(i => i === 'sucata').length >= custo) {
                for(let i=0; i<custo; i++) itensInv.splice(itensInv.indexOf('sucata'), 1);
                if(tipo === 'flecha') { playerState.flechas += 5; logMsg("> MUNIÇÃO REABASTECIDA."); }
                else { playerState.pocoes++; logMsg("> KIT MÉDICO FABRICADO."); }
                atualizarUIInv();
            } else logMsg("> RECURSOS INSUFICIENTES.");
        }

        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase(); teclado[key] = true;
            if (key === 'e') {
                invAberto = !invAberto; ui.painelInv.classList.toggle("hidden", !invAberto);
                if (invAberto) { if(mouseTravado) document.exitPointerLock(); atualizarUIInv(); } 
                else document.body.requestPointerLock();
            }
            if (invAberto || !mouseTravado) return;

            // Tratamento de Inicialização de Salto Tridimensional
            if (key === ' ' && playerState.isGrounded && playerState.stamina >= 15) {
                playerState.velocityY = 12; playerState.isGrounded = false; playerState.stamina -= 15;
            }
            
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < 100) { 
                playerState.pocoes--; playerState.hp = Math.min(100, playerState.hp + 50); atualizarHUD(); logMsg("> CURA APLICADA."); 
            }
            if (key === '1') equiparArma(0); if (key === '2') equiparArma(1); if (key === '3') equiparArma(2);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 25 && playerState.isGrounded) { 
                playerState.dashing = true; playerState.dashTimer = 0.25; playerState.stamina -= 25; playerState.invulneravel = true; logMsg("> AVANÇO TÁTICO.");
            }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function equiparArma(idx) {
            playerState.armaEquipada = idx; playerState.carregandoArco = false; playerState.combo = 0; ui.lblCombo.innerText = "0";
            meshArmas.forEach((m, i) => m.visible = (i === idx)); logMsg(`> ARMAMENTO: ${arsenal[idx].nome}`);
        }

        ui.uiMouse.addEventListener("click", () => { if(!invAberto) document.body.requestPointerLock(); });
        document.getElementById("btn-fechar-inv").addEventListener("click", () => { invAberto = false; ui.painelInv.classList.add("hidden"); document.body.requestPointerLock(); });
        document.addEventListener("pointerlockchange", () => { mouseTravado = (document.pointerLockElement === document.body); ui.uiMouse.classList.toggle("hidden", mouseTravado); });

        document.addEventListener("mousemove", e => {
            if (!mouseTravado || invAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002; cameraPivot.rotation.x -= e.movementY * 0.002;
            cameraPivot.rotation.x = Math.max(-1.2, Math.min(1.2, cameraPivot.rotation.x));
        });

        // Gerenciamento e Execução do Vetor de Ataque
        window.addEventListener("mousedown", e => {
            if (!mouseTravado || invAberto) return;
            const arma = arsenal[playerState.armaEquipada];
            if (e.button === 0) {
                if (arma.tipo === 'melee' && !playerState.atacando && playerState.stamina >= arma.custo) {
                    playerState.atacando = true; playerState.stamina -= arma.custo;
                    playerState.comboTimer > 0 ? playerState.combo++ : playerState.combo = 1;
                    playerState.comboTimer = 1.2; ui.lblCombo.innerText = playerState.combo;
                    
                    let danoBase = Math.floor(arma.dano * (1 + (playerState.combo * 0.25)));
                    playerGroup.getWorldPosition(_vA); _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                    inimigos.forEach(ini => {
                        if (!ini.vivo) return;
                        ini.mesh.getWorldPosition(_vB);
                        if (_vA.distanceTo(_vB) < arma.alcance) {
                            _dir.subVectors(_vB, _vA).normalize();
                            if (_fwd.dot(_dir) > 0.4) { 
                                ini.hp -= danoBase; logMsg(`> ALVO ATINGIDO: ${danoBase} DMG`);
                                if (ini.hp <= 0) abaterHostil(ini);
                            }
                        }
                    });
                } else if (arma.tipo === 'arco' && playerState.flechas > 0) playerState.carregandoArco = true;
            } else if (e.button === 2 && playerState.stamina >= 10) { playerState.defendendo = true; weaponHand.rotation.z = Math.PI/2; weaponHand.position.x = 0; }
        });

        window.addEventListener("mouseup", e => { 
            if (e.button === 2) { playerState.defendendo = false; weaponHand.rotation.z = 0; weaponHand.position.x = 0.4; } 
            if (e.button === 0 && playerState.carregandoArco) {
                playerState.carregandoArco = false;
                if (playerState.flechas > 0) {
                    playerState.flechas--; atualizarHUD();
                    const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
                    playerGroup.getWorldPosition(_vA); proj.position.copy(_vA).add(new THREE.Vector3(0, 1.6, 0));
                    cameraPivot.getWorldQuaternion(_quat);
                    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(_quat);
                    proj.quaternion.setFromUnitVectors(_up, dir);
                    scene.add(proj); projeteis.push({ mesh: proj, dir: dir, life: 1.5 });
                }
            }
        });

        function abaterHostil(ini) {
            ini.vivo = false; scene.remove(ini.mesh); logMsg("> HOSTIL ABATIDO.");
            let dropRate = Math.floor(Math.random() * 3) + 1;
            for(let i=0; i < dropRate; i++) {
                const drop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), matDrop);
                let rx = ini.mesh.position.x + (Math.random()-0.5)*2; let rz = ini.mesh.position.z + (Math.random()-0.5)*2;
                drop.position.set(rx, obterAlturaTerreno(rx, rz) + 0.2, rz);
                scene.add(drop); drops.push({mesh: drop, tipo: 'sucata'});
            }
        }

        function atualizarHUD() {
            ui.hpBar.style.width = `${playerState.hp}%`; ui.stmBar.style.width = `${playerState.stamina}%`;
            ui.lblPocoes.innerText = playerState.pocoes; ui.lblFlechas.innerText = playerState.flechas; ui.lblItens.innerText = itensInv.length;
        }

        function atualizarUIInv() {
            ui.gridInv.innerHTML = ""; let cont = {}; itensInv.forEach(i => cont[i] = (cont[i] || 0) + 1);
            Object.entries(cont).forEach(([item, qtd]) => {
                let div = document.createElement('div'); div.className = 'slot-item';
                div.innerHTML = `⚙️<div class="item-qtd">x${qtd}</div>`; ui.gridInv.appendChild(div);
            });
            while(ui.gridInv.children.length < 15) { let div = document.createElement('div'); div.className = 'slot-item'; ui.gridInv.appendChild(div); }
            atualizarHUD();
        }

        function logMsg(msg) { ui.log.innerText = msg; }

        function checkColisaoObstaculos(pos) {
            for(let i = 0; i < obstaculos.length; i++) {
                let dx = pos.x - obstaculos[i].pos.x; let dz = pos.z - obstaculos[i].pos.z;
                if ((dx*dx + dz*dz) < obstaculos[i].raioSq) return true;
            }
            return false;
        }

        // Loop de Renderização e Atualizações Gerais de Física
        function animate() {
            stats.begin();
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1); 
            
            if (invAberto) { renderer.render(scene, camera); stats.end(); return; }

            if (mouseTravado) {
                // Modulação da Regeneração de Vigor
                if (!playerState.atacando && !playerState.defendendo && !playerState.dashing) { playerState.stamina = Math.min(100, playerState.stamina + (25 * dt)); atualizarHUD(); }
                if (playerState.comboTimer > 0) playerState.comboTimer -= dt; else if(playerState.combo > 0) { playerState.combo = 0; ui.lblCombo.innerText = "0"; }
                if (playerState.dashTimer > 0) playerState.dashTimer -= dt; else { playerState.dashing = false; playerState.invulneravel = false; }
                
                // Processamento de Vetor de Animação das Mãos de Combate
                if (playerState.atacando) { 
                    weaponHand.rotation.x -= arsenal[playerState.armaEquipada].vel * dt;
                    weaponHand.rotation.z -= arsenal[playerState.armaEquipada].vel * dt * 0.5;
                    if (weaponHand.rotation.x < -1.8) { playerState.atacando = false; weaponHand.rotation.x = 0; weaponHand.rotation.z = 0; } 
                }

                // Vetor de Velocidade Balística (Projéteis)
                for(let i = projeteis.length - 1; i >= 0; i--) {
                    let p = projeteis[i]; p.mesh.position.addScaledVector(p.dir, 80 * dt); p.life -= dt;
                    let hit = checkColisaoObstaculos(p.mesh.position) || (p.mesh.position.y <= obterAlturaTerreno(p.mesh.position.x, p.mesh.position.z));
                    if(!hit) {
                        for (let j = 0; j < inimigos.length; j++) {
                            let ini = inimigos[j];
                            if(ini.vivo && p.mesh.position.distanceToSquared(ini.mesh.position) < 4.5) {
                                ini.hp -= arsenal[2].dano; logMsg(`> TIRO CONFIRMADO: ${arsenal[2].dano} DMG`);
                                if(ini.hp <= 0) abaterHostil(ini); hit = true; break;
                            }
                        }
                    }
                    if(p.life <= 0 || hit) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                // Leitura do Vetor de Input Direcional
                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                _dir.normalize();

                // Aplicação de Movimentação Dinâmica no Jogador
                let movendo = _dir.lengthSq() > 0;
                if (movendo) {
                    const vel = (playerState.dashing ? 35 : (teclado['shift'] ? 18 : 10)) * dt;
                    const oldX = playerGroup.position.x; const oldZ = playerGroup.position.z;
                    playerGroup.translateOnAxis(_dir, vel);
                    
                    if (checkColisaoObstaculos(playerGroup.position)) { 
                        playerGroup.position.x = oldX; playerGroup.position.z = oldZ; 
                    }
                }

                // Cálculo Gravitacional Físico e Trava em Superfícies Irregulares
                playerState.velocityY -= 30 * dt; 
                playerGroup.position.y += playerState.velocityY * dt;
                
                const alturaChao = obterAlturaTerreno(playerGroup.position.x, playerGroup.position.z);
                if (playerGroup.position.y <= alturaChao) {
                    playerGroup.position.y = alturaChao;
                    playerState.velocityY = 0;
                    playerState.isGrounded = true;
                }

                // Efeito Cinético Inercial de Head-Bobbing
                if (movendo && playerState.isGrounded && !playerState.dashing) {
                    cameraPivot.position.y = 2.0 + Math.sin(clock.getElapsedTime() * 12) * 0.08;
                } else {
                    cameraPivot.position.y = 2.0;
                }

                playerGroup.getWorldPosition(_vA);

                // Rotina de Captura e Coleta de Recursos Drops
                for (let i = drops.length - 1; i >= 0; i--) {
                    let drop = drops[i]; drop.mesh.rotation.y += dt;
                    if (_vA.distanceToSquared(drop.mesh.position) < 6.0 && itensInv.length < 15) { 
                        itensInv.push(drop.tipo); scene.remove(drop.mesh); drops.splice(i, 1); 
                        logMsg("> SUCATA ADQUIRIDA."); atualizarHUD(); 
                    }
                }

                // Inteligência Artificial Comportamental dos Inimigos (Steering & Separação)
                for (let j = 0; j < inimigos.length; j++) {
                    let ini = inimigos[j];
                    if (!ini.vivo) continue;
                    
                    ini.mesh.getWorldPosition(_vB); 
                    let distParaPlayer = _vA.distanceToSquared(_vB);
                    
                    if (distParaPlayer < 4000) ini.mesh.lookAt(playerGroup.position.x, ini.mesh.position.y, playerGroup.position.z);
                    
                    if (distParaPlayer > 10.0) { 
                        const oldX = ini.mesh.position.x; const oldZ = ini.mesh.position.z;
                        ini.mesh.translateZ(7 * dt); 
                        
                        // Algoritmo de Repulsão Mútua para Evitar Sobreposições Complexas
                        for (let k = 0; k < inimigos.length; k++) {
                            if (j !== k && inimigos[k].vivo) {
                                let distOutro = ini.mesh.position.distanceToSquared(inimigos[k].mesh.position);
                                if (distOutro < 4.0) {
                                    ini.mesh.position.x += (ini.mesh.position.x - inimigos[k].mesh.position.x) * dt;
                                    ini.mesh.position.z += (ini.mesh.position.z - inimigos[k].mesh.position.z) * dt;
                                }
                            }
                        }

                        ini.mesh.position.y = obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z);
                        if (checkColisaoObstaculos(ini.mesh.position)) { ini.mesh.position.x = oldX; ini.mesh.position.z = oldZ; }
                    } else {
                        // Resposta Tática de Combate Próximo (Cooldown do Inimigo)
                        if (ini.cooldown > 0) ini.cooldown -= dt;
                        else {
                            ini.cooldown = 1.2;
                            if (playerState.invulneravel) logMsg("> ESQUIVA CONFIRMADA."); 
                            else if (playerState.defendendo) { playerState.hp -= 8; playerState.stamina -= 20; logMsg("> DANO ABSORVIDO PELO BLOQUEIO."); } 
                            else { playerState.hp -= 30; logMsg("> OPERADOR ATINGIDO."); }
                            atualizarHUD();
                            if (playerState.hp <= 0) { logMsg("> MISSÃO FALHA. REINICIANDO SISTEMA..."); setTimeout(()=>location.reload(), 2000); }
                        }
                    }
                }
            }
            renderer.render(scene, camera);
            stats.end();
        }

        window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
        animate();
    }
})();
