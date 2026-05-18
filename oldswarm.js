let agents = [];
let predator;

function setup() {
  createCanvas(800, 600);

  // Create swarm agents
  for (let i = 0; i < 100; i++) {

    agents.push({
      x: random(width),
      y: random(height),

      vx: random(-2, 2),
      vy: random(-2, 2),

      size: 20,

      dead: false,
      deathTimer: 0
    });

  }

  // Predator
  predator = {
    x: width / 2,
    y: height / 2,

    vx: 3,
    vy: 2,

    size: 35
  };
}

function draw() {

  // Motion trails
  background(10, 40);

  // =========================
  // SWARM AGENTS
  // =========================

  for (let agent of agents) {

    let avoidX = 0;
    let avoidY = 0;

    let alignX = 0;
    let alignY = 0;

    let cohesionX = 0;
    let cohesionY = 0;

    let fearX = 0;
    let fearY = 0;

    let neighborCount = 0;

    // Only living agents move/think
    if (!agent.dead) {

      // -------------------------
      // CHECK NEIGHBORS
      // -------------------------

      for (let other of agents) {

        // Ignore itself or dead agents
        if (agent === other || other.dead) continue;

        let dx = agent.x - other.x;
        let dy = agent.y - other.y;

        let distance = sqrt(dx * dx + dy * dy);

        // Nearby agents
        if (distance < 40) {

          // Separation
          avoidX += dx;
          avoidY += dy;

          // Alignment
          alignX += other.vx;
          alignY += other.vy;

          // Cohesion
          cohesionX += other.x;
          cohesionY += other.y;

          neighborCount++;
        }
      }

      // -------------------------
      // PREDATOR DETECTION
      // -------------------------

      let pdx = agent.x - predator.x;
      let pdy = agent.y - predator.y;

      let predatorDistance = sqrt(pdx * pdx + pdy * pdy);

      if (predatorDistance < 120) {

        fearX += pdx;
        fearY += pdy;
      }

      // -------------------------
      // APPLY FORCES
      // -------------------------

      // Separation
      agent.vx += avoidX * 0.015;
      agent.vy += avoidY * 0.015;

      // Fear
      agent.vx += fearX * 0.02;
      agent.vy += fearY * 0.02;

      // Alignment + Cohesion
      if (neighborCount > 0) {

        // Average neighbor direction
        alignX /= neighborCount;
        alignY /= neighborCount;

        // Alignment force
        agent.vx += alignX * 0.01;
        agent.vy += alignY * 0.01;

        // Average neighbor position
        cohesionX /= neighborCount;
        cohesionY /= neighborCount;

        // Move toward group center
        let cohesionForceX = cohesionX - agent.x;
        let cohesionForceY = cohesionY - agent.y;

        // Cohesion force
        agent.vx += cohesionForceX * 0.0005;
        agent.vy += cohesionForceY * 0.0005;
      }

      // -------------------------
      // LIMIT SPEED
      // -------------------------

      let speed = sqrt(agent.vx * agent.vx + agent.vy * agent.vy);

      let maxSpeed = 3;

      if (speed > maxSpeed) {
        agent.vx = (agent.vx / speed) * maxSpeed;
        agent.vy = (agent.vy / speed) * maxSpeed;
      }

      // -------------------------
      // MOVE
      // -------------------------

      agent.x += agent.vx;
      agent.y += agent.vy;

      // Friction
      agent.vx *= 0.98;
      agent.vy *= 0.98;

      // Screen bounce
      if (agent.x < 0 || agent.x > width) {
        agent.vx *= -1;
      }

      if (agent.y < 0 || agent.y > height) {
        agent.vy *= -1;
      }

      // -------------------------
      // DRAW
      // -------------------------

      push();
      translate(agent.x, agent.y);

      rotate(atan2(agent.vy, agent.vx));

      fill(255);
      noStroke();

      triangle(-10, -7, -10, 7, 15, 0);

      pop();
    }
  }

  // =========================
  // PREDATOR
  // =========================

  let closest = null;
  let closestDistance = Infinity;

  for (let agent of agents) {

    if (agent.dead) continue;

    let dx = agent.x - predator.x;
    let dy = agent.y - predator.y;

    let d = sqrt(dx * dx + dy * dy);

    if (d < closestDistance) {
      closestDistance = d;
      closest = agent;
    }
  }

  if (closest) {

    let dx = closest.x - predator.x;
    let dy = closest.y - predator.y;

    let d = sqrt(dx * dx + dy * dy);

    if (d > 0) {
      predator.vx += (dx / d) * 0.08;
      predator.vy += (dy / d) * 0.08;
    }

    // Kill prey
    if (d < 20) {
      closest.dead = true;
      closest.deathTimer = millis();
    }
  }

  // Predator speed limit
  let predatorSpeed = sqrt(predator.vx * predator.vx + predator.vy * predator.vy);

  let predatorMaxSpeed = 5;

  if (predatorSpeed > predatorMaxSpeed) {
    predator.vx = (predator.vx / predatorSpeed) * predatorMaxSpeed;
    predator.vy = (predator.vy / predatorSpeed) * predatorMaxSpeed;
  }

  // Move predator
  predator.x += predator.vx;
  predator.y += predator.vy;

  predator.vx *= 0.99;
  predator.vy *= 0.99;

  // Bounce
  if (predator.x < 0 || predator.x > width) {
    predator.vx *= -1;
  }

  if (predator.y < 0 || predator.y > height) {
    predator.vy *= -1;
  }

  // Draw predator
  push();
  translate(predator.x, predator.y);

  rotate(atan2(predator.vy, predator.vx));

  fill(255, 0, 0);
  noStroke();

  triangle(-15, -10, -15, 10, 20, 0);

  pop();
}
