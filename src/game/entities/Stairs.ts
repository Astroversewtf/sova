import Phaser from "phaser";
import type { TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

export class Stairs {
  sprite: Phaser.GameObjects.Image;
  pos: TilePos;
  private scene: Phaser.Scene;
  private openDelay: Phaser.Time.TimerEvent | null = null;
  private closeDelay: Phaser.Time.TimerEvent | null = null;
  private enterDelay: Phaser.Time.TimerEvent | null = null;
  private state: "closed" | "opening" | "open" | "closing" | "entering" = "closed";
  private entered = false;

  constructor(scene: Phaser.Scene, pos: TilePos) {
    this.scene = scene;
    this.pos = { ...pos };

    this.sprite = scene.add.image(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_FULL_H + TILE_SIZE / 2,
      "door-1",
    );
    this.sprite.setDepth(200);
    this.sprite.setOrigin(0.5, 0.5);
  }

  updateProximity(playerPos: TilePos) {
    if (this.entered) return;
    const dist =
      Math.abs(playerPos.x - this.pos.x) + Math.abs(playerPos.y - this.pos.y);
    if (dist === 1) {
      this.openNear();
    } else {
      this.close();
    }
  }

  playEnterSequence(onComplete: () => void) {
    if (this.entered) {
      onComplete();
      return;
    }
    this.entered = true;
    this.clearTimers();
    this.state = "entering";
    this.sprite.setTexture("door-4");
    this.enterDelay = this.scene.time.delayedCall(180, () => {
      this.enterDelay = null;
      onComplete();
    });
  }

  private openNear() {
    if (this.state === "open" || this.state === "opening" || this.state === "entering") {
      return;
    }
    this.clearCloseDelay();
    this.clearOpenDelay();
    this.state = "opening";
    this.sprite.setTexture("door-2");
    this.openDelay = this.scene.time.delayedCall(120, () => {
      this.openDelay = null;
      if (this.state !== "opening") return;
      this.sprite.setTexture("door-3");
      this.state = "open";
    });
  }

  private close() {
    if (this.state === "closed" || this.state === "closing" || this.state === "entering") return;
    this.clearCloseDelay();
    this.clearOpenDelay();
    this.state = "closing";
    this.sprite.setTexture("door-2");
    this.closeDelay = this.scene.time.delayedCall(100, () => {
      this.closeDelay = null;
      if (this.state !== "closing") return;
      this.sprite.setTexture("door-1");
      this.state = "closed";
    });
  }

  private clearOpenDelay() {
    if (!this.openDelay) return;
    this.openDelay.remove(false);
    this.openDelay = null;
  }

  private clearCloseDelay() {
    if (!this.closeDelay) return;
    this.closeDelay.remove(false);
    this.closeDelay = null;
  }

  private clearTimers() {
    this.clearCloseDelay();
    this.clearOpenDelay();
    if (!this.enterDelay) return;
    this.enterDelay.remove(false);
    this.enterDelay = null;
  }

  setVisible(v: boolean) {
    this.sprite.setVisible(v);
  }

  destroy() {
    this.clearTimers();
    this.sprite.destroy();
  }
}
