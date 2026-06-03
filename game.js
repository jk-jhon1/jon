(function() {
    "use strict";

    // Inicialização segura
    if (document.readyState === "complete" || document.readyState === "interactive") { 
        initBoot(); 
    } else { 
        window.addEventListener('DOMContentLoaded', initBoot); 
    }

    function initBoot() {
        if (typeof THREE === 'undefined') {
            document.body.innerHTML = "<h2 style='color:red; background:black; text-align:center; padding:20px;'>ERRO: Three.js não carregado. Verifique a tag script no HTML.</h2>";
            return;
        }

        const domInicial = document.getElementById("tela-inicial");
        const btnIniciar = document.getElementById("btn-iniciar");

        if (btnIniciar && domInicial) {
            btnIniciar.addEventListener("click", () => { 
                domInicial.style.display = "none"; 
                iniciarEngine(true); 
            });
        } else {
            // Fallback caso não exista tela inicial no HTML
            const overrideUI = document.createElement("div");
            overrideUI.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#111;z-index:9999;display:flex;align-items:center;justify-content:center;color:#0f0;font-family:monospace;cursor:pointer;user-select:none;";
            overrideUI.innerHTML = "<h1 style='margin-bottom:10px;letter-spacing:4px;'>[ CLIQUE PARA INICIAR ]</h1>";
            document.body.appendChild(overrideUI);
            overrideUI.addEventListener("click", () => { 
                overrideUI.remove(); 
                iniciarEngine(true); 
            });
        }
    }

    function iniciarEngine(autoLock = false) {
        // Cache de elementos da UI para evitar buscas repetidas
        const ui = {
            hud: document.getElementById("game-hud"), 
            reticula: document.getElementById("reticula"),
            log: document.getElementById("combat-log"), 
            uiMouse: document.getElementById("travar-mouse-ui"),
            painelInv: document.getElementById("painel-inventario"), 
            hpBar: document.getElementById("bar-player-hp"), 
            stmBar: document.getElementById("bar-player-stamina"), 
            lblPocoes: document.getElementById("lbl-pocoes"), 
            lblFlechas: document.getElementById("lbl-flechas"), 
            lblCombo: document.getElementById("lbl-combo"), 
            gridInv: document.getElementById("grid-inventario")
        };

        // Exibe UI básica
        ['hud', 'reticula', 'log', 'uiMouse'].forEach(el => { 
            if(ui[el]) ui[el].classList.remove("hidden"); 
        });

        if (ui.gridInv) {
            ui.gridInv.style.display = "grid";
            ui.gridInv.style.gridTemplateColumns = "repeat(5, 1fr)";
            ui.gridInv.style.gap = "8px";
            ui.gridInv.style.padding = "10px";
        }

        // Configuração da Cena e Câmera
        const scene = new THREE.Scene();
        const corCeu = 0x87CEEB; 
        scene.background = new THREE.Color(corCeu); 
        scene.fog = new THREE.FogExp2(corCeu, 0.008);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
        
        // Renderizador otimizado
        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita pixel ratio para performance
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        document.body.appendChild(renderer.domElement);

        let stats = (typeof Stats !== 'undefined') ? new Stats() : { begin: () => {}, end: () => {} };

        // Variáveis globais recicladas (Evita Garbage Collection)
        const clock = new THREE.Clock();
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _dir = new THREE.Vector3();
        const _fwd = new THREE.Vector3(), _quat = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
        const _spawnPos = new THREE.Vector3();
        
        // Iluminação
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 1.0));
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); 
        sunLight.position.set(100, 200, 50); 
        sunLight.castShadow = true; 
        sunLight.shadow.camera.far = 300;
        scene.add(sunLight);

        // Terreno
        function obterAlturaTerreno(x, z) { 
            const freq1 = 0.02, freq2 = 0.05;
            const limit = Math.max(0, 1 - (Math.sqrt(x*x + z*z) / 250));
            return limit * ((Math.sin(x * freq1) * Math.cos(z * freq1) * 15) + (Math.sin(x * freq2) * 2 + Math.cos(z * freq2) * 2)); 
        }

        const floorGeo = new THREE.PlaneGeometry(500, 500, 40, 40);
        const vertices = floorGeo.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            vertices.setZ(i, obterAlturaTerreno(vertices.getX(i), vertices.getY(i))); 
        }
        floorGeo.computeVertexNormals();
        const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x2b4522, roughness: 0.9 })); 
        floor.rotation.x = -Math.PI / 2; 
        floor.receiveShadow = true; 
        scene.add(floor);

        // Materiais e Geometrias (Reaproveitados)
        const matArma = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }); 
        const matDropSucata = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
        const matDropMadeira = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
        const geoDrop = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const geoProj = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
        const matProj = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });

        // Geração de Floresta (InstancedMesh)
        const qtdArvores = 400; 
        const obstaculos = [];
        const arvoresTroncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 4), new THREE.MeshStandardMaterial({ color: 0x3d2817 }), qtdArvores);
        const arvoresFolhas = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 6, 4), new THREE.MeshStandardMaterial({ color: 0x1a3d1f }), qtdArvores);
        arvoresTroncos.castShadow = true; arvoresFolhas.castShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < qtdArvores; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 210;
            const tx = Math.cos(angle) * radius; 
            const tz = Math.sin(angle) * radius;
            const ty = obterAlturaTerreno(tx, tz);
            
            dummy.position.set(tx, ty + 2.5, tz); dummy.updateMatrix(); arvoresTroncos.setMatrixAt(i, dummy.matrix);
            dummy.position.set(tx, ty + 6.5, tz); dummy.updateMatrix(); arvoresFolhas.setMatrixAt(i, dummy.matrix);
            
            // Otimização: Substituído cooldown por lastHitTime
            obstaculos.push({ pos: new THREE.Vector3(tx, ty, tz), raioSq: 2.5, lastHitTime: 0 }); 
        }
        scene.add(arvoresTroncos); scene.add(arvoresFolhas);
        
        // Player e Câmera
        const playerGroup = new THREE.Group(); 
        playerGroup.position.set(0, obterAlturaTerreno(0, 0), 0); 
        scene.add(playerGroup);
        
        const cameraPivot = new THREE.Group(); 
        cameraPivot.position.set(0, 2.0, 0); 
        playerGroup.add(cameraPivot); 
        cameraPivot.add(camera);
        
        const weaponHand = new THREE.Group(); 
        weaponHand.position.set(0.4, -0.4, -0.7); 
        cameraPivot.add(weaponHand);
        
        // Armas
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.1), matArma); 
        mSword.position.set(0, 0.6, -0.4); mSword.rotation.x = -Math.PI/6; mSword.castShadow = true;
        
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), matArma); 
        mHammer.position.set(0, 0, -0.6); mHammer.visible = false; mHammer.castShadow = true;
        
        const mBow = new THREE.Group(); 
        const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), matArma); 
        bowMain.rotation.x = Math.PI/2; mBow.add(bowMain); 
        mBow.position.set(0, 0, -0.6); mBow.visible = false; mBow.castShadow = true;
        
        const mAxe = new THREE.Group(); 
        const caboMachado = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), new THREE.MeshStandardMaterial({color: 0x5c4033})); 
        const laminaMachado = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.4), matArma); 
        laminaMachado.position.set(0, 0.3, 0.1); mAxe.add(caboMachado, laminaMachado); 
        mAxe.position.set(0, 0, -0.4); mAxe.rotation.x = -Math.PI/6; mAxe.visible = false; mAxe.castShadow = true;

        weaponHand.add(mSword, mHammer, mBow, mAxe); 
        const meshArmas = [mSword, mHammer, mBow, mAxe];

        // ==========================================
        // SISTEMA DE INVENTÁRIO (MINECRAFT STYLE)
        // ==========================================
        const INFOS_ITENS = {
            'sucata': { nome: 'Sucata', icone: '⚙️', maxStack: 64, cor: '#555' },
            'madeira': { nome: 'Madeira', icone: '🪵', maxStack: 64, cor: '#6b4423' },
            'pocao': { nome: 'Poção', icone: '🧪', maxStack: 16, cor: '#a32' },
            'flecha': { nome: 'Flecha', icone: '🏹', maxStack: 64, cor: '#444' }
        };

        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, 
            inventario: new Array(15).fill(null),
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false, combo: 0, comboTimer: 0,
            velocityY: 0, isGrounded: true
        };

        function contarItem(tipo) { 
            return playerState.inventario.reduce((acc, slot) => slot && slot.tipo === tipo ? acc + slot.qtd : acc, 0); 
        }
        
        function adicionarItem(tipo, qtd = 1) {
            const info = INFOS_ITENS[tipo];
            // 1. Tenta empilhar
            for(let i=0; i < playerState.inventario.length; i++) {
                if(playerState.inventario[i] && playerState.inventario[i].tipo === tipo && playerState.inventario[i].qtd < info.maxStack) {
                    const espaco = info.maxStack - playerState.inventario[i].qtd;
                    if(qtd <= espaco) { 
                        playerState.inventario[i].qtd += qtd; 
                        return true; 
                    } else { 
                        playerState.inventario[i].qtd = info.maxStack; 
                        qtd -= espaco; 
                    }
                }
            }
            // 2. Procura slot vazio
            for(let i=0; i < playerState.inventario.length; i++) {
                if(!playerState.inventario[i]) {
                    playerState.inventario[i] = { tipo: tipo, qtd: qtd };
                    return true;
                }
            }
            return false; // Inventário cheio
        }

        function removerItem(tipo, qtd) {
            if(contarItem(tipo) < qtd) return false;
            for(let i=0; i < playerState.inventario.length; i++) {
                let slot = playerState.inventario[i];
                if(slot && slot.tipo === tipo) {
                    if(slot.qtd >= qtd) {
                        slot.qtd -= qtd;
                        if(slot.qtd === 0) playerState.inventario[i] = null;
                        return true;
                    } else {
                        qtd -= slot.qtd;
                        playerState.inventario[i] = null;
                    }
                }
            }
            return true;
        }

        // Itens Iniciais
        adicionarItem('pocao', 3);
        adicionarItem('flecha', 15);

        const arsenal = [
            { tipo: 'melee', nome: "LÂMINA", dano: 35, alcanceSq: 20.25, custo: 15, vel: 18 },
            { tipo: 'melee', nome: "BASTÃO", dano: 65, alcanceSq: 12.25, custo: 35, vel: 8 },
            { tipo: 'arco', nome: "ARCO", dano: 50, custo: 0 },
            { tipo: 'melee', nome: "MACHADO", dano: 20, alcanceSq: 18.0, custo: 12, vel: 14 } 
        ];

        let inimigos = [], drops = [], projeteis = [];
        let mouseTravado = false, invAberto = false, teclado = {};

        // Inimigos
        function criarParteInimigo(hostil, w, h, d, y) { 
            const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matInimigo); 
            m.position.y = y; m.castShadow = true; hostil.add(m); 
        }

        for(let i = 0; i < 20; i++) {
            const hostil = new THREE.Group();
            criarParteInimigo(hostil, 0.7, 1.4, 0.4, 1.0); 
            criarParteInimigo(hostil, 0.3, 0.4, 0.3, 1.9); 
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 40 + Math.random() * 160;
            const px = Math.cos(angle) * radius; 
            const pz = Math.sin(angle) * radius;
            
            hostil.position.set(px, obterAlturaTerreno(px, pz), pz);
            scene.add(hostil); 
            inimigos.push({ mesh: hostil, hp: 120, vivo: true, cooldown: 0 });
        }

        // Sistema de Crafting
        const btnFlecha = document.getElementById("btn-craft-flecha"); 
        const btnPocao = document.getElementById("btn-craft-pocao");
        if(btnFlecha) btnFlecha.addEventListener("click", () => forjar('flecha'));
        if(btnPocao) btnPocao.addEventListener("click", () => forjar('pocao'));

        function forjar(tipo) {
            if(tipo === 'flecha') {
                if (contarItem('sucata') >= 1 && contarItem('madeira') >= 1) {
                    removerItem('sucata', 1); removerItem('madeira', 1); adicionarItem('flecha', 5);
                    logMsg("> FLECHAS CRIADAS."); atualizarUIInv();
                } else logMsg("> FALTAM RECURSOS (1⚙️, 1🪵).");
            } else if(tipo === 'pocao') {
                if (contarItem('sucata') >= 3) {
                    removerItem('sucata', 3); adicionarItem('pocao', 1);
                    logMsg("> KIT MÉDICO FABRICADO."); atualizarUIInv();
                } else logMsg("> SUCATA INSUFICIENTE (3⚙️).");
            }
        }

        // Controles de Mouse
        const travarMouse = () => { 
            if (!invAberto && renderer.domElement.requestPointerLock) {
                renderer.domElement.requestPointerLock(); 
            }
        };

        if (autoLock && renderer.domElement.requestPointerLock) renderer.domElement.requestPointerLock();
        
        renderer.domElement.addEventListener("click", travarMouse); 
        if (ui.uiMouse) ui.uiMouse.addEventListener("click", travarMouse);

        document.addEventListener("pointerlockchange", () => { 
            mouseTravado = (document.pointerLockElement === renderer.domElement); 
            if(ui.uiMouse) ui.uiMouse.classList.toggle("hidden", mouseTravado); 
        });

        const btnFecharInv = document.getElementById("btn-fechar-inv");
        if(btnFecharInv) btnFecharInv.addEventListener("click", () => { 
            invAberto = false; 
            if(ui.painelInv) ui.painelInv.classList.add("hidden"); 
            travarMouse(); 
        });

        // Controles de Teclado
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase(); 
            teclado[key] = true;
            
            if (key === 'e') {
                invAberto = !invAberto; 
                if(ui.painelInv) ui.painelInv.classList.toggle("hidden", !invAberto);
                if (invAberto) { 
                    if(mouseTravado && document.exitPointerLock) document.exitPointerLock(); 
                    atualizarUIInv(); 
                } else travarMouse();
            }
            if (invAberto || !mouseTravado) return;

            if (key === ' ' && playerState.isGrounded && playerState.stamina >= 15) { 
                playerState.velocityY = 12; playerState.isGrounded = false; playerState.stamina -= 15; 
            }
            if (key === 'q' && contarItem('pocao') > 0 && playerState.hp < 100) { 
                removerItem('pocao', 1); playerState.hp = Math.min(100, playerState.hp + 50); atualizarUIInv(); logMsg("> CURA APLICADA."); 
            }
            if (key === '1') equiparArma(0); if (key === '2') equiparArma(1); if (key === '3') equiparArma(2); if (key === '4') equiparArma(3);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 25 && playerState.isGrounded) { 
                playerState.dashing = true; playerState.dashTimer = 0.25; playerState.stamina -= 25; playerState.invulneravel = true; logMsg("> AVANÇO."); 
            }
        });

        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function equiparArma(idx) { 
            playerState.armaEquipada = idx; playerState.carregandoArco = false; playerState.combo = 0; 
            if(ui.lblCombo) ui.lblCombo.innerText = "0"; 
            meshArmas.forEach((m, i) => m.visible = (i === idx)); 
            logMsg(`> ARMA: ${arsenal[idx].nome}`); 
        }

        document.addEventListener("mousemove", e => {
            if (!mouseTravado || invAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002; 
            cameraPivot.rotation.x = Math.max(-1.2, Math.min(1.2, cameraPivot.rotation.x - e.movementY * 0.002));
        });

        // Função otimizada para gerar drops no chão
        function gerarDropFisico(x, y, z, tipo) {
            const materialDrop = tipo === 'madeira' ? matDropMadeira : matDropSucata;
            const drop = new THREE.Mesh(geoDrop, materialDrop);
            drop.position.set(x + (Math.random()-0.5), y, z + (Math.random()-0.5));
            scene.add(drop); 
            drops.push({ mesh: drop, tipo: tipo });
        }

        // Ações do Mouse (Ataque/Defesa)
        window.addEventListener("mousedown", e => {
            if (!mouseTravado || invAberto) return;
            const arma = arsenal[playerState.armaEquipada];
            
            if (e.button === 0) { // Clique Esquerdo
                if (arma.tipo === 'melee' && !playerState.atacando && playerState.stamina >= arma.custo) {
                    playerState.atacando = true; 
                    playerState.stamina -= arma.custo;
                    playerState.comboTimer > 0 ? playerState.combo++ : playerState.combo = 1;
                    playerState.comboTimer = 1.2; 
                    if(ui.lblCombo) ui.lblCombo.innerText = playerState.combo;
                    
                    const danoBase = Math.floor(arma.dano * (1 + (playerState.combo * 0.25)));
                    playerGroup.getWorldPosition(_vA); 
                    _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                    // Colisão de combate
                    for (let i = 0; i < inimigos.length; i++) {
                        const ini = inimigos[i];
                        if (!ini.vivo) continue; 
                        
                        ini.mesh.getWorldPosition(_vB);
                        if (_vA.distanceToSquared(_vB) < arma.alcanceSq) { 
                            _dir.subVectors(_vB, _vA).normalize();
                            if (_fwd.dot(_dir) > 0.4) { 
                                ini.hp -= danoBase; logMsg(`> ACERTO: ${danoBase} DMG`);
                                if (ini.hp <= 0) {
                                    ini.vivo = false; scene.remove(ini.mesh); logMsg("> HOSTIL ABATIDO.");
                                    const rate = Math.floor(Math.random() * 2) + 1;
                                    for(let d=0; d<rate; d++) gerarDropFisico(ini.mesh.position.x, obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z) + 0.5, ini.mesh.position.z, 'sucata');
                                }
                            }
                        }
                    }

                    // Colisão de coleta (Machado vs Árvores) - OTIMIZADO
                    if (arma.nome === "MACHADO") {
                        const currentTime = clock.getElapsedTime();
                        for (let i = 0; i < obstaculos.length; i++) {
                            const obs = obstaculos[i];
                            // Usando timestamp em vez de cooldown dinâmico
                            if (currentTime - obs.lastHitTime < 2.0) continue; 
                            
                            if (_vA.distanceToSquared(obs.pos) < 25.0) {
                                _dir.subVectors(obs.pos, _vA).normalize();
                                if (_fwd.dot(_dir) > 0.4) { 
                                    logMsg("> CORTANDO ÁRVORE...");
                                    gerarDropFisico(obs.pos.x, obs.pos.y + 1, obs.pos.z, 'madeira');
                                    obs.lastHitTime = currentTime; 
                                    break; // Só acerta uma árvore por vez
                                }
                            }
                        }
                    }
                } else if (arma.tipo === 'arco' && contarItem('flecha') > 0) {
                    playerState.carregandoArco = true;
                }
            } else if (e.button === 2 && playerState.stamina >= 10) { // Clique Direito
                playerState.defendendo = true; weaponHand.rotation.z = Math.PI/2; weaponHand.position.x = 0; 
            }
        });

        window.addEventListener("mouseup", e => { 
            if (e.button === 2) { 
                playerState.defendendo = false; weaponHand.rotation.z = 0; weaponHand.position.x = 0.4; 
            } 
            if (e.button === 0 && playerState.carregandoArco) {
                playerState.carregandoArco = false;
                if (removerItem('flecha', 1)) { 
                    atualizarUIInv();
                    const proj = new THREE.Mesh(geoProj, matProj);
                    playerGroup.getWorldPosition(_vA); 
                    proj.position.copy(_vA).add(_spawnPos.set(0, 1.6, 0));
                    
                    cameraPivot.getWorldQuaternion(_quat); 
                    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(_quat);
                    proj.quaternion.setFromUnitVectors(_up, dir);
                    
                    scene.add(proj); 
                    projeteis.push({ mesh: proj, dir: dir, life: 1.5 });
                }
            }
        });

        function atualizarUIInv() {
            if(ui.hpBar) ui.hpBar.style.width = `${playerState.hp}%`; 
            if(ui.stmBar) ui.stmBar.style.width = `${playerState.stamina}%`;
            if(ui.lblPocoes) ui.lblPocoes.innerText = contarItem('pocao'); 
            if(ui.lblFlechas) ui.lblFlechas.innerText = contarItem('flecha'); 

            if(!ui.gridInv) return;
            
            let htmlStr = "";
            for(let i=0; i < playerState.inventario.length; i++) {
                const slot = playerState.inventario[i];
                if(slot) {
                    const info = INFOS_ITENS[slot.tipo];
                    htmlStr += `<div style="background:#222; border:2px solid ${info.cor}; width:50px; height:50px; position:relative; display:flex; align-items:center; justify-content:center; font-size:24px; border-radius:4px;">
                        ${info.icone}
                        <span style="position:absolute; bottom:2px; right:4px; font-size:12px; font-weight:bold; color:#fff; text-shadow:1px 1px 0 #000;">${slot.qtd}</span>
                    </div>`;
                } else {
                    htmlStr += `<div style="background:#1a1a1a; border:2px solid #333; width:50px; height:50px; border-radius:4px;"></div>`;
                }
            }
            ui.gridInv.innerHTML = htmlStr;
        }

        function checkColisaoObstaculos(pos) {
            for(let i=0; i<obstaculos.length; i++) { 
                const dx = pos.x - obstaculos[i].pos.x; 
                const dz = pos.z - obstaculos[i].pos.z; 
                if ((dx*dx + dz*dz) < obstaculos[i].raioSq) return true; 
            }
            return false;
        }

        function logMsg(msg) { if(ui.log) ui.log.innerText = msg; }

        // Loop de Animação
        function animate() {
            stats.begin(); 
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1); 

            if (invAberto) { 
                renderer.render(scene, camera); stats.end(); return; 
            }

            if (mouseTravado) {
                // Recuperação de Stamina
                if (!playerState.atacando && !playerState.defendendo && !playerState.dashing && playerState.stamina < 100) { 
                    playerState.stamina = Math.min(100, playerState.stamina + (25 * dt)); 
                    atualizarUIInv(); 
                }
                
                // Atualiza Timers
                if (playerState.comboTimer > 0) playerState.comboTimer -= dt; 
                else if(playerState.combo > 0) { playerState.combo = 0; if(ui.lblCombo) ui.lblCombo.innerText = "0"; }
                
                if (playerState.dashTimer > 0) playerState.dashTimer -= dt; 
                else { playerState.dashing = false; playerState.invulneravel = false; }
                
                // Animação de Ataque
                if (playerState.atacando) { 
                    weaponHand.rotation.x -= arsenal[playerState.armaEquipada].vel * dt; 
                    weaponHand.rotation.z -= arsenal[playerState.armaEquipada].vel * dt * 0.5;
                    if (weaponHand.rotation.x < -1.8) { 
                        playerState.atacando = false; weaponHand.rotation.x = 0; weaponHand.rotation.z = 0; 
                    } 
                }

                // Atualiza Projéteis
                for(let i = projeteis.length - 1; i >= 0; i--) {
                    const p = projeteis[i]; 
                    p.mesh.position.addScaledVector(p.dir, 80 * dt); 
                    p.life -= dt;
                    
                    let hit = checkColisaoObstaculos(p.mesh.position) || (p.mesh.position.y <= obterAlturaTerreno(p.mesh.position.x, p.mesh.position.z));
                    
                    if(!hit) {
                        for (let j = 0; j < inimigos.length; j++) {
                            const ini = inimigos[j];
                            if(ini.vivo && p.mesh.position.distanceToSquared(ini.mesh.position) < 4.5) {
                                ini.hp -= arsenal[2].dano; logMsg(`> TIRO: ${arsenal[2].dano} DMG`);
                                if(ini.hp <= 0) {
                                    ini.vivo = false; scene.remove(ini.mesh); logMsg("> HOSTIL ABATIDO.");
                                    const rate = Math.floor(Math.random() * 2) + 1;
                                    for(let d=0; d<rate; d++) gerarDropFisico(ini.mesh.position.x, obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z) + 0.5, ini.mesh.position.z, 'sucata');
                                }
                                hit = true; break;
                            }
                        }
                    }
                    if(p.life <= 0 || hit) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                // Movimentação do Jogador
                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                
                let movendo = false;
                if (_dir.lengthSq() > 0) {
                    _dir.normalize(); movendo = true;
                    const vel = (playerState.dashing ? 35 : (teclado['shift'] ? 18 : 10)) * dt;
                    const oldX = playerGroup.position.x; const oldZ = playerGroup.position.z;
                    playerGroup.translateOnAxis(_dir, vel);
                    if (checkColisaoObstaculos(playerGroup.position)) { 
                        playerGroup.position.x = oldX; playerGroup.position.z = oldZ; 
                    }
                }

                playerState.velocityY -= 30 * dt; 
                playerGroup.position.y += playerState.velocityY * dt;
                
                const alturaChao = obterAlturaTerreno(playerGroup.position.x, playerGroup.position.z);
                if (playerGroup.position.y <= alturaChao) { 
                    playerGroup.position.y = alturaChao; playerState.velocityY = 0; playerState.isGrounded = true; 
                }
                
                // Headbobbing
                cameraPivot.position.y = (movendo && playerState.isGrounded && !playerState.dashing) ? 2.0 + Math.sin(clock.getElapsedTime() * 12) * 0.08 : 2.0;

                playerGroup.getWorldPosition(_vA);

                // --- SISTEMA DE COLETA DE DROPS ---
                for (let i = drops.length - 1; i >= 0; i--) {
                    const drop = drops[i]; 
                    drop.mesh.rotation.y += dt;
                    if (_vA.distanceToSquared(drop.mesh.position) < 6.0) { 
                        if (adicionarItem(drop.tipo, 1)) {
                            scene.remove(drop.mesh); drops.splice(i, 1); 
                            logMsg(`> +1 ${INFOS_ITENS[drop.tipo].nome.toUpperCase()}`); 
                            atualizarUIInv();
                        }
                    }
                }

                // Lógica dos Inimigos
                for (let j = 0; j < inimigos.length; j++) {
                    const ini = inimigos[j]; 
                    if (!ini.vivo) continue;
                    
                    ini.mesh.getWorldPosition(_vB); 
                    const distSq = _vA.distanceToSquared(_vB);
                    
                    if (distSq < 2500) ini.mesh.lookAt(playerGroup.position.x, ini.mesh.position.y, playerGroup.position.z);
                    
                    if (distSq > 10.0) { 
                        const oldX = ini.mesh.position.x; const oldZ = ini.mesh.position.z;
                        ini.mesh.translateZ(7 * dt); 
                        
                        // Empurrão entre inimigos (rudimentar)
                        for (let k = 0; k < inimigos.length; k++) {
                            if (j !== k && inimigos[k].vivo && ini.mesh.position.distanceToSquared(inimigos[k].mesh.position) < 3.0) {
                                ini.mesh.position.x += (ini.mesh.position.x - inimigos[k].mesh.position.x) * dt; 
                                ini.mesh.position.z += (ini.mesh.position.z - inimigos[k].mesh.position.z) * dt;
                            }
                        }
                        
                        ini.mesh.position.y = obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z);
                        if (checkColisaoObstaculos(ini.mesh.position)) { 
                            ini.mesh.position.x = oldX; ini.mesh.position.z = oldZ; 
                        }
                    } else {
                        if (ini.cooldown > 0) ini.cooldown -= dt;
                        else {
                            ini.cooldown = 1.2;
                            if (playerState.invulneravel) {
                                logMsg("> ESQUIVOU."); 
                            } else if (playerState.defendendo) { 
                                playerState.hp -= 8; playerState.stamina -= 20; logMsg("> BLOQUEIO."); 
                            } else { 
                                playerState.hp -= 30; logMsg("> DANO SOFRIDO."); 
                            }
                            atualizarUIInv();
                            if (playerState.hp <= 0) { 
                                logMsg("> MORTO. REINICIANDO..."); 
                                setTimeout(()=>location.reload(), 2000); 
                            }
                        }
                    }
                }
            }
            renderer.render(scene, camera); 
            stats.end();
        }

        // Responsividade da Tela
        window.addEventListener('resize', () => { 
            camera.aspect = window.innerWidth / window.innerHeight; 
            camera.updateProjectionMatrix(); 
            renderer.setSize(window.innerWidth, window.innerHeight); 
        });
        
        atualizarUIInv(); 
        animate();
    }
})();
