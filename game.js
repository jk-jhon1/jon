(function() {
    "use strict";

    if (document.readyState === "complete" || document.readyState === "interactive") { initBoot(); } 
    else { window.addEventListener('DOMContentLoaded', initBoot); }

    function initBoot() {
        const domInicial = document.getElementById("tela-inicial");
        const btnIniciar = document.getElementById("btn-iniciar");
        if(btnIniciar) {
            btnIniciar.addEventListener("click", () => {
                if (typeof THREE === 'undefined') {
                    alert("ERRO: Three.js não carregado.");
                    return;
                }
                domInicial.style.opacity = "0";
                setTimeout(() => { domInicial.classList.add("hidden"); iniciarEngine(); }, 400);
            });
        }
    }

    function iniciarEngine() {
        const ui = {
            hud: document.getElementById("game-hud"), reticula: document.getElementById("reticula"),
            log: document.getElementById("combat-log"), uiMouse: document.getElementById("travar-mouse-ui"),
            painelInv: document.getElementById("painel-inventario"), hpBar: document.getElementById("bar-player-hp"), 
            stmBar: document.getElementById("bar-player-stamina"), lblPocoes: document.getElementById("lbl-pocoes"), 
            lblFlechas: document.getElementById("lbl-flechas"), lblItens: document.getElementById("lbl-total-itens"), 
            lblCombo: document.getElementById("lbl-combo"), gridInv: document.getElementById("grid-inventario")
        };

        if(ui.hud) ui.hud.classList.remove("hidden"); 
        if(ui.reticula) ui.reticula.classList.remove("hidden"); 
        if(ui.log) ui.log.classList.remove("hidden"); 
        if(ui.uiMouse) ui.uiMouse.classList.remove("hidden");

        const scene = new THREE.Scene();
        const corCeu = 0x87CEEB; 
        scene.background = new THREE.Color(corCeu); 
        scene.fog = new THREE.FogExp2(corCeu, 0.008); // Nevoeiro levemente mais denso para esconder pop-ins

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
        
        // OTIMIZAÇÃO 1: Sem antialias, poder puro de processamento
        const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(1); // OTIMIZAÇÃO 2: Trava a resolução nativa para evitar lag em monitores 2K/4K
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap; // Sombra mais barata que a SoftShadowMap
        document.body.appendChild(renderer.domElement);

        let stats;
        if (typeof Stats !== 'undefined') {
            stats = new Stats();
            stats.showPanel(0);
            stats.dom.style.position = 'absolute';
            stats.dom.style.right = '10px'; stats.dom.style.bottom = '10px';
            document.body.appendChild(stats.dom);
        } else {
            stats = { begin: function(){}, end: function(){} };
        }

        const clock = new THREE.Clock();
        const _vA = new THREE.Vector3(), _vB = new THREE.Vector3(), _dir = new THREE.Vector3();
        const _fwd = new THREE.Vector3(), _quat = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
        
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334433, 1.0));
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); 
        sunLight.position.set(100, 200, 50); 
        sunLight.castShadow = true;
        // OTIMIZAÇÃO 3: Resolução de sombra cortada pela metade
        sunLight.shadow.mapSize.width = 1024; 
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 10; sunLight.shadow.camera.far = 400;
        const dSide = 150;
        sunLight.shadow.camera.left = -dSide; sunLight.shadow.camera.right = dSide;
        sunLight.shadow.camera.top = dSide; sunLight.shadow.camera.bottom = -dSide;
        scene.add(sunLight);

        function obterAlturaTerreno(x, z) {
            let elevacao = (Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15) + (Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2);
            let limiteMapa = Math.max(0, 1 - (Math.sqrt(x*x + z*z) / 250)); 
            return elevacao * limiteMapa;
        }

        // OTIMIZAÇÃO 4: Malha do terreno simplificada (de 80x80 para 40x40 segmentos)
        const floorGeo = new THREE.PlaneGeometry(500, 500, 40, 40);
        const vertices = floorGeo.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
            vertices.setZ(i, obterAlturaTerreno(vertices.getX(i), vertices.getY(i))); 
        }
        floorGeo.computeVertexNormals();
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b4522, roughness: 0.9, metalness: 0.0 });
        const floor = new THREE.Mesh(floorGeo, floorMat); 
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
        scene.add(floor);

        // OTIMIZAÇÃO 5: Árvores Low-Poly extremas (segmentos radiais reduzidos para 4)
        const qtdArvores = 400;
        const obstaculos = [];
        const arvoresTroncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 4), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1 }), qtdArvores);
        const arvoresFolhas = new THREE.InstancedMesh(new THREE.ConeGeometry(2.5, 6, 4), new THREE.MeshStandardMaterial({ color: 0x1a3d1f, roughness: 1 }), qtdArvores);
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

        const matArma = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }); 
        const matDrop = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.5 });
        
        const playerGroup = new THREE.Group(); 
        playerGroup.position.set(0, obterAlturaTerreno(0, 0), 0);
        scene.add(playerGroup);

        const cameraPivot = new THREE.Group(); cameraPivot.position.set(0, 2.0, 0); playerGroup.add(cameraPivot);
        cameraPivot.add(camera); camera.position.set(0, 0, 0);

        const weaponHand = new THREE.Group(); weaponHand.position.set(0.4, -0.4, -0.7); cameraPivot.add(weaponHand);
        
        const mSword = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.1), matArma); 
        mSword.position.set(0, 0.6, -0.4); mSword.rotation.x = -Math.PI/6; mSword.castShadow = true;
        
        const mHammer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.8), matArma); 
        mHammer.position.set(0, 0, -0.6); mHammer.visible = false; mHammer.castShadow = true;
        
        const mBow = new THREE.Group();
        const bowMain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), matArma); bowMain.rotation.x = Math.PI/2;
        mBow.add(bowMain); mBow.position.set(0, 0, -0.6); mBow.visible = false; mBow.castShadow = true;

        weaponHand.add(mSword, mHammer, mBow);
        const meshArmas = [mSword, mHammer, mBow];

        const playerState = { 
            hp: 100, stamina: 100, armaEquipada: 0, pocoes: 3, flechas: 15,
            defendendo: false, atacando: false, carregandoArco: false,
            dashing: false, dashTimer: 0, invulneravel: false, combo: 0, comboTimer: 0,
            velocityY: 0, isGrounded: true
        };
        
        const arsenal = [
            { tipo: 'melee', nome: "LÂMINA", dano: 35, alcance: 4.5, custo: 15, vel: 18 },
            { tipo: 'melee', nome: "BASTÃO", dano: 65, alcance: 3.5, custo: 35, vel: 8 },
            { tipo: 'arco', nome: "ARCO", dano: 50, custo: 0 }
        ];

        let inimigos = [], drops = [], itensInv = [], projeteis = [];
        let mouseTravado = false, invAberto = false, teclado = {};

        function criarHostil() {
            const grupo = new THREE.Group();
            const criarParte = (w, h, d, x, y, z) => {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matInimigo);
                mesh.position.set(x, y, z); mesh.castShadow = true; grupo.add(mesh);
            };
            // Simplificado para menos partes no corpo
            criarParte(0.7, 1.4, 0.4, 0, 1.0, 0); // Corpo central
            criarParte(0.3, 0.4, 0.3, 0, 1.9, 0); // Cabeça
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

        const btnFlecha = document.getElementById("btn-craft-flecha");
        const btnPocao = document.getElementById("btn-craft-pocao");
        if(btnFlecha) btnFlecha.addEventListener("click", () => forjar('flecha', 2));
        if(btnPocao) btnPocao.addEventListener("click", () => forjar('pocao', 3));

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
                invAberto = !invAberto; if(ui.painelInv) ui.painelInv.classList.toggle("hidden", !invAberto);
                if (invAberto) { if(mouseTravado) document.exitPointerLock(); atualizarUIInv(); } 
                else document.body.requestPointerLock();
            }
            if (invAberto || !mouseTravado) return;

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
            playerState.armaEquipada = idx; playerState.carregandoArco = false; playerState.combo = 0; if(ui.lblCombo) ui.lblCombo.innerText = "0";
            meshArmas.forEach((m, i) => m.visible = (i === idx)); logMsg(`> ARMA: ${arsenal[idx].nome}`);
        }

        if(ui.uiMouse) ui.uiMouse.addEventListener("click", () => { if(!invAberto) document.body.requestPointerLock(); });
        const btnFecharInv = document.getElementById("btn-fechar-inv");
        if(btnFecharInv) btnFecharInv.addEventListener("click", () => { invAberto = false; if(ui.painelInv) ui.painelInv.classList.add("hidden"); document.body.requestPointerLock(); });
        document.addEventListener("pointerlockchange", () => { mouseTravado = (document.pointerLockElement === document.body); if(ui.uiMouse) ui.uiMouse.classList.toggle("hidden", mouseTravado); });

        document.addEventListener("mousemove", e => {
            if (!mouseTravado || invAberto) return;
            playerGroup.rotation.y -= e.movementX * 0.002; cameraPivot.rotation.x -= e.movementY * 0.002;
            cameraPivot.rotation.x = Math.max(-1.2, Math.min(1.2, cameraPivot.rotation.x));
        });

        window.addEventListener("mousedown", e => {
            if (!mouseTravado || invAberto) return;
            const arma = arsenal[playerState.armaEquipada];
            if (e.button === 0) {
                if (arma.tipo === 'melee' && !playerState.atacando && playerState.stamina >= arma.custo) {
                    playerState.atacando = true; playerState.stamina -= arma.custo;
                    playerState.comboTimer > 0 ? playerState.combo++ : playerState.combo = 1;
                    playerState.comboTimer = 1.2; if(ui.lblCombo) ui.lblCombo.innerText = playerState.combo;
                    
                    let danoBase = Math.floor(arma.dano * (1 + (playerState.combo * 0.25)));
                    playerGroup.getWorldPosition(_vA); _fwd.set(0, 0, -1).applyQuaternion(playerGroup.quaternion);

                    inimigos.forEach(ini => {
                        if (!ini.vivo) return;
                        ini.mesh.getWorldPosition(_vB);
                        if (_vA.distanceToSquared(_vB) < arma.alcance * arma.alcance) { // Otimização na matemática de distância
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
                    const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
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
            let dropRate = Math.floor(Math.random() * 2) + 1;
            for(let i=0; i < dropRate; i++) {
                const drop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), matDrop);
                let rx = ini.mesh.position.x + (Math.random()-0.5)*2; let rz = ini.mesh.position.z + (Math.random()-0.5)*2;
                drop.position.set(rx, obterAlturaTerreno(rx, rz) + 0.2, rz);
                scene.add(drop); drops.push({mesh: drop, tipo: 'sucata'});
            }
        }

        function atualizarHUD() {
            if(ui.hpBar) ui.hpBar.style.width = `${playerState.hp}%`; 
            if(ui.stmBar) ui.stmBar.style.width = `${playerState.stamina}%`;
            if(ui.lblPocoes) ui.lblPocoes.innerText = playerState.pocoes; 
            if(ui.lblFlechas) ui.lblFlechas.innerText = playerState.flechas; 
            if(ui.lblItens) ui.lblItens.innerText = itensInv.length;
        }

        function atualizarUIInv() {
            if(!ui.gridInv) return;
            ui.gridInv.innerHTML = ""; let cont = {}; itensInv.forEach(i => cont[i] = (cont[i] || 0) + 1);
            Object.entries(cont).forEach(([item, qtd]) => {
                let div = document.createElement('div'); div.className = 'slot-item';
                div.innerHTML = `⚙️<div class="item-qtd">x${qtd}</div>`; ui.gridInv.appendChild(div);
            });
            while(ui.gridInv.children.length < 15) { let div = document.createElement('div'); div.className = 'slot-item'; ui.gridInv.appendChild(div); }
            atualizarHUD();
        }

        function logMsg(msg) { if(ui.log) ui.log.innerText = msg; }

        function checkColisaoObstaculos(pos) {
            for(let i = 0; i < obstaculos.length; i++) {
                let dx = pos.x - obstaculos[i].pos.x; let dz = pos.z - obstaculos[i].pos.z;
                if ((dx*dx + dz*dz) < obstaculos[i].raioSq) return true;
            }
            return false;
        }

        function animate() {
            stats.begin();
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1); 
            
            if (invAberto) { renderer.render(scene, camera); stats.end(); return; }

            if (mouseTravado) {
                if (!playerState.atacando && !playerState.defendendo && !playerState.dashing) { playerState.stamina = Math.min(100, playerState.stamina + (25 * dt)); atualizarHUD(); }
                if (playerState.comboTimer > 0) playerState.comboTimer -= dt; else if(playerState.combo > 0) { playerState.combo = 0; if(ui.lblCombo) ui.lblCombo.innerText = "0"; }
                if (playerState.dashTimer > 0) playerState.dashTimer -= dt; else { playerState.dashing = false; playerState.invulneravel = false; }
                
                if (playerState.atacando) { 
                    weaponHand.rotation.x -= arsenal[playerState.armaEquipada].vel * dt;
                    weaponHand.rotation.z -= arsenal[playerState.armaEquipada].vel * dt * 0.5;
                    if (weaponHand.rotation.x < -1.8) { playerState.atacando = false; weaponHand.rotation.x = 0; weaponHand.rotation.z = 0; } 
                }

                for(let i = projeteis.length - 1; i >= 0; i--) {
                    let p = projeteis[i]; p.mesh.position.addScaledVector(p.dir, 80 * dt); p.life -= dt;
                    let hit = checkColisaoObstaculos(p.mesh.position) || (p.mesh.position.y <= obterAlturaTerreno(p.mesh.position.x, p.mesh.position.z));
                    if(!hit) {
                        for (let j = 0; j < inimigos.length; j++) {
                            let ini = inimigos[j];
                            if(ini.vivo && p.mesh.position.distanceToSquared(ini.mesh.position) < 4.5) {
                                ini.hp -= arsenal[2].dano; logMsg(`> TIRO: ${arsenal[2].dano} DMG`);
                                if(ini.hp <= 0) abaterHostil(ini); hit = true; break;
                            }
                        }
                    }
                    if(p.life <= 0 || hit) { scene.remove(p.mesh); projeteis.splice(i, 1); }
                }

                _dir.set(0, 0, 0);
                if (teclado['w']) _dir.z -= 1; if (teclado['s']) _dir.z += 1;
                if (teclado['a']) _dir.x -= 1; if (teclado['d']) _dir.x += 1;
                _dir.normalize();

                let movendo = _dir.lengthSq() > 0;
                if (movendo) {
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
                    playerGroup.position.y = alturaChao;
                    playerState.velocityY = 0;
                    playerState.isGrounded = true;
                }

                if (movendo && playerState.isGrounded && !playerState.dashing) {
                    cameraPivot.position.y = 2.0 + Math.sin(clock.getElapsedTime() * 12) * 0.08;
                } else {
                    cameraPivot.position.y = 2.0;
                }

                playerGroup.getWorldPosition(_vA);

                for (let i = drops.length - 1; i >= 0; i--) {
                    let drop = drops[i]; drop.mesh.rotation.y += dt;
                    if (_vA.distanceToSquared(drop.mesh.position) < 6.0 && itensInv.length < 15) { 
                        itensInv.push(drop.tipo); scene.remove(drop.mesh); drops.splice(i, 1); 
                        logMsg("> SUCATA COLETADA."); atualizarHUD(); 
                    }
                }

                // AI loop simplificado (executa checagem de sobreposição com menos frequência)
                for (let j = 0; j < inimigos.length; j++) {
                    let ini = inimigos[j];
                    if (!ini.vivo) continue;
                    
                    ini.mesh.getWorldPosition(_vB); 
                    let distSq = _vA.distanceToSquared(_vB);
                    
                    // Só calcula a rotação se estiver no campo visual ativo da IA
                    if (distSq < 2500) ini.mesh.lookAt(playerGroup.position.x, ini.mesh.position.y, playerGroup.position.z);
                    
                    if (distSq > 10.0) { 
                        const oldX = ini.mesh.position.x; const oldZ = ini.mesh.position.z;
                        ini.mesh.translateZ(7 * dt); 
                        
                        // Executa repulsão apenas se os inimigos estiverem muito colados
                        for (let k = 0; k < inimigos.length; k++) {
                            if (j !== k && inimigos[k].vivo) {
                                let distOutro = ini.mesh.position.distanceToSquared(inimigos[k].mesh.position);
                                if (distOutro < 3.0) {
                                    ini.mesh.position.x += (ini.mesh.position.x - inimigos[k].mesh.position.x) * dt;
                                    ini.mesh.position.z += (ini.mesh.position.z - inimigos[k].mesh.position.z) * dt;
                                }
                            }
                        }

                        ini.mesh.position.y = obterAlturaTerreno(ini.mesh.position.x, ini.mesh.position.z);
                        if (checkColisaoObstaculos(ini.mesh.position)) { ini.mesh.position.x = oldX; ini.mesh.position.z = oldZ; }
                    } else {
                        if (ini.cooldown > 0) ini.cooldown -= dt;
                        else {
                            ini.cooldown = 1.2;
                            if (playerState.invulneravel) logMsg("> ESQUIVOU."); 
                            else if (playerState.defendendo) { playerState.hp -= 8; playerState.stamina -= 20; logMsg("> BLOQUEIO."); } 
                            else { playerState.hp -= 30; logMsg("> DANO SOFRIDO."); }
                            atualizarHUD();
                            if (playerState.hp <= 0) { logMsg("> MORTO. REINICIANDO..."); setTimeout(()=>location.reload(), 2000); }
                        }
                    }
                }
            }
            renderer.render(scene, camera);
            stats.end();
        }

        window.addEventListener('resize', () => { 
            camera.aspect = window.innerWidth / window.innerHeight; 
            camera.updateProjectionMatrix(); 
            renderer.setSize(window.innerWidth, window.innerHeight); 
        });
        
        animate();
    }
})();
