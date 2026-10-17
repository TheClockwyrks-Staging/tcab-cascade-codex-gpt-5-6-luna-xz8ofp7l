export const STAGE_W = 1280;
export const STAGE_H = 720;
export const CARD_W = 100;
export const CARD_H = 140;
export const TOP_ROW_Y = 24;
export const TABLEAU_Y = 180;
export const HUD_Y = 680;
export const COLUMN_X = [224, 346, 468, 590, 712, 834, 956];
export const FOUNDATION_X = [590, 712, 834, 956];
export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];
export type Screen = "title" | "howto" | "playing" | "won";
export type PileName = "stock" | "waste" | "foundation" | "tableau";
export type Card = { id: number; suit: Suit; rank: number; faceUp: boolean };
type Flyer = Card & { x: number; y: number; vx: number; vy: number };
type Point = { x: number; y: number };
type Drag = {
  cards: Card[];
  fromPile: PileName;
  fromIndex: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};
type PileRef = { pile: PileName; index: number };

export const colorOf = (suit: Suit): "red" | "black" =>
  suit === "hearts" || suit === "diamonds" ? "red" : "black";
const otherColor = (a: Card, b: Card) => colorOf(a.suit) !== colorOf(b.suit);

export class GameCore {
  screen: Screen = "title";
  menuIndex = 0;
  titleIndex = 0;
  stock: Card[] = [];
  waste: Card[] = [];
  wasteSets: number[] = [];
  foundations: Card[][] = [[], [], [], []];
  tableau: Card[][] = [[], [], [], [], [], [], []];
  drag: Drag | null = null;
  pointer: Point & { down: boolean } = { x: 0, y: 0, down: false };
  lastPress: { x: number; y: number; at: number } | null = null;
  simTime = 0;
  autoFlip = true;
  winDetect = true;
  launching = true;
  trailPainting = true;
  launchClock = 0;
  private launchCursor = 0;
  launched = 0;
  flyers: Flyer[] = [];
  cascadeDone = false;
  trailStamps = 0;
  nextId = 1;
  private painted: Card[] = [];
  muted = false;
  private emit: (cue: string) => void = () => undefined;

  setCue(fn: (cue: string) => void) {
    this.emit = fn;
  }
  private cue(cue: string) {
    this.emit(cue);
  }
  private allPiles(): Card[][] {
    return [this.stock, this.waste, ...this.foundations, ...this.tableau];
  }
  private pile(name: PileName, index: number): Card[] {
    if (name === "stock" || name === "waste") {
      if (index !== 0) throw new Error("invalid pile index");
      return name === "stock" ? this.stock : this.waste;
    }
    const list = name === "foundation" ? this.foundations : this.tableau;
    if (index < 0 || index >= list.length)
      throw new Error("invalid pile index");
    return list[index];
  }
  reset() {
    this.screen = "title";
    this.menuIndex = 0;
    this.titleIndex = 0;
    this.clearTable();
    this.drag = null;
    this.pointer = { x: 0, y: 0, down: false };
    this.lastPress = null;
    this.autoFlip = true;
    this.winDetect = true;
    this.launching = true;
    this.trailPainting = true;
    this.launchClock = 0;
    this.launchCursor = 0;
    this.launched = 0;
    this.flyers = [];
    this.cascadeDone = false;
    this.clearTrail();
    this.simTime = 0;
  }
  deal() {
    this.clearTable();
    this.drag = null;
    this.flyers = [];
    this.launched = 0;
    this.launchClock = 0;
    this.launchCursor = 0;
    this.cascadeDone = false;
    this.clearTrail();
    const deck: Card[] = [];
    for (const suit of SUITS)
      for (let rank = 1; rank <= 13; rank++)
        deck.push({ id: this.nextId++, suit, rank, faceUp: false });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    let cursor = 0;
    for (let col = 0; col < 7; col++)
      for (let row = 0; row <= col; row++) {
        const c = deck[cursor++];
        c.faceUp = row === col;
        this.tableau[col].push(c);
      }
    this.stock.push(...deck.slice(cursor));
    this.screen = "playing";
    this.menuIndex = 0;
    this.cue("deal");
  }
  clearTable() {
    for (const p of this.allPiles()) p.length = 0;
    this.wasteSets = [];
    this.drag = null;
  }
  clearTrail() {
    this.painted = [];
    this.trailStamps = 0;
  }
  addCard(
    name: PileName,
    index: number,
    suit: Suit,
    rank: number,
    faceUp: boolean,
  ) {
    const c = { id: this.nextId++, suit, rank, faceUp };
    this.pile(name, index).push(c);
    return c.id;
  }
  removeCard(id: number) {
    for (const pile of this.allPiles()) {
      const i = pile.findIndex((c) => c.id === id);
      if (i >= 0) {
        pile.splice(i, 1);
        if (pile === this.waste) this.removeWasteAt(i);
        return;
      }
    }
    throw new Error("unknown card");
  }
  private removeWasteAt(index: number) {
    let end = 0;
    for (let i = 0; i < this.wasteSets.length; i++) {
      end += this.wasteSets[i];
      if (index < end) {
        this.wasteSets[i]--;
        if (this.wasteSets[i] === 0) this.wasteSets.splice(i, 1);
        return;
      }
    }
  }
  setCardFaceUp(id: number, faceUp: boolean) {
    const c = this.findCard(id);
    c.faceUp = faceUp;
  }
  private findCard(id: number): Card {
    for (const p of this.allPiles()) {
      const c = p.find((x) => x.id === id);
      if (c) return c;
    }
    const f = this.flyers.find((x) => x.id === id);
    if (f) return f;
    throw new Error("unknown entity");
  }
  addWasteSet(count: number) {
    if (!Number.isInteger(count) || count < 0) throw new Error("invalid count");
    this.wasteSets.push(count);
  }
  clearWasteSets() {
    this.wasteSets = [];
  }
  turnStock() {
    if (this.stock.length) {
      const n = Math.min(1, this.stock.length);
      for (let i = 0; i < n; i++)
        this.waste.push({ ...this.stock.pop()!, faceUp: true });
      this.wasteSets.push(n);
      this.cue("turn");
      return;
    }
    if (this.waste.length) {
      while (this.waste.length)
        this.stock.push({ ...this.waste.pop()!, faceUp: false });
      this.wasteSets = [];
      this.cue("recycle");
    }
  }
  private foundationFor(c: Card): number {
    return this.foundations.findIndex(
      (p) =>
        (!p.length && c.rank === 1) ||
        (!!p.length &&
          p[p.length - 1].suit === c.suit &&
          p[p.length - 1].rank + 1 === c.rank),
    );
  }
  private acceptsFoundation(p: Card[], run: Card[]) {
    return (
      run.length === 1 &&
      run[0].faceUp &&
      ((!p.length && run[0].rank === 1) ||
        (!!p.length &&
          p[p.length - 1].suit === run[0].suit &&
          p[p.length - 1].rank + 1 === run[0].rank))
    );
  }
  private validRun(run: Card[]) {
    return (
      run.length > 0 &&
      run.every((c) => c.faceUp) &&
      run.every(
        (c, i) =>
          i === 0 ||
          (run[i - 1].rank === c.rank + 1 && otherColor(run[i - 1], c)),
      )
    );
  }
  private acceptsTableau(p: Card[], run: Card[]) {
    if (!this.validRun(run)) return false;
    const lead = run[0];
    if (!p.length) return lead.rank === 13;
    const base = p[p.length - 1];
    return base.faceUp && base.rank === lead.rank + 1 && otherColor(base, lead);
  }
  private removeRun(name: PileName, index: number, row: number): Card[] | null {
    const p = this.pile(name, index);
    if (row < 0 || row >= p.length) throw new Error("invalid card index");
    const run = p.slice(row);
    if (name === "tableau" && (!run[0].faceUp || !this.validRun(run)))
      return null;
    if (name !== "tableau" && row !== p.length - 1) return null;
    p.splice(row);
    return run;
  }
  move(
    fromPile: PileName,
    fromIndex: number,
    fromRow: number,
    toPile: PileName,
    toIndex: number,
  ) {
    const source = this.pile(fromPile, fromIndex);
    const run = this.removeRun(fromPile, fromIndex, fromRow);
    if (!run) return false;
    const target = this.pile(toPile, toIndex);
    const accepted =
      toPile === "foundation"
        ? this.acceptsFoundation(target, run)
        : toPile === "tableau"
          ? this.acceptsTableau(target, run)
          : false;
    if (!accepted) {
      source.splice(fromRow, 0, ...run);
      return false;
    }
    target.push(...run);
    if (fromPile === "waste") this.removeWasteAt(fromRow);
    this.acceptedMove(fromPile, source, toPile);
    return true;
  }
  private acceptedMove(_fromPile: PileName, _source: Card[], toPile: PileName) {
    this.cue("drop");
    if (toPile === "foundation") this.cue("home");
    this.revealColumns();
    if (this.winDetect && this.foundations.every((p) => p.length === 13))
      this.win();
  }
  private revealColumns() {
    if (!this.autoFlip) return;
    for (const col of this.tableau) {
      const c = col[col.length - 1];
      if (c && !c.faceUp) {
        c.faceUp = true;
        this.cue("flip");
      }
    }
  }
  autoMove(name: PileName, index: number) {
    const p = this.pile(name, index);
    const row = p.length - 1;
    if (row < 0 || (name === "tableau" && !p[row].faceUp)) return false;
    const c = p[row];
    const fi = this.foundationFor(c);
    return fi >= 0 && this.move(name, index, row, "foundation", fi);
  }
  private win() {
    this.screen = "won";
    this.launchClock = 0.18;
    this.cue("win");
  }
  private dropRect(ref: PileRef) {
    if (ref.pile === "foundation")
      return { x: FOUNDATION_X[ref.index], y: TOP_ROW_Y, w: CARD_W, h: CARD_H };
    if (ref.pile === "tableau") {
      const col = this.tableau[ref.index];
      return {
        x: COLUMN_X[ref.index],
        y: TABLEAU_Y,
        w: CARD_W,
        h: Math.max(CARD_H, this.columnHeight(col)),
      };
    }
    return {
      x: ref.pile === "stock" ? 224 : 346,
      y: TOP_ROW_Y,
      w: CARD_W,
      h: CARD_H,
    };
  }
  columnOffset(col: Card[]) {
    const downs = col.filter((c) => !c.faceUp).length;
    const ups = Math.max(0, col.length - downs - 1);
    const natural = downs * 24 + ups * 34;
    return ups > 0 && TABLEAU_Y + natural + CARD_H > 676
      ? Math.max(14, (676 - TABLEAU_Y - CARD_H - downs * 24) / ups)
      : 34;
  }
  columnHeight(col: Card[]) {
    return (
      CARD_H +
      col
        .slice(1)
        .reduce(
          (sum, _c, i) => sum + (col[i].faceUp ? this.columnOffset(col) : 24),
          0,
        )
    );
  }
  private targetAt(point: Point, run: Card[]) {
    if (!this.validRun(run)) return null;
    const refs: PileRef[] = [
      ...this.foundations.map((_, index) => ({
        pile: "foundation" as const,
        index,
      })),
      ...this.tableau.map((_, index) => ({ pile: "tableau" as const, index })),
    ];
    for (const ref of refs) {
      const r = this.dropRect(ref);
      const inside =
        point.x >= r.x &&
        point.x <= r.x + r.w &&
        point.y >= r.y &&
        point.y <= r.y + r.h;
      if (inside) {
        const p = this.pile(ref.pile, ref.index);
        if (
          ref.pile === "foundation"
            ? this.acceptsFoundation(p, run)
            : this.acceptsTableau(p, run)
        )
          return ref;
      }
    }
    return null;
  }
  pointerDown(x: number, y: number) {
    this.pointer = { x, y, down: true };
    if (this.screen === "won") {
      this.deal();
      return;
    }
    if (this.screen !== "playing") {
      this.menuPointer(x, y, true);
      return;
    }
    const previous = this.lastPress;
    this.lastPress = { x, y, at: this.simTime };
    const playable = this.cardAt(x, y);
    if (
      previous &&
      this.simTime - previous.at <= 0.3 &&
      Math.hypot(x - previous.x, y - previous.y) <= 20 &&
      playable
    ) {
      this.autoMove(playable.pile, playable.index);
      return;
    }
    if (playable) {
      const p = this.pile(playable.pile, playable.index);
      const run =
        playable.pile === "tableau" ? p.slice(playable.row) : [p[p.length - 1]];
      if (playable.pile === "waste" && this.wasteSets.length === 0) return;
      this.drag = {
        cards: run,
        fromPile: playable.pile,
        fromIndex: playable.index,
        x: playable.x,
        y: playable.y,
        offsetX: x - playable.x,
        offsetY: y - playable.y,
      };
      p.splice(playable.row, run.length);
    }
  }
  pointerMove(x: number, y: number) {
    this.pointer = { x, y, down: this.pointer.down };
    if (this.pointer.down && this.drag) {
      this.drag.x = x - this.drag.offsetX;
      this.drag.y = y - this.drag.offsetY;
    }
    if (this.screen !== "playing") this.menuPointer(x, y, false);
  }
  pointerUp(x: number, y: number) {
    const wasDown = this.pointer.down;
    this.pointer = { x, y, down: false };
    if (!wasDown) return;
    if (this.screen !== "playing") {
      const i = this.menuIndexAt(x, y);
      if (i >= 0 && i === this.menuIndex) this.activateMenu();
      return;
    }
    if (!this.drag) {
      if (
        Math.hypot(
          x - (this.lastPress?.x ?? x),
          y - (this.lastPress?.y ?? y),
        ) <= 5 &&
        x >= 224 &&
        x <= 324 &&
        y >= 24 &&
        y <= 164
      )
        this.turnStock();
      return;
    }
    const drag = this.drag;
    const distance = Math.hypot(
      x - (this.lastPress?.x ?? x),
      y - (this.lastPress?.y ?? y),
    );
    const leading = { x: drag.x, y: drag.y };
    if (distance <= 5) {
      this.restoreDrag(drag);
      if (x >= 224 && x <= 324 && y >= 24 && y <= 164) this.turnStock();
      this.cue("reject");
    } else {
      const target = this.targetAt(
        { x: leading.x + 50, y: leading.y + 70 },
        drag.cards,
      );
      if (!target || !this.applyDrag(target, drag)) {
        this.restoreDrag(drag);
        this.cue("reject");
      }
    }
    this.drag = null;
  }
  private restoreDrag(d: Drag) {
    const p = this.pile(d.fromPile, d.fromIndex);
    p.push(...d.cards);
  }
  private applyDrag(target: PileRef, drag: Drag) {
    const p = this.pile(target.pile, target.index);
    const accepted =
      target.pile === "foundation"
        ? this.acceptsFoundation(p, drag.cards)
        : this.acceptsTableau(p, drag.cards);
    if (!accepted) return false;
    p.push(...drag.cards);
    if (drag.fromPile === "waste") this.removeWasteAt(this.waste.length);
    this.acceptedMove(
      drag.fromPile,
      this.pile(drag.fromPile, drag.fromIndex),
      target.pile,
    );
    return true;
  }
  private menuPointer(x: number, y: number, press: boolean) {
    const i = this.menuIndexAt(x, y);
    if (i >= 0) {
      this.menuIndex = i;
      if (!press) return;
    }
  }
  private cardAt(
    x: number,
    y: number,
  ): {
    pile: PileName;
    index: number;
    row: number;
    x: number;
    y: number;
  } | null {
    for (let i = 0; i < 7; i++) {
      const p = this.tableau[i];
      const positions: number[] = [];
      let cy = TABLEAU_Y;
      for (let row = 0; row < p.length; row++) {
        const c = p[row];
        positions[row] = cy;
        const h =
          row === p.length - 1 ? CARD_H : c.faceUp ? this.columnOffset(p) : 24;
        cy += h;
      }
      for (let row = p.length - 1; row >= 0; row--) {
        const c = p[row];
        cy = positions[row];
        if (
          x >= COLUMN_X[i] &&
          x <= COLUMN_X[i] + CARD_W &&
          y >= cy &&
          y <= cy + CARD_H
        ) {
          if (!c.faceUp) return null;
          return { pile: "tableau", index: i, row, x: COLUMN_X[i], y: cy };
        }
      }
    }
    if (
      x >= 346 &&
      x <= 446 &&
      y >= 24 &&
      y <= 164 &&
      this.waste.length &&
      this.wasteSets.length
    )
      return {
        pile: "waste",
        index: 0,
        row: this.waste.length - 1,
        x: 346,
        y: 24,
      };
    for (let i = 0; i < 4; i++) {
      const p = this.foundations[i];
      if (
        p.length &&
        x >= FOUNDATION_X[i] &&
        x <= FOUNDATION_X[i] + CARD_W &&
        y >= 24 &&
        y <= 164
      )
        return {
          pile: "foundation",
          index: i,
          row: p.length - 1,
          x: FOUNDATION_X[i],
          y: 24,
        };
    }
    return null;
  }
  update(dt: number) {
    this.simTime += dt;
    if (this.screen !== "won") return;
    if (this.launching) {
      this.launchClock += dt;
      while (this.launchClock >= 0.18 && this.launched < 52) {
        this.launchClock -= 0.18;
        this.launchOne();
      }
    }
    for (const flyer of [...this.flyers]) {
      flyer.vy += 1800 * dt;
      flyer.x += flyer.vx * dt;
      flyer.y += flyer.vy * dt;
      if (flyer.y >= 580 && flyer.vy > 0) {
        flyer.vy = -flyer.vy * 0.8;
        flyer.y = 580;
      }
      if (this.trailPainting) {
        this.painted.push({ ...flyer });
        this.trailStamps++;
      }
      if (flyer.x + CARD_W < 0 || flyer.x > STAGE_W)
        this.flyers.splice(this.flyers.indexOf(flyer), 1);
    }
    if (this.launched === 52 && this.flyers.length === 0)
      this.cascadeDone = true;
  }
  private launchOne() {
    for (let n = 0; n < 4; n++) {
      const i = (this.launchCursor + n) % 4;
      const p = this.foundations[i];
      if (p.length) {
        const c = p.pop()!;
        const sign = Math.random() < 0.5 ? -1 : 1;
        const vx = sign * (180 + Math.random() * 240);
        this.flyers.push({ ...c, x: FOUNDATION_X[i], y: 24, vx, vy: -120 });
        this.launched++;
        this.launchCursor = (i + 1) % 4;
        this.cue("launch");
        return;
      }
    }
  }
  drawLaunchVx() {
    return (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 240);
  }
  addFlyer(
    suit: Suit,
    rank: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) {
    const c = { id: this.nextId++, suit, rank, faceUp: true };
    this.flyers.push({ ...c, x, y, vx, vy });
    return c.id;
  }
  setScreen(screen: Screen) {
    this.screen = screen;
  }
  setMenuIndex(index: number) {
    this.menuIndex = index;
  }
  setTitleIndex(index: number) {
    this.titleIndex = index;
  }
  setAutoFlip(v: boolean) {
    this.autoFlip = v;
  }
  setWinDetect(v: boolean) {
    this.winDetect = v;
  }
  setLaunching(v: boolean) {
    this.launching = v;
  }
  setTrailPainting(v: boolean) {
    this.trailPainting = v;
  }
  menuItemRect(index: number) {
    const rects =
      this.screen === "title"
        ? [
            { x: 470, y: 400, w: 340, h: 58 },
            { x: 470, y: 470, w: 340, h: 58 },
          ]
        : this.screen === "howto"
          ? [{ x: 500, y: 590, w: 280, h: 54 }]
          : this.screen === "playing"
            ? [
                { x: 34, y: 686, w: 150, h: 26 },
                { x: 194, y: 686, w: 120, h: 26 },
                { x: 324, y: 686, w: 120, h: 26 },
              ]
            : [];
    return rects[index] ?? null;
  }
  private menuIndexAt(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const r = this.menuItemRect(i);
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
        return i;
    }
    return -1;
  }
  activateMenu() {
    if (this.screen === "title") {
      this.titleIndex = this.menuIndex;
      if (this.menuIndex === 0) this.deal();
      else this.screen = "howto";
    } else if (this.screen === "howto") {
      this.screen = "title";
      this.menuIndex = this.titleIndex;
    } else if (this.screen === "playing") {
      if (this.menuIndex === 0) this.deal();
      else if (this.menuIndex === 1) {
        this.screen = "title";
        this.menuIndex = this.titleIndex;
      } else this.muted = !this.muted;
    }
  }
  snapshot() {
    const card = (c: Card) => ({ ...c, color: colorOf(c.suit) });
    return {
      version: 1,
      screen: this.screen,
      menuIndex: this.menuIndex,
      titleIndex: this.titleIndex,
      dealMode: "draw-one",
      turnCount: 1,
      dealModeLabel: "DRAW ONE",
      muted: this.muted,
      autoFlip: this.autoFlip,
      winDetect: this.winDetect,
      launching: this.launching,
      trailPainting: this.trailPainting,
      stock: this.stock.map(card),
      waste: this.waste.map(card),
      wasteSets: [...this.wasteSets],
      wasteVisibleCount: this.wasteSets.length
        ? this.wasteSets[this.wasteSets.length - 1]
        : 0,
      foundations: this.foundations.map((p) => p.map(card)),
      tableau: this.tableau.map((p) => p.map(card)),
      drag: this.drag
        ? {
            cards: this.drag.cards.map(card),
            fromPile: this.drag.fromPile,
            fromIndex: this.drag.fromIndex,
            x: this.drag.x,
            y: this.drag.y,
          }
        : null,
      dropTarget: this.drag
        ? this.targetAt(
            { x: this.drag.x + 50, y: this.drag.y + 70 },
            this.drag.cards,
          )
        : null,
      pointer: { ...this.pointer },
      lastPress: this.lastPress ? { ...this.lastPress } : null,
      launchClock: this.launchClock,
      launched: this.launched,
      flyers: this.flyers.map((f) => ({
        id: f.id,
        suit: f.suit,
        rank: f.rank,
        x: f.x,
        y: f.y,
        vx: f.vx,
        vy: f.vy,
      })),
      cascadeDone: this.cascadeDone,
      trailStamps: this.trailStamps,
      simTime: this.simTime,
    };
  }
  reconcile() {
    /* all derived values are read from the live piles */
  }
  setFlyerPosition(id: number, x: number, y: number) {
    const f = this.flyers.find((v) => v.id === id);
    if (!f) throw new Error("unknown flyer");
    f.x = x;
    f.y = y;
  }
  setFlyerVelocity(id: number, vx: number, vy: number) {
    const f = this.flyers.find((v) => v.id === id);
    if (!f) throw new Error("unknown flyer");
    f.vx = vx;
    f.vy = vy;
  }
  removeFlyer(id: number) {
    const i = this.flyers.findIndex((f) => f.id === id);
    if (i < 0) throw new Error("unknown flyer");
    this.flyers.splice(i, 1);
  }
  clearFlyers() {
    this.flyers = [];
  }
  setLaunchClock(v: number) {
    this.launchClock = v;
  }
}
