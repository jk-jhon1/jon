(function() {
    "use strict";

    if (document.readyState === "complete" || document.readyState === "interactive") { gerenciarAbertura(); } 
    else { window.addEventListener('DOMContentLoaded', gerenciarAbertura); }

    function gerenciarAbertura() {
        const domInicial = document.getElementById("tela-inicial");
        document.getElementById("btn-iniciar").addEventListener("click", () => {
            domInicial.style.opacity = "0";
            setTimeout(() => { domInicial.classList.add("hidden"); inicializarMotorJogo(); }, 400);
        });
    }

    function inicializarMotorJogo() {
        // UI
        const ui = {
            hud: document.getElementById("game-hud"), reticula: document.getElementById("reticula"),
            log: document.getElementById("combat-log"), uiMouse: document.getElementById("travar-mouse-ui"),
            painelInv: document.getElementById("painel-inventario"),
            hpBar: document.getElementById("bar-player-hp"), stmBar: document.getElementById("bar-player-stamina"),
            lblPocoes: document.getElementById("lbl-pocoes"), lblFlechas: document.getElementById("lbl-flechas"),
            lblItens: document.getElementById("lbl-total-itens"), lblCombo: document.getElementById("lbl-combo"),
            gridInv: document.getElementById("grid-inventario")
        };

        ui.hud.classList.remove("hidden"); ui.reticula.classList.remove("hidden"); 
        ui.log.classList.remove("hidden"); ui.uiMouse.classList.remove("hidden");

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x010501); 
        scene.fog = new THREE.FogExp2(0x010501, 0.02);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        const clock = new THREE.Clock();
        
        // Vetores Globais - Otimização
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _dir = new THREE.Vector3();
        const _fwd = new THREE.Vector3(), _quat = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.3)); 
        const light = new THREE.DirectionalLight(0x00ff00, 0.8); 
        light.position.set(20, 50, 20); 
        light.castShadow = true;
        scene.add(light);

        // Chão Tático
        const floorGeo = new THREE.PlaneGeometry(300, 300, 20, 20);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, wireframe: true, wireframeLinewidth: 2 }); 
        const floor = new THREE.Mesh(floorGeo, floorMat); 
        floor.rotation.x = -Math.PI / 2; 
        floor.receiveShadow = true;
        scene.add(floor);

        // Estruturas 3D (Barricadas/Pilares) para imersão
        const matObstaculo = new THREE.MeshStandardMaterial({ color: 0x002200 });
        const geoObstaculo = new THREE.BoxGeometry(4, 6, 4);
        const obstaculos = [];
        const posicoesObs = [[10, 10], [-15, 20], [25, -15], [-20, -20], [0, -30], [30, 5]];
        
        posicoesObs.forEach(pos => {
            const obs = new THREE.Mesh(geoObstaculo, matObstaculo);
            obs.position.set(pos[0], 3, pos[1]);
            obs.castShadow = true;
            obs.receiveShadow = true;
            scene.add(obs);
            obstaculos.push(obs);
        });

        // Cache de Geometrias e Materiais
        const matPadraoVerde = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const matDrop = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true });
        const matProj = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        const geoInimigo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
        const geoDrop = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const geoProj = new THREE.CylinderGeometry(0.02, 0.02, 0.8);

        // Operador (Player)
        const playerGroup = new THREE.Group(); scene.add(playerGroup);
        const cameraPivot = new THREE.Group(); cameraPivot.position.set(0, 2.0, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 0);

        const weaponHandGroup = new THREE.Group(); weaponHandGroup.position.set(0.4, -0.3, -0.6); cameraPivot.add(weaponHandGroup);
        
        // Armamento
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 0.1), matPadraoVerde); 
        mSword.position.set(0, 0.5, -0.5); mSword.rotation.x = -Math.PI/4; mSword.castShadow = true;
        
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), matPadraoVerde); 
        mHammer.position.set(0, 0, -0.8); mHammer.visible = false; mHammer.castShadow = true;
        
        const mBowGroup = new THREE.Group();
        const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6), matPadraoVerde); bowMain.rotation.x = Math.PI/2;
        mBowGroup.add(bowMain); mBowGroup.position.set(0, 0, -0.8); mBowGroup.visible = false; mBowGroup.castShadow = true;

        weaponHandGroup.add(mSword, mHammer, mBowGroup);
        const meshArmas = [mSword, mHammer, mBowGroup];

        // Status
        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, pocoes: 3, flechas: 15,
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false,
            combo: 0, comboTimer: 0
        };
        
        const arsenal = [
            { tipo: 'melee', nome: "Lâmina Tática", dano: 30, alcance: 4.5, custo: 15, vel: 12 },
            { tipo: 'melee', nome: "Pesado", dano: 65, alcance: 3.5, custo: 35, vel: 6 },
            { tipo: 'arco', nome: "Arco Composto", dano: 50, custo: 0 }
        ];

        let inimigos = [], drops = [], itensInv = [], projeteis = [];
        let mouseTravado = false, invAberto = false, teclado = {};

        function spawnInimigo(px, pz) {
            const eGroup = new THREE.Group();
            const malha = new THREE.Mesh(geoInimigo, matInimigo);
            malha.position.y = 1.25; malha.castShadow = true;
            eGroup.position.set(px, 0, pz); eGroup.add(malha);
            scene.add(eGroup);
            inimigos.push({ mesh: eGroup, hp: 300, vivo: true, cooldown: 0 });
        }
        spawnInimigo(0, -20); spawnInimigo(15, -15); spawnInimigo(-15, -25); spawnInimigo(20, -30);

        // Sistema de Forja
        document.getElementById("btn-craft-flecha").addEventListener("click", () => tentarCraft('flecha'));
        document.getElementById("btn-craft-pocao").addEventListener("click", () => tentarCraft('pocao'));

        function tentarCraft(tipo) {
            let numSucatas = itensInv.filter(i => i === 'sucata').length;
            if (tipo === 'flecha' && numSucatas >= 2) {
                removerItemInv('sucata', 2); playerState.flechas += 5; logMsg("> FORJA: +5 Flechas.");
            } else if (tipo === 'pocao' && numSucatas >= 3) {
                removerItemInv('sucata', 3); playerState.pocoes++; logMsg("> FORJA: +1 Seringa.");
            } else {
                logMsg("> ERRO: Recursos insuficientes.");
            }
            atualizarUIInventario();
        }

        function removerItemInv(nome, qtd) {
            for(let i=0; i<qtd; i++) { let idx = itensInv.indexOf(nome); if(idx > -1) itensInv.splice(idx, 1); }
        }

        // Controles de Eixo
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase(); teclado[key] = true;
            if (key === 'e') {
                invAberto = !invAberto; ui.painelInv.classList.toggle("hidden", !invAberto);
                if (invAberto) { if(mouseTravado) document.exitPointerLock(); atualizarUIInventario(); } 
                else { document.body.requestPointerLock(); }
            }
            if (invAberto) return;
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < 100) { 
                playerState.pocoes--; playerState.hp = Math.min(100, playerState.hp + 40); 
                atualizarHUD(); logMsg("> Seringa injetada."); 
            }
            if (key === '1') trocarArma(0); if (key === '2') trocarArma(1); if (key === '3') trocarArma(2);
            
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 20) { 
                playerState.dashing = true; playerState.dashTimer = 0.3; playerState.stamina -= 20; 
                playerState.invulneravel = true; logMsg("> EVASÃO TÁTICA.");
            }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function trocarArma(index) {
            playerState.armaEquipada = index; playerState.carregandoArco = false;
            meshArmas.forEach((m, idx) => m.visible = (idx === index));
            logMsg(`> Arma Ativa: ${arsenal[index].nome}`);
            playerState.combo = 0; ui.lblCombo.innerText = "0";
        }

        ui.uiMouse.addEventListener("click", () => { if(!invAberto) document.body.requestPointerLock(); });
        document.getElementById("btn-fechar-inv").addEventListener("click", () => { 
            invAberto = false; ui.painelInv.classList.add("hidden"); document.body.requestPointerLock(); 
        });
        document.addEventListener("pointerlockchange", () => { 
            mouseTravado = (document.pointerLockElement === document.body); 
            ui.uiMouse.classList.toggle("hidden", mouseTravado); 
        });

        document.addEventListener("mousemove", (e) => {
            if (!mouseTravado || invAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002;
            cameraPivot.rotation.x -= e.movementY * 0.002;
            cameraPivot.rotation.x = Math.max(-1.0, Math.min(1.0, cameraPivot.rotation.x)); // Look mais amplo
        });

        // Engajamento
        window.addEventListener("mousedown", (e) => {
            if (!mouseTravado || invAberto) return;
            const arma = arsenal[playerState.armaEquipada];

            if (e.button === 0) {
                if (arma.tipo === 'melee' && !playerState.atacando && playerState.stamina >= arma.custo) {
                    playerState.atacando = true; playerState.stamina -= arma.custo;
                    
                    if(playerState.comboTimer > 0) playerState.combo++; else playerState.combo = 1;
                    playerState.comboTimer = 1.5; ui.lblCombo.innerText = playerState.combo;
                    
                    let multiCombo = 1 + (playerState.combo * 0.3);
                    let danoFinal = Math.floor(arma.dano * multiCombo);

                    playerGroup.getWorldPosition(_vA);
                    _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                    inimigos.forEach(inimigo => {
                        if (!inimigo.vivo) return;
                        inimigo.mesh.getWorldPosition(_vB);
                        let dist = _vA.distanceTo(_vB);
                        if (dist < arma.alcance && dist > 0.1) {
                            _dir.subVectors(_vB, _vA).normalize();
                            if (_fwd.dot(_dir) > 0.5) { 
                                inimigo.hp -= danoFinal; 
                                logMsg(`> DANO APLICADO: ${danoFinal} (x${playerState.combo})`);
                                if (inimigo.hp <= 0) matarInimigo(inimigo);
                            }
                        }
                    });
                } 
                else if (arma.tipo === 'arco' && playerState.flechas > 0) {
                    playerState.carregandoArco = true;
                }
            } 
            else if (e.button === 2) { 
                if (playerState.stamina >= 10) { playerState.defendendo = true; weaponHandGroup.rotation.z = Math.PI/2; }
            }
        });

        window.addEventListener("mouseup", (e) => { 
            if (e.button === 2) { playerState.defendendo = false; weaponHandGroup.rotation.z = 0; } 
            
            if (e.button === 0 && playerState.carregandoArco) {
                playerState.carregandoArco = false;
                if (playerState.flechas > 0) {
                    playerState.flechas--; atualizarHUD();
                    
                    const projMesh = new THREE.Mesh(geoProj, matProj);
                    playerGroup.getWorldPosition(_vA);
                    projMesh.position.copy(_vA).add(new THREE.Vector3(0, 1.5, 0));
                    
                    cameraPivot.getWorldQuaternion(_quat);
                    const dirDisparo = new THREE.Vector3(0, 0, -1).applyQuaternion(_quat);
                    projMesh.quaternion.setFromUnitVectors(_up, dirDisparo);
                    
                    scene.add(projMesh);
                    projeteis.push({ mesh: projMesh, dir: dirDisparo, life: 2.0 });
                }
            }
        });

        function matarInimigo(inimigo) {
            inimigo.vivo = false; scene.remove(inimigo.mesh); logMsg("> ALVO NEUTRALIZADO.");
            let qtdDrop = Math.floor(Math.random() * 3) + 1;
            for(let i=0; i<qtdDrop; i++) {
                const drop = new THREE.Mesh(geoDrop, matDrop);
                drop.position.copy(inimigo.mesh.position).add(new THREE.Vector3((Math.random()-0.5)*2, 0.5, (Math.random()-0.5)*2));
                scene.add(drop); drops.push({mesh: drop, tipo: 'sucata'});
            }
        }

        function atualizarHUD() {
            ui.hpBar.style.width = `${playerState.hp}%`; ui.stmBar.style.width = `${playerState.stamina}%`;
            ui.lblPocoes.innerText = playerState.pocoes; ui.lblFlechas.innerText = playerState.flechas;
            ui.lblItens.innerText = itensInv.length;
        }

        function atualizarUIInventario() {
            ui.gridInv.innerHTML = "";
            let contagem = {}; itensInv.forEach(i => contagem[i] = (contagem[i] || 0) + 1);
            for (let [item, qtd] of Object.entries(contagem)) {
                let div = document.createElement('div'); div.className = 'slot-item';
                div.innerHTML = `⚙️<div class="item-qtd">x${qtd}</div>`;
                ui.gridInv.appendChild(div);
            }
            for (let i = ui.gridInv.children.length; i < 15; i++) { 
                let div = document.createElement('div'); div.className = 'slot-item'; ui.gridInv.appendChild(div); 
            }
            atualizarHUD();
        }

        function logMsg(msg) { ui.log.innerText = msg; }

        function checkColisaoObstaculos(pos) {
            for(let obs of obstaculos) {
                if (pos.distanceTo(obs.position) < 3.5) return true;
            }
            return false;
        }

        function animate() {
            requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1);
            if (invAberto) { renderer.render(scene, camera); return; }

            if (mouseTravado) {
                if (!playerState.atacando && !playerState.defendendo && !playerState.dashing) { 
                    playerState.stamina = Math.min(100, playerState.stamina + (25 * delta)); atualizarHUD(); 
                }
                
                if(playerState.comboTimer > 0) { playerState.comboTimer -= delta; } 
                else if(playerState.combo > 0) { playerState.combo = 0; ui.lblCombo.innerText = "0"; }

                if (playerState.dashTimer > 0) { playerState.dashTimer -= delta; } 
                else { playerState.dashing = false; playerState.invulneravel = false; }
                
                if (playerState.atacando) { 
                    weaponHandGroup.rotation.x -= arsenal[playerState.armaEquipada].vel * delta; 
                    if (weaponHandGroup.rotation.x < -1.5) { playerState.atacando = false; weaponHandGroup.rotation.x = 0; } 
                }

                // Balística
                for(let i = projeteis.length - 1; i >= 0; i--) {
                    let p = projeteis[i];
                    p.mesh.position.addScaledVector(p.dir, 60 * delta);
                    p.life -= delta;
                    
                    let acertou = false;
                    if(checkColisaoObstaculos(p.mesh.position)) acertou = true;

                    if(!acertou) {
                        inimigos.forEach(inimigo => {
                            if(inimigo.vivo && p.mesh.position.distanceTo(inimigo.mesh.position) < 2.0) {
                                inimigo.hp -= arsenal[2].dano;
                                logMsg(`> IMPACTO: Arco (${arsenal[2].dano} DMG)`);
                                if(inimigo.hp <= 0) matarInimigo(inimigo);
                                acertou = true;
                            }
                        });
                    }

                    if(p.life <= 0 || acertou) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                // Movimento do Jogador
                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                _dir.normalize();

                if (_dir.lengthSq() > 0) {
                    const mVel = (playerState.dashing ? 35 : 15) * delta;
                    const oldPos = playerGroup.position.clone();
                    playerGroup.translateOnAxis(_dir, mVel);
                    
                    if (checkColisaoObstaculos(playerGroup.position)) {
                        playerGroup.position.copy(oldPos); // Trava movimento se bater na barricada
                    }
                }
                playerGroup.getWorldPosition(_vA);

                // Loot
                for (let i = drops.length - 1; i >= 0; i--) {
                    let drop = drops[i]; drop.mesh.rotation.y += delta;
                    if (_vA.distanceTo(drop.mesh.position) < 2.5 && itensInv.length < 15) { 
                        itensInv.push(drop.tipo); scene.remove(drop.mesh); drops.splice(i, 1); 
                        logMsg("> Sucata adquirida."); atualizarHUD(); 
                    }
                }

                // IA Inimiga
                inimigos.forEach(inimigo => {
                    if (!inimigo.vivo) return;
                    inimigo.mesh.getWorldPosition(_vB); let dist = _vA.distanceTo(_vB);
                    if (dist < 40) inimigo.mesh.lookAt(playerGroup.position.x, inimigo.mesh.position.y, playerGroup.position.z);
                    
                    if (dist > 3.0) { 
                        const oldEPos = inimigo.mesh.position.clone();
                        inimigo.mesh.translateZ(5 * delta); 
                        if (checkColisaoObstaculos(inimigo.mesh.position)) inimigo.mesh.position.copy(oldEPos);
                    } else {
                        if (inimigo.cooldown > 0) inimigo.cooldown -= delta;
                        else {
                            inimigo.cooldown = 1.5;
                            if (playerState.invulneravel) { logMsg("> ESQUIVA BEM SUCEDIDA."); } 
                            else if (playerState.defendendo) { 
                                playerState.hp -= 5; playerState.stamina -= 15; logMsg("> IMPACTO ABSORVIDO."); 
                            } else { 
                                playerState.hp -= 25; logMsg("> INTEGRIDADE COMPROMETIDA."); 
                            }
                            atualizarHUD();
                            if (playerState.hp <= 0) { logMsg("> FALHA CRÍTICA. REINICIANDO SISTEMA..."); setTimeout(()=>location.reload(), 2000); }
                        }
                    }
                });
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
