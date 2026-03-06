import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Fountain {
  sprite: Phaser.GameObjects.Sprite;
  /** Bottom tile — where the player walks to interact */
  pos: TilePos;
  /** Top tile — impassable decorative part (against the wall) */
  topPos: TilePos;
  used: boolean = false;
  id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pos: TilePos, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.topPos = { x: pos.x, y: pos.y - 1 };
    this.id = id;

    // Sprite is 32×64 (2 tiles tall).
    // Anchor at bottom-center so it covers both the top and bottom tiles.
    this.sprite = scene.add.sprite(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE,
      "fountain-1",
    );
    this.sprite.setDepth(300);
    this.sprite.setOrigin(0.5, 1.0);
    this.sprite.play("fountain-idle");
  }

  /** Use the fountain. Returns energy healed (10-29). */
  use(): number {
    if (this.used) return 0;
    this.used = true;

    // Darken to show it's depleted — animation continues
    this.sprite.setTint(0x555555);

    const heal = 10 + Math.floor(Math.random() * 20); // 10..29

    // Floating heal text
    const text = this.scene.add
      .text(this.sprite.x, this.pos.y * TILE_FULL_H, `+${heal}`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "9px",
        color: "#4ade80",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });

    return heal;
  }

  /** Check if a position overlaps either tile of the fountain */
  occupies(p: TilePos): boolean {
    return (
      (p.x === this.pos.x && p.y === this.pos.y) ||
      (p.x === this.topPos.x && p.y === this.topPos.y)
    );
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
