(function() {
    "use strict";

    if (document.readyState === "complete" || document.readyState === "interactive") { 
        initBoot(); 
    } else { 
        window.addEventListener('DOMContentLoaded', initBoot); 
    }

    function initBoot() {
        if (typeof THREE === 'undefined') {
            document.body.innerHTML = "<h2 style='color:red; background:black; text-align:center; padding:20px;'>ERRO: Three.js não foi carregado corretamente.</h2>";
            return;
        }

        const domInicial = document.getElementById("tela-inicial");
        const btnIniciar = document.getElementById("btn-iniciar");

        if (btnIniciar && domInicial) {
            btnIniciar.addEventListener("click", () => { 
                domInicial.style.display = "none"; 
                iniciarEngine(true); 
            });
        }
    }

    function iniciarEngine(autoLock = false) {
        // Cache da Interface Gráfica
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

        // Exibe o HUD inicial
        ['hud', 'reticula', 'log', 'uiMouse'].forEach(el => { 
            if(ui[el]) ui[el].classList.remove("hidden"); 
        });

        // Configuração gráfica do motor Three.js
        const scene = new THREE.Scene();
        const corCeu = 0x87CEEB; 
        scene.background = new THREE.Color(corCeu); 
        scene.fog = new THREE.FogExp2(corCeu, 0.008);
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        // Alocação estática de vetores matemáticas (Performance - Evita Lag/Gargalo de memória)
        const clock = new THREE.Clock();
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _dir = new THREE.Vector3();
        const _fwd = new THREE.Vector3(), _quat = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
        const _spawnPos = new THREE.Vector3();

        // Iluminação
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 1.0));
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); 
        sunLight.position.set(100, 200, 50); 
        sunLight.castShadow = true; 
        scene.add(sunLight);

        // Algoritmo matemático para geração do relevo do terreno
        function obterAlturaTerreno(x, z) { 
            const limit = Math.max(0, 1 - (Math.sqrt(x*x + z*z) / 250));
            return limit * ((Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15) + (Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2)); 
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

        // Configuração de Materiais Comuns
        const matArma = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }); 
        const matDropSucata = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
        const matDropMadeira = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
        const geoDrop = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const geoProj = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
        const matProj = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });

        // Instanciamento em massa de Árvores (Renderiza 400 árvores com a performance de apenas 1)
        const qtdArvores = 400; 
        const obstaculos = [];
        const arvoresTroncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 4), new THREE.MeshStandardMaterial({ color: 0x3d2817 }), qtdArvores);
        const arvoresFolhas = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 6, 4), new THREE.MeshStandardMaterial({ color: 0x1a3d1f }), qtdArvores);
        arvoresTroncos.castShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < qtdArvores; i++) {
            const angulo = Math.random() * Math.PI * 2;
            const raio = 20 + Math.random() * 210;
            const tx = Math.cos(angulo) * raio; 
            const tz = Math.sin(angulo) * raio;
            const ty = obterAlturaTerreno(tx, tz);
            
            dummy.position.set(tx, ty + 2.5, tz); dummy.updateMatrix(); arvoresTroncos.setMatrixAt(i, dummy.matrix);
            dummy.position.set(tx, ty + 6.5, tz); dummy.updateMatrix(); arvoresFolhas.setMatrixAt(i, dummy.matrix);
            
            obstaculos.push({ pos: new THREE.Vector3(tx, ty, tz), raioSq: 2.5, lastHitTime: 0 }); 
        }
        scene.add(arvoresTroncos, arvoresFolhas);
        
        // Estrutura do Jogador
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
        
        // Modelagem Visual de Armas Equipáveis
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.1), matArma); mSword.position.set(0, 0.6, -0.4); mSword.rotation.x = -Math.PI/6; mSword.castShadow = true;
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), matArma); mHammer.position.set(0, 0, -0.6); mHammer.visible = false; mHammer.castShadow = true;
        const mBow = new THREE.Group(); const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), matArma); bowMain.rotation.x = Math.PI/2; mBow.add(bowMain); mBow.position.set(0, 0, -0.6); mBow.visible = false;
        const mAxe = new THREE.Group(); const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), new THREE.MeshStandardMaterial({color: 0x5c4033})); const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.4), matArma); lamina.position.set(0, 0.3, 0.1); mAxe.add(cabo, lamina); mAxe.position.set(0, 0, -0.4); mAxe.rotation.x = -Math.PI/6; mAxe.visible = false;

        weaponHand.add(mSword, mHammer, mBow, mAxe); 
        const meshArmas = [mSword, mHammer, mBow, mAxe];

        // Datapack do Inventário de Itens (Minecraft Style)
        const INFOS_ITENS = {
            'sucata': { nome: 'Sucata', icone: '⚙️', maxStack: 64, cor: '#555' },
            'madeira': { nome: 'Madeira', icone: '🪵', maxStack: 64, cor: '#6b4423' },
            'pocao': { nome: 'Poção', icone: '🧪', maxStack: 16, cor: '#a32' },
            'flecha': { nome: 'Flecha', icone: '🏹', maxStack: 64, cor: '#444' }
        };

        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, 
            inventario: new Array(15).fill(null), // 15 slots reais vazios
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false, combo: 0, comboTimer: 0,
            velocityY: 0, isGrounded: true
        };

        function contarItem(tipo) { 
            return playerState.inventario.reduce((acc, slot) => slot && slot.tipo === tipo ? acc + slot.qtd : acc, 0); 
        }
        
        function adicionarItem(tipo, qtd = 1) {
            const info = INFOS_ITENS[tipo];
            for(let i=0; i < playerState.inventario.length; i++) {
                if(playerState.inventario[i] && playerState.inventario[i].tipo === tipo && playerState.inventario[i].qtd < info.maxStack) {
                    const espaco = info.maxStack - playerState.inventario[i].qtd;
                    if(qtd <= espaco) { playerState.inventario[i].qtd += qtd; return true; } 
                    else { playerState.inventario[i].qtd = info.maxStack; qtd -= espaco; }
                }
            }
            for(let i=0; i < playerState.inventario.length; i++) {
                if(!playerState.inventario[i]) { playerState.inventario[i] = { tipo: tipo, qtd: qtd }; return true; }
            }
            return false;
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
                    } else { qtd -= slot.qtd; playerState.inventario[i] = null; }
                }
            }
            return true;
        }

        // Carga inicial
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

        // Spawn de Monstros
        for(let i = 0; i < 20; i++) {
            const hostil = new THREE.Group();
            const mBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.4), matInimigo); mBody.position.y = 1.0; mBody.castShadow = true;
            const mHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), matInimigo); mHead.position.y = 1.9; hostil.add(mBody, mHead);
            
            const angulo = Math.random() * Math.PI * 2, raio = 40 + Math.random() * 160;
            const px = Math.cos(angulo) * raio, pz = Math.sin(angulo) * raio;
            
            hostil.position.set(px, obterAlturaTerreno(px, pz), pz);
            scene.add(hostil); inimigos.push({ mesh: hostil, hp: 120, vivo: true, cooldown: 0 });
        }

        // Eventos de Crafting (UI)
        const btnFlecha = document.getElementById("btn-craft-flecha"); 
        const btnPocao = document.getElementById("btn-craft-pocao");
        if(btnFlecha) btnFlecha.addEventListener("click", () => forjar('flecha'));
        if(btnPocao) btnPocao.addEventListener("click", () => forjar('pocao'));

        function forjar(tipo) {
            if(tipo === 'flecha' && contarItem('sucata') >= 1 && contarItem('madeira') >= 1) {
                removerItem('sucata', 1); removerItem('madeira', 1); adicionarItem('flecha', 5);
                logMsg("> FABRICOU FLECHAS."); atualizarUIInv();
            } else if(tipo === 'pocao' && contarItem('sucata') >= 3) {
                removerItem('sucata', 3); adicionarItem('pocao', 1);
                logMsg("> KIT MÉDICO CRIADO."); atualizarUIInv();
            } else { logMsg("> RECURSOS INSUFICIENTES."); }
        }

        // Captura Mecânica do Cursor (PointerLock)
        const travarMouse = () => { if (!invAberto && renderer.domElement.requestPointerLock) renderer.domElement.requestPointerLock(); };
        if (autoLock && renderer.domElement.requestPointerLock) renderer.domElement.requestPointerLock();
        
        renderer.domElement.addEventListener("click", travarMouse);
        if (ui.uiMouse) ui.uiMouse.addEventListener("click", travarMouse);

        document.addEventListener("pointerlockchange", () => { 
            mouseTravado = (document.pointerLockElement === renderer.domElement); 
            if(ui.uiMouse) ui.uiMouse.classList.toggle("hidden", mouseTravado); 
        });

        const btnFecharInv = document.getElementById("btn-fechar-inv");
        if(btnFecharInv) btnFecharInv.addEventListener("click", () => { invAberto = false; if(ui.painelInv) ui.painelInv.classList.add("hidden"); travarMouse(); });

        // Eventos de Input Teclado
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase(); teclado[key] = true;
            
            if (key === 'e') {
                invAberto = !invAberto; if(ui.painelInv) ui.painelInv.classList.toggle("hidden", !invAberto);
                if (invAberto) { if(mouseTravado && document.exitPointerLock) document.exitPointerLock(); atualizarUIInv(); } else travarMouse();
            }
            if (invAberto || !mouseTravado) return;

            if (key === ' ' && playerState.isGrounded && playerState.stamina >= 15) { playerState.velocityY = 12; playerState.isGrounded = false; playerState.stamina -= 15; }
            if (key === 'q' && contarItem('pocao') > 0 && playerState.hp < 100) { removerItem('pocao', 1); playerState.hp = Math.min(100, playerState.hp + 50); atualizarUIInv(); logMsg("> REGENEROU VIDA."); }
            if (['1','2','3','4'].includes(key)) equiparArma(parseInt(key) - 1);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 25 && playerState.isGrounded) { playerState.dashing = true; playerState.dashTimer = 0.25; playerState.stamina -= 25; playerState.invulneravel = true; }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function equiparArma(idx) { playerState.armaEquipada = idx; playerState.carregandoArco = false; playerState.combo = 0; if(ui.lblCombo) ui.lblCombo.innerText = "0"; meshArmas.forEach((m, i) => m.visible = (i === idx)); logMsg(`> EQUIPOU: ${arsenal[idx].nome}`); }

        document.addEventListener("mousemove", e => {
            if (!mouseTravado || invAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002; cameraPivot.rotation.x = Math.max(-1.2, Math.min(1.2, cameraPivot.rotation.x - e.movementY * 0.002));
        });

        // Drop Físico que cai no cenário
        function gerarDropFisico(x, y, z, tipo) {
            const drop = new THREE.Mesh(geoDrop, tipo === 'madeira' ? matDropMadeira : matDropSucata);
            drop.position.set(x + (Math.random()-0.5), y, z + (Math.random()-0.5));
            scene.add(drop); drops.push({ mesh: drop, tipo: tipo });
        }

        // Ataques e Interações com Cliques do Mouse
        window.addEventListener("mousedown", e => {
            if (!mouseTravado || invAberto) return;
            const arma = arsenal[playerState.armaEquipada];
            
            if (e.button === 0) {
                if (arma.tipo === 'melee' && !playerState.atacando && playerState.stamina >= arma.custo) {
                    playerState.atacando = true; playerState.stamina -= arma.custo;
                    playerState.comboTimer > 0 ? playerState.combo++ : playerState.combo = 1; playerState.comboTimer = 1.2; if(ui.lblCombo) ui.lblCombo.innerText = playerState.combo;
                    
                    const danoBase = Math.floor(arma.dano * (1 + (playerState.combo * 0.25)));
                    playerGroup.getWorldPosition(_vA); _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                    for (let i = 0; i < inimigos.length; i++) {
                        const ini = inimigos[i]; if (!ini.vivo) continue;
                        ini.mesh.getWorldPosition(_vB);
                        if (_vA.distanceToSquared(_vB) < arma.alcanceSq) { 
                            _dir.subVectors(_vB, _vA).normalize();
                            if (_fwd.dot(_dir) > 0.4) { 
                                ini.hp -= danoBase; logMsg(`> HIT: -${danoBase} HP`);
                                if (ini.hp <= 0) {
                                    ini.vivo = false; scene.remove(ini.mesh); logMsg("> EXP +1");
                                    gerarDropFisico(ini.mesh.position.x, obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z) + 0.5, ini.mesh.position.z, 'sucata');
                                }
                            }
                        }
                    }

                    // Coleta de madeira por impacto otimizado (Timestamps)
                    if (arma.nome === "MACHADO") {
                        const tempoAtual = clock.getElapsedTime();
                        for (let i = 0; i < obstaculos.length; i++) {
                            const obs = obstaculos[i];
                            if (tempoAtual - obs.lastHitTime < 1.5) continue; 
                            if (_vA.distanceToSquared(obs.pos) < 20.0) {
                                _dir.subVectors(obs.pos, _vA).normalize();
                                if (_fwd.dot(_dir) > 0.4) { 
                                    logMsg("* CORTANDO MADEIRA *");
                                    gerarDropFisico(obs.pos.x, obs.pos.y + 2, obs.pos.z, 'madeira');
                                    obs.lastHitTime = tempoAtual; break;
                                }
                            }
                        }
                    }
                } else if (arma.tipo === 'arco' && contarItem('flecha') > 0) playerState.carregandoArco = true;
            } else if (e.button === 2 && playerState.stamina >= 10) { playerState.defendendo = true; weaponHand.rotation.z = Math.PI/2; weaponHand.position.x = 0; }
        });

        window.addEventListener("mouseup", e => { 
            if (e.button === 2) { playerState.defendendo = false; weaponHand.rotation.z = 0; weaponHand.position.x = 0.4; } 
            if (e.button === 0 && playerState.carregandoArco) {
                playerState.carregandoArco = false;
                if (removerItem('flecha', 1)) { 
                    atualizarUIInv();
                    const proj = new THREE.Mesh(geoProj, matProj);
                    playerGroup.getWorldPosition(_vA); proj.position.copy(_vA).add(_spawnPos.set(0, 1.6, 0));
                    cameraPivot.getWorldQuaternion(_quat); const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(_quat);
                    proj.quaternion.setFromUnitVectors(_up, dir);
                    scene.add(proj); projeteis.push({ mesh: proj, dir: dir, life: 1.5 });
                }
            }
        });

        // Sincronização do estado lógico com elementos visuais da UI
        function atualizarUIInv() {
            if(ui.hpBar) ui.hpBar.style.width = `${playerState.hp}%`; 
            if(ui.stmBar) ui.stmBar.style.width = `${playerState.stamina}%`;
            if(ui.lblPocoes) ui.lblPocoes.innerText = contarItem('pocao'); 
            if(ui.lblFlechas) ui.lblFlechas.innerText = contarItem('flecha'); 

            if(!ui.gridInv) return;
            let HTMLFinal = "";
            for(let i=0; i < playerState.inventario.length; i++) {
                const slot = playerState.inventario[i];
                if(slot) {
                    const info = INFOS_ITENS[slot.tipo];
                    HTMLFinal += `<div style="background:#222; border:2px solid ${info.cor}; width:50px; height:50px; position:relative; display:flex; align-items:center; justify-content:center; font-size:24px; border-radius:4px;">
                        ${info.icone}
                        <span style="position:absolute; bottom:2px; right:4px; font-size:11px; font-weight:bold; color:#fff; text-shadow:1px 1px 0 #000;">${slot.qtd}</span>
                    </div>`;
                } else { HTMLFinal += `<div style="background:#1a1a1a; border:2px solid #333; width:50px; height:50px; border-radius:4px;"></div>`; }
            }
            ui.gridInv.innerHTML = HTMLFinal;
        }

        function checkColisaoObstaculos(pos) {
            for(let i=0; i<obstaculos.length; i++) { 
                const dx = pos.x - obstaculos[i].pos.x, dz = pos.z - obstaculos[i].pos.z; 
                if ((dx*dx + dz*dz) < obstaculos[i].raioSq) return true; 
            }
            return false;
        }

        function logMsg(msg) { if(ui.log) ui.log.innerText = msg; }

        // Loop de Renderização Principal (Loop Perfeito a 60FPS+)
        function animate() {
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1); 

            if (invAberto) { renderer.render(scene, camera); return; }

            if (mouseTravado) {
                if (!playerState.atacando && !playerState.defendendo && !playerState.dashing && playerState.stamina < 100) { playerState.stamina = Math.min(100, playerState.stamina + (25 * dt)); atualizarUIInv(); }
                if (playerState.comboTimer > 0) playerState.comboTimer -= dt; else if(playerState.combo > 0) { playerState.combo = 0; if(ui.lblCombo) ui.lblCombo.innerText = "0"; }
                if (playerState.dashTimer > 0) playerState.dashTimer -= dt; else { playerState.dashing = false; playerState.invulneravel = false; }
                
                if (playerState.atacando) { 
                    weaponHand.rotation.x -= arsenal[playerState.armaEquipada].vel * dt; weaponHand.rotation.z -= arsenal[playerState.armaEquipada].vel * dt * 0.5;
                    if (weaponHand.rotation.x < -1.8) { playerState.atacando = false; weaponHand.rotation.x = 0; weaponHand.rotation.z = 0; } 
                }

                // Simulação Física de Flechas e Projéteis
                for(let i = projeteis.length - 1; i >= 0; i--) {
                    const p = projeteis[i]; p.mesh.position.addScaledVector(p.dir, 80 * dt); p.life -= dt;
                    let hit = checkColisaoObstaculos(p.mesh.position) || (p.mesh.position.y <= obterAlturaTerreno(p.mesh.position.x, p.mesh.position.z));
                    if(!hit) {
                        for (let j = 0; j < inimigos.length; j++) {
                            const ini = inimigos[j];
                            if(ini.vivo && p.mesh.position.distanceToSquared(ini.mesh.position) < 4.5) {
                                ini.hp -= arsenal[2].dano; logMsg(`> ARCO ACERTO: ${arsenal[2].dano} DMG`);
                                if(ini.hp <= 0) {
                                    ini.vivo = false; scene.remove(ini.mesh); logMsg("> HOSTIL ELIMINADO.");
                                    gerarDropFisico(ini.mesh.position.x, obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z) + 0.5, ini.mesh.position.z, 'sucata');
                                }
                                hit = true; break;
                            }
                        }
                    }
                    if(p.life <= 0 || hit) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                // Vetor de Entrada de Movimento
                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                
                let movendo = false;
                if (_dir.lengthSq() > 0) {
                    _dir.normalize(); movendo = true;
                    const vel = (playerState.dashing ? 35 : (teclado['shift'] ? 18 : 10)) * dt;
                    const oldX = playerGroup.position.x, oldZ = playerGroup.position.z;
                    playerGroup.translateOnAxis(_dir, vel);
                    if (checkColisaoObstaculos(playerGroup.position)) { playerGroup.position.x = oldX; playerGroup.position.z = oldZ; }
                }

                // Gravidade Aplicada ao Player
                playerState.velocityY -= 30 * dt; playerGroup.position.y += playerState.velocityY * dt;
                const alturaChao = obterAlturaTerreno(playerGroup.position.x, playerGroup.position.z);
                if (playerGroup.position.y <= alturaChao) { playerGroup.position.y = alturaChao; playerState.velocityY = 0; playerState.isGrounded = true; }
                
                // Balanço de Câmera (Headbobbing)
                cameraPivot.position.y = (movendo && playerState.isGrounded && !playerState.dashing) ? 2.0 + Math.sin(clock.getElapsedTime() * 12) * 0.08 : 2.0;
                playerGroup.getWorldPosition(_vA);

                // Magnetismo e Coleta Mecânica dos Itens do chão
                for (let i = drops.length - 1; i >= 0; i--) {
                    const drop = drops[i]; drop.mesh.rotation.y += dt;
                    if (_vA.distanceToSquared(drop.mesh.position) < 6.0) { 
                        if (adicionarItem(drop.tipo, 1)) { scene.remove(drop.mesh); drops.splice(i, 1); logMsg(`+ 1 ${INFOS_ITENS[drop.tipo].nome}`); atualizarUIInv(); }
                    }
                }

                // Inteligência Artificial e Movimento dos Monstros
                for (let j = 0; j < inimigos.length; j++) {
                    const ini = inimigos[j]; if (!ini.vivo) continue;
                    ini.mesh.getWorldPosition(_vB); const distSq = _vA.distanceToSquared(_vB);
                    
                    if (distSq < 2500) ini.mesh.lookAt(playerGroup.position.x, ini.mesh.position.y, playerGroup.position.z);
                    if (distSq > 10.0) { 
                        const oldX = ini.mesh.position.x, oldZ = ini.mesh.position.z;
                        ini.mesh.translateZ(7 * dt); 
                        ini.mesh.position.y = obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z);
                        if (checkColisaoObstaculos(ini.mesh.position)) { ini.mesh.position.x = oldX; ini.mesh.position.z = oldZ; }
                    } else {
                        if (ini.cooldown > 0) ini.cooldown -= dt;
                        else {
                            ini.cooldown = 1.2;
                            if (!playerState.invulneravel) {
                                if (playerState.defendendo) { playerState.hp -= 8; playerState.stamina -= 20; logMsg("> BLOQUEOU ATAQUE!"); } 
                                else { playerState.hp -= 30; logMsg("> DANO SOFRIDO!"); }
                                atualizarUIInv();
                                if (playerState.hp <= 0) { logMsg("GAME OVER."); setTimeout(()=>location.reload(), 1500); }
                            }
                        }
                    }
                }
            }
            renderer.render(scene, camera); 
        }

        window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
        atualizarUIInv(); animate();
    }
})();
