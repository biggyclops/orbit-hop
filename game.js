(function() {
    'use strict';

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    // Game constants
    const TOTAL_PLANETS = 12;
    const BASE_ORBIT_SPEED = 0.025;
    const SPEED_INCREASE = 0.004;
    const BASE_DISTANCE = 280;
    const DISTANCE_INCREASE = 25;
    const CAPTURE_RADIUS = 90;
    const ORBIT_RADIUS = 50;
    const PLANET_RADIUS = 30;
    const MOON_RADIUS = 8;
    const MOON_SPEED = 6;
    const BEACON_RADIUS = 45;

    // Colors (neon palette)
    const COLORS = {
        bg: '#0a0a12',
        moon: '#00ffff',
        moonGlow: 'rgba(0, 255, 255, 0.3)',
        planet: '#ff00ff',
        planetGlow: 'rgba(255, 0, 255, 0.2)',
        orbit: 'rgba(255, 0, 255, 0.15)',
        beacon: '#ffff00',
        beaconGlow: 'rgba(255, 255, 0, 0.3)',
        comet: '#ff6600',
        cometGlow: 'rgba(255, 102, 0, 0.4)',
        text: '#ffffff',
        textGlow: 'rgba(255, 255, 255, 0.5)',
        star: '#ffffff',
        trajectory: 'rgba(0, 255, 255, 0.3)'
    };

    // Game state
    let state = 'start'; // start, playing, win, lose
    let planetsLanded = 0;
    let bestScore = parseInt(localStorage.getItem('orbitHopBest')) || 0;
    let planets = [];
    let moon = null;
    let comet = null;
    let cometTimer = 0;
    let cameraX = 0;
    let cameraY = 0;
    let stars = [];
    let screenShake = 0;
    let particles = [];

    // Canvas sizing
    let width, height, dpr;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        generateStars();
    }

    function generateStars() {
        stars = [];
        const starCount = Math.floor((width * height) / 8000);
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width * 3 - width,
                y: Math.random() * height * 3 - height,
                size: Math.random() * 1.5 + 0.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01
            });
        }
    }

    function initGame() {
        planetsLanded = 0;
        planets = [];
        particles = [];
        comet = null;
        cometTimer = 3000 + Math.random() * 4000;

        // First planet at center of screen
        planets.push({
            x: width / 2,
            y: height / 2,
            radius: PLANET_RADIUS,
            orbitSpeed: BASE_ORBIT_SPEED,
            hue: 300
        });

        // Generate all planets ahead
        for (let i = 1; i <= TOTAL_PLANETS; i++) {
            const prev = planets[i - 1];
            const angle = (Math.random() - 0.5) * Math.PI * 0.8 + (i % 2 === 0 ? 0 : Math.PI * 0.1);
            const distance = BASE_DISTANCE + i * DISTANCE_INCREASE;
            planets.push({
                x: prev.x + Math.cos(angle) * distance,
                y: prev.y + Math.sin(angle) * distance,
                radius: i === TOTAL_PLANETS ? BEACON_RADIUS : PLANET_RADIUS,
                orbitSpeed: BASE_ORBIT_SPEED + i * SPEED_INCREASE,
                isBeacon: i === TOTAL_PLANETS,
                hue: i === TOTAL_PLANETS ? 60 : (300 + i * 20) % 360
            });
        }

        // Moon starts orbiting first planet
        moon = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            angle: Math.random() * Math.PI * 2,
            orbiting: planets[0],
            orbitIndex: 0,
            riding: null,
            rideTimer: 0
        };

        updateMoonOrbit();
        cameraX = 0;
        cameraY = 0;
    }

    function updateMoonOrbit() {
        if (moon.orbiting) {
            moon.x = moon.orbiting.x + Math.cos(moon.angle) * ORBIT_RADIUS;
            moon.y = moon.orbiting.y + Math.sin(moon.angle) * ORBIT_RADIUS;
        }
    }

    function release() {
        if (state !== 'playing' || !moon.orbiting) return;

        // Tangent direction (perpendicular to radius)
        const tangentAngle = moon.angle + Math.PI / 2;
        moon.vx = Math.cos(tangentAngle) * MOON_SPEED;
        moon.vy = Math.sin(tangentAngle) * MOON_SPEED;
        moon.orbiting = null;

        // Add release particles
        for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            particles.push({
                x: moon.x,
                y: moon.y,
                vx: Math.cos(a) * 2 + moon.vx * 0.3,
                vy: Math.sin(a) * 2 + moon.vy * 0.3,
                life: 1,
                color: COLORS.moon
            });
        }
    }

    function spawnComet() {
        const side = Math.floor(Math.random() * 4);
        const targetPlanet = planets[Math.min(planetsLanded + 1, planets.length - 1)];
        let x, y, vx, vy;

        // Comet comes from off-screen, heading roughly toward player area
        const speed = 4 + Math.random() * 2;
        const targetX = targetPlanet.x + (Math.random() - 0.5) * 300;
        const targetY = targetPlanet.y + (Math.random() - 0.5) * 300;

        if (side === 0) { // top
            x = cameraX + Math.random() * width;
            y = cameraY - 100;
        } else if (side === 1) { // right
            x = cameraX + width + 100;
            y = cameraY + Math.random() * height;
        } else if (side === 2) { // bottom
            x = cameraX + Math.random() * width;
            y = cameraY + height + 100;
        } else { // left
            x = cameraX - 100;
            y = cameraY + Math.random() * height;
        }

        const angle = Math.atan2(targetY - y, targetX - x);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;

        comet = { x, y, vx, vy, trail: [] };
    }

    function update(dt) {
        if (state !== 'playing') return;

        // Update moon
        if (moon.orbiting) {
            moon.angle += moon.orbiting.orbitSpeed;
            updateMoonOrbit();
        } else if (moon.riding) {
            // Riding comet
            moon.x = moon.riding.x;
            moon.y = moon.riding.y;
            moon.rideTimer -= dt;
            if (moon.rideTimer <= 0) {
                // Release from comet
                moon.vx = moon.riding.vx * 1.2;
                moon.vy = moon.riding.vy * 1.2;
                moon.riding = null;
            }
        } else {
            // Flying through space
            moon.x += moon.vx;
            moon.y += moon.vy;

            // Check capture by next planets
            for (let i = moon.orbitIndex + 1; i < planets.length; i++) {
                const p = planets[i];
                const dx = p.x - moon.x;
                const dy = p.y - moon.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CAPTURE_RADIUS) {
                    // Captured!
                    moon.orbiting = p;
                    moon.orbitIndex = i;
                    moon.angle = Math.atan2(moon.y - p.y, moon.x - p.x);
                    planetsLanded = i;

                    // Update best score
                    if (planetsLanded > bestScore) {
                        bestScore = planetsLanded;
                        localStorage.setItem('orbitHopBest', bestScore);
                    }

                    // Win condition
                    if (p.isBeacon) {
                        state = 'win';
                        screenShake = 20;
                    } else {
                        screenShake = 10;
                    }

                    // Capture particles
                    for (let j = 0; j < 15; j++) {
                        const a = Math.random() * Math.PI * 2;
                        particles.push({
                            x: moon.x,
                            y: moon.y,
                            vx: Math.cos(a) * 3,
                            vy: Math.sin(a) * 3,
                            life: 1,
                            color: `hsl(${p.hue}, 100%, 60%)`
                        });
                    }
                    break;
                }
            }

            // Check if moon drifted off screen (lose)
            if (!moon.orbiting) {
                const margin = 200;
                const offLeft = moon.x < cameraX - margin;
                const offRight = moon.x > cameraX + width + margin;
                const offTop = moon.y < cameraY - margin;
                const offBottom = moon.y > cameraY + height + margin;

                if (offLeft || offRight || offTop || offBottom) {
                    state = 'lose';
                    screenShake = 15;
                }
            }
        }

        // Comet logic
        if (comet) {
            comet.x += comet.vx;
            comet.y += comet.vy;
            comet.trail.unshift({ x: comet.x, y: comet.y });
            if (comet.trail.length > 20) comet.trail.pop();

            // Check if moon touches comet (while flying)
            if (!moon.orbiting && !moon.riding) {
                const dx = comet.x - moon.x;
                const dy = comet.y - moon.y;
                if (Math.sqrt(dx * dx + dy * dy) < 25) {
                    moon.riding = comet;
                    moon.rideTimer = 1000; // 1 second ride
                    screenShake = 8;
                }
            }

            // Remove comet if off screen
            const margin = 300;
            if (comet.x < cameraX - margin || comet.x > cameraX + width + margin ||
                comet.y < cameraY - margin || comet.y > cameraY + height + margin) {
                comet = null;
            }
        } else {
            cometTimer -= dt;
            if (cometTimer <= 0) {
                spawnComet();
                cometTimer = 5000 + Math.random() * 6000;
            }
        }

        // Camera follows moon toward next planet
        let targetX, targetY;
        const nextPlanet = planets[Math.min(moon.orbitIndex + 1, planets.length - 1)];
        const currentCenter = moon.orbiting || { x: moon.x, y: moon.y };

        // Blend between current position and next planet
        targetX = (currentCenter.x + nextPlanet.x) / 2 - width / 2;
        targetY = (currentCenter.y + nextPlanet.y) / 2 - height / 2;

        cameraX += (targetX - cameraX) * 0.05;
        cameraY += (targetY - cameraY) * 0.05;

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Screen shake decay
        if (screenShake > 0) screenShake *= 0.9;

        // Update star twinkle
        for (const star of stars) {
            star.twinkle += star.speed;
        }
    }

    function drawGlow(x, y, radius, color) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        // Apply screen shake
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;

        ctx.save();
        ctx.translate(-cameraX + shakeX, -cameraY + shakeY);

        // Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(cameraX - 10, cameraY - 10, width + 20, height + 20);

        // Stars (parallax)
        for (const star of stars) {
            const parallax = 0.3;
            const sx = star.x - cameraX * parallax;
            const sy = star.y - cameraY * parallax;
            
            // Wrap stars
            const wx = ((sx % (width * 2)) + width * 2) % (width * 2) + cameraX - width * 0.5;
            const wy = ((sy % (height * 2)) + height * 2) % (height * 2) + cameraY - height * 0.5;

            const alpha = 0.3 + Math.sin(star.twinkle) * 0.3 + 0.4;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(wx, wy, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw planets
        for (let i = 0; i < planets.length; i++) {
            const p = planets[i];
            const screenX = p.x;
            const screenY = p.y;

            // Only draw if on screen (with margin)
            if (screenX < cameraX - 200 || screenX > cameraX + width + 200 ||
                screenY < cameraY - 200 || screenY > cameraY + height + 200) continue;

            // Orbit ring (only for non-beacon, non-landed planets)
            if (!p.isBeacon && i > moon.orbitIndex) {
                ctx.strokeStyle = COLORS.orbit;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 10]);
                ctx.beginPath();
                ctx.arc(screenX, screenY, CAPTURE_RADIUS, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Glow
            const glowColor = p.isBeacon ? COLORS.beaconGlow : COLORS.planetGlow;
            drawGlow(screenX, screenY, p.radius * 2.5, glowColor);

            // Planet body
            ctx.strokeStyle = p.isBeacon ? COLORS.beacon : `hsl(${p.hue}, 100%, 60%)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenX, screenY, p.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner details
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(screenX, screenY, p.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // Beacon sparkle
            if (p.isBeacon) {
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(Date.now() * 0.002);
                ctx.strokeStyle = COLORS.beacon;
                ctx.lineWidth = 2;
                for (let j = 0; j < 4; j++) {
                    ctx.beginPath();
                    ctx.moveTo(0, -p.radius - 10);
                    ctx.lineTo(0, -p.radius - 25);
                    ctx.stroke();
                    ctx.rotate(Math.PI / 2);
                }
                ctx.restore();
            }

            // Planet number (except beacon)
            if (!p.isBeacon && i > 0) {
                ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, 0.5)`;
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(i.toString(), screenX, screenY + 4);
            }
        }

        // Draw comet
        if (comet) {
            // Trail
            ctx.strokeStyle = COLORS.cometGlow;
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(comet.x, comet.y);
            for (let i = 0; i < comet.trail.length; i++) {
                const t = comet.trail[i];
                ctx.lineTo(t.x, t.y);
            }
            ctx.stroke();

            // Head glow
            drawGlow(comet.x, comet.y, 30, COLORS.cometGlow);

            // Head
            ctx.fillStyle = COLORS.comet;
            ctx.beginPath();
            ctx.arc(comet.x, comet.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw trajectory preview (when orbiting)
        if (state === 'playing' && moon.orbiting) {
            const tangentAngle = moon.angle + Math.PI / 2;
            const previewLength = 80;
            ctx.strokeStyle = COLORS.trajectory;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(moon.x, moon.y);
            ctx.lineTo(
                moon.x + Math.cos(tangentAngle) * previewLength,
                moon.y + Math.sin(tangentAngle) * previewLength
            );
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw moon
        if (state === 'playing' || state === 'win') {
            // Glow
            drawGlow(moon.x, moon.y, MOON_RADIUS * 3, COLORS.moonGlow);

            // Moon body
            ctx.fillStyle = COLORS.moon;
            ctx.beginPath();
            ctx.arc(moon.x, moon.y, MOON_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Orbit line when attached
            if (moon.orbiting) {
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(moon.orbiting.x, moon.orbiting.y);
                ctx.lineTo(moon.x, moon.y);
                ctx.stroke();
            }
        }

        // Draw particles
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // HUD (fixed to screen)
        drawHUD();
    }

    function drawHUD() {
        ctx.save();

        // Progress indicator
        const hudY = 30;
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${planetsLanded} / ${TOTAL_PLANETS}`, 20, hudY);

        // Best score
        ctx.font = '14px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(`Best: ${bestScore}`, 20, hudY + 25);

        // Riding comet indicator
        if (moon && moon.riding) {
            ctx.fillStyle = COLORS.comet;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('RIDING COMET!', width / 2, 40);
        }

        ctx.restore();
    }

    function drawScreen(title, subtitle, instruction) {
        // Dim overlay
        ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
        ctx.fillRect(0, 0, width, height);

        // Title glow
        ctx.shadowColor = COLORS.moon;
        ctx.shadowBlur = 20;
        ctx.fillStyle = COLORS.moon;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, height / 2 - 50);

        ctx.shadowBlur = 0;

        // Subtitle
        if (subtitle) {
            ctx.fillStyle = COLORS.text;
            ctx.font = '20px monospace';
            ctx.fillText(subtitle, width / 2, height / 2 + 10);
        }

        // Instruction
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '16px monospace';
        ctx.fillText(instruction, width / 2, height / 2 + 60);

        // Best score
        if (bestScore > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '14px monospace';
            ctx.fillText(`Best: ${bestScore} planets`, width / 2, height / 2 + 100);
        }
    }

    function drawStartScreen() {
        // Draw some background planets for visual interest
        draw();
        drawScreen('ORBIT HOP', 'Tap to release • Reach planet 12', 'Tap or press SPACE to start');
    }

    function drawWinScreen() {
        draw();
        drawScreen('BEACON REACHED!', `You made it to all ${TOTAL_PLANETS} planets!`, 'Tap or press R to play again');
    }

    function drawLoseScreen() {
        draw();
        drawScreen('LOST IN SPACE', `Reached ${planetsLanded} planet${planetsLanded !== 1 ? 's' : ''}`, 'Tap or press R to restart');
    }

    function handleInput() {
        if (state === 'start') {
            state = 'playing';
            initGame();
        } else if (state === 'playing') {
            release();
        } else if (state === 'win' || state === 'lose') {
            state = 'playing';
            initGame();
        }
    }

    // Input handlers
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleInput();
        } else if (e.code === 'Enter' || e.code === 'KeyR') {
            if (state === 'win' || state === 'lose') {
                e.preventDefault();
                state = 'playing';
                initGame();
            }
        }
    });

    canvas.addEventListener('click', (e) => {
        e.preventDefault();
        handleInput();
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleInput();
    }, { passive: false });

    window.addEventListener('resize', resize);

    // Prevent zoom on double tap
    let lastTap = 0;
    canvas.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            e.preventDefault();
        }
        lastTap = now;
    }, { passive: false });

    // Game loop
    let lastTime = 0;
    function gameLoop(timestamp) {
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        update(dt);

        if (state === 'start') {
            drawStartScreen();
        } else if (state === 'win') {
            drawWinScreen();
        } else if (state === 'lose') {
            drawLoseScreen();
        } else {
            draw();
        }

        requestAnimationFrame(gameLoop);
    }

    // Initialize
    resize();
    initGame();
    requestAnimationFrame(gameLoop);
})();
