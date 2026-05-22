(function() {
    "use strict";

    // [Mantive a estrutura de inicialização igual ao anterior]
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
        // [Configuração de cena, câmera e luzes mantidas...]
        const scene = new THREE.Scene();
        const corCeu = 0x87CEEB; scene.background = new THREE.Color(corCeu); 
        scene.fog = new THREE.FogExp2(corCeu, 0.008);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // [Instanciamento de árvores e terreno igual ao anterior...]
        // ... (código de terreno e arvores omitido para foco no inimigo)

        // --- MODELO DE INIMIGO REALISTA (Corpo Humano Esquemático) ---
        const matInimigo = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });

        function criarSoldado() {
            const grupo = new THREE.Group();
            
            // Tronco
            const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), matInimigo);
            tronco.position.y = 1.2; grupo.add(tronco);
            
            // Cabeça
            const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), matInimigo);
            cabeca.position.y = 2.0; grupo.add(cabeca);
            
            // Braços
            const bracoE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), matInimigo);
            bracoE.position.set(-0.5, 1.2, 0); grupo.add(bracoE);
            const bracoD = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), matInimigo);
            bracoD.position.set(0.5, 1.2, 0); grupo.add(bracoD);
            
            // Pernas
            const pernaE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), matInimigo);
            pernaE.position.set(-0.2, 0.4, 0); grupo.add(pernaE);
            const pernaD = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.2), matInimigo);
            pernaD.position.set(0.2, 0.4, 0); grupo.add(pernaD);
            
            return grupo;
        }

        let inimigos = [];
        
        // --- SPAWN ESPALHADO PELO MAPA ---
        for(let i = 0; i < 20; i++) {
            const soldado = criarSoldado();
            const angulo = Math.random() * Math.PI * 2;
            const distancia = 50 + Math.random() * 150;
            const x = Math.cos(angulo) * distancia;
            const z = Math.sin(angulo) * distancia;
            const y = 0; // O cálculo de altura será feito no loop de animação
            
            soldado.position.set(x, y, z);
            scene.add(soldado);
            inimigos.push({ mesh: soldado, hp: 100, vivo: true, cooldown: 0 });
        }

        // [O restante do código (movimentação, tiro, inventário) continua o mesmo]
        // Dica: No loop de animação, certifique-se de chamar obterAlturaTerreno 
        // para inimigo.mesh.position.y = obterAlturaTerreno(...) para que fiquem no chão.
        
        // Loop de renderização necessário para rodar tudo...
        function animate() {
            requestAnimationFrame(animate);
            // ... (logica de jogo)
            renderer.render(scene, camera);
        }
        animate();
    }
})();
