// --- 1. Audio System (Sparkle Sound) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSparkle() {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    // Play a quick, high-pitched chime (C6, E6, G6)
    [1046.5, 1318.5, 1568.0].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i*0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.04 + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i*0.04);
        osc.stop(now + i*0.04 + 0.2);
    });
}

// --- 2. Game Logic Manager ---
const gameManager = {
    state: 'SETUP',
    totalPlayers: 0,
    players: [],
    currentPlayerIndex: 0,
    score: 0,
    startTime: 0,
    roundDuration: 60,
    timerInterval: null,

    setTotalPlayers: () => {
        const num = parseInt(document.getElementById('input-players').value) || 1;
        gameManager.totalPlayers = num;
        gameManager.switchScreen('screen-name');
        gameManager.updateNameScreen();
    },

    updateNameScreen: () => {
        document.getElementById('player-title').innerText = `Player ${gameManager.currentPlayerIndex + 1}`;
        document.getElementById('input-name').value = `Player ${gameManager.currentPlayerIndex + 1}`;
    },

    startGame: () => {
        const name = document.getElementById('input-name').value;
        gameManager.players[gameManager.currentPlayerIndex] = { name: name, time: 999 };
        
        gameManager.switchScreen(null); // Hide panels
        document.getElementById('hud').style.display = 'flex';
        
        scene3D.resetShapes();
        gameManager.score = 0;
        gameManager.updateHUD();
        gameManager.startTime = Date.now();
        
        let timeLeft = gameManager.roundDuration;
        document.getElementById('hud-timer').innerText = `${timeLeft}s`;
        
        gameManager.timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('hud-timer').innerText = `${timeLeft}s`;
            if (timeLeft <= 0) {
                gameManager.endRound(false);
            }
        }, 1000);
    },

    handleScore: () => {
        gameManager.score++;
        gameManager.updateHUD();
        playSparkle();
        if (gameManager.score >= 5) { // Changed to 5 for 5 shapes
            gameManager.endRound(true);
        }
    },

    updateHUD: () => {
        document.getElementById('hud-score').innerText = `${gameManager.score}/5`;
    },

    endRound: (completed) => {
        clearInterval(gameManager.timerInterval);
        const timeTaken = (Date.now() - gameManager.startTime) / 1000;
        gameManager.players[gameManager.currentPlayerIndex].time = completed ? timeTaken : 60;

        gameManager.currentPlayerIndex++;
        if (gameManager.currentPlayerIndex < gameManager.totalPlayers) {
            gameManager.switchScreen('screen-name');
            gameManager.updateNameScreen();
        } else {
            gameManager.showLeaderboard();
        }
        document.getElementById('hud').style.display = 'none';
    },

    showLeaderboard: () => {
        gameManager.switchScreen('screen-leaderboard');
        const sorted = [...gameManager.players].sort((a, b) => a.time - b.time);
        const podium = document.getElementById('podium');
        podium.innerHTML = '';
        
        const order = [1, 0, 2];
        order.forEach(idx => {
            if (sorted[idx]) {
                const p = sorted[idx];
                const div = document.createElement('div');
                div.className = `podium-step rank-${idx+1}`;
                div.innerHTML = `
                    <div class="name">${p.name}</div>
                    <div class="time">${p.time.toFixed(1)}s</div>
                    <div class="bar">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                `;
                podium.appendChild(div);
            }
        });
    },

    switchScreen: (id) => {
        document.querySelectorAll('.glass-panel').forEach(el => el.classList.remove('active'));
        if(id) document.getElementById(id).classList.add('active');
    },
    
    restart: () => {
        location.reload();
    }
};

//Event Listeners
document.getElementById('btn-start').onclick = gameManager.setTotalPlayers;
document.getElementById('btn-play').onclick = gameManager.startGame;
document.getElementById('btn-restart-panel').onclick = gameManager.restart;
document.getElementById('btn-restart-hud').onclick = gameManager.restart;

// --- 3. Three.js Scene Setup ---
const scene = new THREE.Scene();
// Adjust camera to look at center
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(2, 5, 5);
scene.add(dirLight);

// Materials (Bauhaus Colors)
const matRed = new THREE.MeshStandardMaterial({ color: 0xE94D36, roughness: 0.4 });
const matBlue = new THREE.MeshStandardMaterial({ color: 0x2B5699, roughness: 0.4 });
const matYellow = new THREE.MeshStandardMaterial({ color: 0xF2C223, roughness: 0.4 });
const matIcon = new THREE.MeshBasicMaterial({ color: 0x2B5699 }); // Dark blue for icons
const matBox = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 });

// Target Boxes (Centered Row)
const targets = [];
function createBox(x, type, iconGeo) {
    const group = new THREE.Group();
    group.position.set(x, 0, 0); // Centered Y
    
    // Box
    const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const mesh = new THREE.Mesh(boxGeo, matBox);
    group.add(mesh);

    // Icon on front
    const icon = new THREE.Mesh(iconGeo, matIcon);
    icon.position.z = 0.61; // Slightly in front
    group.add(icon);

    scene.add(group);
    targets.push({ x: x, type: type, mesh: group });
}

// Create icons geometry
const triangleGeo = new THREE.CircleGeometry(0.3, 3);
const squareGeo = new THREE.PlaneGeometry(0.5, 0.5);
const circleGeo = new THREE.CircleGeometry(0.3, 32);

// Place boxes centered horizontally
createBox(-1.5, 'cone', triangleGeo);
createBox(0, 'cube', squareGeo);
createBox(1.5, 'sphere', circleGeo);

// Shapes Logic
let shapes = [];
let particles = [];
const shapeTypes = [
    { type: 'cube', mat: matBlue, geo: new THREE.BoxGeometry(0.6, 0.6, 0.6) }, // Blue Cube
    { type: 'cone', mat: matRed, geo: new THREE.ConeGeometry(0.35, 0.7, 32) }, // Red Cone
    { type: 'sphere', mat: matYellow, geo: new THREE.SphereGeometry(0.35, 32, 32) }, // Yellow Sphere
    { type: 'cone', mat: matRed, geo: new THREE.ConeGeometry(0.35, 0.7, 4) }, // Red Pyramid
    { type: 'cube', mat: matBlue, geo: new THREE.CylinderGeometry(0.35, 0.35, 0.6, 32) } // Blue Cylinder
    // Add more shapes as needed, matching the image style
];

const scene3D = {
    resetShapes: () => {
        shapes.forEach(s => scene.remove(s.mesh));
        shapes = [];
        
        // Create 5 shapes in a row, centered above boxes
        const startX = -2;
        const gap = 1;
        for (let i = 0; i < 5; i++) {
            const typeData = shapeTypes[i % shapeTypes.length];
            const mesh = new THREE.Mesh(typeData.geo, typeData.mat);
            
            const startPos = new THREE.Vector3(startX + i*gap, 2, 0);
            mesh.position.copy(startPos);
            
            scene.add(mesh);
            shapes.push({
                mesh: mesh,
                type: typeData.type,
                basePos: startPos,
                isGrabbed: false,
                active: true
            });
        }
    },
    
    explode: (pos, color) => {
        for(let i=0; i<12; i++) {
            const pGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
            const pMat = new THREE.MeshBasicMaterial({ color: color });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(pos);
            
            scene.add(pMesh);
            particles.push({
                mesh: pMesh,
                vel: new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2),
                life: 1.0
            });
        }
    }
};

// Cursor
const cursor = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.14, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
);
scene.add(cursor);

// --- 4. MediaPipe & Hand Tracking ---
let handLandmarker = null;
let isPinching = false;

async function initVision() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
    });
    startCamera();
}

async function startCamera() {
    const video = document.getElementById('webcam');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
}

let lastVideoTime = -1;
function predictWebcam() {
    const video = document.getElementById('webcam');
    const now = performance.now();
    
    if (video.currentTime !== lastVideoTime && handLandmarker) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, now);
        
        if (results.landmarks && results.landmarks.length > 0) {
            const lm = results.landmarks[0];
            const index = lm[8];
            const thumb = lm[4];

            // Map Screen to World Coordinates
            const aspect = window.innerWidth / window.innerHeight;
            const fov = camera.fov * (Math.PI / 180);
            const height = 2 * Math.tan(fov / 2) * camera.position.z;
            const width = height * aspect;

            // Flip X for mirrored video
            const x = (0.5 - index.x) * width;
            const y = (0.5 - index.y) * height;
            
            cursor.position.set(x, y, 0);

            // Pinch Calc
            const dist = Math.sqrt(Math.pow(index.x - thumb.x, 2) + Math.pow(index.y - thumb.y, 2));
            isPinching = dist < 0.08;

            cursor.material.color.setHex(isPinching ? 0xE94D36 : 0xffffff);

            updateInteraction(x, y, isPinching);
        }
    }
    requestAnimationFrame(predictWebcam);
}

function updateInteraction(cx, cy, pinching) {
    shapes.forEach(s => {
        if (!s.active) return;

        if (s.isGrabbed) {
            if (pinching) {
                // Dragging
                s.mesh.position.lerp(cursor.position, 0.2);
                s.mesh.position.z = 1;
                s.mesh.rotation.x = 0.3;
                s.mesh.rotation.z = 0.3;
            } else {
                // Released
                s.isGrabbed = false;
                checkDrop(s);
            }
        } else {
            const dist = s.mesh.position.distanceTo(cursor.position);
            // Hovering
            if (pinching && dist < 0.8) {
                s.isGrabbed = true;
            } else {
                // Return
                s.mesh.position.lerp(s.basePos, 0.1);
                s.mesh.position.z = 0;
                s.mesh.rotation.set(0,0,0);
            }
        }
    });
}

function checkDrop(shape) {
    targets.forEach(t => {
        const dx = Math.abs(shape.mesh.position.x - t.x);
        const dy = Math.abs(shape.mesh.position.y - t.mesh.position.y);
        
        if (dx < 0.8 && dy < 0.8) {
            // Simple type matching (cone->triangle icon, cube->square icon, etc.)
            let match = false;
            if(shape.type === 'cone' && t.type === 'cone') match = true;
            if(shape.type === 'cube' && t.type === 'cube') match = true;
            if(shape.type === 'sphere' && t.type === 'sphere') match = true;

            if (match) {
                scene3D.explode(shape.mesh.position, shape.mesh.material.color);
                scene.remove(shape.mesh);
                shape.active = false;
                gameManager.handleScore();
                
                // Bounce Box
                t.mesh.scale.set(1.1, 1.1, 1.1);
                setTimeout(() => t.mesh.scale.set(1, 1, 1), 200);
            }
        }
    });
}

// --- 5. Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.mesh.scale.multiplyScalar(0.92);
        p.life -= 0.05;
        if(p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

initVision();
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});