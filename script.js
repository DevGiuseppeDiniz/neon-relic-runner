const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  energyText: document.getElementById("energyText"),
  energyBar: document.getElementById("energyBar"),
  comboText: document.getElementById("comboText"),
  comboBar: document.getElementById("comboBar"),
  scoreText: document.getElementById("scoreText"),
  startPanel: document.getElementById("startPanel"),
  gameOverPanel: document.getElementById("gameOverPanel"),
  finalTitle: document.getElementById("finalTitle"),
  finalStats: document.getElementById("finalStats"),
  startButton: document.getElementById("startButton"),
  restartButton: document.getElementById("restartButton"),
  pulseButton: document.getElementById("pulseButton"),
};

const state = {
  running: false,
  over: false,
  score: 0,
  best: Number(localStorage.getItem("neonRelicBest") || 0),
  energy: 100,
  combo: 1,
  comboTimer: 0,
  pulse: 1,
  pulseCooldown: 0,
  speed: 210,
  time: 0,
  spawnTimer: 0,
  relicTimer: 0,
  width: 0,
  height: 0,
  dpr: 1,
  pointer: { active: false, x: 0, y: 0 },
  ship: { x: 0, y: 0, radius: 18, vx: 0, vy: 0 },
  obstacles: [],
  relics: [],
  particles: [],
  stars: [],
};

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = Math.floor(window.innerWidth);
  state.height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.ship.x ||= state.width * 0.24;
  state.ship.y ||= state.height * 0.5;
  makeStars();
}

function makeStars() {
  state.stars = Array.from({ length: Math.max(70, Math.floor(state.width * state.height / 9500)) }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    z: 0.35 + Math.random() * 1.35,
    r: 0.7 + Math.random() * 1.8,
  }));
}

function resetGame() {
  state.running = true;
  state.over = false;
  state.score = 0;
  state.energy = 100;
  state.combo = 1;
  state.comboTimer = 0;
  state.pulse = 1;
  state.pulseCooldown = 0;
  state.speed = 210;
  state.time = 0;
  state.spawnTimer = 0.55;
  state.relicTimer = 0.35;
  state.obstacles = [];
  state.relics = [];
  state.particles = [];
  state.ship.x = state.width * 0.24;
  state.ship.y = state.height * 0.5;
  ui.startPanel.classList.remove("visible");
  ui.gameOverPanel.classList.remove("visible");
}

function finishGame() {
  state.running = false;
  state.over = true;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("neonRelicBest", String(state.best));
  ui.finalTitle.textContent = state.score > 2500 ? "Piloto lendario" : "Missao encerrada";
  ui.finalStats.textContent = `Pontuacao: ${Math.floor(state.score)} | Recorde: ${state.best}`;
  ui.gameOverPanel.classList.add("visible");
}

function spawnObstacle() {
  const lane = 80 + Math.random() * Math.max(80, state.height - 160);
  const size = 24 + Math.random() * 24;
  state.obstacles.push({
    x: state.width + size,
    y: lane,
    radius: size,
    spin: Math.random() * Math.PI,
    kind: Math.random() > 0.72 ? "gate" : "drone",
  });
}

function spawnRelic() {
  const drift = Math.sin(state.time * 1.7) * state.height * 0.22;
  state.relics.push({
    x: state.width + 28,
    y: state.height * 0.5 + drift + (Math.random() - 0.5) * 130,
    radius: 12,
    value: Math.random() > 0.85 ? 90 : 35,
    phase: Math.random() * Math.PI * 2,
  });
}

function addParticles(x, y, color, count = 10, force = 120) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = force * (0.35 + Math.random());
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.5,
      max: 0.95,
      color,
      r: 2 + Math.random() * 4,
    });
  }
}

function activatePulse() {
  if (!state.running || state.pulseCooldown > 0 || state.pulse < 1) return;
  state.pulse = 0;
  state.pulseCooldown = 4.4;
  addParticles(state.ship.x, state.ship.y, "#7dd3fc", 34, 280);
  state.obstacles = state.obstacles.filter((obstacle) => {
    const dx = obstacle.x - state.ship.x;
    const dy = obstacle.y - state.ship.y;
    const hit = Math.hypot(dx, dy) < 170;
    if (hit) {
      state.score += 55 * state.combo;
      addParticles(obstacle.x, obstacle.y, "#facc15", 18, 190);
    }
    return !hit;
  });
}

function update(dt) {
  if (!state.running) return;
  state.time += dt;
  state.speed += dt * 8.5;
  state.score += dt * 14 * state.combo;
  state.energy -= dt * (3.2 + state.time * 0.035);
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer === 0) state.combo = 1;
  if (state.energy <= 0) finishGame();

  const targetX = state.pointer.active ? state.pointer.x : state.width * 0.24;
  const targetY = state.pointer.active ? state.pointer.y : state.height * 0.5 + Math.sin(state.time * 1.5) * 80;
  state.ship.vx += (targetX - state.ship.x) * dt * 9;
  state.ship.vy += (targetY - state.ship.y) * dt * 9;
  state.ship.vx *= 0.83;
  state.ship.vy *= 0.83;
  state.ship.x += state.ship.vx;
  state.ship.y += state.ship.vy;
  state.ship.x = clamp(state.ship.x, 28, state.width - 28);
  state.ship.y = clamp(state.ship.y, 82, state.height - 34);

  state.spawnTimer -= dt;
  state.relicTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = Math.max(0.3, 1.08 - state.time * 0.012 - Math.random() * 0.28);
  }
  if (state.relicTimer <= 0) {
    spawnRelic();
    state.relicTimer = 0.58 + Math.random() * 0.65;
  }

  for (const star of state.stars) {
    star.x -= state.speed * dt * star.z * 0.3;
    if (star.x < -8) {
      star.x = state.width + 8;
      star.y = Math.random() * state.height;
    }
  }

  updateObstacles(dt);
  updateRelics(dt);
  updateParticles(dt);
  state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
  state.pulse = state.pulseCooldown === 0 ? 1 : 1 - state.pulseCooldown / 4.4;
}

function updateObstacles(dt) {
  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt * (obstacle.kind === "gate" ? 0.8 : 1);
    obstacle.y += Math.sin(state.time * 2.6 + obstacle.spin) * dt * 24;
    obstacle.spin += dt * 3;
    const distance = Math.hypot(obstacle.x - state.ship.x, obstacle.y - state.ship.y);
    if (distance < obstacle.radius + state.ship.radius * 0.72) {
      state.energy -= obstacle.kind === "gate" ? 27 : 18;
      state.combo = 1;
      state.comboTimer = 0;
      addParticles(state.ship.x, state.ship.y, "#ff6b7a", 24, 220);
      obstacle.x = -999;
      if (state.energy <= 0) finishGame();
    }
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x > -120);
}

function updateRelics(dt) {
  for (const relic of state.relics) {
    relic.x -= state.speed * dt * 1.05;
    relic.phase += dt * 5;
    relic.y += Math.sin(relic.phase) * dt * 22;
    const distance = Math.hypot(relic.x - state.ship.x, relic.y - state.ship.y);
    if (distance < relic.radius + state.ship.radius) {
      state.score += relic.value * state.combo;
      state.energy = Math.min(100, state.energy + 2.5);
      state.combo = Math.min(9, state.combo + 1);
      state.comboTimer = 3.2;
      addParticles(relic.x, relic.y, relic.value > 50 ? "#facc15" : "#5eead4", 16, 170);
      relic.x = -999;
    }
  }
  state.relics = state.relics.filter((relic) => relic.x > -80);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function draw() {
  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground();
  drawRelics();
  drawObstacles();
  drawShip();
  drawParticles();
  drawPulseRing();
  updateHud();
  requestAnimationFrame(loop);
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, state.width, state.height);
  grd.addColorStop(0, "#07131f");
  grd.addColorStop(0.48, "#101827");
  grd.addColorStop(1, "#060b15");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.12)";
  ctx.lineWidth = 1;
  const gap = 44;
  const offset = (state.time * state.speed * 0.18) % gap;
  for (let x = -gap + offset; x < state.width + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - state.height * 0.28, state.height);
    ctx.stroke();
  }
  for (const star of state.stars) {
    ctx.globalAlpha = 0.35 + star.z * 0.28;
    ctx.fillStyle = star.z > 1.2 ? "#f8d748" : "#98e8ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShip() {
  const { x, y } = state.ship;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(clamp(state.ship.vy / 170, -0.55, 0.55));
  ctx.shadowBlur = 26;
  ctx.shadowColor = "#68e4ff";
  ctx.fillStyle = "#dff9ff";
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.lineTo(-18, -16);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-18, 16);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#00c2ff";
  ctx.beginPath();
  ctx.ellipse(-4, 0, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 106, 182, 0.72)";
  ctx.beginPath();
  ctx.moveTo(-18, -7);
  ctx.lineTo(-42 - Math.random() * 10, 0);
  ctx.lineTo(-18, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawObstacles() {
  for (const obstacle of state.obstacles) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.spin);
    ctx.shadowBlur = 24;
    ctx.shadowColor = obstacle.kind === "gate" ? "#ff6b7a" : "#f472b6";
    ctx.strokeStyle = obstacle.kind === "gate" ? "#ff8c6b" : "#ff6ab6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const sides = obstacle.kind === "gate" ? 6 : 4;
    for (let i = 0; i <= sides; i += 1) {
      const a = (i / sides) * Math.PI * 2;
      const r = obstacle.radius * (i % 2 ? 0.72 : 1);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawRelics() {
  for (const relic of state.relics) {
    ctx.save();
    ctx.translate(relic.x, relic.y);
    ctx.rotate(relic.phase);
    ctx.shadowBlur = 22;
    ctx.shadowColor = relic.value > 50 ? "#facc15" : "#5eead4";
    ctx.fillStyle = relic.value > 50 ? "#f8d748" : "#5eead4";
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? relic.radius * 0.48 : relic.radius;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPulseRing() {
  if (state.pulseCooldown <= 0) return;
  const radius = 170 * (1 - state.pulse);
  ctx.save();
  ctx.strokeStyle = `rgba(125, 211, 252, ${0.34 * (1 - state.pulse)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.ship.x, state.ship.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function updateHud() {
  ui.energyText.textContent = `${Math.max(0, Math.ceil(state.energy))}`;
  ui.energyBar.style.width = `${clamp(state.energy, 0, 100)}%`;
  ui.scoreText.textContent = `${Math.floor(state.score)}`;
  ui.comboText.textContent = `x${state.combo}`;
  ui.comboBar.style.width = `${(state.comboTimer / 3.2) * 100}%`;
  ui.pulseButton.classList.toggle("ready", state.running && state.pulseCooldown === 0);
}

function setPointer(event, active = true) {
  event.preventDefault();
  const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
  state.pointer.active = active;
  state.pointer.x = touch.clientX;
  state.pointer.y = touch.clientY;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

let last = performance.now();
function loop(now = performance.now()) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
}

window.addEventListener("resize", resize);
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture?.(event.pointerId);
  setPointer(event, true);
});
canvas.addEventListener("pointermove", (event) => state.pointer.active && setPointer(event, true));
canvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  state.pointer.active = false;
});
canvas.addEventListener("pointercancel", (event) => {
  event.preventDefault();
  state.pointer.active = false;
});
canvas.addEventListener("touchstart", (event) => setPointer(event, true), { passive: false });
canvas.addEventListener("touchmove", (event) => state.pointer.active && setPointer(event, true), {
  passive: false,
});
canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  state.pointer.active = false;
});
ui.startButton.addEventListener("click", resetGame);
ui.restartButton.addEventListener("click", resetGame);
ui.pulseButton.addEventListener("click", activatePulse);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") activatePulse();
  if (event.code === "Enter" && !state.running) resetGame();
});

resize();
draw();
