const config = { sens: 0.002, wireframe: false };
let scene, camera, renderer, player, enemy, clock;

document.getElementById('btn-iniciar').addEventListener('click', () => {
    document.getElementById('tela-inicial').classList.add('hidden');
    init();
});

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    clock = new THREE.Clock();
    
    // Adicionar elementos básicos (chão, luzes, jogador)
    setupScene();
    
    animate();
}

function setupScene() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light, new THREE.AmbientLight(0x404040));
    
    // Exemplo de jogador simplificado
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    player = new THREE.Mesh(geometry, material);
    scene.add(player);
    
    camera.position.z = 5;
    document.getElementById('game-hud').classList.remove('hidden');
    document.getElementById('reticula').classList.remove('hidden');
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    // Lógica de update otimizada aqui
    
    renderer.render(scene, camera);
}

// Tratamento de janelas redimensionadas
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
