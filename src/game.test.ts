import { describe, expect, it } from "vitest";
import { GameCore } from "./game";

describe("Cascade rules", () => {
  it("deals the fixed Draw One shape", () => {
    const game = new GameCore();
    game.deal();
    expect(game.stock).toHaveLength(24);
    expect(game.tableau.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(
      game.tableau.every((p) => p.filter((c) => c.faceUp).length === 1),
    ).toBe(true);
  });

  it("turns one card and recycles it in the same order", () => {
    const game = new GameCore();
    game.addCard("stock", 0, "hearts", 1, false);
    game.addCard("stock", 0, "spades", 2, false);
    game.turnStock();
    expect(game.waste[0].rank).toBe(2);
    expect(game.wasteSets).toEqual([1]);
    game.turnStock();
    game.turnStock();
    expect(game.stock).toHaveLength(2);
    expect(game.waste).toHaveLength(0);
    game.turnStock();
    expect(game.waste[0].rank).toBe(2);
  });

  it("accepts alternating runs and rejects incorrect runs", () => {
    const game = new GameCore();
    game.setScreen("won");
    game.addCard("tableau", 0, "hearts", 9, true);
    game.addCard("tableau", 1, "spades", 8, true);
    expect(game.move("tableau", 1, 0, "tableau", 0)).toBe(true);
    expect(game.tableau[0].map((c) => c.rank)).toEqual([9, 8]);
    game.addCard("tableau", 2, "clubs", 7, true);
    expect(game.move("tableau", 2, 0, "tableau", 0)).toBe(false);
  });

  it("integrates a flyer and paints it", () => {
    const game = new GameCore();
    game.setScreen("won");
    const id = game.addFlyer("clubs", 1, 300, 100, 200, 0);
    game.update(0.1);
    const flyer = game.flyers.find((f) => f.id === id);
    expect(flyer?.x).toBeCloseTo(320);
    expect(game.trailStamps).toBe(1);
  });
});
