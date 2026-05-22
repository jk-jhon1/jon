(function() {
    "use strict";

    if (document.readyState === "complete" || document.readyState === "interactive") { initBoot(); } 
    else { window.addEventListener('DOMContentLoaded', initBoot); }

    function initBoot() {
        const domInicial = document.getElementById("tela-inicial");
        document.getElementById("btn-iniciar").addEventListener("click", () => {
            domInicial.style.opacity = "0";
            setTimeout(() => { domInicial.classList.add("hidden"); iniciarEngine(); }, 400);
        });
    }

    function iniciarEngine() {
        // Cache de UI
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

        // Cena, Câmera, Renderizador
        const scene = new THREE.Scene();
        const corCeu = 0x87CEEB; 
        scene.background = new THREE.Color(corCeu); 
        scene.fog = new THREE.FogExp2(corCeu, 0.008);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        document.body.appendChild(renderer.domElement);

        // HUD de FPS
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
        
        // Iluminação
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); 
        sunLight.position.set(100, 150, 50); 
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10; sunLight.shadow.camera.far = 400;
        const dSide = 150;
        sunLight.shadow.camera.left = -dSide; sunLight.shadow.camera.right = dSide;
        sunLight.shadow.camera.top = dSide; sunLight.shadow.camera.bottom = -dSide;
        scene.add(sunLight);

        // Terreno Procedural
        const floorGeo = new THREE.PlaneGeometry(400, 400, 60, 60);
        const vertices = floorGeo.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            let x = vertices.getX(i); let y = vertices.getY(i);
            let elevacao = (Math.sin(x * 0.02) * Math.cos(y * 0.02) * 15) + (Math.sin(x * 0.05) * 2 + Math.cos(y * 0.05) * 2);
            let fatorCentro = Math.min(1, Math.sqrt(x*x + y*y) / 60);
            vertices.setZ(i, elevacao * fatorCentro); 
        }
        floorGeo.computeVertexNormals();
        const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1e3f1e, roughness: 0.9 })); 
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
        scene.add(floor);

        function obterAlturaTerreno(x, z) {
            let elevacao = (Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15) + (Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2);
            let fatorCentro = Math.min(1, Math.sqrt(x*x + z*z) / 60);
            return elevacao * fatorCentro;
        }

        // Floresta (InstancedMesh)
        const qtdArvores = 350;
        const obstaculos = [];
        const arvoresTroncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.5, 4, 5), new THREE.MeshStandardMaterial({ color: 0x4a2f13 }), qtdArvores);
        const arvoresFolhas = new THREE.InstancedMesh(new THREE.ConeGeometry(2, 5, 5), new THREE.MeshStandardMaterial({ color: 0x134a1b }), qtdArvores);
        arvoresTroncos.castShadow = true; arvoresTroncos.receiveShadow = true;
        arvoresFolhas.castShadow = true; arvoresFolhas.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < qtdArvores; i++) {
            let angulo = Math.random() * Math.PI * 2;
            let raio = 25 + Math.random() * 150;
            let tx = Math.cos(angulo) * raio; let tz = Math.sin(angulo) * raio;
            let ty = obterAlturaTerreno(tx, tz);
            
            dummy.position.set(tx, ty + 2, tz); dummy.updateMatrix(); arvoresTroncos.setMatrixAt(i, dummy.matrix);
            dummy.position.set(tx, ty + 5.5, tz); dummy.updateMatrix(); arvoresFolhas.setMatrixAt(i, dummy.matrix);
            obstaculos.push({ pos: new THREE.Vector3(tx, ty, tz), raioSq: 2.25 });
        }
        scene.add(arvoresTroncos); scene.add(arvoresFolhas);

        // Materiais
        const matArma = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.8 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
        const matDrop = new THREE.MeshStandardMaterial({ color: 0x33ff33, wireframe: true });
        
        // Jogador (Primeira Pessoa)
        const playerGroup = new THREE.Group(); 
        playerGroup.position.set(0, obterAlturaTerreno(0, 0), 0);
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group(); cameraPivot.position.set(0, 2.0, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 0);

        const weaponHand = new THREE.Group(); weaponHand.position.set(0.4, -0.3, -0.6); cameraPivot.add(weaponHand);
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 0.1), matArma); 
        mSword.position.set(0, 0.5, -0.5); mSword.rotation.x = -Math.PI/4; mSword.castShadow = true;
        
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), matArma); 
        mHammer.position.set(0, 0, -0.8); mHammer.visible = false; mHammer.castShadow = true;
        
        const mBow = new THREE.Group();
        const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6), matArma); bowMain.rotation.x = Math.PI/2;
        mBow.add(bowMain); mBow.position.set(0, 0, -0.8); mBow.visible = false; mBow.castShadow = true;

        weaponHand.add(mSword, mHammer, mBow);
        const meshArmas = [mSword, mHammer, mBow];

        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, pocoes: 3, flechas: 15,
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false, combo: 0, comboTimer: 0
        };
        const arsenal = [
            { tipo: 'melee', nome: "Lâmina Tática", dano: 30, alcance: 4.5, custo: 15, vel: 12 },
            { tipo: 'melee', nome: "Bastão Pesado", dano: 65, alcance: 3.5, custo: 35, vel: 6 },
            { tipo: 'arco', nome: "Arco Composto", dano: 50, custo: 0 }
        ];

        let inimigos = [], drops = [], itensInv = [], projeteis = [];
        let mouseTravado = false, invAberto = false, teclado = {};

        // Sistema de Alvos (Humanoides)
        function criarAlvo() {
            const grupo = new THREE.Group();
            const criarParte = (w, h, d, x, y, z) => {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matInimigo);
                mesh.position.set(x, y, z); mesh.castShadow = true; grupo.add(mesh);
            };
            criarParte(0.6, 0.8, 0.3, 0, 1.2, 0);    // Tronco
            criarParte(0.3, 0.3, 0.3, 0, 1.75, 0);   // Cabeça
            criarParte(0.15, 0.6, 0.15, -0.4, 1.2, 0); // Braço E
            criarParte(0.15, 0.6, 0.15, 0.4, 1.2, 0);  // Braço D
            criarParte(0.2, 0.8, 0.2, -0.15, 0.4, 0);  // Perna E
            criarParte(0.2, 0.8, 0.2, 0.15, 0.4, 0);   // Perna D
            return grupo;
        }

        for(let i = 0; i < 20; i++) {
            const soldado = criarAlvo();
            const angulo = Math.random() * Math.PI * 2;
            const raio = 30 + Math.random() * 150;
            const px = Math.cos(angulo) * raio; const pz = Math.sin(angulo) * raio;
            soldado.position.set(px, obterAlturaTerreno(px, pz), pz);
            scene.add(soldado);
            inimigos.push({ mesh: soldado, hp: 150, vivo: true, cooldown: 0 });
        }

        // Controles de UI e Inventário
        document.getElementById("btn-craft-flecha").addEventListener("click", () => craft('flecha', 2));
        document.getElementById("btn-craft-pocao").addEventListener("click", () => craft('pocao', 3));

        function craft(tipo, custo) {
            if (itensInv.filter(i => i === 'sucata').length >= custo) {
                for(let i=0; i<custo; i++) itensInv.splice(itensInv.indexOf('sucata'), 1);
                if(tipo === 'flecha') { playerState.flechas += 5; logMsg("> 5 MUNIÇÕES SINTETIZADAS."); }
                else { playerState.pocoes++; logMsg("> 1 SERINGA SINTETIZADA."); }
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
            if (invAberto) return;
            if (key === 'q' && playerState.pocoes > 0 && playerState.hp < 100) { 
                playerState.pocoes--; playerState.hp = Math.min(100, playerState.hp + 40); atualizarHUD(); logMsg("> CURA APLICADA."); 
            }
            if (key === '1') equiparArma(0); if (key === '2') equiparArma(1); if (key === '3') equiparArma(2);
            if (key === 'shift' && !playerState.dashing && playerState.stamina >= 20) { 
                playerState.dashing = true; playerState.dashTimer = 0.3; playerState.stamina -= 20; playerState.invulneravel = true; logMsg("> EVASÃO TÁTICA.");
            }
        });
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);

        function equiparArma(idx) {
            playerState.armaEquipada = idx; playerState.carregandoArco = false; playerState.combo = 0; ui.lblCombo.innerText = "0";
            meshArmas.forEach((m, i) => m.visible = (i === idx)); logMsg(`> ARMAMENTO ATIVO: ${arsenal[idx].nome}`);
        }

        ui.uiMouse.addEventListener("click", () => { if(!invAberto) document.body.requestPointerLock(); });
        document.getElementById("btn-fechar-inv").addEventListener("click", () => { invAberto = false; ui.painelInv.classList.add("hidden"); document.body.requestPointerLock(); });
        document.addEventListener("pointerlockchange", () => { mouseTravado = (document.pointerLockElement === document.body); ui.uiMouse.classList.toggle("hidden", mouseTravado); });

        document.addEventListener("mousemove", e => {
            if (!mouseTravado || invAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002; cameraPivot.rotation.x -= e.movementY * 0.002;
            cameraPivot.rotation.x = Math.max(-1.0, Math.min(1.0, cameraPivot.rotation.x));
        });

        // Combate
        window.addEventListener("mousedown", e => {
            if (!mouseTravado || invAberto) return;
            const arma = arsenal[playerState.armaEquipada];
            if (e.button === 0) {
                if (arma.tipo === 'melee' && !playerState.atacando && playerState.stamina >= arma.custo) {
                    playerState.atacando = true; playerState.stamina -= arma.custo;
                    playerState.comboTimer > 0 ? playerState.combo++ : playerState.combo = 1;
                    playerState.comboTimer = 1.5; ui.lblCombo.innerText = playerState.combo;
                    
                    let danoBase = Math.floor(arma.dano * (1 + (playerState.combo * 0.3)));
                    playerGroup.getWorldPosition(_vA); _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                    inimigos.forEach(ini => {
                        if (!ini.vivo) return;
                        ini.mesh.getWorldPosition(_vB);
                        if (_vA.distanceTo(_vB) < arma.alcance) {
                            _dir.subVectors(_vB, _vA).normalize();
                            if (_fwd.dot(_dir) > 0.5) { 
                                ini.hp -= danoBase; logMsg(`> DANO CONFIRMADO: ${danoBase}`);
                                if (ini.hp <= 0) abaterAlvo(ini);
                            }
                        }
                    });
                } else if (arma.tipo === 'arco' && playerState.flechas > 0) playerState.carregandoArco = true;
            } else if (e.button === 2 && playerState.stamina >= 10) { playerState.defendendo = true; weaponHand.rotation.z = Math.PI/2; }
        });

        window.addEventListener("mouseup", e => { 
            if (e.button === 2) { playerState.defendendo = false; weaponHand.rotation.z = 0; } 
            if (e.button === 0 && playerState.carregandoArco) {
                playerState.carregandoArco = false;
                if (playerState.flechas > 0) {
                    playerState.flechas--; atualizarHUD();
                    const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({color: 0x33ff33}));
                    playerGroup.getWorldPosition(_vA); proj.position.copy(_vA).add(new THREE.Vector3(0, 1.5, 0));
                    cameraPivot.getWorldQuaternion(_quat);
                    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(_quat);
                    proj.quaternion.setFromUnitVectors(_up, dir);
                    scene.add(proj); projeteis.push({ mesh: proj, dir: dir, life: 2.0 });
                }
            }
        });

        function abaterAlvo(ini) {
            ini.vivo = false; scene.remove(ini.mesh); logMsg("> ALVO NEUTRALIZADO.");
            for(let i=0; i < (Math.floor(Math.random() * 3) + 1); i++) {
                const drop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), matDrop);
                let rx = ini.mesh.position.x + (Math.random()-0.5)*2; let rz = ini.mesh.position.z + (Math.random()-0.5)*2;
                drop.position.set(rx, obterAlturaTerreno(rx, rz) + 0.3, rz);
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

        function checkColisao(pos) {
            for(let i = 0; i < obstaculos.length; i++) {
                let dx = pos.x - obstaculos[i].pos.x; let dz = pos.z - obstaculos[i].pos.z;
                if ((dx*dx + dz*dz) < obstaculos[i].raioSq) return true;
            }
            return false;
        }

        // Loop Principal
        function animate() {
            stats.begin();
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1);
            
            if (invAberto) { renderer.render(scene, camera); stats.end(); return; }

            if (mouseTravado) {
                if (!playerState.atacando && !playerState.defendendo && !playerState.dashing) { playerState.stamina = Math.min(100, playerState.stamina + (25 * dt)); atualizarHUD(); }
                if (playerState.comboTimer > 0) playerState.comboTimer -= dt; else if(playerState.combo > 0) { playerState.combo = 0; ui.lblCombo.innerText = "0"; }
                if (playerState.dashTimer > 0) playerState.dashTimer -= dt; else { playerState.dashing = false; playerState.invulneravel = false; }
                
                if (playerState.atacando) { 
                    weaponHand.rotation.x -= arsenal[playerState.armaEquipada].vel * dt; 
                    if (weaponHand.rotation.x < -1.5) { playerState.atacando = false; weaponHand.rotation.x = 0; } 
                }

                for(let i = projeteis.length - 1; i >= 0; i--) {
                    let p = projeteis[i]; p.mesh.position.addScaledVector(p.dir, 70 * dt); p.life -= dt;
                    let hit = checkColisao(p.mesh.position) || (p.mesh.position.y <= obterAlturaTerreno(p.mesh.position.x, p.mesh.position.z));
                    if(!hit) {
                        for (let j = 0; j < inimigos.length; j++) {
                            let ini = inimigos[j];
                            if(ini.vivo && p.mesh.position.distanceToSquared(ini.mesh.position) < 4.84) {
                                ini.hp -= arsenal[2].dano; logMsg(`> IMPACTO LONGO ALCANCE: ${arsenal[2].dano}`);
                                if(ini.hp <= 0) abaterAlvo(ini); hit = true; break;
                            }
                        }
                    }
                    if(p.life <= 0 || hit) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                _dir.normalize();

                if (_dir.lengthSq() > 0) {
                    const vel = (playerState.dashing ? 32 : 14) * dt;
                    const oldX = playerGroup.position.x; const oldZ = playerGroup.position.z;
                    playerGroup.translateOnAxis(_dir, vel);
                    playerGroup.position.y = obterAlturaTerreno(playerGroup.position.x, playerGroup.position.z);
                    if (checkColisao(playerGroup.position)) { playerGroup.position.x = oldX; playerGroup.position.z = oldZ; }
                }
                playerGroup.getWorldPosition(_vA);

                for (let i = drops.length - 1; i >= 0; i--) {
                    let drop = drops[i]; drop.mesh.rotation.y += dt;
                    if (_vA.distanceToSquared(drop.mesh.position) < 6.25 && itensInv.length < 15) { 
                        itensInv.push(drop.tipo); scene.remove(drop.mesh); drops.splice(i, 1); 
                        logMsg("> SUCATA COLETADA."); atualizarHUD(); 
                    }
                }

                for (let j = 0; j < inimigos.length; j++) {
                    let ini = inimigos[j];
                    if (!ini.vivo) continue;
                    ini.mesh.getWorldPosition(_vB); let distSq = _vA.distanceToSquared(_vB);
                    if (distSq < 3600) ini.mesh.lookAt(playerGroup.position.x, ini.mesh.position.y, playerGroup.position.z);
                    
                    if (distSq > 9.0) { 
                        const oldX = ini.mesh.position.x; const oldZ = ini.mesh.position.z;
                        ini.mesh.translateZ(6 * dt); 
                        ini.mesh.position.y = obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z);
                        if (checkColisao(ini.mesh.position)) { ini.mesh.position.x = oldX; ini.mesh.position.z = oldZ; }
                    } else {
                        if (ini.cooldown > 0) ini.cooldown -= dt;
                        else {
                            ini.cooldown = 1.4;
                            if (playerState.invulneravel) logMsg("> ESQUIVA BEM SUCEDIDA."); 
                            else if (playerState.defendendo) { playerState.hp -= 5; playerState.stamina -= 15; logMsg("> IMPACTO ABSORVIDO."); } 
                            else { playerState.hp -= 25; logMsg("> INTEGRIDADE COMPROMETIDA."); }
                            atualizarHUD();
                            if (playerState.hp <= 0) { logMsg("> SISTEMA OFFLINE."); setTimeout(()=>location.reload(), 2000); }
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
