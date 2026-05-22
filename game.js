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
        // Cache de UI
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
        scene.background = new THREE.Color(0x020a02); 
        scene.fog = new THREE.FogExp2(0x020a02, 0.015);

        const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        const clock = new THREE.Clock();
        
        // OTIMIZAÇÃO DE MEMÓRIA: Alocação global de vetores para evitar Garbage Collection em tempo real
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _dir = new THREE.Vector3();
        const _fwd = new THREE.Vector3(), _quat = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.5)); 
        const light = new THREE.DirectionalLight(0x00ff00, 0.6); light.position.set(20, 50, 20); scene.add(light);

        // Chão Estilo Tron/Matrix
        const floorGeo = new THREE.PlaneGeometry(200, 200, 10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, wireframe: true, wireframeLinewidth: 2 }); 
        const floor = new THREE.Mesh(floorGeo, floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);

        // OTIMIZAÇÃO DE MEMÓRIA: Geometrias e Materiais em Cache
        const matPadraoVerde = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const matDrop = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true });
        const matProj = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        const geoInimigo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
        const geoDrop = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const geoProj = new THREE.CylinderGeometry(0.02, 0.02, 0.8);

        // --- SISTEMA DE PERSONAGEM ---
        const playerGroup = new THREE.Group(); scene.add(playerGroup);
        const cameraPivot = new THREE.Group(); cameraPivot.position.set(0, 2.0, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 0);

        const weaponHandGroup = new THREE.Group(); weaponHandGroup.position.set(0.4, -0.3, -0.6); cameraPivot.add(weaponHandGroup);
        
        // Armas 3D
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 0.1), matPadraoVerde); 
        mSword.position.set(0, 0.5, -0.5); mSword.rotation.x = -Math.PI/4;
        
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), matPadraoVerde); 
        mHammer.position.set(0, 0, -0.8); mHammer.visible = false;
        
        const mBowGroup = new THREE.Group();
        const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6), matPadraoVerde); bowMain.rotation.x = Math.PI/2;
        mBowGroup.add(bowMain); mBowGroup.position.set(0, 0, -0.8); mBowGroup.visible = false;

        weaponHandGroup.add(mSword, mHammer, mBowGroup);
        const meshArmas = [mSword, mHammer, mBowGroup];

        // --- STATUS & MECÂNICAS ---
        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, pocoes: 3, flechas: 15,
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false,
            combo: 0, comboTimer: 0
        };
        
        const arsenal = [
            { tipo: 'melee', nome: "Cyber-Lâmina", dano: 30, alcance: 4.5, custo: 15, vel: 12 },
            { tipo: 'melee', nome: "Esmagador", dano: 65, alcance: 3.5, custo: 35, vel: 6 },
            { tipo: 'arco', nome: "Arco Tático", dano: 50, custo: 0 }
        ];

        let inimigos = [], drops = [], itensInv = [], projeteis = [];
        let mouseTravado = false, invAberto = false, teclado = {};

        function spawnInimigo(px, pz) {
            const eGroup = new THREE.Group();
            const malha = new THREE.Mesh(geoInimigo, matInimigo);
            malha.position.y = 1.25; eGroup.position.set(px, 0, pz); eGroup.add(malha);
            scene.add(eGroup);
            inimigos.push({ mesh: eGroup, hp: 300, vivo: true, cooldown: 0 });
        }
        spawnInimigo(0, -20); spawnInimigo(15, -15); spawnInimigo(-15, -25);

        // --- CRAFTING E INVENTÁRIO ---
        document.getElementById("btn-craft-flecha").addEventListener("click", () => tentarCraft('flecha'));
        document.getElementById("btn-craft-pocao").addEventListener("click", () => tentarCraft('pocao'));

        function tentarCraft(tipo) {
            let numSucatas = itensInv.filter(i => i === 'sucata').length;
            if (tipo === 'flecha' && numSucatas >= 2) {
                removerItemInv('sucata', 2); playerState.flechas += 5; logMsg("> FORJA: +5 Flechas.");
            } else if (tipo === 'pocao' && numSucatas >= 3) {
                removerItemInv('sucata', 3); playerState.pocoes++; logMsg("> FORJA: +1 Seringa.");
            } else {
                logMsg("> ERRO: Sucata insuficiente.");
            }
            atualizarUIInventario();
        }

        function removerItemInv(nome, qtd) {
            for(let i=0; i<qtd; i++) { let idx = itensInv.indexOf(nome); if(idx > -1) itensInv.splice(idx, 1); }
        }

        // --- CONTROLES ---
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
                atualizarHUD(); logMsg("> Seringa aplicada."); 
            }
            if (key === '1') trocarArma(0); if (key === '2') trocarArma(1); if (key === '3') trocarArma(2);
            
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 20) { 
                playerState.dashing = true; playerState.dashTimer = 0.3; playerState.stamina -= 20; 
                playerState.invulneravel = true; logMsg("> DASH EXECUTADO.");
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
            cameraPivot.rotation.x = Math.max(-0.6, Math.min(0.6, cameraPivot.rotation.x));
        });

        // --- COMBATE ---
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
                                logMsg(`> ACERTO: ${danoFinal} DMG (x${playerState.combo})`);
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
            inimigo.vivo = false; scene.remove(inimigo.mesh); logMsg("> INIMIGO ABATIDO.");
            let qtdDrop = Math.floor(Math.random() * 3) + 1;
            for(let i=0; i<qtdDrop; i++) {
                const drop = new THREE.Mesh(geoDrop, matDrop);
                drop.position.copy(inimigo.mesh.position).add(new THREE.Vector3((Math.random()-0.5), 0.5, (Math.random()-0.5)));
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

                // Física de Projéteis
                for(let i = projeteis.length - 1; i >= 0; i--) {
                    let p = projeteis[i];
                    p.mesh.position.addScaledVector(p.dir, 50 * delta);
                    p.life -= delta;
                    
                    inimigos.forEach(inimigo => {
                        if(inimigo.vivo && p.mesh.position.distanceTo(inimigo.mesh.position) < 2.0) {
                            inimigo.hp -= arsenal[2].dano;
                            logMsg(`> HIT: Arco (${arsenal[2].dano} DMG)`);
                            if(inimigo.hp <= 0) matarInimigo(inimigo);
                            p.life = 0;
                        }
                    });

                    if(p.life <= 0) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                // Movimentação
                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                _dir.normalize();

                const mVel = (playerState.dashing ? 35 : 15) * delta;
                playerGroup.translateOnAxis(_dir, mVel);
                playerGroup.getWorldPosition(_vA);

                // Drops
                for (let i = drops.length - 1; i >= 0; i--) {
                    let drop = drops[i]; drop.mesh.rotation.y += delta;
                    if (_vA.distanceTo(drop.mesh.position) < 2.0 && itensInv.length < 15) { 
                        itensInv.push(drop.tipo); scene.remove(drop.mesh); drops.splice(i, 1); 
                        logMsg("> Sucata recolhida."); atualizarHUD(); 
                    }
                }

                // IA
                inimigos.forEach(inimigo => {
                    if (!inimigo.vivo) return;
                    inimigo.mesh.getWorldPosition(_vB); let dist = _vA.distanceTo(_vB);
                    if (dist < 40) inimigo.mesh.lookAt(playerGroup.position.x, inimigo.mesh.position.y, playerGroup.position.z);
                    
                    if (dist > 3.0) { inimigo.mesh.translateZ(5 * delta); } 
                    else {
                        if (inimigo.cooldown > 0) inimigo.cooldown -= delta;
                        else {
                            inimigo.cooldown = 1.5;
                            if (playerState.invulneravel) { logMsg("> ESQUIVA PERFEITA."); } 
                            else if (playerState.defendendo) { 
                                playerState.hp -= 5; playerState.stamina -= 15; logMsg("> DANO BLOQUEADO."); 
                            } else { 
                                playerState.hp -= 25; logMsg("> DANO SOFRIDO."); 
                            }
                            atualizarHUD();
                            if (playerState.hp <= 0) { logMsg("> SISTEMA CRÍTICO. REINICIANDO..."); setTimeout(()=>location.reload(), 2000); }
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
