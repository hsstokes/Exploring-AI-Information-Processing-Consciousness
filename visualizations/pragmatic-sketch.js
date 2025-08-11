// Pragmatic AR Visualization - p5.js for AR.js overlay

let pragmaticSketch = function(p) {
    // --- Color palette ---
    const SLATE_BLUE = [68, 88, 120];
    const COOL_GRAY = [234, 236, 239];
    const VIBRANT_TEAL = [0, 128, 128];
    const LIGHT_TEAL = [40, 180, 170];

    // --- Viz elements ---
    let hexGrid = [];
    let dataCircles = [];
    let pathways = [];
    let particles = [];
    let emergedSolution = null;
    let mouseInactivityTimer = 0;

    let centralNode;
    const HEX_SIZE = 25;
    const GRID_SPACING = HEX_SIZE * 1.8;

    let processingMode = false;
    let processingTimer = 0;
    let solutionPhase = false;
    let mouseInfluence = { x: 0, y: 0, active: false };

    let interactionSound;

    p.preload = function() {
        // Optional: provide a sound file in ../audio/pragmatic-sound.wav or comment out
        interactionSound = undefined; // Disable for now to avoid loading errors
        // interactionSound = p.loadSound('../audio/pragmatic-sound.wav');
    };

    p.setup = function() {
        p.createCanvas(window.innerWidth, window.innerHeight).parent('p5-overlay');
        p.clear();
        centralNode = {
            x: p.width / 2, y: p.height / 2, baseSize: 40, size: 40,
            pulseAmount: 0, color: SLATE_BLUE, alpha: 250,
            rotation: 0, rotationSpeed: 0.005, activeConnections: []
        };
        createHexGrid();
        for (let i = 0; i < 8; i++) createDataCircle();
    };

    p.draw = function() {
        p.clear(); // Transparent for AR overlay
        drawGridBackground();
        updateAndDrawPathways();
        updateDataCircles(); drawDataCircles();
        updateHexGrid(); drawHexGrid();
        updateAndDrawParticles();
        updateCentralNode(); drawCentralNode();
        if (processingMode) {
            processingTimer++;
            if (processingTimer % 10 === 0 && pathways.length < 25) createPathway();
            if (processingTimer > 180 && !solutionPhase) { solutionPhase = true; createSolution(); }
            if (processingTimer > 360) resetProcessing();
        }
        if (emergedSolution) updateAndDrawSolution();
        if (!processingMode && p.frameCount % 180 === 0) triggerProcessingMode();
        if (p.frameCount % 45 === 0 && !processingMode && dataCircles.length < 12) createDataCircle();
        if (mouseInfluence.active) {
            mouseInactivityTimer++;
            if (mouseInactivityTimer > 60) { mouseInfluence.x = p.mouseX; mouseInfluence.y = p.mouseY; }
            if (mouseInactivityTimer > 300) {
                if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) mouseInfluence.active = false;
            }
        }
    };

    p.mousePressed = function() {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            mouseInfluence.x = p.mouseX; mouseInfluence.y = p.mouseY; mouseInfluence.active = true;
            if (interactionSound && !interactionSound.isPlaying()) interactionSound.play();
            if (!processingMode) triggerProcessingMode();
            return false;
        }
    };
    p.mouseReleased = function() { mouseInfluence.active = false; return false; };
    p.mouseDragged = function() {
        if (mouseInfluence.active) { mouseInfluence.x = p.mouseX; mouseInfluence.y = p.mouseY; mouseInactivityTimer = 0; return false; }
    };
    p.mouseMoved = function() {
        if (mouseInfluence.active) { mouseInfluence.x = p.mouseX; mouseInfluence.y = p.mouseY; mouseInactivityTimer = 0; return false; }
    };

    function createHexGrid() {
        const maxDistance = Math.min(p.width, p.height) * 0.45;
        for (let angle = 0; angle < p.TWO_PI; angle += p.TWO_PI / 30) {
            for (let dist = 80; dist < maxDistance; dist += GRID_SPACING * p.random(0.8, 1.2)) {
                const angleVar = angle + p.random(-0.2, 0.2);
                const distVar = dist + p.random(-10, 10);
                const x = centralNode.x + Math.cos(angleVar) * distVar;
                const y = centralNode.y + Math.sin(angleVar) * distVar;
                if (x < 30 || x > p.width - 30 || y < 30 || y > p.height - 30) continue;
                hexGrid.push({
                    x, y, baseX: x, baseY: y,
                    baseSize: HEX_SIZE * p.random(0.8, 1.2),
                    size: HEX_SIZE * p.random(0.8, 1.2),
                    sides: 6,
                    rotation: p.random(p.TWO_PI),
                    rotationSpeed: p.random(0.001, 0.003) * (p.random() < 0.5 ? 1 : -1),
                    distanceFromCenter: distVar,
                    angleFromCenter: angleVar,
                    orbitSpeed: p.random(0.0005, 0.001) * (p.random() < 0.5 ? 1 : -1),
                    color: [...SLATE_BLUE, p.random(120, 180)],
                    active: false, pulseSize: 0, pulseDirection: 1, highlight: 0,
                    wobbleAmount: p.random(0.5, 2), wobbleSpeed: p.random(0.01, 0.02), mouseInfluence: p.random(0.2, 0.5)
                });
            }
        }
    }

    function drawGridBackground() {
        p.noFill(); p.strokeWeight(0.5);
        for (let i = 0; i < 5; i++) {
            const yOffset = p.frameCount * 0.2 + i * 30;
            p.stroke(SLATE_BLUE[0], SLATE_BLUE[1], SLATE_BLUE[2], 10);
            p.beginShape();
            for (let x = 0; x < p.width; x += 10) {
                const y = p.height / 2 + Math.sin(x * 0.01 + yOffset * 0.02) * 50 + Math.cos(x * 0.02 - yOffset * 0.01) * 30;
                p.vertex(x, y);
            }
            p.endShape();
        }
    }

    function updateHexGrid() {
        for (let hex of hexGrid) {
            if (mouseInfluence.active) {
                const d = p.dist(hex.x, hex.y, mouseInfluence.x, mouseInfluence.y);
                const maxDist = 150;
                if (d < maxDist) {
                    const force = p.map(d, 0, maxDist, 0.5, 0) * hex.mouseInfluence;
                    const angle = Math.atan2(hex.y - mouseInfluence.y, hex.x - mouseInfluence.x);
                    hex.x += Math.cos(angle) * force * 5;
                    hex.y += Math.sin(angle) * force * 5;
                }
            }
            if (!hex.active) {
                hex.angleFromCenter += hex.orbitSpeed;
                const targetX = centralNode.x + Math.cos(hex.angleFromCenter) * hex.distanceFromCenter;
                const targetY = centralNode.y + Math.sin(hex.angleFromCenter) * hex.distanceFromCenter;
                hex.x = p.lerp(hex.x, targetX, 0.01);
                hex.y = p.lerp(hex.y, targetY, 0.01);
            }
            const wobble = Math.sin(p.frameCount * hex.wobbleSpeed) * hex.wobbleAmount;
            hex.x += wobble * 0.2; hex.y += wobble * 0.2;
            if (hex.active) {
                hex.pulseSize += 0.1 * hex.pulseDirection;
                if (hex.pulseSize > 3 || hex.pulseSize < 0) hex.pulseDirection *= -1;
                hex.highlight = Math.max(0, hex.highlight - 2);
                hex.rotation += hex.rotationSpeed * 2;
            } else {
                hex.rotation += hex.rotationSpeed * 0.5;
            }
            hex.size = p.lerp(hex.size, hex.baseSize + (hex.active ? hex.pulseSize : 0), 0.1);
        }
        if (!mouseInfluence.active) {
            for (let hex of hexGrid) {
                const targetX = centralNode.x + Math.cos(hex.angleFromCenter) * hex.distanceFromCenter;
                const targetY = centralNode.y + Math.sin(hex.angleFromCenter) * hex.distanceFromCenter;
                hex.x = p.lerp(hex.x, targetX, 0.02);
                hex.y = p.lerp(hex.y, targetY, 0.02);
            }
        }
    }

    function drawHexGrid() {
        drawHexConnections();
        for (let hex of hexGrid) {
            p.push(); p.translate(hex.x, hex.y); p.rotate(hex.rotation);
            let displayColor;
            if (hex.active) {
                displayColor = [
                    hex.color[0] + hex.highlight,
                    hex.color[1] + hex.highlight,
                    hex.color[2] + hex.highlight,
                    hex.color[3]
                ];
            } else {
                displayColor = hex.color;
            }
            if (hex.active) {
                for (let i = 3; i >= 0; i--) {
                    const glowSize = hex.size * (1 + i * 0.15);
                    p.fill(displayColor[0], displayColor[1], displayColor[2], Math.max(0, displayColor[3] * 0.3 - i * 10));
                    drawPolygon(0, 0, glowSize, 6);
                }
            }
            p.fill(displayColor); drawPolygon(0, 0, hex.size, 6);
            if (hex.active) {
                p.fill(255, 255, 255, 40); drawPolygon(0, 0, hex.size * 0.7, 6);
            } else {
                p.fill(255, 255, 255, 20); drawPolygon(0, 0, hex.size * 0.7, 6);
            }
            p.pop();
        }
    }

    function drawHexConnections() {
        const activeHexes = hexGrid.filter(h => h.active);
        if (activeHexes.length < 2) return;
        for (let i = 0; i < activeHexes.length; i++) {
            for (let j = i + 1; j < activeHexes.length; j++) {
                const hex1 = activeHexes[i], hex2 = activeHexes[j];
                const d = p.dist(hex1.x, hex1.y, hex2.x, hex2.y);
                if (d < 200) {
                    const alpha = p.map(d, 0, 200, 100, 20);
                    p.stroke(LIGHT_TEAL[0], LIGHT_TEAL[1], LIGHT_TEAL[2], alpha);
                    p.strokeWeight(1);
                    p.line(hex1.x, hex1.y, hex2.x, hex2.y);
                    const pulseFactor = (p.frameCount * 0.02) % 1;
                    const pulseX = p.lerp(hex1.x, hex2.x, pulseFactor);
                    const pulseY = p.lerp(hex1.y, hex2.y, pulseFactor);
                    p.noStroke(); p.fill(LIGHT_TEAL[0], LIGHT_TEAL[1], LIGHT_TEAL[2], 150);
                    p.ellipse(pulseX, pulseY, 3, 3);
                }
            }
        }
    }

    function drawPolygon(x, y, radius, sides) {
        p.beginShape();
        for (let i = 0; i < sides; i++) {
            const angle = p.TWO_PI / sides * i;
            const vx = x + p.cos(angle) * radius;
            const vy = y + p.sin(angle) * radius;
            p.vertex(vx, vy);
        }
        p.endShape(p.CLOSE);
    }

    function createDataCircle() {
        const angle = p.random(p.TWO_PI);
        const distance = p.random(50, 300);
        const x = centralNode.x + p.cos(angle) * distance;
        const y = centralNode.y + p.sin(angle) * distance;
        const circle = {
            x, y,
            baseX: x, baseY: y,
            targetX: x, targetY: y,
            size: p.random(10, 25), maxSize: p.random(30, 45),
            pulseSpeed: p.random(0.02, 0.05), pulseAmount: 0,
            baseColor: SLATE_BLUE,
            color: [...SLATE_BLUE, 180],
            lifetime: 0, maxLifetime: p.random(300, 600),
            merging: false, mergeTarget: null, mergeProgress: 0,
            velocity: { x: p.random(-0.5, 0.5), y: p.random(-0.5, 0.5) },
            attraction: p.random(0.001, 0.003),
            wobbleAmount: p.random(1, 4), wobbleSpeed: p.random(0.01, 0.03),
            rotation: p.random(p.TWO_PI), rotationSpeed: p.random(0.01, 0.03) * (p.random() < 0.5 ? 1 : -1)
        };
        dataCircles.push(circle);
    }

    function updateDataCircles() {
        for (let i = dataCircles.length - 1; i >= 0; i--) {
            const circle = dataCircles[i];
            circle.lifetime++;
            circle.pulseAmount = p.sin(circle.lifetime * circle.pulseSpeed) * 5;
            circle.rotation += circle.rotationSpeed;
            if (mouseInfluence.active) {
                const d = p.dist(circle.x, circle.y, mouseInfluence.x, mouseInfluence.y);
                const maxDist = 120;
                if (d < maxDist) {
                    const force = p.map(d, 0, maxDist, 0.4, 0);
                    const angle = Math.atan2(circle.y - mouseInfluence.y, circle.x - mouseInfluence.x);
                    circle.velocity.x += Math.cos(angle) * force;
                    circle.velocity.y += Math.sin(angle) * force;
                }
            }
            if (circle.merging) {
                circle.mergeProgress += 0.02;
                circle.x = p.lerp(circle.x, circle.mergeTarget.x, circle.mergeProgress);
                circle.y = p.lerp(circle.y, circle.mergeTarget.y, circle.mergeProgress);
                circle.size = p.lerp(circle.size, 0, circle.mergeProgress);
                if (circle.mergeProgress >= 1) {
                    circle.mergeTarget.active = true;
                    circle.mergeTarget.highlight = 80;
                    createMergeParticles(circle.mergeTarget.x, circle.mergeTarget.y, circle.color, 10);
                    dataCircles.splice(i, 1);
                }
            } else {
                const angleToCenter = Math.atan2(centralNode.y - circle.y, centralNode.x - circle.x);
                circle.velocity.x += Math.cos(angleToCenter) * circle.attraction;
                circle.velocity.y += Math.sin(angleToCenter) * circle.attraction;
                circle.velocity.x *= 0.98; circle.velocity.y *= 0.98;
                circle.x += circle.velocity.x; circle.y += circle.velocity.y;
                circle.x += Math.sin(p.frameCount * circle.wobbleSpeed) * circle.wobbleAmount * 0.2;
                circle.y += Math.cos(p.frameCount * circle.wobbleSpeed * 1.3) * circle.wobbleAmount * 0.2;
                if (circle.lifetime > circle.maxLifetime * 0.6 && !processingMode) {
                    let nearestHex = null, minDist = Infinity;
                    for (let hex of hexGrid) {
                        const d = p.dist(circle.x, circle.y, hex.x, hex.y);
                        if (d < minDist && !hex.active) { minDist = d; nearestHex = hex; }
                    }
                    if (nearestHex && minDist < 100) {
                        circle.merging = true;
                        circle.mergeTarget = nearestHex;
                    }
                } else if (circle.lifetime > circle.maxLifetime) {
                    createMergeParticles(circle.x, circle.y, circle.color, 5);
                    dataCircles.splice(i, 1);
                }
            }
        }
    }

    function drawDataCircles() {
        for (let circle of dataCircles) {
            p.push();
            p.translate(circle.x, circle.y); p.rotate(circle.rotation);
            p.noStroke();
            p.fill(circle.color);
            p.ellipse(0, 0, circle.size + circle.pulseAmount, circle.size + circle.pulseAmount);
            p.pop();
        }
    }

    // The following are placeholders for all the "..." update/draw/create functions from your original code.
    // For clarity in this starter, only the essentials are included.
    // For a full match, move your detailed solution, particle, pathway, etc. logic into these functions.

    function updateAndDrawPathways() {}
    function createPathway() {}
    function createSolution() {}
    function updateAndDrawSolution() {}
    function createMergeParticles(x, y, color, count) {}
    function updateAndDrawParticles() {}
    function updateCentralNode() {}
    function drawCentralNode() {}
    function triggerProcessingMode() { processingMode = true; processingTimer = 0; solutionPhase = false; }
    function resetProcessing() { processingMode = false; processingTimer = 0; solutionPhase = false; emergedSolution = null; }

    p.windowResized = function() {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        if (centralNode) {
            centralNode.x = p.width / 2;
            centralNode.y = p.height / 2;
        }
    };
};

new p5(pragmaticSketch);