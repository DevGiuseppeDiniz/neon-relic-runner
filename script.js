const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.getElementById("scoreText"),
  best: document.getElementById("bestText"),
  coins: document.getElementById("coinText"),
  panel: document.getElementById("messagePanel"),
  message: document.getElementById("messageText"),
  hint: document.getElementById("tapHint"),
  touchCatcher: document.getElementById("touchCatcher"),
  debugPanel: document.getElementById("debugPanel"),
  debugBridge: document.getElementById("debugBridge"),
  debugCommand: document.getElementById("debugCommand"),
  debugInput: document.getElementById("debugInput"),
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
  ceilingY: 0,
  gravity: 2250,
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
  platforms: [],
  coinsList: [],
  portals: [],
  particles: [],
  stars: [],
  lastPressAt: 0,
  lastReleaseAt: 0,
  lastBridgeCommand: "",
  lastHashCommand: "",
  debug: true,
  debugInput: "nenhum",
  debugBridge: "aguardando",
  debugCommand: "nenhum",
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
  game.groundY = game.h * 0.78;
  game.ceilingY = game.h * 0.21;
  game.player.size = clamp(Math.round(Math.min(game.w, game.h) * 0.082), 26, 34);
  game.player.x = clamp(game.w * 0.2, 72, 108);
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
  game.speed = clamp(game.w * 0.95, 300, 380);
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
  game.platforms = [];
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
  blockBrowserGesture(event);
  const now = performance.now();
  game.debugInput = `${event?.type || "unknown"} down ${Math.floor(now)}`;
  if (event?.type === "click" && now - game.lastPressAt < 520) return;
  if (now - game.lastPressAt < 55) return;
  game.lastPressAt = now;
  if (game.mode !== "playing") {
    startGame();
    return;
  }
  jump();
  game.jumpHeld = true;
  game.holdTime = 0;
}

function touchEnd(event) {
  blockBrowserGesture(event);
  const now = performance.now();
  game.debugInput = `${event?.type || "unknown"} up ${Math.floor(now)}`;
  if (now - game.lastReleaseAt < 45) return;
  game.lastReleaseAt = now;
  game.jumpHeld = false;
  game.holdTime = 0;
}

function handleBridgeCommand(rawCommand) {
  if (!rawCommand || rawCommand === game.lastBridgeCommand) return;
  game.lastBridgeCommand = rawCommand;
  game.debugCommand = String(rawCommand);
  const command = String(rawCommand).split(":")[0].toLowerCase().trim();
  if (command === "down" || command === "tap" || command === "jump" || command === "start") {
    touchStart({ type: "appinventor", cancelable: false });
  }
  if (command === "up" || command === "release") {
    touchEnd({ type: "appinventor", cancelable: false });
  }
}

function pollAppInventorBridge() {
  try {
    const bridge = window.AppInventor || globalThis.AppInventor;
    if (bridge?.getWebViewString) {
      game.debugBridge = "AppInventor.getWebViewString OK";
      handleBridgeCommand(bridge.getWebViewString());
      return;
    }
    game.debugBridge = bridge ? "AppInventor sem getWebViewString" : "AppInventor ausente";
  } catch {
    game.debugBridge = "erro ao ler AppInventor";
    // Some browsers expose no App Inventor bridge outside the APK.
  }
}

function pollHashBridge() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === game.lastHashCommand) return;
  game.lastHashCommand = hash;
  if (hash.toLowerCase().startsWith("tap") || hash.toLowerCase().startsWith("jump")) {
    game.debugCommand = `hash:${hash}`;
    touchStart({ type: "hash", cancelable: false });
    touchEnd({ type: "hash", cancelable: false });
  }
}

function runInitialHashCommand() {
  game.lastHashCommand = "";
  pollHashBridge();
}

function blockBrowserGesture(event) {
  if (event?.cancelable) event.preventDefault();
}

function jump() {
  if (!game.player.grounded) return;
  game.player.vy = -650 * game.gravityDir;
  game.player.grounded = false;
  burst(game.player.x, game.player.y + game.player.size, "#68e4ff", 12);
}

function floorY() {
  return game.gravityDir === 1 ? game.groundY : game.ceilingY;
}

function spawnObstacle() {
  const pattern = Math.random();
  if (pattern < 0.27) {
    spawnSpikeRow(1 + Math.floor(Math.random() * 3));
    return;
  }
  if (pattern < 0.49) {
    spawnBlockAndSpike();
    return;
  }
  if (pattern < 0.66) {
    spawnSaw();
    return;
  }
  if (pattern < 0.86) {
    spawnPlatformChallenge();
    return;
  }
  spawnGate();
}

function spawnSpikeRow(count) {
  const base = floorY();
  const size = clamp(game.player.size * 0.72, 19, 25);
  for (let i = 0; i < count; i += 1) {
    game.obstacles.push({
      x: game.w + 44 + i * (size * 0.88),
      y: game.gravityDir === 1 ? base - size : base,
      w: size,
      h: size,
      type: "spike",
    });
  }
}

function spawnBlockAndSpike() {
  const base = floorY();
  const block = clamp(game.player.size * 0.94, 26, 34);
  const gap = clamp(game.player.size * 2.15, 62, 78);
  const floatingY =
    game.gravityDir === 1 ? base - gap - block : base + gap;
  game.obstacles.push({
    x: game.w + 46,
    y: floatingY,
    w: block * 1.55,
    h: block,
    type: "block",
  });
  game.obstacles.push({
    x: game.w + 118,
    y: game.gravityDir === 1 ? base - block * 0.86 : base,
    w: block * 0.86,
    h: block * 0.86,
    type: "spike",
  });
}

function spawnSaw() {
  const base = floorY();
  const r = clamp(game.player.size * 0.55, 15, 20);
  const lift = clamp(game.player.size * 1.95, 54, 70);
  game.obstacles.push({
    x: game.w + 56,
    y: game.gravityDir === 1 ? base - lift : base + lift,
    r,
    phase: Math.random() * Math.PI * 2,
    type: "saw",
  });
}

function spawnGate() {
  const base = floorY();
  const size = clamp(game.player.size * 0.72, 19, 25);
  spawnSpikeRow(1);
  game.obstacles.push({
    x: game.w + 142,
    y: game.gravityDir === 1 ? base - size * 2.9 : base + size * 1.9,
    w: size * 1.35,
    h: size * 1.35,
    type: "block",
  });
  game.obstacles.push({
    x: game.w + 208,
    y: game.gravityDir === 1 ? base - size : base,
    w: size,
    h: size,
    type: "spike",
  });
}

function spawnPlatformChallenge() {
  const base = floorY();
  const h = clamp(game.player.size * 0.48, 13, 17);
  const w = clamp(game.player.size * (2.15 + Math.random() * 0.9), 62, 94);
  const lift = clamp(game.player.size * 1.65, 46, 60);
  const y = game.gravityDir === 1 ? base - lift : base + lift - h;
  const x = game.w + 48;
  game.platforms.push({
    x,
    y,
    w,
    h,
    type: "platform",
  });
  game.obstacles.push({
    x: x + w + 34,
    y: game.gravityDir === 1 ? base - h * 1.55 : base,
    w: h * 1.55,
    h: h * 1.55,
    type: "spike",
  });
  if (Math.random() > 0.46) {
    game.coinsList.push({
      x: x + w * 0.5,
      y: game.gravityDir === 1 ? y - 24 : y + h + 24,
      r: clamp(game.player.size * 0.3, 8, 11),
      phase: 0,
    });
  }
}

function spawnCoin() {
  const arc = clamp(game.player.size * (2.1 + Math.random() * 1.6), 58, 116);
  const y = game.gravityDir === 1 ? floorY() - arc : floorY() + arc;
  game.coinsList.push({
    x: game.w + 40,
    y,
    r: clamp(game.player.size * 0.32, 9, 12),
    phase: Math.random() * Math.PI * 2,
  });
}

function spawnPortal() {
  const y = game.h * 0.48;
  game.portals.push({ x: game.w + 50, y, r: clamp(game.player.size * 0.82, 22, 28), phase: 0 });
}

function update(dt) {
  if (game.mode !== "playing") {
    updateBackground(dt);
    updateParticles(dt);
    return;
  }

  game.time += dt;
  game.speed += dt * 7;
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
  const previousY = game.player.y;
  const holdBoost = game.jumpHeld && game.holdTime < 0.08 && !game.player.grounded;
  if (holdBoost) {
    game.player.vy -= 850 * dt * game.gravityDir;
    game.holdTime += dt;
  }

  game.player.vy += game.gravity * dt * game.gravityDir;
  game.player.y += game.player.vy * dt;
  game.player.angle += (game.player.grounded ? 0.02 : 7.6 * dt) * game.gravityDir;
  game.player.grounded = false;

  resolvePlatformLanding(previousY);
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

function resolvePlatformLanding(previousY) {
  const boxLeft = game.player.x + 5;
  const boxRight = game.player.x + game.player.size - 5;
  for (const platform of game.platforms) {
    const overlapsX = boxRight > platform.x && boxLeft < platform.x + platform.w;
    if (!overlapsX) continue;
    if (game.gravityDir === 1 && game.player.vy >= 0) {
      const previousBottom = previousY + game.player.size;
      const currentBottom = game.player.y + game.player.size;
      if (previousBottom <= platform.y + 4 && currentBottom >= platform.y) {
        game.player.y = platform.y - game.player.size;
        game.player.vy = 0;
        game.player.grounded = true;
        game.player.angle = Math.round(game.player.angle / (Math.PI / 2)) * (Math.PI / 2);
        return;
      }
    }
    if (game.gravityDir === -1 && game.player.vy <= 0) {
      const previousTop = previousY;
      const currentTop = game.player.y;
      const surface = platform.y + platform.h;
      if (previousTop >= surface - 4 && currentTop <= surface) {
        game.player.y = surface;
        game.player.vy = 0;
        game.player.grounded = true;
        game.player.angle = Math.round(game.player.angle / (Math.PI / 2)) * (Math.PI / 2);
        return;
      }
    }
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
  for (const platform of game.platforms) {
    platform.x -= move;
  }
  for (const obstacle of game.obstacles) {
    obstacle.x -= move;
    obstacle.phase = (obstacle.phase || 0) + dt * 6;
    if (obstacleHit(obstacle)) {
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

  game.obstacles = game.obstacles.filter((item) => item.x > -110);
  game.platforms = game.platforms.filter((item) => item.x + item.w > -80);
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
  const pad = Math.max(4, game.player.size * 0.18);
  return {
    x: game.player.x + pad,
    y: game.player.y + pad,
    w: game.player.size - pad * 2,
    h: game.player.size - pad * 2,
  };
}

function obstacleHit(obstacle) {
  const box = playerBox();
  if (obstacle.type === "saw") {
    return circleBoxHit({ x: obstacle.x, y: obstacle.y, r: obstacle.r * 0.78 }, box);
  }
  if (obstacle.type === "spike") {
    const spikeBox = {
      x: obstacle.x + obstacle.w * 0.18,
      y: obstacle.y + obstacle.h * 0.18,
      w: obstacle.w * 0.64,
      h: obstacle.h * 0.68,
    };
    return boxHit(box, spikeBox);
  }
  return boxHit(box, obstacle);
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
  drawPlatforms();
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

function drawPlatforms() {
  for (const platform of game.platforms) {
    ctx.save();
    ctx.translate(platform.x, platform.y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#5eead4";
    ctx.fillStyle = "#5eead4";
    ctx.fillRect(0, 0, platform.w, platform.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(8, 18, 29, 0.4)";
    const inset = Math.max(4, platform.h * 0.28);
    ctx.fillRect(inset, inset, Math.max(4, platform.w - inset * 2), Math.max(3, platform.h - inset * 2));
    ctx.restore();
  }
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
    if (o.type === "saw") {
      drawSaw(o);
      ctx.restore();
      continue;
    }
    ctx.translate(o.x, o.y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = o.type === "block" ? "#f8d748" : "#ff4d7d";
    if (o.type === "block") {
      ctx.fillStyle = "#f8d748";
      ctx.fillRect(0, 0, o.w, o.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(8, 18, 29, 0.34)";
      ctx.fillRect(5, 5, Math.max(4, o.w - 10), Math.max(4, o.h - 10));
    } else {
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
    }
    ctx.restore();
  }
}

function drawSaw(o) {
  ctx.translate(o.x, o.y);
  ctx.rotate(o.phase);
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff7a45";
  ctx.fillStyle = "#ff7a45";
  ctx.beginPath();
  const teeth = 14;
  for (let i = 0; i <= teeth; i += 1) {
    const angle = (i / teeth) * Math.PI * 2;
    const radius = i % 2 ? o.r * 0.68 : o.r;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#101927";
  ctx.beginPath();
  ctx.arc(0, 0, o.r * 0.32, 0, Math.PI * 2);
  ctx.fill();
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
  if (game.debug) {
    ui.debugPanel.classList.add("visible");
    ui.debugBridge.textContent = `bridge: ${game.debugBridge}`;
    ui.debugCommand.textContent = `command: ${game.debugCommand}`;
    ui.debugInput.textContent = `input: ${game.debugInput}`;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

let last = performance.now();
function loop(now = performance.now()) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  pollAppInventorBridge();
  pollHashBridge();
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function bindTouchControls(target) {
  target.addEventListener("touchstart", touchStart, { passive: false });
  target.addEventListener("touchend", touchEnd, { passive: false });
  target.addEventListener("touchcancel", touchEnd, { passive: false });
  target.addEventListener("pointerdown", touchStart, { passive: false });
  target.addEventListener("pointerup", touchEnd, { passive: false });
  target.addEventListener("pointercancel", touchEnd, { passive: false });
  target.addEventListener("mousedown", touchStart);
  target.addEventListener("mouseup", touchEnd);
  target.addEventListener("click", touchStart);
}

window.neonDashPress = touchStart;
window.neonDashRelease = touchEnd;
window.neonDashCommand = handleBridgeCommand;
window.addEventListener("resize", resize);
bindTouchControls(canvas);
bindTouchControls(ui.touchCatcher);
bindTouchControls(document);
bindTouchControls(window);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    touchStart(event);
  }
});

ui.best.textContent = game.best;
resize();
runInitialHashCommand();
loop();
