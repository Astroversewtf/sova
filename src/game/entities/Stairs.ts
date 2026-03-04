import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Stairs {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pos: TilePos) {
    this.scene = scene;
    this.pos = { ...pos };

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      "stairs-unlocked",
    );
    this.sprite.setDepth(200);
    this.sprite.setOrigin(0.5, 0.5);
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
