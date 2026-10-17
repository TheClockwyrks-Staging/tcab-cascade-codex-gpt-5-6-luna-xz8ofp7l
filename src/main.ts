import {
  CARD_H,
  CARD_W,
  COLUMN_X,
  FOUNDATION_X,
  GameCore,
  STAGE_H,
  STAGE_W,
  TABLEAU_Y,
  TOP_ROW_Y,
  HUD_Y,
  colorOf,
} from "./game";

const canvasFound = document.querySelector<HTMLCanvasElement>("#stage");
if (!canvasFound) throw new Error("stage canvas missing");
const canvas = canvasFound;
const contextFound = canvas.getContext("2d");
if (!contextFound) throw new Error("2d canvas unavailable");
const ctx = contextFound;
const game = new GameCore();
let autoStep = true;
let overlay = false;
let muted = false;
let lastTime = performance.now();
let scale = 1;
let offsetX = 0;
let offsetY = 0;

const resize = () => {
  const dpr = window.devicePixelRatio || 1;
  scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
  offsetX = (innerWidth - STAGE_W * scale) / 2;
  offsetY = (innerHeight - STAGE_H * scale) / 2;
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
};
resize();
window.addEventListener("resize", resize);
const point = (e: PointerEvent) => ({
  x: (e.clientX - offsetX) / scale,
  y: (e.clientY - offsetY) / scale,
});

function audioCue(cue: string) {
  if (muted) return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ac = new AudioContextClass();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const tones: Record<string, number> = {
      deal: 220,
      turn: 420,
      recycle: 180,
      lift: 520,
      drop: 620,
      reject: 130,
      flip: 360,
      home: 760,
      launch: 280,
      win: 900,
    };
    osc.frequency.value = tones[cue] ?? 300;
    osc.type = cue === "reject" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.045, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.13);
  } catch {
    /* audio is optional */
  }
}
game.setCue(audioCue);

function roundRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
function text(
  value: string,
  x: number,
  y: number,
  size: number,
  fill = "#f5efd7",
  align: CanvasTextAlign = "left",
  weight = "600",
) {
  ctx.font = `${weight} ${size}px Georgia, serif`;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}
function suitMark(suit: string) {
  return suit === "hearts"
    ? "♥"
    : suit === "diamonds"
      ? "♦"
      : suit === "clubs"
        ? "♣"
        : "♠";
}
function rankMark(rank: number) {
  return rank === 1
    ? "A"
    : rank === 11
      ? "J"
      : rank === 12
        ? "Q"
        : rank === 13
          ? "K"
          : String(rank);
}
function card(
  c: { suit: string; rank: number; faceUp?: boolean; x: number; y: number },
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (!c.faceUp) {
    roundRect(c.x, c.y, CARD_W, CARD_H, 9, "#173a45", "#8fc1b5");
    ctx.strokeStyle = "#4d8b80";
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x + 9, c.y + 9, CARD_W - 18, CARD_H - 18);
    ctx.strokeStyle = "#c2dfc8";
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x + 16, c.y + 16, CARD_W - 32, CARD_H - 32);
    text("✦", c.x + 50, c.y + 70, 30, "#9ed0be", "center");
  } else {
    roundRect(c.x, c.y, CARD_W, CARD_H, 9, "#f7f1df", "#d6cdb8");
    const col = colorOf(c.suit as never) === "red" ? "#b53f4a" : "#193b43";
    text(rankMark(c.rank), c.x + 11, c.y + 17, 20, col, "left", "700");
    text(suitMark(c.suit), c.x + 12, c.y + 40, 18, col, "left");
    text(suitMark(c.suit), c.x + 50, c.y + 77, 34, col, "center");
    text(rankMark(c.rank), c.x + 89, c.y + 124, 20, col, "right", "700");
  }
  ctx.restore();
}
function background() {
  ctx.fillStyle = "#071f28";
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  const g = ctx.createRadialGradient(640, 340, 80, 640, 360, 800);
  g.addColorStop(0, "#1a645a");
  g.addColorStop(1, "#0d3b40");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  ctx.fillStyle = "rgba(255,255,255,.025)";
  for (let i = 0; i < 80; i++)
    ctx.fillRect((i * 173) % STAGE_W, (i * 97) % STAGE_H, 1, 1);
}
function pileMark(x: number, y: number, label = "") {
  ctx.setLineDash([7, 6]);
  roundRect(
    x,
    y,
    CARD_W,
    CARD_H,
    9,
    "rgba(3,28,33,.18)",
    "rgba(187,225,194,.36)",
  );
  ctx.setLineDash([]);
  if (label)
    text(label, x + 50, y + 74, 13, "rgba(220,240,214,.55)", "center", "700");
}
function drawTable() {
  for (let i = 0; i < 2; i++) pileMark(224 + i * 122, TOP_ROW_Y);
  for (let i = 0; i < 4; i++)
    pileMark(FOUNDATION_X[i], TOP_ROW_Y, "FOUNDATION");
  for (let i = 0; i < 7; i++) {
    const p = game.tableau[i];
    if (!p.length) pileMark(COLUMN_X[i], TABLEAU_Y);
    let y = TABLEAU_Y;
    p.forEach((c, row) => {
      card({ ...c, x: COLUMN_X[i], y });
      y += row === p.length - 1 ? 0 : c.faceUp ? game.columnOffset(p) : 24;
    });
  }
  if (game.stock.length)
    card({ ...game.stock[game.stock.length - 1], x: 224, y: TOP_ROW_Y });
  if (game.waste.length && game.wasteSets.length)
    card({ ...game.waste[game.waste.length - 1], x: 346, y: TOP_ROW_Y });
  game.foundations.forEach((p, i) => {
    if (p.length)
      card({ ...p[p.length - 1], x: FOUNDATION_X[i], y: TOP_ROW_Y });
  });
  game.flyers.forEach((f) => card({ ...f, x: f.x, y: f.y }));
  if (game.drag)
    game.drag.cards.forEach((c, i) =>
      card({ ...c, x: game.drag!.x, y: game.drag!.y + i * 34 }),
    );
}
function drawHud() {
  ctx.fillStyle = "rgba(3,25,30,.82)";
  ctx.fillRect(0, HUD_Y, STAGE_W, 40);
  text("DRAW ONE", 1220, 700, 13, "#b9d4bd", "right", "700");
  ["NEW GAME", "MENU", muted ? "SOUND OFF" : "SOUND"].forEach((v, i) => {
    const x = [34, 194, 324][i];
    roundRect(
      x,
      686,
      [150, 120, 140][i],
      26,
      6,
      i === game.menuIndex ? "#d49a53" : "#28555a",
      i === game.menuIndex ? "#f4d89c" : "#527f7a",
    );
    text(
      v,
      x + [75, 60, 70][i],
      699,
      12,
      i === game.menuIndex ? "#102d32" : "#e8efd6",
      "center",
      "700",
    );
  });
}
function titleScreen() {
  background();
  text("CASCADE", 640, 188, 82, "#f3e6bd", "center", "700");
  text("KLONDIKE SOLITAIRE", 640, 246, 18, "#a7d2be", "center", "700");
  text(
    "A patient game with a spectacular ending",
    640,
    285,
    16,
    "#bad4c2",
    "center",
    "400",
  );
  ["NEW GAME", "HOW TO PLAY"].forEach((v, i) => {
    roundRect(
      470,
      400 + i * 70,
      340,
      58,
      10,
      i === game.menuIndex ? "#d49a53" : "rgba(24,74,74,.88)",
      "#e6c881",
    );
    text(
      v,
      640,
      429 + i * 70,
      18,
      i === game.menuIndex ? "#16373b" : "#f4efd8",
      "center",
      "700",
    );
  });
  text("DRAW ONE", 640, 585, 14, "#d4dfc9", "center", "700");
}
function howtoScreen() {
  background();
  text("HOW TO PLAY", 640, 90, 38, "#f3e6bd", "center", "700");
  roundRect(
    230,
    145,
    820,
    360,
    18,
    "rgba(4,31,36,.7)",
    "rgba(161,208,184,.35)",
  );
  const lines = [
    "Build all four foundations from ACE to KING, one suit at a time.",
    "Columns build down in rank and alternate color; only a KING fills an empty column.",
    "Turn the STOCK onto the waste. When it runs out, it recycles for another pass.",
    "Drag a card or run to move it. DOUBLE-CLICK a playable card to send it home.",
  ];
  lines.forEach((v, i) =>
    text(v, 280, 205 + i * 66, 18, "#e5ead3", "left", "400"),
  );
  roundRect(500, 590, 280, 54, 10, "#d49a53", "#f1d89a");
  text("BACK", 640, 617, 18, "#16373b", "center", "700");
}
function wonScreen() {
  background();
  drawTable();
  if (game.cascadeDone) {
    ctx.fillStyle = "rgba(4,24,28,.32)";
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    text("YOU WIN", 640, 350, 72, "#f4e5ad", "center", "700");
    text(
      "Tap anywhere for a fresh deal",
      640,
      410,
      17,
      "#d2e0c8",
      "center",
      "400",
    );
  }
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(
    scale * (canvas.width / innerWidth),
    0,
    0,
    scale * (canvas.height / innerHeight),
    offsetX * (canvas.width / innerWidth),
    offsetY * (canvas.height / innerHeight),
  );
  if (game.screen === "title") titleScreen();
  else if (game.screen === "howto") howtoScreen();
  else if (game.screen === "playing") {
    background();
    drawTable();
    drawHud();
  } else wonScreen();
  if (overlay) diagnostics();
}
function diagnostics() {
  const s = game.snapshot();
  roundRect(20, 20, 305, 160, 8, "rgba(3,15,18,.88)", "#8bc5ac");
  const lines = [
    `screen ${s.screen}  mode ${s.dealMode}`,
    `stock ${s.stock.length}  waste ${s.waste.length}`,
    `foundations ${s.foundations.map((p) => p.length).join(" / ")}`,
    `columns ${s.tableau.map((p) => p.length).join(" / ")}`,
    `hand ${s.drag ? s.drag.cards.length : 0}`,
    `cascade ${s.launched} launched / ${s.flyers.length} flying`,
  ];
  lines.forEach((v, i) =>
    text(v, 34, 43 + i * 24, 13, "#d9edd7", "left", "400"),
  );
}
function frame(now: number) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (autoStep) game.update(dt);
  muted = game.muted;
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const p = point(e);
  canvas.setPointerCapture(e.pointerId);
  game.pointerDown(p.x, p.y);
});
canvas.addEventListener("pointermove", (e) => {
  e.preventDefault();
  const p = point(e);
  game.pointerMove(p.x, p.y);
});
canvas.addEventListener("pointerup", (e) => {
  e.preventDefault();
  const p = point(e);
  game.pointerUp(p.x, p.y);
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Backquote") {
    overlay = !overlay;
    return;
  }
  if (
    ![
      "ArrowUp",
      "ArrowDown",
      "KeyW",
      "KeyS",
      "Enter",
      "Space",
      "Escape",
    ].includes(e.code)
  )
    return;
  e.preventDefault();
  if (game.screen === "won") return;
  if (e.code === "ArrowUp" || e.code === "KeyW")
    game.menuIndex =
      (game.menuIndex +
        (game.screen === "howto" ? 0 : (game.screen === "title" ? 2 : 3) - 1)) %
      (game.screen === "title" ? 2 : game.screen === "playing" ? 3 : 1);
  else if (e.code === "ArrowDown" || e.code === "KeyS")
    game.menuIndex =
      (game.menuIndex + 1) %
      (game.screen === "title" ? 2 : game.screen === "playing" ? 3 : 1);
  else if (e.code === "Enter" || e.code === "Space") game.activateMenu();
  else if (e.code === "Escape" && game.screen === "howto") game.activateMenu();
});

type CascadeApi = ReturnType<typeof makeApi>;
function makeApi() {
  return {
    version: 1,
    reset: () => game.reset(),
    snapshot: () => game.snapshot(),
    reconcile: () => game.reconcile(),
    menuItemRect: (i: number) => game.menuItemRect(i),
    setAutoStep: (v: boolean) => {
      autoStep = v;
    },
    advance: (seconds: number, frames = 1) => {
      if (!Number.isFinite(seconds) || !Number.isInteger(frames) || frames < 1)
        throw new Error("invalid advance");
      for (let i = 0; i < frames; i++) game.update(seconds / frames);
      draw();
    },
    setMuted: (v: boolean) => {
      muted = v;
      game.muted = v;
    },
    setScreen: (v: Parameters<GameCore["setScreen"]>[0]) => game.setScreen(v),
    setMenuIndex: (v: number) => game.setMenuIndex(v),
    setTitleIndex: (v: number) => game.setTitleIndex(v),
    addCard: (
      p: "stock" | "waste" | "foundation" | "tableau",
      i: number,
      s: never,
      r: number,
      f: boolean,
    ) => game.addCard(p, i, s, r, f),
    removeCard: (id: number) => game.removeCard(id),
    setCardFaceUp: (id: number, f: boolean) => game.setCardFaceUp(id, f),
    clearPile: (p: "stock" | "waste" | "foundation" | "tableau", i: number) => {
      const pile =
        p === "stock"
          ? game.stock
          : p === "waste"
            ? game.waste
            : p === "foundation"
              ? game.foundations[i]
              : game.tableau[i];
      if (!pile) throw new Error("invalid pile");
      pile.length = 0;
      if (p === "waste") game.wasteSets = [];
    },
    clearTable: () => game.clearTable(),
    addWasteSet: (c: number) => game.addWasteSet(c),
    clearWasteSets: () => game.clearWasteSets(),
    deal: () => game.deal(),
    turnStock: () => game.turnStock(),
    move: (a: never, b: number, c: number, d: never, e: number) =>
      game.move(a, b, c, d, e),
    autoMove: (p: never, i: number) => game.autoMove(p, i),
    pointerDown: (x: number, y: number) => game.pointerDown(x, y),
    pointerMove: (x: number, y: number) => game.pointerMove(x, y),
    pointerUp: (x: number, y: number) => game.pointerUp(x, y),
    setAutoFlip: (v: boolean) => game.setAutoFlip(v),
    setWinDetect: (v: boolean) => game.setWinDetect(v),
    setLaunching: (v: boolean) => game.setLaunching(v),
    setTrailPainting: (v: boolean) => game.setTrailPainting(v),
    addFlyer: (
      s: never,
      r: number,
      x: number,
      y: number,
      vx: number,
      vy: number,
    ) => game.addFlyer(s, r, x, y, vx, vy),
    setFlyerPosition: (id: number, x: number, y: number) =>
      game.setFlyerPosition(id, x, y),
    setFlyerVelocity: (id: number, vx: number, vy: number) =>
      game.setFlyerVelocity(id, vx, vy),
    removeFlyer: (id: number) => game.removeFlyer(id),
    clearFlyers: () => game.clearFlyers(),
    setLaunchClock: (v: number) => game.setLaunchClock(v),
    clearTrail: () => game.clearTrail(),
    drawLaunchVx: () => game.drawLaunchVx(),
  };
}
declare global {
  interface Window {
    __cascade?: CascadeApi;
    webkitAudioContext?: typeof AudioContext;
  }
}
window.__cascade = makeApi();
