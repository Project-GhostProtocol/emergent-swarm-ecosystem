// =====================================================
// EMERGENT SWARM ECOSYSTEM
// Artificial Life Sandbox - Cinematic FX Edition
// =====================================================

let agents = [];
let predators = [];
let apexPredators = [];
let foods = [];
let obstacles = [];
let dangerZones = [];
let particles = [];
let shockwaves = [];

let apexSpawned = false;
let camShake = 0;
let flashAlpha = 0;

// =====================================================
// SETUP
// =====================================================

function setup() {
  createCanvas(1400, 900);

  for (let i = 0; i < 120; i++) {
    agents.push(createAgent(random(width), random(height)));
  }

  for (let i = 0; i < 3; i++) {
    predators.push({
      id: random(1e9),
      x: random(width),
      y: random(height),
      vx: random(-2, 2),
      vy: random(-2, 2),
      size: 40,

      aggression: random(0.16, 0.26),
      baseAggression: random(0.16, 0.26),
      maxSpeed: 3.2,

      role: i,
      color: color(random(180, 255), random(20, 70), random(20, 70)),

      energy: 100,
      state: "stalk",
      mode: "hunt",

      huntSuccess: 0,
      huntFailures: 0,

      targetId: null,
      targetLockTime: 0,

      dead: false,
      deathTimer: 0,
      remove: false
    });
  }

  for (let i = 0; i < 250; i++) {
    foods.push({
      x: random(width),
      y: random(height),
      energy: random(20, 50),
      pulse: random(TWO_PI)
    });
  }

  for (let i = 0; i < 8; i++) {
    obstacles.push({
      x: random(150, width - 150),
      y: random(150, height - 150),
      r: random(40, 90)
    });
  }

  noStroke();
}

// =====================================================
// CREATE AGENT
// =====================================================

function createAgent(x, y, parent = null) {
  let fearStrength;
  let maxSpeed;
  let separationStrength;
  let cohesionStrength;
  let leadership;
  let immunity;

  if (parent) {
    fearStrength = constrain(parent.fearStrength + random(-0.003, 0.003), 0.005, 0.06);
    maxSpeed = constrain(parent.maxSpeed + random(-0.2, 0.2), 1, 5);
    separationStrength = constrain(parent.separationStrength + random(-0.003, 0.003), 0.005, 0.05);
    cohesionStrength = constrain(parent.cohesionStrength + random(-0.0002, 0.0002), 0.0001, 0.003);
    leadership = constrain(parent.leadership + random(-0.05, 0.05), 0, 1);
    immunity = constrain(parent.immunity + random(-0.05, 0.05), 0, 1);
  } else {
    fearStrength = random(0.01, 0.04);
    maxSpeed = random(2, 4);
    separationStrength = random(0.01, 0.03);
    cohesionStrength = random(0.0003, 0.001);
    leadership = random(0, 1);
    immunity = random(0, 1);
  }

  return {
    id: random(1e9),
    x,
    y,
    vx: random(-2, 2),
    vy: random(-2, 2),
    size: 20,

    energy: random(60, 120),
    age: 0,
    dead: false,
    deathTimer: 0,
    remove: false,
    generation: parent ? parent.generation + 1 : 1,

    alertLevel: 0,
    memoryX: x,
    memoryY: y,
    leadership,

    infected: random(1) < 0.02,
    infectionLevel: 1,
    immunity,

    fearStrength,
    maxSpeed,
    separationStrength,
    cohesionStrength,

    reproductionCooldown: 0
  };
}

// =====================================================
// HELPERS
// =====================================================

function distSq(x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  return dx * dx + dy * dy;
}

function limitVelocity(obj, maxSpd) {
  let s = sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
  if (s > maxSpd && s > 0) {
    obj.vx = (obj.vx / s) * maxSpd;
    obj.vy = (obj.vy / s) * maxSpd;
  }
}

function bounceInside(obj, halfSize) {
  if (obj.x < halfSize) {
    obj.x = halfSize;
    obj.vx *= -1;
  } else if (obj.x > width - halfSize) {
    obj.x = width - halfSize;
    obj.vx *= -1;
  }

  if (obj.y < halfSize) {
    obj.y = halfSize;
    obj.vy *= -1;
  } else if (obj.y > height - halfSize) {
    obj.y = height - halfSize;
    obj.vy *= -1;
  }
}

function chooseSharedTarget() {
  let best = null;
  let bestScore = -Infinity;

  for (let agent of agents) {
    if (agent.dead) continue;

    let minPredDist = Infinity;
    let nearbyAllies = 0;

    for (let predator of predators) {
      if (predator.dead) continue;
      let d = sqrt(distSq(agent.x, agent.y, predator.x, predator.y));
      if (d < minPredDist) minPredDist = d;
    }

    for (let other of agents) {
      if (other === agent || other.dead) continue;
      let d = sqrt(distSq(agent.x, agent.y, other.x, other.y));
      if (d < 70) nearbyAllies++;
    }

    let isolationScore = map(nearbyAllies, 0, 10, 1.5, 0.1, true);
    let lowEnergyScore = map(agent.energy, 0, 180, 1.2, 0.1, true);
    let infectionScore = agent.infected ? 0.8 : 0;
    let distanceScore = map(minPredDist, 0, 500, 1.3, 0.1, true);
    let edgePenalty = 0;

    if (agent.x < 60 || agent.x > width - 60 || agent.y < 60 || agent.y > height - 60) {
      edgePenalty = 0.2;
    }

    let score = isolationScore + lowEnergyScore + infectionScore + distanceScore - edgePenalty;

    if (score > bestScore) {
      bestScore = score;
      best = agent;
    }
  }

  return best;
}

function updatePredatorState(predator, distToTarget) {
  if (predator.state === "stalk") {
    predator.maxSpeed = 3.2;
    predator.energy += 0.04;

    if (distToTarget < 180) predator.state = "burst";
  }

  if (predator.state === "burst") {
    predator.maxSpeed = 8;
    predator.energy -= 0.35;

    if (predator.energy <= 20) predator.state = "recover";
  }

  if (predator.state === "recover") {
    predator.maxSpeed = 2.2;
    predator.energy += 0.08;

    if (predator.energy > 70) predator.state = "stalk";
  }

  predator.energy = constrain(predator.energy, 0, 100);
}

function applyFearShockwave(sharedTarget, distToTarget) {
  if (!sharedTarget || sharedTarget.dead) return;

  if (distToTarget < 120) {
    for (let agent of agents) {
      if (agent.dead) continue;

      let dx = agent.x - sharedTarget.x;
      let dy = agent.y - sharedTarget.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < 140 && d > 0) {
        agent.vx += (dx / d) * 2.5;
        agent.vy += (dy / d) * 2.5;
        agent.alertLevel = max(agent.alertLevel, 0.85);
      }
    }
  }
}

function penalizeFailedHunt(predator) {
  predator.huntFailures++;
  predator.aggression -= 0.005;
  predator.aggression = constrain(predator.aggression, 0.08, 0.45);
  predator.targetLockTime = 0;
}

function rewardSuccessfulHunt(predator) {
  predator.huntSuccess++;
  predator.aggression += 0.01;
  predator.aggression = constrain(predator.aggression, 0.08, 0.45);
  predator.energy = min(100, predator.energy + 18);
  predator.targetLockTime = 0;
  predator.state = "recover";
}

function spawnApexPredator() {
  apexPredators.push({
    id: random(1e9),
    x: width * 0.5,
    y: height * 0.5,
    vx: random(-1, 1),
    vy: random(-1, 1),
    size: 64,
    maxSpeed: 7.2,
    aggression: 0.34,
    energy: 180,
    health: 260,
    color: color(40, 120, 255),
    state: "apex",
    targetId: null,
    lockTimer: 0,
    dead: false,
    deathTimer: 0,
    remove: false
  });

  spawnShockwave(width * 0.5, height * 0.5, color(80, 160, 255), 220, 5);
  flashAlpha = 80;
  camShake = 10;
}

function chooseIsolatedPredatorTarget(apex) {
  let best = null;
  let bestScore = -Infinity;

  for (let predator of predators) {
    if (predator.dead) continue;

    let nearbyFriends = 0;
    let dToApex = sqrt(distSq(apex.x, apex.y, predator.x, predator.y));

    for (let other of predators) {
      if (other === predator || other.dead) continue;
      let d = sqrt(distSq(predator.x, predator.y, other.x, other.y));
      if (d < 120) nearbyFriends++;
    }

    let isolationScore = map(nearbyFriends, 0, 2, 1.6, 0.2, true);
    let distanceScore = map(dToApex, 0, 500, 1.4, 0.2, true);
    let lowEnergyScore = map(predator.energy, 0, 100, 1.2, 0.2, true);

    let score = isolationScore + distanceScore + lowEnergyScore;

    if (score > bestScore) {
      bestScore = score;
      best = predator;
    }
  }

  return best;
}

function countPredatorsNearApex(apex, radius) {
  let nearby = [];
  for (let predator of predators) {
    if (predator.dead) continue;
    let d = sqrt(distSq(apex.x, apex.y, predator.x, predator.y));
    if (d < radius) nearby.push(predator);
  }
  return nearby;
}

// =====================================================
// FX HELPERS
// =====================================================

function glowCircle(x, y, r, c, layers = 4, alphaScale = 1) {
  push();
  blendMode(ADD);
  noStroke();

  for (let i = layers; i >= 1; i--) {
    let rr = r * (1 + i * 0.8);
    let a = 10 * i * alphaScale;
    fill(red(c), green(c), blue(c), a);
    circle(x, y, rr);
  }

  pop();
}

function glowTriangle(x, y, angle, size, c, intensity = 1) {
  push();
  translate(x, y);
  rotate(angle);
  blendMode(ADD);
  noStroke();

  for (let i = 4; i >= 1; i--) {
    fill(red(c), green(c), blue(c), 12 * i * intensity);
    triangle(
      -size * 0.75 - i * 2,
      -size * 0.5 - i,
      -size * 0.75 - i * 2,
      size * 0.5 + i,
      size + i * 3,
      0
    );
  }

  pop();
}

function spawnParticleBurst(x, y, c, count, speedMin, speedMax, lifeMin = 20, lifeMax = 50, sizeMin = 2, sizeMax = 6) {
  for (let i = 0; i < count; i++) {
    let a = random(TWO_PI);
    let s = random(speedMin, speedMax);

    particles.push({
      x,
      y,
      vx: cos(a) * s,
      vy: sin(a) * s,
      life: random(lifeMin, lifeMax),
      maxLife: random(lifeMin, lifeMax),
      size: random(sizeMin, sizeMax),
      color: color(red(c), green(c), blue(c), 255),
      drag: random(0.92, 0.98)
    });
  }
}

function spawnShockwave(x, y, c, maxR = 120, weight = 3) {
  shockwaves.push({
    x,
    y,
    r: 10,
    maxR,
    life: 28,
    maxLife: 28,
    weight,
    color: c
  });
}

function triggerKillEffect(x, y, c) {
  spawnParticleBurst(x, y, c, 28, 1.5, 6.5, 18, 42, 2, 7);
  spawnParticleBurst(x, y, color(255, 255, 255), 10, 0.5, 3.5, 10, 18, 1, 3);
  spawnShockwave(x, y, c, 100, 3);
  camShake = max(camShake, 8);
  flashAlpha = max(flashAlpha, 65);
}

function triggerBigKillEffect(x, y, c) {
  spawnParticleBurst(x, y, c, 50, 1.5, 8.5, 22, 56, 3, 8);
  spawnParticleBurst(x, y, color(255, 255, 255), 18, 0.8, 4.2, 14, 24, 1, 4);
  spawnShockwave(x, y, c, 180, 5);
  camShake = max(camShake, 14);
  flashAlpha = max(flashAlpha, 95);
}

function drawParticles() {
  push();
  blendMode(ADD);
  noStroke();

  for (let p of particles) {
    let lifeT = p.life / p.maxLife;
    let a = 255 * lifeT;

    fill(red(p.color), green(p.color), blue(p.color), a * 0.5);
    circle(p.x, p.y, p.size * 3.2);

    fill(red(p.color), green(p.color), blue(p.color), a);
    circle(p.x, p.y, p.size);
  }

  pop();
}

function updateParticles() {
  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.vy += 0.02;
    p.life--;
  }

  particles = particles.filter(p => p.life > 0);
}

function drawShockwaves() {
  for (let s of shockwaves) {
    let t = s.life / s.maxLife;
    noFill();
    stroke(red(s.color), green(s.color), blue(s.color), 130 * t);
    strokeWeight(s.weight * t);
    circle(s.x, s.y, s.r);

    push();
    blendMode(ADD);
    noFill();
    stroke(red(s.color), green(s.color), blue(s.color), 60 * t);
    strokeWeight(s.weight * 3 * t);
    circle(s.x, s.y, s.r + 8);
    pop();
  }
}

function updateShockwaves() {
  for (let s of shockwaves) {
    s.r += (s.maxR - s.r) * 0.18;
    s.life--;
  }

  shockwaves = shockwaves.filter(s => s.life > 0);
}

function drawVignette() {
  push();
  noStroke();
  for (let i = 0; i < 10; i++) {
    let inset = i * 24;
    fill(0, 0, 0, 6);
    rect(inset, inset, width - inset * 2, height - inset * 2, 30);
  }
  pop();
}

function drawGridAura() {
  push();
  stroke(30, 60, 80, 18);
  strokeWeight(1);

  for (let x = 0; x < width; x += 50) {
    line(x, 0, x, height);
  }

  for (let y = 0; y < height; y += 50) {
    line(0, y, width, y);
  }

  pop();
}

// =====================================================
// MAIN LOOP
// =====================================================

function draw() {
  background(3, 8, 14);

  let sx = random(-camShake, camShake);
  let sy = random(-camShake, camShake);
  camShake *= 0.88;
  flashAlpha *= 0.9;

  push();
  translate(sx, sy);

  drawGridAura();

  if (random(1) < 0.08 && foods.length < 400) {
    foods.push({
      x: random(width),
      y: random(height),
      energy: random(20, 50),
      pulse: random(TWO_PI)
    });
  }

  // FOOD
  for (let food of foods) {
    food.pulse += 0.04;
    let pulseSize = 6 + sin(food.pulse) * 1.5;
    glowCircle(food.x, food.y, 10 + sin(food.pulse) * 2, color(0, 255, 100), 3, 0.8);
    noStroke();
    fill(0, 255, 120, 220);
    circle(food.x, food.y, pulseSize);
  }

  // OBSTACLES
  for (let obstacle of obstacles) {
    glowCircle(obstacle.x, obstacle.y, obstacle.r * 0.8, color(90, 100, 120), 2, 0.45);

    fill(40, 46, 58, 220);
    circle(obstacle.x, obstacle.y, obstacle.r * 2);

    noFill();
    stroke(120, 130, 150, 35);
    strokeWeight(2);
    circle(obstacle.x, obstacle.y, obstacle.r * 2.15);
  }

  let newborns = [];

  // =====================================================
  // AGENTS
  // =====================================================

  for (let agent of agents) {
    if (agent.dead) {
      if (millis() - agent.deathTimer > 1200) {
        agent.remove = true;
      }
      continue;
    }

    agent.age++;
    agent.energy -= 0.02;
    agent.reproductionCooldown = max(0, agent.reproductionCooldown - 1);

    let movementCost = abs(agent.vx) * 0.003 + abs(agent.vy) * 0.003;
    agent.energy -= movementCost;

    if (agent.energy <= 0 || agent.age > 25000) {
      agent.dead = true;
      agent.deathTimer = millis();
      triggerKillEffect(agent.x, agent.y, color(255, 140, 60));
      continue;
    }

    let avoidX = 0;
    let avoidY = 0;
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let foodForceX = 0;
    let foodForceY = 0;
    let fearX = 0;
    let fearY = 0;
    let obstacleForceX = 0;
    let obstacleForceY = 0;
    let neighbors = 0;

    for (let other of agents) {
      if (other === agent || other.dead) continue;

      let dx = agent.x - other.x;
      let dy = agent.y - other.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d > 0 && d < 50) {
        avoidX += dx / d;
        avoidY += dy / d;

        alignX += other.vx * other.leadership;
        alignY += other.vy * other.leadership;

        cohesionX += other.x;
        cohesionY += other.y;
        neighbors++;

        agent.alertLevel = max(agent.alertLevel, other.alertLevel * 0.985);

        if (other.infected && random(1) > agent.immunity) {
          if (random(1) < 0.002) {
            agent.infected = true;
            spawnParticleBurst(agent.x, agent.y, color(80, 255, 80), 10, 0.5, 2.2, 12, 22, 1, 3);
          }
        }
      }
    }

    let closestFood = null;
    let closestFoodDistance = Infinity;

    for (let food of foods) {
      let dx = food.x - agent.x;
      let dy = food.y - agent.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < closestFoodDistance) {
        closestFoodDistance = d;
        closestFood = food;
      }
    }

    if (closestFood) {
      foodForceX = closestFood.x - agent.x;
      foodForceY = closestFood.y - agent.y;

      let fd = sqrt(foodForceX * foodForceX + foodForceY * foodForceY);
      if (fd > 0) {
        foodForceX /= fd;
        foodForceY /= fd;
      }

      if (closestFoodDistance < 10) {
        agent.energy += closestFood.energy;
        agent.energy = min(agent.energy, 180);

        spawnParticleBurst(closestFood.x, closestFood.y, color(0, 255, 120), 8, 0.4, 2.5, 10, 18, 1, 3);

        let idx = foods.indexOf(closestFood);
        if (idx > -1) foods.splice(idx, 1);
      }
    }

    for (let predator of predators) {
      if (predator.dead) continue;

      let dx = agent.x - predator.x;
      let dy = agent.y - predator.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < 190 && d > 0) {
        let fearBoost = predator.state === "burst" ? 1.9 : predator.state === "recover" ? 0.7 : 1.2;
        fearX += (dx / d) * fearBoost;
        fearY += (dy / d) * fearBoost;

        agent.alertLevel = 1;
        agent.memoryX = predator.x;
        agent.memoryY = predator.y;

        if (frameCount % 8 === 0) {
          dangerZones.push({
            x: predator.x,
            y: predator.y,
            life: 100,
            color: color(255, 60, 60)
          });
        }
      }
    }

    for (let apex of apexPredators) {
      if (apex.dead) continue;

      let dx = agent.x - apex.x;
      let dy = agent.y - apex.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < 250 && d > 0) {
        fearX += (dx / d) * 2.8;
        fearY += (dy / d) * 2.8;
        agent.alertLevel = 1;
      }
    }

    let memDX = agent.x - agent.memoryX;
    let memDY = agent.y - agent.memoryY;
    let memDist = sqrt(memDX * memDX + memDY * memDY);

    if (memDist < 200 && memDist > 0) {
      fearX += (memDX / memDist) * 0.2;
      fearY += (memDY / memDist) * 0.2;
    }

    for (let obstacle of obstacles) {
      let dx = agent.x - obstacle.x;
      let dy = agent.y - obstacle.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < obstacle.r + 40 && d > 0) {
        let push = (obstacle.r + 40 - d) / (obstacle.r + 40);
        obstacleForceX += (dx / d) * push;
        obstacleForceY += (dy / d) * push;
      }
    }

    agent.vx += avoidX * agent.separationStrength * 0.4;
    agent.vy += avoidY * agent.separationStrength * 0.4;

    if (neighbors > 0) {
      alignX /= neighbors;
      alignY /= neighbors;

      agent.vx += alignX * 0.01;
      agent.vy += alignY * 0.01;

      cohesionX /= neighbors;
      cohesionY /= neighbors;

      let cohesionDX = cohesionX - agent.x;
      let cohesionDY = cohesionY - agent.y;

      agent.vx += cohesionDX * agent.cohesionStrength;
      agent.vy += cohesionDY * agent.cohesionStrength;
    }

    agent.vx += fearX * agent.fearStrength * (1 + agent.alertLevel * 2.6);
    agent.vy += fearY * agent.fearStrength * (1 + agent.alertLevel * 2.6);

    agent.vx += foodForceX * 0.03;
    agent.vy += foodForceY * 0.03;

    agent.vx += obstacleForceX * 0.4;
    agent.vy += obstacleForceY * 0.4;

    limitVelocity(agent, agent.maxSpeed);

    agent.x += agent.vx;
    agent.y += agent.vy;

    agent.vx *= 0.98;
    agent.vy *= 0.98;

    bounceInside(agent, agent.size * 0.5);

    agent.alertLevel *= 0.995;

    if (agent.infected) {
      agent.energy -= 0.03;
      agent.infectionLevel += 0.0005;

      if (agent.infectionLevel > 10) {
        agent.dead = true;
        agent.deathTimer = millis();
        triggerKillEffect(agent.x, agent.y, color(120, 255, 80));
        continue;
      }
    }

    if (agent.energy > 140 && agent.reproductionCooldown <= 0 && random(1) < 0.002) {
      let mate = null;

      for (let other of agents) {
        if (other !== agent && !other.dead) {
          let dx = other.x - agent.x;
          let dy = other.y - agent.y;
          let d = sqrt(dx * dx + dy * dy);

          if (d < 60 && other.energy > 80) {
            mate = other;
            break;
          }
        }
      }

      if (mate) {
        agent.energy -= 40;
        mate.energy -= 20;
        agent.reproductionCooldown = 600;
        mate.reproductionCooldown = 600;

        newborns.push(
          createAgent(
            agent.x + random(-10, 10),
            agent.y + random(-10, 10),
            random([agent, mate])
          )
        );

        spawnParticleBurst(agent.x, agent.y, color(255, 210, 80), 10, 0.3, 1.8, 16, 26, 1, 3);
      }
    }

    let r = 20;
    let g = 20;
    let b = 20;

    b += map(agent.fearStrength, 0.005, 0.06, 0, 220);
    g += map(agent.maxSpeed, 1, 5, 0, 220);

    let sep = map(agent.separationStrength, 0.005, 0.05, 0, 180);
    r += sep;
    b += sep;

    let coh = map(agent.cohesionStrength, 0.0001, 0.003, 0, 220);
    r += coh;
    g += coh * 0.6;

    r += agent.leadership * 60;
    g += agent.leadership * 40;
    r += agent.alertLevel * 100;

    if (agent.infected) {
      g += 120;
      r -= 50;
    }

    r = constrain(r, 0, 255);
    g = constrain(g, 0, 255);
    b = constrain(b, 0, 255);

    let ac = color(r, g, b);

    if (agent.alertLevel > 0.3) {
      glowTriangle(agent.x, agent.y, atan2(agent.vy, agent.vx), 15, ac, 0.8 + agent.alertLevel);
    }

    push();
    translate(agent.x, agent.y);
    rotate(atan2(agent.vy, agent.vx));
    noStroke();
    fill(r, g, b);
    triangle(-10, -7, -10, 7, 15, 0);
    pop();
  }

  agents.push(...newborns);
  agents = agents.filter(a => !a.remove);

  if (!apexSpawned && agents.filter(a => !a.dead).length === 0) {
    spawnApexPredator();
    apexSpawned = true;
  }

  // =====================================================
  // COOPERATIVE PREDATORS
  // =====================================================

  let sharedTarget = chooseSharedTarget();

  for (let i = 0; i < predators.length; i++) {
    let predator = predators[i];

    if (predator.dead) {
      if (millis() - predator.deathTimer > 1200) predator.remove = true;
      continue;
    }

    let steerX = 0;
    let steerY = 0;
    predator.mode = "hunt";

    for (let apex of apexPredators) {
      if (apex.dead) continue;

      let dxA = apex.x - predator.x;
      let dyA = apex.y - predator.y;
      let dApex = sqrt(dxA * dxA + dyA * dyA);

      let lockedTarget = null;
      if (apex.targetId !== null) {
        lockedTarget = predators.find(p => p.id === apex.targetId && !p.dead);
      }

      let nearbyFriends = 0;
      for (let other of predators) {
        if (other === predator || other.dead) continue;
        let d = sqrt(distSq(predator.x, predator.y, other.x, other.y));
        if (d < 120) nearbyFriends++;
      }

      let isLockedVictim = lockedTarget && lockedTarget.id === predator.id;
      let isIsolated = nearbyFriends === 0;

      if (isLockedVictim || (isIsolated && dApex < 240)) {
        predator.mode = "flee";

        if (dApex > 0) {
          steerX -= (dxA / dApex) * 2.4;
          steerY -= (dyA / dApex) * 2.4;
        }
      } else if (lockedTarget && lockedTarget.id !== predator.id) {
        predator.mode = "fight";

        let helpDX = apex.x - predator.x;
        let helpDY = apex.y - predator.y;
        let helpD = sqrt(helpDX * helpDX + helpDY * helpDY);

        if (helpD > 0) {
          steerX += (helpDX / helpD) * 1.8;
          steerY += (helpDY / helpD) * 1.8;
        }
      } else if (dApex < 220) {
        predator.mode = "flee";

        if (dApex > 0) {
          steerX -= (dxA / dApex) * 1.6;
          steerY -= (dyA / dApex) * 1.6;
        }
      }
    }

    for (let j = 0; j < predators.length; j++) {
      if (i === j) continue;

      let other = predators[j];
      if (other.dead) continue;

      let dx = predator.x - other.x;
      let dy = predator.y - other.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d > 0 && d < 80) {
        steerX += (dx / d) * 0.5;
        steerY += (dy / d) * 0.5;
      }
    }

    if (sharedTarget && !sharedTarget.dead && apexPredators.filter(a => !a.dead).length === 0) {
      if (predator.targetId !== sharedTarget.id) {
        predator.targetId = sharedTarget.id;
        predator.targetLockTime = 0;
      } else {
        predator.targetLockTime++;
      }

      let predictTime = predator.state === "burst" ? 25 : 14;
      let predictedX = sharedTarget.x + sharedTarget.vx * predictTime;
      let predictedY = sharedTarget.y + sharedTarget.vy * predictTime;

      predictedX = constrain(predictedX, 0, width);
      predictedY = constrain(predictedY, 0, height);

      let directAngle = atan2(predictedY - predator.y, predictedX - predator.x);
      let roleOffset = 0;
      let orbitRadius = 0;

      if (predator.role === 0) {
        roleOffset = 0;
        orbitRadius = predator.state === "burst" ? 0 : 25;
      } else if (predator.role === 1) {
        roleOffset = -0.9;
        orbitRadius = predator.state === "burst" ? 35 : 65;
      } else {
        roleOffset = 0.9;
        orbitRadius = predator.state === "burst" ? 35 : 65;
      }

      let approachAngle = directAngle + roleOffset;
      let desiredX = predictedX - cos(approachAngle) * orbitRadius;
      let desiredY = predictedY - sin(approachAngle) * orbitRadius;

      let dx = desiredX - predator.x;
      let dy = desiredY - predator.y;
      let d = sqrt(dx * dx + dy * dy);
      let distToTarget = sqrt(distSq(predator.x, predator.y, sharedTarget.x, sharedTarget.y));

      updatePredatorState(predator, distToTarget);

      if (d > 0) {
        dx /= d;
        dy /= d;

        let stateMultiplier = predator.state === "burst" ? 2.1 : predator.state === "recover" ? 0.7 : 1.0;
        steerX += dx * predator.aggression * 1.2 * stateMultiplier;
        steerY += dy * predator.aggression * 1.2 * stateMultiplier;
      }

      if (distToTarget < 100) {
        let closeDX = sharedTarget.x - predator.x;
        let closeDY = sharedTarget.y - predator.y;
        let closeD = sqrt(closeDX * closeDX + closeDY * closeDY);

        if (closeD > 0) {
          let pull = predator.state === "burst" ? 0.28 : 0.12;
          steerX += (closeDX / closeD) * pull;
          steerY += (closeDY / closeD) * pull;
        }
      }

      applyFearShockwave(sharedTarget, distToTarget);

      if (distToTarget < 18) {
        sharedTarget.dead = true;
        sharedTarget.deathTimer = millis();
        rewardSuccessfulHunt(predator);
        triggerKillEffect(sharedTarget.x, sharedTarget.y, predator.color);
      }

      if (predator.targetLockTime > 500 && distToTarget > 260) {
        penalizeFailedHunt(predator);
      }
    } else {
      predator.targetId = null;
      predator.targetLockTime = 0;
      updatePredatorState(predator, Infinity);

      if (predator.mode === "hunt") {
        steerX += random(-0.08, 0.08);
        steerY += random(-0.08, 0.08);
      }
    }

    for (let obstacle of obstacles) {
      let dx = predator.x - obstacle.x;
      let dy = predator.y - obstacle.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < obstacle.r + 70 && d > 0) {
        let push = (obstacle.r + 70 - d) / (obstacle.r + 70);
        steerX += (dx / d) * push * 0.8;
        steerY += (dy / d) * push * 0.8;
      }
    }

    predator.vx += steerX;
    predator.vy += steerY;

    limitVelocity(predator, predator.maxSpeed);

    predator.x += predator.vx;
    predator.y += predator.vy;

    let friction = predator.state === "burst" ? 0.97 : predator.state === "recover" ? 0.90 : 0.94;
    predator.vx *= friction;
    predator.vy *= friction;

    bounceInside(predator, predator.size * 0.5);

    let pr = red(predator.color);
    let pg = green(predator.color);
    let pb = blue(predator.color);

    if (predator.state === "burst") {
      pr = min(255, pr + 40);
      pg = max(0, pg - 10);
    } else if (predator.state === "recover") {
      pb = min(255, pb + 40);
    }

    if (predator.mode === "fight") {
      pr = min(255, pr + 30);
    }

    let pc = color(pr, pg, pb);
    glowTriangle(predator.x, predator.y, atan2(predator.vy, predator.vx), 25, pc, predator.state === "burst" ? 1.4 : 0.9);

    push();
    translate(predator.x, predator.y);
    rotate(atan2(predator.vy, predator.vx));
    fill(pr, pg, pb);
    noStroke();
    triangle(-18, -12, -18, 12, 25, 0);
    pop();
  }

  predators = predators.filter(p => !p.remove);

  // =====================================================
  // APEX PREDATOR
  // =====================================================

  for (let apex of apexPredators) {
    if (apex.dead) {
      if (millis() - apex.deathTimer > 1500) apex.remove = true;
      continue;
    }

    let target = chooseIsolatedPredatorTarget(apex);
    let steerX = 0;
    let steerY = 0;

    if (target) {
      if (apex.targetId !== target.id) {
        apex.targetId = target.id;
        apex.lockTimer = 0;
      } else {
        apex.lockTimer++;
      }

      let predictTime = 20;
      let predictedX = target.x + target.vx * predictTime;
      let predictedY = target.y + target.vy * predictTime;

      let dx = predictedX - apex.x;
      let dy = predictedY - apex.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d > 0) {
        steerX += (dx / d) * apex.aggression * 2.1;
        steerY += (dy / d) * apex.aggression * 2.1;
      }

      if (d < 26) {
        target.dead = true;
        target.deathTimer = millis();
        triggerBigKillEffect(target.x, target.y, color(60, 160, 255));
      }
    } else {
      apex.targetId = null;
      apex.lockTimer = 0;
      steerX += random(-0.04, 0.04);
      steerY += random(-0.04, 0.04);
    }

    let nearbyPreds = countPredatorsNearApex(apex, 70);

    if (nearbyPreds.length >= 3) {
      apex.health -= 0.45;
      spawnParticleBurst(apex.x, apex.y, color(100, 180, 255), 2, 0.2, 1.4, 8, 16, 1, 2);

      for (let predator of nearbyPreds) {
        let dx = predator.x - apex.x;
        let dy = predator.y - apex.y;
        let d = sqrt(dx * dx + dy * dy);

        if (d > 0) {
          predator.vx += (dx / d) * 0.8;
          predator.vy += (dy / d) * 0.8;
        }
      }
    }

    for (let obstacle of obstacles) {
      let dx = apex.x - obstacle.x;
      let dy = apex.y - obstacle.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d < obstacle.r + 90 && d > 0) {
        let push = (obstacle.r + 90 - d) / (obstacle.r + 90);
        steerX += (dx / d) * push * 1.1;
        steerY += (dy / d) * push * 1.1;
      }
    }

    apex.vx += steerX;
    apex.vy += steerY;

    limitVelocity(apex, apex.maxSpeed);

    apex.x += apex.vx;
    apex.y += apex.vy;

    apex.vx *= 0.965;
    apex.vy *= 0.965;

    bounceInside(apex, apex.size * 0.5);

    if (apex.health <= 0) {
      apex.dead = true;
      apex.deathTimer = millis();
      triggerBigKillEffect(apex.x, apex.y, color(100, 180, 255));
    }

    let pulse = 1 + sin(frameCount * 0.12) * 0.08;
    glowTriangle(apex.x, apex.y, atan2(apex.vy, apex.vx), 34 * pulse, apex.color, 1.8);

    push();
    translate(apex.x, apex.y);
    rotate(atan2(apex.vy, apex.vx));
    fill(apex.color);
    stroke(255, 120);
    strokeWeight(1.5);
    triangle(-26, -18, -26, 18, 34, 0);
    pop();
  }

  apexPredators = apexPredators.filter(a => !a.remove);

  // =====================================================
  // DANGER ZONES
  // =====================================================

  for (let zone of dangerZones) {
    zone.life--;

    let t = zone.life / 100;
    push();
    blendMode(ADD);
    noFill();
    stroke(255, 40, 40, 40 * t);
    strokeWeight(8 * t);
    circle(zone.x, zone.y, 50 + (100 - zone.life));
    pop();

    noFill();
    stroke(255, 0, 0, zone.life);
    strokeWeight(1.5);
    circle(zone.x, zone.y, 50 + (100 - zone.life));
  }

  dangerZones = dangerZones.filter(z => z.life > 0);

  updateShockwaves();
  drawShockwaves();

  updateParticles();
  drawParticles();

  drawVignette();

  pop();

  // flash overlay
  if (flashAlpha > 1) {
    noStroke();
    fill(255, 255, 255, flashAlpha);
    rect(0, 0, width, height);
  }

  // =====================================================
  // UI
  // =====================================================

  push();
  noStroke();

  fill(10, 20, 30, 180);
  rect(12, 12, 330, 300, 16);

  blendMode(ADD);
  fill(60, 140, 255, 26);
  rect(12, 12, 330, 300, 16);
  blendMode(BLEND);

  fill(220, 235, 255);
  textSize(16);
  text("Population: " + agents.filter(a => !a.dead).length, 24, 38);
  text("Food: " + foods.length, 24, 62);

  let infectedCount = agents.filter(a => !a.dead && a.infected).length;
  text("Infected: " + infectedCount, 24, 86);
  text("Predators: " + predators.filter(p => !p.dead).length, 24, 110);
  text("Apex Predators: " + apexPredators.filter(a => !a.dead).length, 24, 134);

  if (sharedTarget && !sharedTarget.dead && apexPredators.filter(a => !a.dead).length === 0) {
    fill(255, 130, 130);
    text("Pack target locked", 24, 160);

    noFill();
    stroke(255, 80, 80, 120);
    circle(sharedTarget.x + sx, sharedTarget.y + sy, 30);
  }

  if (apexPredators.length > 0 && !apexPredators[0].dead) {
    fill(120, 180, 255);
    text("APEX PREDATOR RELEASED", 24, 184);
    text("APEX HP: " + nf(apexPredators[0].health, 1, 1), 24, 208);
  }

  fill(255, 190, 190);
  for (let i = 0; i < predators.length; i++) {
    let p = predators[i];
    if (p.dead) continue;

    text(
      "Pred " + i +
      " | " + p.state +
      " | " + (p.mode || "hunt") +
      " | E:" + nf(p.energy, 1, 1) +
      " | A:" + nf(p.aggression, 1, 3) +
      " | S:" + p.huntSuccess +
      " | F:" + p.huntFailures,
      24,
      236 + i * 22
    );
  }

  fill(180, 210, 255, 180);
  text("Press K to erase prey and release apex", 24, 292);

  pop();
}

// =====================================================
// INPUT
// =====================================================

function keyPressed() {
  if (key === 'k' || key === 'K') {
    for (let a of agents) {
      if (!a.dead) {
        triggerKillEffect(a.x, a.y, color(255, 80, 50));
      }
    }
    agents.length = 0;
    return false;
  }
}
