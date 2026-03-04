import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Chest {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  opened: boolean = false;
  id: string;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, pos: TilePos, id: string) {
    this.scene = scene;
    this.pos = { ...pos };
    this.id = id;

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      "chest-closed",
    );
    this.sprite.setDepth(300);
    this.sprite.setOrigin(0.5, 0.5);
  }

  open() {
    if (this.opened) return;
    this.opened = true;

    // Swap to open texture
    this.sprite.setTexture("chest-open");

    // Pop animation
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: "Back.easeOut",
    });

    // Floating label
    const text = this.scene.add
      .text(this.sprite.x, this.sprite.y - 12, "OPEN!", {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(900);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
  }
}
