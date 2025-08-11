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

    // Implemented missing functions
    function updateAndDrawPathways() {
        // Update and draw all pathways
        for (let i = pathways.length - 1; i >= 0; i--) {
            const path = pathways[i];
            
            // Update path properties
            path.lifetime++;
            
            // Draw the path
            p.noFill();
            p.stroke(path.color[0], path.color[1], path.color[2], path.alpha);
            p.strokeWeight(path.width);
            
            p.beginShape();
            for (let point of path.points) {
                p.vertex(point.x, point.y);
            }
            p.endShape();
            
            // Create particles along the path
            if (p.frameCount % 5 === 0 && path.lifetime < path.maxLifetime * 0.7) {
                const progress = p.random(1);
                const index = Math.floor(progress * (path.points.length - 1));
                const pt1 = path.points[index];
                const pt2 = path.points[index + 1];
                
                if (pt1 && pt2) {
                    const particleX = p.lerp(pt1.x, pt2.x, progress % 1);
                    const particleY = p.lerp(pt1.y, pt2.y, progress % 1);
                    
                    particles.push({
                        x: particleX,
                        y: particleY,
                        vx: p.random(-0.5, 0.5),
                        vy: p.random(-0.5, 0.5),
                        size: p.random(2, 4),
                        color: path.color,
                        alpha: 150,
                        life: 0,
                        maxLife: p.random(20, 40)
                    });
                }
            }
            
            // Remove old pathways
            if (path.lifetime > path.maxLifetime) {
                pathways.splice(i, 1);
            }
        }
    }

    function createPathway() {
        // Get active hexes
        const activeHexes = hexGrid.filter(h => h.active);
        
        // If no active hexes, create path from central node to a random hex
        if (activeHexes.length === 0) {
            const randomHex = hexGrid[Math.floor(p.random(hexGrid.length))];
            if (randomHex) {
                createPathFromCentralNode(randomHex);
            }
            return;
        }
        
        // Decide on path type
        if (p.random() < 0.7 || activeHexes.length === 1) {
            // Create path from central node to a random active hex
            const sourceHex = activeHexes[Math.floor(p.random(activeHexes.length))];
            
            // Find inactive hexes that are not too far from active hexes
            const potentialTargets = hexGrid.filter(h => !h.active);
            if (potentialTargets.length > 0) {
                // Sort by distance to source hex
                potentialTargets.sort((a, b) => {
                    const distA = p.dist(sourceHex.x, sourceHex.y, a.x, a.y);
                    const distB = p.dist(sourceHex.x, sourceHex.y, b.x, b.y);
                    return distA - distB;
                });
                
                // Choose one of the closest
                const targetIndex = Math.floor(p.random(Math.min(5, potentialTargets.length)));
                const targetHex = potentialTargets[targetIndex];
                
                // Create the path
                createPath(sourceHex, targetHex);
            }
        } else {
            // Create path between two active hexes
            if (activeHexes.length >= 2) {
                const hex1 = activeHexes[Math.floor(p.random(activeHexes.length))];
                let hex2;
                do {
                    hex2 = activeHexes[Math.floor(p.random(activeHexes.length))];
                } while (hex1 === hex2);
                
                createPath(hex1, hex2);
            }
        }
    }

    function createPath(source, target) {
        // Calculate control points for a curved path
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = p.dist(source.x, source.y, target.x, target.y);
        
        // Create control points perpendicular to the direct line
        const perpX = -dy / distance * p.random(30, 80);
        const perpY = dx / distance * p.random(30, 80);
        
        // Create the Bezier control points
        const ctrl1X = source.x + dx * 0.3 + perpX;
        const ctrl1Y = source.y + dy * 0.3 + perpY;
        const ctrl2X = source.x + dx * 0.7 + perpX;
        const ctrl2Y = source.y + dy * 0.7 + perpY;
        
        // Sample points along the Bezier curve
        const points = [];
        const steps = 15;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = p.bezierPoint(source.x, ctrl1X, ctrl2X, target.x, t);
            const y = p.bezierPoint(source.y, ctrl1Y, ctrl2Y, target.y, t);
            points.push({ x, y });
        }
        
        // Create the path object
        const path = {
            points: points,
            source: source,
            target: target,
            width: p.random(1, 2),
            color: [LIGHT_TEAL[0], LIGHT_TEAL[1], LIGHT_TEAL[2]],
            alpha: 150,
            lifetime: 0,
            maxLifetime: 300 + p.random(300)
        };
        
        pathways.push(path);
        
        // Activate the target hex if it's not already active
        if (!target.active) {
            target.active = true;
            target.highlight = 80;
            createMergeParticles(target.x, target.y, LIGHT_TEAL, 8);
        }
    }

    function createPathFromCentralNode(targetHex) {
        // Create a path from central node to a target hex
        const dx = targetHex.x - centralNode.x;
        const dy = targetHex.y - centralNode.y;
        
        // Create control points for a curved path
        const ctrl1X = centralNode.x + dx * 0.3 + p.random(-30, 30);
        const ctrl1Y = centralNode.y + dy * 0.3 + p.random(-30, 30);
        const ctrl2X = centralNode.x + dx * 0.7 + p.random(-30, 30);
        const ctrl2Y = centralNode.y + dy * 0.7 + p.random(-30, 30);
        
        // Sample points along the Bezier curve
        const points = [];
        const steps = 15;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = p.bezierPoint(centralNode.x, ctrl1X, ctrl2X, targetHex.x, t);
            const y = p.bezierPoint(centralNode.y, ctrl1Y, ctrl2Y, targetHex.y, t);
            points.push({ x, y });
        }
        
        // Create the path object
        const path = {
            points: points,
            source: { x: centralNode.x, y: centralNode.y },
            target: targetHex,
            width: p.random(1, 2.5),
            color: [LIGHT_TEAL[0], LIGHT_TEAL[1], LIGHT_TEAL[2]],
            alpha: 180,
            lifetime: 0,
            maxLifetime: 300 + p.random(300)
        };
        
        pathways.push(path);
        
        // Add to central node's active connections
        centralNode.activeConnections.push({
            target: targetHex,
            alpha: 150,
            width: path.width
        });
        
        // Activate the target hex
        targetHex.active = true;
        targetHex.highlight = 80;
        createMergeParticles(targetHex.x, targetHex.y, LIGHT_TEAL, 10);
    }

    function createSolution() {
        // Create a solution node at the center that will move upward
        emergedSolution = {
            x: centralNode.x,
            y: centralNode.y,
            targetX: centralNode.x,
            targetY: centralNode.y - 100,
            size: 10,
            targetSize: 50,
            color: VIBRANT_TEAL,
            alpha: 0,
            rotation: 0,
            rotationSpeed: 0.01,
            particles: [],
            connections: [],
            pulseFactor: 0,
            pulseDirection: 0.02,
            activeHexes: hexGrid.filter(h => h.active)
        };
        
        // Create connections to all active hexes
        for (let hex of emergedSolution.activeHexes) {
            emergedSolution.connections.push({
                target: hex,
                alpha: 0,
                targetAlpha: 150,
                width: p.random(1, 2)
            });
        }
    }

    function updateAndDrawSolution() {
        if (!emergedSolution) return;
        
        // Update solution position and properties
        emergedSolution.x = p.lerp(emergedSolution.x, emergedSolution.targetX, 0.03);
        emergedSolution.y = p.lerp(emergedSolution.y, emergedSolution.targetY, 0.03);
        emergedSolution.size = p.lerp(emergedSolution.size, emergedSolution.targetSize, 0.03);
        emergedSolution.alpha = Math.min(255, emergedSolution.alpha + 5);
        emergedSolution.rotation += emergedSolution.rotationSpeed;
        emergedSolution.pulseFactor += emergedSolution.pulseDirection;
        
        if (emergedSolution.pulseFactor > 1 || emergedSolution.pulseFactor < 0) {
            emergedSolution.pulseDirection *= -1;
        }
        
        // Update and draw connections to active hexes
        for (let conn of emergedSolution.connections) {
            conn.alpha = p.lerp(conn.alpha, conn.targetAlpha, 0.05);
            
            p.stroke(emergedSolution.color[0], emergedSolution.color[1], emergedSolution.color[2], conn.alpha);
            p.strokeWeight(conn.width);
            p.line(emergedSolution.x, emergedSolution.y, conn.target.x, conn.target.y);
            
            // Add pulse along connection
            if (p.frameCount % 10 === 0) {
                particles.push({
                    x: emergedSolution.x,
                    y: emergedSolution.y,
                    targetX: conn.target.x,
                    targetY: conn.target.y,
                    progress: 0,
                    speed: p.random(0.01, 0.03),
                    size: p.random(3, 6),
                    color: emergedSolution.color,
                    alpha: 200,
                    life: 0,
                    maxLife: 100
                });
            }
        }
        
        // Draw the solution
        p.push();
        p.translate(emergedSolution.x, emergedSolution.y);
        p.rotate(emergedSolution.rotation);
        
        // Draw outer glow
        p.noStroke();
        for (let i = 4; i > 0; i--) {
            const glowSize = emergedSolution.size * (1 + i * 0.15);
            p.fill(emergedSolution.color[0], emergedSolution.color[1], emergedSolution.color[2], 
                   Math.max(0, emergedSolution.alpha * 0.2 - i * 10));
            p.ellipse(0, 0, glowSize, glowSize);
        }
        
        // Draw main shape - octagon
        p.fill(emergedSolution.color[0], emergedSolution.color[1], emergedSolution.color[2], emergedSolution.alpha);
        drawPolygon(0, 0, emergedSolution.size * (0.8 + emergedSolution.pulseFactor * 0.1), 8);
        
        // Draw inner shape - smaller octagon
        p.fill(255, 255, 255, emergedSolution.alpha * 0.5);
        drawPolygon(0, 0, emergedSolution.size * 0.5, 8);
        
        p.pop();
        
        // Occasionally emit particles
        if (p.frameCount % 5 === 0) {
            const angle = p.random(p.TWO_PI);
            const radius = emergedSolution.size * 0.5;
            const px = emergedSolution.x + p.cos(angle) * radius;
            const py = emergedSolution.y + p.sin(angle) * radius;
            
            particles.push({
                x: px,
                y: py,
                vx: p.cos(angle) * p.random(0.5, 2),
                vy: p.sin(angle) * p.random(0.5, 2),
                size: p.random(2, 5),
                color: emergedSolution.color,
                alpha: 200,
                life: 0,
                maxLife: p.random(20, 40)
            });
        }
    }

    function createMergeParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = p.random(p.TWO_PI);
            const speed = p.random(0.5, 2.5);
            
            particles.push({
                x: x,
                y: y,
                vx: p.cos(angle) * speed,
                vy: p.sin(angle) * speed,
                size: p.random(2, 6),
                color: color,
                alpha: 200,
                life: 0,
                maxLife: p.random(20, 40),
                drag: p.random(0.92, 0.97)
            });
        }
    }

    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            
            // Different update logic depending on particle type
            if (particle.hasOwnProperty('progress')) {
                // Path-following particle
                particle.progress += particle.speed;
                particle.x = p.lerp(particle.x, particle.targetX, particle.progress);
                particle.y = p.lerp(particle.y, particle.targetY, particle.progress);
                particle.alpha = p.map(particle.life, 0, particle.maxLife, 200, 0);
            } else {
                // Regular particle with velocity
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Apply drag if specified
                if (particle.drag) {
                    particle.vx *= particle.drag;
                    particle.vy *= particle.drag;
                } else {
                    particle.vx *= 0.95;
                    particle.vy *= 0.95;
                }
                
                particle.size *= 0.97;
                particle.alpha = p.map(particle.life, 0, particle.maxLife, 200, 0);
            }
            
            // Increment life counter
            particle.life++;
            
            // Draw the particle
            p.noStroke();
            p.fill(particle.color[0], particle.color[1], particle.color[2], particle.alpha);
            p.ellipse(particle.x, particle.y, particle.size);
            
            // Remove if expired
            if (particle.life >= particle.maxLife || particle.progress >= 1) {
                particles.splice(i, 1);
            }
        }
    }

    function updateCentralNode() {
        // Update central node properties
        centralNode.pulseAmount = Math.sin(p.frameCount * 0.03) * 5;
        centralNode.rotation += centralNode.rotationSpeed;
        
        // Update connections
        for (let i = centralNode.activeConnections.length - 1; i >= 0; i--) {
            const conn = centralNode.activeConnections[i];
            
            // If target is no longer active, fade out connection
            if (!conn.target.active) {
                conn.alpha -= 5;
                if (conn.alpha <= 0) {
                    centralNode.activeConnections.splice(i, 1);
                }
            }
        }
    }

    function drawCentralNode() {
        // Draw the central node
        p.push();
        p.translate(centralNode.x, centralNode.y);
        p.rotate(centralNode.rotation);
        
        // Draw outer glow
        p.noStroke();
        for (let i = 3; i > 0; i--) {
            const glowSize = centralNode.size * (1 + i * 0.2) + centralNode.pulseAmount;
            p.fill(centralNode.color[0], centralNode.color[1], centralNode.color[2], 
                  Math.max(0, centralNode.alpha * 0.3 - i * 20));
            p.ellipse(0, 0, glowSize, glowSize);
        }
        
        // Draw main circle
        p.fill(centralNode.color[0], centralNode.color[1], centralNode.color[2], centralNode.alpha);
        p.ellipse(0, 0, centralNode.size + centralNode.pulseAmount, centralNode.size + centralNode.pulseAmount);
        
        // Draw inner highlight for depth
        p.fill(255, 255, 255, 60);
        p.ellipse(0, 0, (centralNode.size + centralNode.pulseAmount) * 0.7, (centralNode.size + centralNode.pulseAmount) * 0.7);
        
        p.pop();
        
        // Draw active connections
        for (let conn of centralNode.activeConnections) {
            p.stroke(LIGHT_TEAL[0], LIGHT_TEAL[1], LIGHT_TEAL[2], conn.alpha);
            p.strokeWeight(conn.width);
            p.line(centralNode.x, centralNode.y, conn.target.x, conn.target.y);
            
            // Draw pulse along the connection
            if (conn.target.active && p.frameCount % 20 === 0) {
                particles.push({
                    x: centralNode.x,
                    y: centralNode.y,
                    targetX: conn.target.x,
                    targetY: conn.target.y,
                    progress: 0,
                    speed: 0.05,
                    size: 4,
                    color: LIGHT_TEAL,
                    alpha: 200,
                    life: 0,
                    maxLife: 60
                });
            }
        }
    }

    function triggerProcessingMode() { 
        processingMode = true; 
        processingTimer = 0; 
        solutionPhase = false; 
        
        // Create initial pathways
        for (let i = 0; i < 3; i++) {
            createPathway();
        }
    }

    function resetProcessing() { 
        processingMode = false; 
        processingTimer = 0; 
        solutionPhase = false; 
        emergedSolution = null;
        
        // Keep some active hexes, but reset most
        const activeHexes = hexGrid.filter(h => h.active);
        if (activeHexes.length > 5) {
            // Deactivate some random hexes
            for (let i = 0; i < activeHexes.length * 0.7; i++) {
                const index = Math.floor(p.random(activeHexes.length));
                if (index < activeHexes.length) {
                    activeHexes[index].active = false;
                }
            }
        }
    }

    p.windowResized = function() {
        p.resizeCanvas(window.innerWidth, window.innerHeight);
        if (centralNode) {
            centralNode.x = p.width / 2;
            centralNode.y = p.height / 2;
        }
    };
};

new p5(pragmaticSketch);
