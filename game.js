(function() {
    "use strict";

    // Configurações Globais
    const config = { sensibilidade: 0.0022, gravidade: 9.8 };
    const state = { 
        mouseLocked: false, inventoryOpen: false, gameOver: false,
        lastTime: 0, player: { hp: 100, stamina: 100, combo: 0, pocoes: 3 }
    };

    let scene, camera, renderer, playerGroup, cameraPivot, clock;
    let inimigos = [], drops = [], teclado = {};

    // Início do Jogo
    window.addEventListener('DOMContentLoaded', () => {
        document.getElementById("btn-iniciar").addEventListener("click", () => {
            document.getElementById("tela-inicial").style.opacity = "0";
            setTimeout(() => {
                document.getElementById("tela-inicial").classList.add("hidden");
                inicializar();
            }, 500);
        });
    });

    function inicializar() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0c10);
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        clock = new THREE.Clock();
        
        // Elementos Básicos
        scene.add(new THREE.AmbientLight(0x202040, 1.5));
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(10, 20, 10);
        light.castShadow = true;
        scene.add(light);

        // Chão
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Jogador
        playerGroup = new THREE.Group();
        cameraPivot = new THREE.Group();
        cameraPivot.position.set(0, 2, 0);
        camera.position.set(0, 0, 5);
        playerGroup.add(cameraPivot);
        cameraPivot.add(camera);
        scene.add(playerGroup);

        // Controles e Eventos
        window.addEventListener('keydown', e => teclado[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => teclado[e.key.toLowerCase()] = false);
        
        document.addEventListener('pointerlockchange', () => {
            state.mouseLocked = (document.pointerLockElement === document.body);
        });

        document.body.addEventListener('click', () => {
            if (!state.mouseLocked && !state.inventoryOpen) document.body.requestPointerLock();
        });

        animate();
    }

    function animate() {
        if (state.gameOver) return;
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        if (state.mouseLocked && !state.inventoryOpen) {
            updatePlayer(delta);
            updateAI(delta);
        }

        renderer.render(scene, camera);
    }

    function updatePlayer(delta) {
        const speed = 10 * delta;
        if (teclado['w']) playerGroup.translateZ(-speed);
        if (teclado['s']) playerGroup.translateZ(speed);
        if (teclado['a']) playerGroup.translateX(-speed);
        if (teclado['d']) playerGroup.translateX(speed);
    }

    function updateAI(delta) {
        // Lógica de perseguição dos inimigos
        inimigos.forEach(inimigo => {
            if (!inimigo.mesh) return;
            inimigo.mesh.lookAt(playerGroup.position);
            // Adicionar movimento em direção ao jogador...
        });
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();
