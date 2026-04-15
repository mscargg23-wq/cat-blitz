const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const arena = document.getElementById("arena");
const playfield = document.getElementById("playfield");
const effectsLayer = document.getElementById("effectsLayer");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayFootnote = document.getElementById("overlayFootnote");
const startRoundButton = document.getElementById("startRoundButton");
const overlayStartButton = document.getElementById("overlayStartButton");
const showRulesButton = document.getElementById("showRulesButton");
const overlayRulesButton = document.getElementById("overlayRulesButton");
const messageBanner = document.getElementById("messageBanner");
const modeChip = document.getElementById("modeChip");
const targetChip = document.getElementById("targetChip");
const speedChip = document.getElementById("speedChip");
const scoreValue = document.getElementById("scoreValue");
const timerValue = document.getElementById("timerValue");
const comboValue = document.getElementById("comboValue");
const highScoreValue = document.getElementById("highScoreValue");
const hitsValue = document.getElementById("hitsValue");
const missesValue = document.getElementById("missesValue");
const bestComboValue = document.getElementById("bestComboValue");
const accuracyMoodValue = document.getElementById("accuracyMoodValue");
const liveRegion = document.getElementById("liveRegion");

const BEST_SCORE_KEY = "cat-blitz-best-score";
const LANES = [
  { y: 0.16, scale: 0.74 },
  { y: 0.32, scale: 0.82 },
  { y: 0.5, scale: 0.94 },
  { y: 0.68, scale: 1.06 },
  { y: 0.84, scale: 1.18 },
];

const MODES = {
  meadow: {
    name: "Meadow",
    duration: 45,
    missLimit: 8,
    spawnMin: 0.7,
    spawnMax: 1.2,
    speedMin: 170,
    speedMax: 265,
    bonusChance: 0.08,
    speedLabel: "breezy",
  },
  rooftop: {
    name: "Rooftop",
    duration: 40,
    missLimit: 6,
    spawnMin: 0.48,
    spawnMax: 0.88,
    speedMin: 230,
    speedMax: 340,
    bonusChance: 0.11,
    speedLabel: "sharp",
  },
  mayhem: {
    name: "Mayhem",
    duration: 35,
    missLimit: 5,
    spawnMin: 0.28,
    spawnMax: 0.6,
    speedMin: 320,
    speedMax: 470,
    bonusChance: 0.14,
    speedLabel: "feral",
  },
};

const CAT_VARIANTS = [
  {
    className: "cat--ginger",
    points: 12,
    label: "ginger tabby",
    image: "./assets/ginger-cat.svg",
    sizeFactor: 1.04,
    bobFactor: 1,
  },
  {
    className: "cat--silver",
    points: 16,
    label: "silver shorthair",
    image: "./assets/silver-cat.svg",
    sizeFactor: 1.02,
    bobFactor: 0.92,
  },
  {
    className: "cat--kitten",
    points: 18,
    label: "kitten",
    image: "./assets/kitten-cat.svg",
    sizeFactor: 0.9,
    bobFactor: 1.18,
  },
];

const state = {
  mode: "meadow",
  playing: false,
  score: 0,
  hits: 0,
  misses: 0,
  combo: 0,
  bestCombo: 0,
  highScore: Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10) || 0,
  timeLeft: MODES.meadow.duration,
  spawnTimer: 0.6,
  cats: [],
  nextCatId: 1,
  lastTime: 0,
  arenaRect: null,
  rafId: 0,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(value) {
  return `${value.toFixed(1)}s`;
}

function updateArenaRect() {
  state.arenaRect = arena.getBoundingClientRect();
}

function currentMode() {
  return MODES[state.mode];
}

function setMessage(text) {
  messageBanner.textContent = text;
}

function announce(text) {
  liveRegion.textContent = text;
}

function setMode(modeName) {
  state.mode = modeName;
  const mode = currentMode();

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === modeName);
  });

  modeChip.textContent = `Mode: ${mode.name}`;
  targetChip.textContent = `Escapes allowed: ${mode.missLimit}`;
  speedChip.textContent = `Speed: ${mode.speedLabel}`;

  if (!state.playing) {
    timerValue.textContent = formatTime(mode.duration);
    overlayTitle.textContent = `${mode.name} mode is armed`;
    overlayText.textContent =
      `${mode.name} mode runs for ${mode.duration} seconds. Tag every cat before it escapes and avoid empty clicks if you want huge combos.`;
    overlayFootnote.textContent = `Round limit: ${mode.missLimit} escapes. Best score stays saved in this browser.`;
    setMessage(`${mode.name} mode selected. Press start when ready.`);
  }
}

function moodLabel() {
  if (state.hits === 0) {
    return "Steady";
  }
  const accuracy = state.hits / Math.max(1, state.hits + state.misses);
  if (accuracy > 0.9 && state.bestCombo >= 8) {
    return "Laser";
  }
  if (accuracy > 0.78) {
    return "Focused";
  }
  if (accuracy > 0.62) {
    return "Warming";
  }
  return "Scrappy";
}

function syncHud() {
  scoreValue.textContent = `${state.score}`;
  timerValue.textContent = formatTime(state.timeLeft);
  comboValue.textContent = `x${Math.max(1, state.combo)}`;
  highScoreValue.textContent = `${state.highScore}`;
  hitsValue.textContent = `${state.hits}`;
  missesValue.textContent = `${state.misses}`;
  bestComboValue.textContent = `${state.bestCombo}`;
  accuracyMoodValue.textContent = moodLabel();
}

function createCatMarkup(variant) {
  return `
    <span class="cat__shadow"></span>
    <img class="cat__sprite" src="${variant.image}" alt="" draggable="false">
  `;
}

function pickLaneIndex() {
  const counts = LANES.map(() => 0);
  state.cats.forEach((cat) => {
    counts[cat.laneIndex] += 1;
  });
  const minimum = Math.min(...counts);
  const options = counts
    .map((count, index) => ({ count, index }))
    .filter(({ count }) => count === minimum)
    .map(({ index }) => index);

  return options[Math.floor(Math.random() * options.length)];
}

function createCat() {
  updateArenaRect();
  const bounds = state.arenaRect;
  const mode = currentMode();
  const laneIndex = pickLaneIndex();
  const lane = LANES[laneIndex];
  const isGold = Math.random() < mode.bonusChance;
  const variant = isGold
    ? {
        className: "cat--gold cat--ginger",
        points: 36,
        label: "golden tabby",
        image: "./assets/ginger-cat.svg",
        sizeFactor: 1.08,
        bobFactor: 0.98,
      }
    : CAT_VARIANTS[Math.floor(Math.random() * CAT_VARIANTS.length)];
  const size = Math.round((104 * lane.scale + Math.random() * 20) * variant.sizeFactor);
  const direction = Math.random() > 0.5 ? 1 : -1;
  const progressBoost = 1 + (1 - state.timeLeft / mode.duration) * 0.34;
  const speed = randomBetween(mode.speedMin, mode.speedMax) * lane.scale * progressBoost;
  const y = bounds.height * lane.y - size * 0.82;
  const x = direction === 1 ? -size * 1.35 : bounds.width + size * 1.35;
  const wobble = Math.random() * Math.PI * 2;
  const drift = randomBetween(-8, 8);

  const element = document.createElement("button");
  element.type = "button";
  element.className = `cat ${variant.className}`;
  element.style.setProperty("--size", `${size}px`);
  element.innerHTML = createCatMarkup(variant);
  element.setAttribute("aria-label", `Tag the ${variant.label} cat`);

  const cat = {
    id: state.nextCatId,
    x,
    baseY: y,
    direction,
    speed,
    size,
    wobble,
    drift,
    laneIndex,
    points: variant.points,
    isGold,
    bobFactor: variant.bobFactor,
    element,
  };

  state.nextCatId += 1;

  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hitCat(cat, event.clientX, event.clientY);
  });

  playfield.appendChild(element);
  state.cats.push(cat);
  renderCat(cat);
}

function renderCat(cat) {
  const bob = Math.sin(performance.now() / 140 + cat.wobble) * (6 + cat.drift * 0.15) * cat.bobFactor;
  const lean = Math.sin(performance.now() / 170 + cat.wobble) * 1.4;
  cat.element.style.transform = `translate3d(${cat.x}px, ${cat.baseY + bob}px, 0) rotate(${lean}deg)`;
}

function removeCat(cat) {
  state.cats = state.cats.filter((item) => item.id !== cat.id);
  cat.element.remove();
}

function spawnBurst(clientX, clientY, label, isGold) {
  const bounds = state.arenaRect;
  const burst = document.createElement("div");
  burst.className = isGold ? "burst is-gold" : "burst";
  burst.textContent = label;
  burst.style.left = `${clientX - bounds.left}px`;
  burst.style.top = `${clientY - bounds.top}px`;
  effectsLayer.appendChild(burst);
  window.setTimeout(() => burst.remove(), 720);
}

function hitCat(cat, clientX, clientY) {
  if (!state.playing) {
    return;
  }

  const comboMultiplier = 1 + Math.max(0, state.combo - 1) * 0.15;
  const points = Math.round(cat.points * comboMultiplier);
  state.score += points;
  state.hits += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.highScore = Math.max(state.highScore, state.score);
  localStorage.setItem(BEST_SCORE_KEY, `${state.highScore}`);
  state.cats = state.cats.filter((item) => item.id !== cat.id);

  cat.element.classList.add("is-hit");
  spawnBurst(clientX, clientY, cat.isGold ? `+${points} jackpot` : `+${points}`, cat.isGold);
  setMessage(cat.isGold ? "Golden cat tagged. Jackpot." : "Direct hit. Keep the streak alive.");
  announce(`Hit confirmed. Score is now ${state.score}.`);
  syncHud();

  window.setTimeout(() => {
    cat.element.remove();
  }, 180);
}

function whiff(event) {
  if (!state.playing) {
    return;
  }

  if (event.target.closest(".cat")) {
    return;
  }

  if (state.combo > 0) {
    setMessage("Empty click. Combo reset.");
  } else {
    setMessage("No cat there. Stay sharp.");
  }
  state.combo = 0;
  syncHud();
}

function clearCats() {
  playfield.innerHTML = "";
  state.cats = [];
  effectsLayer.innerHTML = "";
}

function endRound(reason) {
  state.playing = false;
  overlay.classList.remove("is-hidden");

  const summary =
    reason === "timer"
      ? `You finished the round with ${state.score} points, ${state.hits} hits, and a best combo of ${state.bestCombo}.`
      : `The cats slipped away too often. Final score: ${state.score}, with ${state.hits} clean hits and ${state.misses} escapes.`;

  overlayTitle.textContent = reason === "timer" ? "Round complete" : "Too many escapes";
  overlayText.textContent = summary;
  overlayFootnote.textContent = `Best score in this browser: ${state.highScore}. Pick a mode and launch another round.`;
  setMessage(reason === "timer" ? "Round over. Ready for another run?" : "Escapes hit the limit. Try a fresh round.");
  announce(summary);
  syncHud();
}

function startRound() {
  const mode = currentMode();
  state.playing = true;
  state.score = 0;
  state.hits = 0;
  state.misses = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.timeLeft = mode.duration;
  state.spawnTimer = 0.25;
  state.lastTime = 0;

  clearCats();
  overlay.classList.add("is-hidden");
  setMessage("Round live. Tag every cat before it escapes.");
  announce(`${mode.name} round started.`);
  syncHud();
  arena.focus();
}

function showRules() {
  if (state.playing) {
    setMessage("Finish the round before opening the rules.");
    return;
  }

  overlay.classList.remove("is-hidden");
  overlayTitle.textContent = "How to play";
  overlayText.textContent =
    "Choose a mode, start the round, then click or tap every cat before it crosses the arena. Golden cats are worth more. Empty taps reset your combo, and escaping cats push you toward the round limit.";
  overlayFootnote.textContent = `Current mode: ${currentMode().name}. Press play when you are ready.`;
  setMessage("Rules opened. Pick a mode and start when ready.");
}

function updateCats(dt) {
  const bounds = state.arenaRect;

  for (const cat of [...state.cats]) {
    cat.x += cat.speed * dt * cat.direction;
    renderCat(cat);

    const escaped =
      (cat.direction === 1 && cat.x > bounds.width + cat.size * 1.35) ||
      (cat.direction === -1 && cat.x < -cat.size * 1.45);

    if (escaped) {
      removeCat(cat);
      state.misses += 1;
      state.combo = 0;
      setMessage(`A cat escaped. ${currentMode().missLimit - state.misses} chances left.`);
      announce("A cat escaped.");
      syncHud();

      if (state.misses >= currentMode().missLimit) {
        endRound("misses");
        return;
      }
    }
  }
}

function maybeSpawn(dt) {
  const mode = currentMode();
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) {
    return;
  }

  createCat();
  state.spawnTimer = randomBetween(mode.spawnMin, mode.spawnMax);
}

function tick(timestamp) {
  if (!state.rafId) {
    return;
  }

  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.04);
  state.lastTime = timestamp;

  if (state.playing) {
    updateArenaRect();
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    maybeSpawn(dt);
    updateCats(dt);
    syncHud();

    if (state.timeLeft <= 0 && state.playing) {
      endRound("timer");
    }
  } else {
    state.cats.forEach(renderCat);
  }

  state.rafId = window.requestAnimationFrame(tick);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state.playing) {
      setMessage("Modes change between rounds.");
      return;
    }
    setMode(button.dataset.mode);
  });
});

startRoundButton.addEventListener("click", startRound);
overlayStartButton.addEventListener("click", startRound);
showRulesButton.addEventListener("click", showRules);
overlayRulesButton.addEventListener("click", showRules);
arena.addEventListener("pointerdown", whiff);
window.addEventListener("resize", updateArenaRect);

setMode(state.mode);
syncHud();
updateArenaRect();

const params = new URLSearchParams(window.location.search);
if (params.get("autostart") === "1") {
  const requestedMode = params.get("mode");
  if (requestedMode && MODES[requestedMode]) {
    setMode(requestedMode);
  }
  startRound();
}

state.rafId = window.requestAnimationFrame(tick);
