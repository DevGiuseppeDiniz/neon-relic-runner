const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("scoreText"),
  best: document.getElementById("bestText"),
  coins: document.getElementById("coinText"),
  panel: document.getElementById("messagePanel"),
  message: document.getElementById("messageText"),
  hint: document.getElementById("tapHint"),
};

const game = {
  mode: "ready",
  w: 0,
  h: 0,
  dpr: 1,
  time: 0,
  speed: 355,
  distance: 0,
  score: 0,
  coins: 0,
  best: Number(localStorage.getItem("neonDashBest") || 0),
  groundY: 0,
  gravity: 2300,
  gravityDir: 1,
  jumpHeld: false,
  holdTime: 0,
  spawnTimer: 0,
  coinTimer: 0,
  portalTimer: 0,
  shake: 0,
  player: {
    x: 96,
    y: 0,
    size: 32,
    vy: 0,
    angle: 0,
    grounded: true,
  },
  obstacles: [],
  coinsList: [],
  portals: [],
  particles: [],
  stars: [],
};

function resize() {
  game.dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.w = window.innerWidth;
  game.h = window.innerHeight;
  canvas.width = Math.floor(game.w * game.dpr);
  canvas.height = Math.floor(game.h * game.dpr);
  canvas.style.width = `${game.w}px`;
  canvas.style.height = `${game.h}px`;
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  game.groundY = game.h * 0.76;
  game.player.x = Math.max(78, game.w * 0.18);
  if (game.mode === "ready") {
    game.player.y = floorY() - game.player.size;
  }
  createStars();
}

function createStars() {
  const amount = Math.max(60, Math.floor((game.w * game.h) / 10500));
  game.stars = Array.from({ length: amount }, () => ({
    x: Math.random() * game.w,
    y: Math.random() * game.h,
    z: 0.25 + Math.random() * 1.5,
    size: 0.7 + Math.random() * 2,
  }));
}

function startGame() {
  game.mode = "playing";
  game.time = 0;
  game.speed = 355;
  game.distance = 0;
  game.score = 0;
  game.coins = 0;
  game.gravityDir = 1;
  game.jumpHeld = false;
  game.holdTime = 0;
  game.spawnTimer = 0.9;
  game.coinTimer = 1.1;
  game.portalTimer = 4.5;
  game.shake = 0;
  game.obstacles = [];
  game.coinsList = [];
  game.portals = [];
  game.particles = [];
  game.player.y = floorY() - game.player.size;
  game.player.vy = 0;
  game.player.angle = 0;
  game.player.grounded = true;
  ui.panel.classList.remove("visible");
  ui.hint.textContent = "TOQUE PARA PULAR";
}

function endGame() {
  game.mode = "over";
  game.best = Math.max(game.best, Math.floor(game.score));
  localStorage.setItem("neonDashBest", String(game.best));
  ui.message.textContent = `Fim da fase. Pontos: ${Math.floor(game.score)} | Moedas: ${game.coins}. Toque para tentar novamente.`;
  ui.panel.classList.add("visible");
  ui.hint.textContent = "TOQUE PARA REINICIAR";
  burst(game.player.x, game.player.y + game.player.size / 2, "#ff4d7d", 34);
  game.shake = 18;
}

function touchStart(event) {
  event.preventDefault();
  if (game.mode !== "playing") {
    startGame();
    return;
  }
  jump();
  game.jumpHeld = true;
  game.holdTime = 0;
}

function touchEnd(event) {
  event.preventDefault();
  game.jumpHeld = false;
  game.holdTime = 0;
}

function jump() {
  if (!game.player.grounded) return;
  game.player.vy = -820 * game.gravityDir;
  game.player.grounded = false;
  burst(game.player.x, game.player.y + game.player.size, "#68e4ff", 12);
}

function floorY() {
  return game.gravityDir === 1 ? game.groundY : game.h * 0.2;
}

function spawnObstacle() {
  const tall = Math.random() > 0.72;
  const double = Math.random() > 0.78;
  const base = floorY();
  const size = tall ? 46 : 34;
  const y = game.gravityDir === 1 ? base - size : base;
  game.obstacles.push({ x: game.w + 50, y, w: size, h: size, type: "spike" });
  if (double) {
    game.obstacles.push({
      x: game.w + 92,
      y: game.gravityDir === 1 ? base - 30 : base,
      w: 30,
      h: 30,
      type: "spike",
    });
  }
}

function spawnCoin() {
  const arc = 74 + Math.random() * 92;
  const y = game.gravityDir === 1 ? floorY() - arc : floorY() + arc;
  game.coinsList.push({ x: game.w + 40, y, r: 12, phase: Math.random() * Math.PI * 2 });
}

function spawnPortal() {
  const y = game.h * 0.48;
  game.portals.push({ x: game.w + 50, y, r: 28, phase: 0 });
}

function update(dt) {
  if (game.mode !== "playing") {
    updateBackground(dt);
    updateParticles(dt);
    return;
  }

  game.time += dt;
  game.speed += dt * 8;
  game.distance += game.speed * dt;
  game.score = game.distance * 0.1 + game.coins * 50;
  game.shake = Math.max(0, game.shake - dt * 42);

  updateBackground(dt);
  updatePlayer(dt);
  updateSpawns(dt);
  updateObjects(dt);
  updateParticles(dt);
}

function updatePlayer(dt) {
  const holdBoost = game.jumpHeld && game.holdTime < 0.13 && !game.player.grounded;
  if (holdBoost) {
    game.player.vy -= 1350 * dt * game.gravityDir;
    game.holdTime += dt;
  }

  game.player.vy += game.gravity * dt * game.gravityDir;
  game.player.y += game.player.vy * dt;
  game.player.angle += (game.player.grounded ? 0.02 : 7.6 * dt) * game.gravityDir;

  const base = floorY();
  if (game.gravityDir === 1 && game.player.y + game.player.size >= base) {
    game.player.y = base - game.player.size;
    game.player.vy = 0;
    game.player.grounded = true;
    game.player.angle = Math.round(game.player.angle / (Math.PI / 2)) * (Math.PI / 2);
  }
  if (game.gravityDir === -1 && game.player.y <= base) {
    game.player.y = base;
    game.player.vy = 0;
    game.player.grounded = true;
    game.player.angle = Math.round(game.player.angle / (Math.PI / 2)) * (Math.PI / 2);
  }
}

function updateSpawns(dt) {
  game.spawnTimer -= dt;
  game.coinTimer -= dt;
  game.portalTimer -= dt;

  if (game.spawnTimer <= 0) {
    spawnObstacle();
    game.spawnTimer = Math.max(0.58, 1.25 - game.time * 0.008 + Math.random() * 0.25);
  }
  if (game.coinTimer <= 0) {
    spawnCoin();
    game.coinTimer = 0.72 + Math.random() * 0.72;
  }
  if (game.portalTimer <= 0 && game.time > 8) {
    spawnPortal();
    game.portalTimer = 7 + Math.random() * 4;
  }
}

function updateObjects(dt) {
  const move = game.speed * dt;
  for (const obstacle of game.obstacles) {
    obstacle.x -= move;
    if (boxHit(playerBox(), obstacle)) {
      endGame();
      return;
    }
  }

  for (const coin of game.coinsList) {
    coin.x -= move;
    coin.phase += dt * 6;
    if (circleBoxHit(coin, playerBox())) {
      const collectedX = coin.x;
      const collectedY = coin.y;
      coin.x = -999;
      game.coins += 1;
      burst(collectedX, collectedY, "#f8d748", 15);
    }
  }

  for (const portal of game.portals) {
    portal.x -= move;
    portal.phase += dt * 5;
    if (circleBoxHit(portal, playerBox())) {
      portal.x = -999;
      game.gravityDir *= -1;
      game.player.vy = -520 * game.gravityDir;
      game.player.grounded = false;
      burst(game.player.x, game.player.y, "#b983ff", 26);
    }
  }

  game.obstacles = game.obstacles.filter((item) => item.x > -80);
  game.coinsList = game.coinsList.filter((item) => item.x > -80);
  game.portals = game.portals.filter((item) => item.x > -90);
}

function updateBackground(dt) {
  for (const star of game.stars) {
    star.x -= game.speed * dt * star.z * 0.18;
    if (star.x < -8) {
      star.x = game.w + 8;
      star.y = Math.random() * game.h;
    }
  }
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function playerBox() {
  const pad = 6;
  return {
    x: game.player.x + pad,
    y: game.player.y + pad,
    w: game.player.size - pad * 2,
    h: game.player.size - pad * 2,
  };
}

function boxHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleBoxHit(circle, box) {
  const x = clamp(circle.x, box.x, box.x + box.w);
  const y = clamp(circle.y, box.y, box.y + box.h);
  return Math.hypot(circle.x - x, circle.y - y) < circle.r;
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 260;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 2 + Math.random() * 4,
      life: 0.45 + Math.random() * 0.5,
      color,
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, game.w, game.h);
  const sx = game.shake ? (Math.random() - 0.5) * game.shake : 0;
  const sy = game.shake ? (Math.random() - 0.5) * game.shake : 0;
  ctx.save();
  ctx.translate(sx, sy);
  drawBackground();
  drawTrack();
  drawCoins();
  drawPortals();
  drawObstacles();
  drawPlayer();
  drawParticles();
  ctx.restore();
  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, game.w, game.h);
  gradient.addColorStop(0, "#07121f");
  gradient.addColorStop(0.52, "#111a29");
  gradient.addColorStop(1, "#070b13");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.w, game.h);

  ctx.save();
  for (const star of game.stars) {
    ctx.globalAlpha = 0.32 + star.z * 0.22;
    ctx.fillStyle = star.z > 1.2 ? "#f8d748" : "#83e9ff";
    ctx.fillRect(star.x, star.y, star.size * 8, star.size);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(104, 228, 255, 0.11)";
  ctx.lineWidth = 1;
  const gap = 46;
  const offset = -(game.distance * 0.18) % gap;
  for (let x = offset; x < game.w + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - game.h * 0.32, game.h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrack() {
  drawPlatform(game.groundY, 1);
  drawPlatform(game.h * 0.2, -1);
}

function drawPlatform(y, dir) {
  ctx.save();
  ctx.strokeStyle = dir === 1 ? "#68e4ff" : "#b983ff";
  ctx.shadowBlur = 20;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(game.w, y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = dir === 1 ? "rgba(104, 228, 255, 0.08)" : "rgba(185, 131, 255, 0.06)";
  ctx.fillRect(0, dir === 1 ? y : 0, game.w, dir === 1 ? game.h - y : y);

  const tile = 36;
  const offset = -(game.distance * 0.42) % tile;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.13)";
  ctx.lineWidth = 1;
  for (let x = offset; x < game.w + tile; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18, y + 18 * dir);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
  ctx.rotate(p.angle);
  ctx.shadowBlur = 26;
  ctx.shadowColor = "#67e8f9";
  ctx.fillStyle = "#e9fbff";
  ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#08121d";
  ctx.fillRect(-8, -8, 6, 6);
  ctx.fillRect(4, -8, 6, 6);
  ctx.fillStyle = "#ff4dab";
  ctx.fillRect(-10, 7, 20, 5);
  ctx.restore();
}

function drawObstacles() {
  for (const o of game.obstacles) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff4d7d";
    ctx.fillStyle = "#ff4d7d";
    ctx.beginPath();
    if (game.gravityDir === 1) {
      ctx.moveTo(0, o.h);
      ctx.lineTo(o.w / 2, 0);
      ctx.lineTo(o.w, o.h);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(o.w / 2, o.h);
      ctx.lineTo(o.w, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCoins() {
  for (const coin of game.coinsList) {
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate(coin.phase);
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#f8d748";
    ctx.strokeStyle = "#f8d748";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, coin.r, coin.r * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPortals() {
  for (const portal of game.portals) {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(portal.phase);
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#b983ff";
    ctx.strokeStyle = "#b983ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, portal.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#68e4ff";
    ctx.beginPath();
    ctx.moveTo(-portal.r, 0);
    ctx.lineTo(portal.r, 0);
    ctx.moveTo(0, -portal.r);
    ctx.lineTo(0, portal.r);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateHud() {
  ui.score.textContent = Math.floor(game.score);
  ui.best.textContent = game.best;
  ui.coins.textContent = game.coins;
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
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
if (window.PointerEvent) {
  window.addEventListener("pointerdown", touchStart, { passive: false });
  window.addEventListener("pointerup", touchEnd, { passive: false });
  window.addEventListener("pointercancel", touchEnd, { passive: false });
} else {
  window.addEventListener("touchstart", touchStart, { passive: false });
  window.addEventListener("touchend", touchEnd, { passive: false });
  window.addEventListener("touchcancel", touchEnd, { passive: false });
  window.addEventListener("mousedown", touchStart);
  window.addEventListener("mouseup", touchEnd);
}
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    touchStart(event);
  }
});

ui.best.textContent = game.best;
resize();
loop();
