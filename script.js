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
  level: document.getElementById("levelText"),
  mode: document.getElementById("modeText"),
  power: document.getElementById("powerText"),
  progress: document.getElementById("progressBar"),
};

const storage = {
  best: "neonDashBest",
  coins: "neonDashCoins",
  skin: "neonDashSkin",
};

const colors = {
  cyan: "#68e4ff",
  mint: "#5eead4",
  gold: "#f8d748",
  rose: "#ff4d7d",
  violet: "#b983ff",
  orange: "#ff8a45",
  ink: "#08121d",
};

const levels = [
  {
    name: "Pulso Inicial",
    distance: 1900,
    speed: 330,
    palette: ["#07121f", "#102035", "#07121f"],
    patterns: ["single", "coins", "platform", "saw"],
  },
  {
    name: "Torres Prismas",
    distance: 2400,
    speed: 370,
    palette: ["#09101c", "#191a35", "#07121f"],
    patterns: ["stairs", "gate", "platform", "double", "power"],
  },
  {
    name: "Gravidade Partida",
    distance: 2900,
    speed: 405,
    palette: ["#07111f", "#18243a", "#160f2a"],
    patterns: ["portal", "ceiling", "saw", "lane", "coins"],
  },
  {
    name: "Zona Wave",
    distance: 3300,
    speed: 435,
    palette: ["#06121f", "#0b2732", "#20122a"],
    patterns: ["mode", "zigzag", "laser", "power", "gate"],
  },
  {
    name: "Labirinto Neon",
    distance: 3800,
    speed: 470,
    palette: ["#07121f", "#251735", "#06282f"],
    patterns: ["gauntlet", "portal", "platform", "laser", "double", "mode"],
  },
];

const game = {
  mode: "ready",
  w: 0,
  h: 0,
  dpr: 1,
  time: 0,
  distance: 0,
  levelIndex: 0,
  levelDistance: 0,
  totalDistance: 0,
  score: 0,
  coins: 0,
  runCoins: 0,
  best: Number(localStorage.getItem(storage.best) || 0),
  bank: Number(localStorage.getItem(storage.coins) || 0),
  speed: 330,
  baseSpeed: 330,
  gravity: 2200,
  gravityDir: 1,
  groundY: 0,
  ceilingY: 0,
  shake: 0,
  slowTimer: 0,
  shieldTimer: 0,
  magnetTimer: 0,
  combo: 1,
  comboTimer: 0,
  perfectTime: 0,
  spawnTimer: 0,
  coinTimer: 0,
  patternCursor: 0,
  jumpHeld: false,
  holdTime: 0,
  lastPressAt: 0,
  lastReleaseAt: 0,
  player: {
    x: 90,
    y: 0,
    size: 30,
    vy: 0,
    angle: 0,
    grounded: true,
    mode: "cube",
    dashReady: true,
    trail: [],
  },
  obstacles: [],
  platforms: [],
  pickups: [],
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
  game.groundY = game.h * 0.78;
  game.ceilingY = game.h * 0.2;
  game.player.size = clamp(Math.round(Math.min(game.w, game.h) * 0.078), 25, 34);
  game.player.x = clamp(game.w * 0.2, 72, 108);
  if (game.mode === "ready") {
    game.player.y = floorY() - game.player.size;
  }
  createStars();
}

function createStars() {
  const amount = Math.max(72, Math.floor((game.w * game.h) / 9000));
  game.stars = Array.from({ length: amount }, () => ({
    x: Math.random() * game.w,
    y: Math.random() * game.h,
    z: 0.25 + Math.random() * 1.7,
    size: 0.7 + Math.random() * 2,
    hue: Math.random() > 0.72 ? colors.gold : colors.cyan,
  }));
}

function currentLevel() {
  return levels[game.levelIndex % levels.length];
}

function resetRun() {
  const level = currentLevel();
  game.mode = "playing";
  game.time = 0;
  game.distance = 0;
  game.levelDistance = 0;
  game.totalDistance = 0;
  game.score = 0;
  game.runCoins = 0;
  game.speed = level.speed;
  game.baseSpeed = level.speed;
  game.gravityDir = 1;
  game.shake = 0;
  game.slowTimer = 0;
  game.shieldTimer = 0;
  game.magnetTimer = 0;
  game.combo = 1;
  game.comboTimer = 0;
  game.perfectTime = 0;
  game.spawnTimer = 0.75;
  game.coinTimer = 0.55;
  game.patternCursor = 0;
  game.jumpHeld = false;
  game.holdTime = 0;
  game.obstacles = [];
  game.platforms = [];
  game.pickups = [];
  game.particles = [];
  game.player.mode = "cube";
  game.player.y = floorY() - game.player.size;
  game.player.vy = 0;
  game.player.angle = 0;
  game.player.grounded = true;
  game.player.dashReady = true;
  game.player.trail = [];
  ui.panel.classList.remove("visible");
  ui.hint.textContent = "TOQUE: PULAR | NO AR: DASH";
}

function finishRun(won = false) {
  game.mode = "over";
  game.best = Math.max(game.best, Math.floor(game.score));
  game.bank += game.runCoins;
  localStorage.setItem(storage.best, String(game.best));
  localStorage.setItem(storage.coins, String(game.bank));
  ui.message.textContent = won
    ? `Fase vencida! Pontos ${Math.floor(game.score)} | Moedas +${game.runCoins}. Toque para continuar.`
    : `Colisao critica. Pontos ${Math.floor(game.score)} | Moedas +${game.runCoins}. Toque para tentar de novo.`;
  ui.panel.classList.add("visible");
  ui.hint.textContent = won ? "TOQUE PARA PROXIMA FASE" : "TOQUE PARA REINICIAR";
  burst(game.player.x, game.player.y + game.player.size / 2, won ? colors.gold : colors.rose, won ? 42 : 30);
  game.shake = won ? 10 : 18;
  if (won) {
    game.levelIndex = (game.levelIndex + 1) % levels.length;
  }
}

function touchStart(event) {
  blockBrowserGesture(event);
  const now = performance.now();
  if (event?.type === "click" && now - game.lastPressAt < 520) return;
  if (now - game.lastPressAt < 50) return;
  game.lastPressAt = now;

  if (game.mode !== "playing") {
    resetRun();
    return;
  }

  if (game.player.mode === "ship") {
    game.jumpHeld = true;
    return;
  }

  if (game.player.mode === "wave") {
    game.jumpHeld = !game.jumpHeld;
    addTrailPulse(colors.violet);
    return;
  }

  if (game.player.grounded) {
    jump();
  } else if (game.player.dashReady) {
    dash();
  }
  game.jumpHeld = true;
  game.holdTime = 0;
}

function touchEnd(event) {
  blockBrowserGesture(event);
  const now = performance.now();
  if (now - game.lastReleaseAt < 45) return;
  game.lastReleaseAt = now;
  if (game.player.mode !== "wave") {
    game.jumpHeld = false;
  }
  game.holdTime = 0;
}

function blockBrowserGesture(event) {
  if (event?.cancelable) event.preventDefault();
}

function jump() {
  game.player.vy = -660 * game.gravityDir;
  game.player.grounded = false;
  game.player.dashReady = true;
  burst(game.player.x, game.player.y + game.player.size, colors.cyan, 12);
}

function dash() {
  game.player.dashReady = false;
  game.player.vy = -500 * game.gravityDir;
  game.slowTimer = Math.max(game.slowTimer, 0.18);
  game.score += 18 * game.combo;
  addTrailPulse(colors.gold);
  burst(game.player.x + game.player.size, game.player.y + game.player.size / 2, colors.gold, 18);
}

function floorY() {
  return game.gravityDir === 1 ? game.groundY : game.ceilingY;
}

function spawnPattern() {
  const level = currentLevel();
  const patterns = level.patterns;
  const name = patterns[game.patternCursor % patterns.length];
  game.patternCursor += 1;
  const variants = {
    single: () => spawnSpikeRow(1),
    double: () => spawnSpikeRow(2 + Math.floor(Math.random() * 2)),
    coins: spawnCoinArc,
    platform: spawnPlatformChallenge,
    saw: spawnSawPair,
    stairs: spawnStairs,
    gate: spawnGate,
    portal: spawnGravityPortal,
    ceiling: spawnCeilingThreat,
    lane: spawnLaneSwap,
    mode: spawnModePortal,
    zigzag: spawnZigZag,
    laser: spawnLaserGate,
    power: spawnPowerUp,
    gauntlet: spawnGauntlet,
  };
  variants[name]?.();
}

function spawnSpikeRow(count) {
  const base = floorY();
  const size = clamp(game.player.size * 0.72, 19, 25);
  const x0 = game.w + 52;
  for (let i = 0; i < count; i += 1) {
    game.obstacles.push({
      x: x0 + i * (size * 0.86),
      y: game.gravityDir === 1 ? base - size : base,
      w: size,
      h: size,
      type: "spike",
    });
  }
}

function spawnCoinArc() {
  const base = floorY();
  const count = 5 + Math.floor(Math.random() * 3);
  const step = 34;
  const lift = clamp(game.player.size * 2.15, 58, 82);
  for (let i = 0; i < count; i += 1) {
    const wave = Math.sin((i / Math.max(1, count - 1)) * Math.PI);
    game.pickups.push({
      x: game.w + 56 + i * step,
      y: game.gravityDir === 1 ? base - lift - wave * 42 : base + lift + wave * 42,
      r: 10,
      kind: "coin",
      phase: i,
    });
  }
  if (Math.random() > 0.35) spawnSpikeRow(1);
}

function spawnPlatformChallenge() {
  const base = floorY();
  const h = clamp(game.player.size * 0.48, 13, 17);
  const w = clamp(game.player.size * (2.1 + Math.random()), 62, 94);
  const lift = clamp(game.player.size * 1.75, 48, 64);
  const x = game.w + 56;
  const y = game.gravityDir === 1 ? base - lift : base + lift - h;
  game.platforms.push({ x, y, w, h, type: "platform" });
  game.platforms.push({ x: x + w + 72, y: y + (game.gravityDir === 1 ? -34 : 34), w: w * 0.82, h, type: "platform" });
  game.obstacles.push({
    x: x + w + 26,
    y: game.gravityDir === 1 ? base - h * 1.55 : base,
    w: h * 1.55,
    h: h * 1.55,
    type: "spike",
  });
}

function spawnSawPair() {
  const base = floorY();
  const r = clamp(game.player.size * 0.55, 15, 21);
  const lift = clamp(game.player.size * 1.9, 52, 72);
  for (let i = 0; i < 2; i += 1) {
    game.obstacles.push({
      x: game.w + 70 + i * 118,
      y: game.gravityDir === 1 ? base - lift - i * 16 : base + lift + i * 16,
      r,
      phase: Math.random() * Math.PI * 2,
      type: "saw",
    });
  }
}

function spawnStairs() {
  const base = floorY();
  const block = clamp(game.player.size * 0.86, 25, 32);
  for (let i = 0; i < 3; i += 1) {
    game.obstacles.push({
      x: game.w + 54 + i * 58,
      y: game.gravityDir === 1 ? base - block * (i + 1) : base + block * i,
      w: block,
      h: block * (i + 1),
      type: "block",
    });
  }
  spawnCoinArc();
}

function spawnGate() {
  const base = floorY();
  const size = clamp(game.player.size * 0.72, 19, 25);
  spawnSpikeRow(1);
  game.obstacles.push({
    x: game.w + 142,
    y: game.gravityDir === 1 ? base - size * 3.1 : base + size * 2,
    w: size * 1.4,
    h: size * 1.4,
    type: "block",
  });
  game.obstacles.push({
    x: game.w + 214,
    y: game.gravityDir === 1 ? base - size : base,
    w: size,
    h: size,
    type: "spike",
  });
}

function spawnGravityPortal() {
  const y = game.h * 0.49;
  game.pickups.push({ x: game.w + 90, y, r: 26, kind: "gravity", phase: 0 });
  spawnSpikeRow(1);
}

function spawnModePortal() {
  const next = game.player.mode === "cube" ? (Math.random() > 0.5 ? "ship" : "wave") : "cube";
  game.pickups.push({ x: game.w + 92, y: game.h * 0.49, r: 25, kind: next, phase: 0 });
  spawnCoinArc();
}

function spawnCeilingThreat() {
  const base = game.ceilingY;
  const size = clamp(game.player.size * 0.7, 18, 24);
  game.obstacles.push({ x: game.w + 70, y: base, w: size, h: size, type: "spikeTop" });
  game.obstacles.push({ x: game.w + 158, y: floorY() - size, w: size, h: size, type: "spike" });
}

function spawnLaneSwap() {
  spawnPlatformChallenge();
  game.pickups.push({ x: game.w + 230, y: game.h * 0.49, r: 23, kind: "gravity", phase: 0 });
}

function spawnZigZag() {
  const gap = 74;
  for (let i = 0; i < 4; i += 1) {
    game.obstacles.push({
      x: game.w + 70 + i * 72,
      y: game.h * (i % 2 ? 0.62 : 0.36),
      r: 17,
      phase: i,
      type: "saw",
    });
    game.pickups.push({ x: game.w + 104 + i * 72, y: game.h * 0.49 + (i % 2 ? -gap : gap), r: 9, kind: "coin", phase: i });
  }
}

function spawnLaserGate() {
  const top = game.ceilingY + 44;
  const bottom = game.groundY - 44;
  const gap = 105;
  const center = clamp(game.h * (0.42 + Math.random() * 0.18), top + gap / 2, bottom - gap / 2);
  game.obstacles.push({ x: game.w + 82, y: top, w: 18, h: center - gap / 2 - top, type: "laser" });
  game.obstacles.push({ x: game.w + 82, y: center + gap / 2, w: 18, h: bottom - center - gap / 2, type: "laser" });
}

function spawnPowerUp() {
  const kinds = ["shield", "slow", "magnet"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  game.pickups.push({
    x: game.w + 90,
    y: game.h * (0.36 + Math.random() * 0.28),
    r: 17,
    kind,
    phase: 0,
  });
  if (Math.random() > 0.4) spawnSawPair();
}

function spawnGauntlet() {
  spawnGate();
  spawnSawPair();
  game.pickups.push({ x: game.w + 300, y: game.h * 0.5, r: 17, kind: "shield", phase: 0 });
}

function update(dt) {
  if (game.mode !== "playing") {
    updateBackground(dt);
    updateParticles(dt);
    return;
  }

  game.time += dt;
  game.slowTimer = Math.max(0, game.slowTimer - dt);
  game.shieldTimer = Math.max(0, game.shieldTimer - dt);
  game.magnetTimer = Math.max(0, game.magnetTimer - dt);
  game.comboTimer = Math.max(0, game.comboTimer - dt);
  if (game.comboTimer === 0) game.combo = 1;

  const level = currentLevel();
  const slowFactor = game.slowTimer > 0 ? 0.66 : 1;
  game.speed = (game.baseSpeed + game.time * 5.2 + game.levelIndex * 18) * slowFactor;
  const move = game.speed * dt;
  game.distance += move;
  game.levelDistance += move;
  game.totalDistance += move;
  game.score += dt * (16 + game.levelIndex * 4) * game.combo;
  game.perfectTime += dt;
  game.shake = Math.max(0, game.shake - dt * 40);

  updateBackground(dt);
  updatePlayer(dt);
  updateSpawns(dt);
  updateObjects(dt);
  updateParticles(dt);
  if (game.levelDistance >= level.distance) {
    finishRun(true);
  }
}

function updatePlayer(dt) {
  const previousY = game.player.y;
  if (game.player.mode === "ship") {
    const lift = game.jumpHeld ? -1450 : 1300;
    game.player.vy += lift * dt * game.gravityDir;
    game.player.vy = clamp(game.player.vy, -520, 520);
    game.player.y += game.player.vy * dt;
    game.player.angle = clamp(game.player.vy / 600, -0.55, 0.55);
    game.player.grounded = false;
  } else if (game.player.mode === "wave") {
    const direction = game.jumpHeld ? -1 : 1;
    game.player.vy = direction * 470 * game.gravityDir;
    game.player.y += game.player.vy * dt;
    game.player.angle = direction * -0.8 * game.gravityDir;
    game.player.grounded = false;
  } else {
    const holdBoost = game.jumpHeld && game.holdTime < 0.08 && !game.player.grounded;
    if (holdBoost) {
      game.player.vy -= 820 * dt * game.gravityDir;
      game.holdTime += dt;
    }
    game.player.vy += game.gravity * dt * game.gravityDir;
    game.player.y += game.player.vy * dt;
    game.player.angle += (game.player.grounded ? 0.02 : 7.6 * dt) * game.gravityDir;
    game.player.grounded = false;
    resolvePlatformLanding(previousY);
  }

  resolveWorldBounds();
  game.player.trail.unshift({ x: game.player.x, y: game.player.y, life: 0.28, mode: game.player.mode });
  game.player.trail = game.player.trail.filter((item) => (item.life -= dt) > 0).slice(0, 12);
}

function resolveWorldBounds() {
  const base = floorY();
  if (game.player.mode === "cube") {
    if (game.gravityDir === 1 && game.player.y + game.player.size >= base) {
      game.player.y = base - game.player.size;
      game.player.vy = 0;
      game.player.grounded = true;
      game.player.dashReady = true;
      snapAngle();
    }
    if (game.gravityDir === -1 && game.player.y <= base) {
      game.player.y = base;
      game.player.vy = 0;
      game.player.grounded = true;
      game.player.dashReady = true;
      snapAngle();
    }
  }

  if (game.player.y < game.ceilingY - game.player.size * 0.2) {
    game.player.y = game.ceilingY - game.player.size * 0.2;
    game.player.vy = Math.max(0, game.player.vy);
  }
  if (game.player.y + game.player.size > game.groundY + game.player.size * 0.2) {
    game.player.y = game.groundY - game.player.size * 0.8;
    game.player.vy = Math.min(0, game.player.vy);
  }
}

function snapAngle() {
  game.player.angle = Math.round(game.player.angle / (Math.PI / 2)) * (Math.PI / 2);
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
        game.player.dashReady = true;
        snapAngle();
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
        game.player.dashReady = true;
        snapAngle();
        return;
      }
    }
  }
}

function updateSpawns(dt) {
  game.spawnTimer -= dt;
  game.coinTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnPattern();
    game.spawnTimer = Math.max(0.54, 1.05 - game.time * 0.006 + Math.random() * 0.28);
  }
  if (game.coinTimer <= 0) {
    if (Math.random() > 0.28) spawnCoinArc();
    game.coinTimer = 1.25 + Math.random() * 1.3;
  }
}

function updateObjects(dt) {
  const move = game.speed * dt;
  for (const platform of game.platforms) platform.x -= move;
  for (const obstacle of game.obstacles) {
    obstacle.x -= move;
    obstacle.phase = (obstacle.phase || 0) + dt * 6;
    if (obstacleHit(obstacle)) {
      if (game.shieldTimer > 0) {
        obstacle.x = -999;
        game.shieldTimer = 0;
        game.combo = Math.min(9, game.combo + 1);
        game.comboTimer = 3.2;
        game.score += 120;
        burst(game.player.x, game.player.y, colors.mint, 24);
      } else {
        finishRun(false);
        return;
      }
    }
  }

  for (const item of game.pickups) {
    item.x -= move;
    item.phase += dt * 5;
    if (game.magnetTimer > 0 && item.kind === "coin") {
      const dx = game.player.x - item.x;
      const dy = game.player.y - item.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist < 180) {
        item.x += (dx / dist) * 280 * dt;
        item.y += (dy / dist) * 280 * dt;
      }
    }
    if (circleBoxHit(item, playerBox())) {
      collectPickup(item);
      item.x = -999;
    }
  }

  game.obstacles = game.obstacles.filter((item) => item.x > -120);
  game.platforms = game.platforms.filter((item) => item.x + item.w > -80);
  game.pickups = game.pickups.filter((item) => item.x > -80);
}

function collectPickup(item) {
  if (item.kind === "coin") {
    game.runCoins += 1;
    game.score += 35 * game.combo;
    game.combo = Math.min(9, game.combo + 1);
    game.comboTimer = 3;
    burst(item.x, item.y, colors.gold, 14);
    return;
  }
  if (item.kind === "gravity") {
    game.gravityDir *= -1;
    game.player.vy = -420 * game.gravityDir;
    game.player.grounded = false;
    addTrailPulse(colors.violet);
    burst(item.x, item.y, colors.violet, 26);
    return;
  }
  if (item.kind === "ship" || item.kind === "wave" || item.kind === "cube") {
    game.player.mode = item.kind;
    game.player.vy = 0;
    addTrailPulse(item.kind === "cube" ? colors.cyan : colors.violet);
    burst(item.x, item.y, colors.cyan, 26);
    return;
  }
  if (item.kind === "shield") {
    game.shieldTimer = 7;
    burst(item.x, item.y, colors.mint, 20);
    return;
  }
  if (item.kind === "slow") {
    game.slowTimer = 5;
    burst(item.x, item.y, colors.violet, 20);
    return;
  }
  if (item.kind === "magnet") {
    game.magnetTimer = 8;
    burst(item.x, item.y, colors.gold, 20);
  }
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
  if (obstacle.type === "saw") return circleBoxHit({ x: obstacle.x, y: obstacle.y, r: obstacle.r * 0.78 }, box);
  if (obstacle.type === "spike" || obstacle.type === "spikeTop") {
    return boxHit(box, {
      x: obstacle.x + obstacle.w * 0.18,
      y: obstacle.y + obstacle.h * 0.16,
      w: obstacle.w * 0.64,
      h: obstacle.h * 0.68,
    });
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

function addTrailPulse(color) {
  game.player.trail.unshift({ x: game.player.x, y: game.player.y, life: 0.4, color, mode: game.player.mode });
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
  drawPickups();
  drawObstacles();
  drawPlayerTrail();
  drawPlayer();
  drawParticles();
  ctx.restore();
  updateHud();
}

function drawBackground() {
  const level = currentLevel();
  const gradient = ctx.createLinearGradient(0, 0, game.w, game.h);
  gradient.addColorStop(0, level.palette[0]);
  gradient.addColorStop(0.55, level.palette[1]);
  gradient.addColorStop(1, level.palette[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.w, game.h);

  ctx.save();
  for (const star of game.stars) {
    ctx.globalAlpha = 0.26 + star.z * 0.2;
    ctx.fillStyle = star.hue;
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
  drawPlatformLine(game.groundY, 1);
  drawPlatformLine(game.ceilingY, -1);
}

function drawPlatformLine(y, dir) {
  ctx.save();
  ctx.strokeStyle = dir === 1 ? colors.cyan : colors.violet;
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
    ctx.shadowColor = colors.mint;
    ctx.fillStyle = colors.mint;
    ctx.fillRect(0, 0, platform.w, platform.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(8, 18, 29, 0.4)";
    const inset = Math.max(4, platform.h * 0.28);
    ctx.fillRect(inset, inset, Math.max(4, platform.w - inset * 2), Math.max(3, platform.h - inset * 2));
    ctx.restore();
  }
}

function drawPlayerTrail() {
  for (const item of game.player.trail) {
    ctx.globalAlpha = Math.max(0, item.life * 1.7);
    ctx.fillStyle = item.color || (item.mode === "wave" ? colors.violet : colors.cyan);
    ctx.fillRect(item.x + 4, item.y + 4, game.player.size - 8, game.player.size - 8);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
  ctx.rotate(p.angle);
  ctx.shadowBlur = game.shieldTimer > 0 ? 34 : 24;
  ctx.shadowColor = game.shieldTimer > 0 ? colors.mint : colors.cyan;

  if (p.mode === "ship") {
    ctx.fillStyle = "#e9fbff";
    ctx.beginPath();
    ctx.moveTo(p.size * 0.6, 0);
    ctx.lineTo(-p.size * 0.45, -p.size * 0.35);
    ctx.lineTo(-p.size * 0.25, 0);
    ctx.lineTo(-p.size * 0.45, p.size * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.rose;
    ctx.fillRect(-p.size * 0.2, -3, p.size * 0.35, 6);
  } else if (p.mode === "wave") {
    ctx.fillStyle = "#e9fbff";
    ctx.beginPath();
    ctx.moveTo(p.size * 0.46, 0);
    ctx.lineTo(-p.size * 0.34, -p.size * 0.42);
    ctx.lineTo(-p.size * 0.1, 0);
    ctx.lineTo(-p.size * 0.34, p.size * 0.42);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#e9fbff";
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(-8, -8, 6, 6);
    ctx.fillRect(4, -8, 6, 6);
    ctx.fillStyle = colors.rose;
    ctx.fillRect(-10, 7, 20, 5);
  }

  if (game.shieldTimer > 0) {
    ctx.rotate(-p.angle);
    ctx.strokeStyle = "rgba(94, 234, 212, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.82, 0, Math.PI * 2);
    ctx.stroke();
  }
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
    ctx.shadowColor = o.type === "block" ? colors.gold : colors.rose;
    if (o.type === "block") {
      ctx.fillStyle = colors.gold;
      ctx.fillRect(0, 0, o.w, o.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(8, 18, 29, 0.34)";
      ctx.fillRect(5, 5, Math.max(4, o.w - 10), Math.max(4, o.h - 10));
    } else if (o.type === "laser") {
      ctx.fillStyle = colors.orange;
      ctx.fillRect(0, 0, o.w, o.h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillRect(5, 0, 2, o.h);
    } else {
      ctx.fillStyle = colors.rose;
      ctx.beginPath();
      if (o.type === "spikeTop" || game.gravityDir === -1) {
        ctx.moveTo(0, 0);
        ctx.lineTo(o.w / 2, o.h);
        ctx.lineTo(o.w, 0);
      } else {
        ctx.moveTo(0, o.h);
        ctx.lineTo(o.w / 2, 0);
        ctx.lineTo(o.w, o.h);
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
  ctx.shadowColor = colors.orange;
  ctx.fillStyle = colors.orange;
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

function drawPickups() {
  for (const item of game.pickups) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.phase);
    const color = pickupColor(item.kind);
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    if (item.kind === "coin") {
      ctx.beginPath();
      ctx.ellipse(0, 0, item.r, item.r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, item.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "900 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pickupLabel(item.kind), 0, 0);
    }
    ctx.restore();
  }
}

function pickupColor(kind) {
  if (kind === "coin") return colors.gold;
  if (kind === "gravity" || kind === "wave") return colors.violet;
  if (kind === "shield" || kind === "magnet") return colors.mint;
  if (kind === "slow") return colors.gold;
  return colors.cyan;
}

function pickupLabel(kind) {
  const labels = { gravity: "G", ship: "S", wave: "W", cube: "C", shield: "O", slow: "T", magnet: "M" };
  return labels[kind] || "?";
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
  const level = currentLevel();
  ui.score.textContent = Math.floor(game.score);
  ui.best.textContent = game.best;
  ui.coins.textContent = `${game.runCoins}/${game.bank}`;
  ui.level.textContent = `${game.levelIndex + 1} ${level.name}`;
  ui.mode.textContent = game.player.mode.toUpperCase();
  const powers = [];
  if (game.shieldTimer > 0) powers.push(`ESC ${Math.ceil(game.shieldTimer)}`);
  if (game.slowTimer > 0) powers.push(`TEMPO ${Math.ceil(game.slowTimer)}`);
  if (game.magnetTimer > 0) powers.push(`IMA ${Math.ceil(game.magnetTimer)}`);
  if (game.combo > 1) powers.push(`x${game.combo}`);
  ui.power.textContent = powers.join(" | ") || "SEM PODER";
  ui.progress.style.width = `${clamp((game.levelDistance / level.distance) * 100, 0, 100)}%`;
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
window.addEventListener("resize", resize);
bindTouchControls(canvas);
bindTouchControls(ui.touchCatcher);
bindTouchControls(document);
bindTouchControls(window);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") touchStart(event);
});

ui.best.textContent = game.best;
resize();
loop();
setInterval(() => loop(performance.now()), 1000 / 60);
