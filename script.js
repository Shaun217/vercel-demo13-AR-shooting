// --- 1. Audio (Cute Pop Sound) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playPop() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

// --- 2. Game Logic ---
const game = {
    state: 'SETUP',
    players: [],
    currIdx: 0,
    score: 0,
    startTime: 0,
    timer: null,

    init: () => {
        document.getElementById('btn-start').onclick = game.setupPlayers;
        document.getElementById('btn-play').onclick = game.startRound;
        document.getElementById('btn-restart-panel').onclick = () => location.reload();
    },

    setupPlayers: () => {
        const count = parseInt(document.getElementById('input-players').value) || 1;
        game.totalPlayers = count;
        game.switchScreen('screen-name');
        game.updateTitle();
    },

    updateTitle: () => {
        document.getElementById('player-title').innerText = `Player ${game.currIdx + 1}`;
        document.getElementById('input-name').value = `Player ${game.currIdx + 1}`;
    },

    startRound: () => {
        const name = document.getElementById('input-name').value;
        game.players[game.currIdx] = { name, time: 999 };
        
        game.switchScreen(null); // Clear UI
        document.getElementById('hud').style.display = 'flex';
        
        scene3D.spawnShapes();
        game.score = 0;
        document.getElementById('hud-score').innerText = `0/10`;
        game.startTime = Date.now();
        
        let timeLeft = 60;
        document.getElementById('hud-timer').innerText = `${timeLeft}s`;
        
        game.timer = setInterval(() => {
            timeLeft--;
            document.getElementById('hud-timer').innerText = `${timeLeft}s`;
            if(timeLeft <= 0) game.endRound(false);
        }, 1000);
    },

    scorePoint: () => {
        game.score++;
        document.getElementById('hud-score').innerText = `${game.score}/10`;
        playPop();
        if(game.score >= 10) game.endRound(true);
    },

    endRound: (completed) => {
        clearInterval(game.timer);
        const time = completed ? (Date.now() - game.startTime)/1000 : 60;
        game.players[game.currIdx].time = time;
        
        game.currIdx++;
        if(game.currIdx < game.totalPlayers) {
            game.switchScreen('screen-name');
            game.updateTitle();
        } else {
            game.showLeaderboard();
        }
        document.getElementById('hud').style.display = 'none';
    },

    showLeaderboard: () => {
        game.switchScreen('screen-leaderboard');
        const sorted = [...game.players].sort((a,b) => a.time - b.time);
        const podium = document.getElementById('podium');
        podium.innerHTML = '';
        
        const order = [1, 0, 2];
        order.forEach(i => {
            if(sorted[i]) {
                const p = sorted[i];
                const div = document.createElement('div');
                div.className = `podium-step rank-${i+1}`;
                div.innerHTML = `
                    <div class="name">${p.name}</div>
                    <div class="bar"></div>
                    <div>${p.time.toFixed(1)}s</div>
                `;
                podium.appendChild(div);
            }
        });
    },

    switchScreen: (id) => {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        if(id) document.getElementById(id).classList.add('active');
    }
};

// --- 3. Three.js Scene & Interaction ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2c2c34'); // Match CSS background

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 100);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting (Soft Studio Light)
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Materials (Matte Clay Look)
const matParams = { roughness: 0.7, metalness: 0.0 };
const matBlue = new THREE.MeshStandardMaterial({ color: '#86C1E3', ...matParams });
const matPink = new THREE.MeshStandardMaterial({ color: '#FF8BA7', ...matParams });
const matYellow = new THREE.MeshStandardMaterial({ color: '#F9D56E', ...matParams });
const matWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', ...matParams });
const matDark = new THREE.MeshStandardMaterial({ color: '#333344', ...matParams });

// Targets (White Rounded Boxes with Icons)
const targets = [];
function createTarget(x, type) {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);

    // White Box
    const geo = new THREE.BoxGeometry(2, 2, 0.5);
    const mesh = new THREE.Mesh(geo, matWhite);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Icon
    let iconGeo;
    if(type === 'cube') iconGeo = new THREE.PlaneGeometry(0.8, 0.8); // Square
    if(type === 'cone') iconGeo = new THREE.CircleGeometry(0.6, 3); // Triangle
    if(type === 'sphere') iconGeo = new THREE.CircleGeometry(0.5, 32); // Circle
    
    const icon = new THREE.Mesh(iconGeo, matDark);
    icon.position.z = 0.26;
    if(type === 'cone') icon.rotation.z = Math.PI; // Adjust triangle orientation
    group.add(icon);

    scene.add(group);
    targets.push({ x, type, mesh: group });
}

// Position targets like the image: Square, Triangle, Circle
createTarget(-3, 'cone'); 
createTarget(0, 'cube');
createTarget(3, 'sphere');

// Shapes
let shapes = [];
let particles = [];
const shapeTypes = [
    { type: 'cube', geo: new THREE.BoxGeometry(0.8, 0.8, 0.8), mat: matBlue },
    { type: 'cone', geo: new THREE.ConeGeometry(0.5, 1, 32), mat: matPink },
    { type: 'sphere', geo: new THREE.SphereGeometry(0.5, 32, 32), mat: matYellow }
];

const scene3D = {
    spawnShapes: () => {
        // Clear old
        shapes.forEach(s => scene.remove(s.mesh));
        shapes = [];

        // Spawn 10 shapes in a row above targets
        for(let i=0; i<10; i++) {
            const data = shapeTypes[Math.floor(Math.random() * 3)];
            const mesh = new THREE.Mesh(data.geo, data.mat);
            mesh.castShadow = true;
            
            // Random scatter start position
            const startX = (Math.random() - 0.5) * 8;
            const startY = 3 + Math.random() * 2;
            
            mesh.position.set(startX, startY, 0);
            mesh.rotation.set(Math.random(), Math.random(), 0);
            
            scene.add(mesh);
            shapes.push({ mesh, type: data.type, active: true });
        }
    },

    explode: (pos, color) => {
        for(let i=0; i<8; i++) {
            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const mat = new THREE.MeshBasicMaterial({ color });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            scene.add(p);
            particles.push({ 
                mesh: p, 
                vel: new THREE.Vector3((Math.random()-.5)*0.3, (Math.random()-.5)*0.3, 0),
                life: 1.0 
            });
        }
    }
};

// --- 4. Mouse Interaction (Raycaster) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 plane
let draggedObject = null;
let offset = new THREE.Vector3();

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (draggedObject) {
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersectPoint);
        draggedObject.mesh.position.copy(intersectPoint.sub(offset));
        draggedObject.mesh.position.z = 1; // Lift up a bit
        // Tilt effect
        draggedObject.mesh.rotation.x = (draggedObject.mesh.position.y - intersectPoint.y) * 2;
        draggedObject.mesh.rotation.z = (draggedObject.mesh.position.x - intersectPoint.x) * 2;
    }
});

window.addEventListener('mousedown', () => {
    const intersects = raycaster.intersectObjects(shapes.map(s => s.mesh));
    if (intersects.length > 0) {
        const hit = intersects[0].object;
        const shape = shapes.find(s => s.mesh === hit);
        if (shape && shape.active) {
            draggedObject = shape;
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, intersectPoint);
            offset.copy(intersectPoint).sub(hit.position);
        }
    }
});

window.addEventListener('mouseup', () => {
    if (draggedObject) {
        checkDrop(draggedObject);
        draggedObject = null;
    }
});

// Touch Support (Simple mapping)
window.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(shapes.map(s => s.mesh));
    if (intersects.length > 0) {
        const hit = intersects[0].object;
        const shape = shapes.find(s => s.mesh === hit);
        if(shape && shape.active) {
            draggedObject = shape;
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, intersectPoint);
            offset.copy(intersectPoint).sub(hit.position);
        }
    }
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if(draggedObject) {
        const touch = e.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersectPoint);
        draggedObject.mesh.position.copy(intersectPoint.sub(offset));
    }
}, {passive: false});

window.addEventListener('touchend', () => {
    if(draggedObject) {
        checkDrop(draggedObject);
        draggedObject = null;
    }
});

function checkDrop(shape) {
    let dropped = false;
    targets.forEach(t => {
        // Distance check
        const dist = shape.mesh.position.distanceTo(new THREE.Vector3(t.x, 0, 0));
        if (dist < 1.2 && shape.type === t.type) {
            // Success
            scene3D.explode(shape.mesh.position, shape.mesh.material.color);
            scene.remove(shape.mesh);
            shape.active = false;
            game.scorePoint();
            dropped = true;
            // Target animation
            t.mesh.scale.set(1.1, 1.1, 1.1);
            setTimeout(() => t.mesh.scale.set(1, 1, 1), 150);
        }
    });

    if (!dropped) {
        // Bounce back if wrong
        shape.mesh.position.z = 0;
    }
}

// --- 5. Loop ---
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate shapes slightly
    shapes.forEach(s => {
        if(s.active && s !== draggedObject) {
            s.mesh.rotation.y += 0.01;
        }
    });

    // Particles
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.mesh.scale.multiplyScalar(0.9);
        p.life -= 0.05;
        if(p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i,1);
        }
    }

    renderer.render(scene, camera);
}

// Init
game.init();
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});