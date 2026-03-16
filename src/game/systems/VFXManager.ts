import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { emitSfxEvent, emitHeartbeatVolume } from "@/lib/audioEvents";

/**
 * VFXManager — desaturation when energy is low.
 *
 * Uses camera postFX ColorMatrix to desaturate the screen when energy < 20.
 * Also exposes a heartbeat hook (sound not yet connected).
 */
export class VFXManager {
  private scene: Phaser.Scene;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private desatAmount = 0;
  private damageOverlay: Phaser.GameObjects.Rectangle | null = null;
  private damageTween: Phaser.Tweens.Tween | null = null;
  private hitStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private fadeContainer: Phaser.GameObjects.Container | null = null;
  private fadeRects: Phaser.GameObjects.Rectangle[] = [];
  private fadeCols = 0;
  private fadeRows = 0;
  private fadeCellSize = 16;

  // Heartbeat state (ready for when audio is added)
  private heartbeatActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Add ColorMatrix postFX to camera
    const cam = scene.cameras.main;
    if (cam.postFX) {
      this.colorMatrix = cam.postFX.addColorMatrix();
    }

    // Fullscreen dark-red hit overlay (very subtle / very fast)
    this.damageOverlay = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x8a1a24,
      1,
    );
    this.damageOverlay
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2400)
      .setAlpha(0);
  }

  /**
   * Update desaturation based on current energy.
   * Below threshold (20), screen progressively desaturates up to -0.7.
   */
  updateDesaturation(energy: number, _maxEnergy: number) {
    if (!this.colorMatrix) return;

    const threshold = 20;
    if (energy < threshold && energy > 0) {
      const t = 1 - energy / threshold; // 0 at 20 energy → 1 at 0 energy
      const target = -0.7 * t;

      if (Math.abs(target - this.desatAmount) > 0.01) {
        this.desatAmount = target;
        this.colorMatrix.reset();
        this.colorMatrix.saturate(this.desatAmount);
      }

      // Heartbeat hook
      if (!this.heartbeatActive) {
        this.heartbeatActive = true;
        emitSfxEvent("heartbeat-start");
      }
      // Update volume based on intensity (louder as energy drops)
      emitHeartbeatVolume(0.2 + 0.8 * t);
    } else {
      if (this.desatAmount !== 0) {
        this.desatAmount = 0;
        this.colorMatrix.reset();
      }
      if (this.heartbeatActive) {
        this.heartbeatActive = false;
        emitSfxEvent("heartbeat-stop");
      }
    }
  }

  /** Very fast and subtle red screen flash when the player is hit */
  flashDamageOverlay() {
    if (!this.damageOverlay) return;

    this.damageTween?.stop();
    this.damageTween = null;

    this.damageOverlay.setAlpha(0);
    this.damageTween = this.scene.tweens.add({
      targets: this.damageOverlay,
      alpha: 0.14,
      duration: 26,
      ease: "Quad.Out",
      onComplete: () => {
        this.damageTween = this.scene.tweens.add({
          targets: this.damageOverlay,
          alpha: 0,
          duration: 84,
          ease: "Quad.In",
          onComplete: () => {
            this.damageTween = null;
          },
        });
      },
    });
  }

  /**
   * MoG-like impact on kill:
   * - quick camera shake
   * - very short hit-stop (global time freeze), then restore
   */
  playKillImpact(strong = false) {
    const cam = this.scene.cameras.main;
    cam.shake(strong ? 100 : 60, strong ? 0.006 : 0.003);

    if (this.hitStopTimeoutId !== null) {
      clearTimeout(this.hitStopTimeoutId);
      this.hitStopTimeoutId = null;
      this.restoreGlobalTimeScale();
    }

    this.scene.time.timeScale = 0;
    this.scene.tweens.timeScale = 0;
    this.scene.anims.globalTimeScale = 0;

    const restoreDelay = strong ? 80 : 50;
    this.hitStopTimeoutId = globalThis.setTimeout(() => {
      this.restoreGlobalTimeScale();
      this.hitStopTimeoutId = null;
    }, restoreDelay);
  }

  private restoreGlobalTimeScale() {
    this.scene.time.timeScale = 1;
    this.scene.tweens.timeScale = 1;
    this.scene.anims.globalTimeScale = 1;
  }

  /**
   * MoG-style death desaturation — heavy desaturation + slight tint shift.
   * Applied once at death, stays until scene transitions.
   */
  applyDeathDesaturation() {
    if (!this.colorMatrix) return;
    this.colorMatrix.reset();
    this.colorMatrix.saturate(-0.6);
    this.colorMatrix.brightness(0.95);
    this.colorMatrix.saturate(-0.5);
  }

  /**
   * SOVA "Crack Collapse" pixelated fade to black.
   * Timings match MoG, but reveal order is driven by dungeon-like fissures.
   */
  playPixelatedFadeToBlack(duration = 1500, onComplete?: () => void) {
    this.createFadeGrid(0);
    if (!this.fadeContainer || this.fadeRects.length === 0) return;

    const total = this.fadeRects.length;
    const crackDist = this.buildCrackDistanceField(this.fadeCols, this.fadeRows);
    const order = Array.from({ length: total }, (_, i) => i);
    order.sort((a, b) => {
      const da = crackDist[a] + this.hash01(a, 211) * 0.85;
      const db = crackDist[b] + this.hash01(b, 211) * 0.85;
      return da - db;
    });

    const spread = 0.7 * duration;
    for (let rank = 0; rank < order.length; rank++) {
      const idx = order[rank];
      const rect = this.fadeRects[idx];
      const base = (rank / order.length) * spread;
      const jitter = this.cellJitterFromIndex(idx) * 90;
      const delay = Math.max(0, base + jitter);
      this.scene.tweens.add({
        targets: rect,
        alpha: 1,
        duration: 300,
        delay,
        ease: "Quad.easeIn",
      });
    }

    this.scene.tweens.add({
      targets: this.fadeContainer,
      scale: 1.4,
      duration: duration + 300,
      ease: "Quad.easeIn",
    });

    this.scene.time.delayedCall(duration + 300, () => {
      onComplete?.();
    });
  }

  /**
   * Pixelated fade from black.
   * Kept clean/center-out so room reveal remains readable after floor swap.
   */
  playPixelatedFadeFromBlack(duration = 1000, onComplete?: () => void) {
    if (!this.fadeContainer || this.fadeRects.length === 0) {
      this.createFadeGrid(1);
    } else {
      this.fadeContainer.setScale(1.4);
      for (const rect of this.fadeRects) rect.setAlpha(1);
    }
    if (!this.fadeContainer) return;

    const rects = [...this.fadeRects];
    rects.sort((a, b) => this.distSq(a) - this.distSq(b)); // center first

    const spread = 0.7 * duration;
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const base = (i / rects.length) * spread;
      const jitter = this.cellJitter(rect.x, rect.y) * 90;
      const delay = Math.max(0, base + jitter);
      this.scene.tweens.add({
        targets: rect,
        alpha: 0,
        duration: 300,
        delay,
        ease: "Quad.easeOut",
      });
    }

    this.scene.tweens.add({
      targets: this.fadeContainer,
      scale: 1,
      duration: duration + 300,
      ease: "Quad.easeOut",
    });

    this.scene.time.delayedCall(duration + 300, () => {
      this.fadeContainer?.destroy();
      this.fadeContainer = null;
      this.fadeRects = [];
      onComplete?.();
    });
  }

  private createFadeGrid(initialAlpha: number) {
    this.fadeContainer?.destroy();
    this.fadeContainer = null;
    this.fadeRects = [];

    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const cellSize = this.fadeCellSize;
    const cols = Math.ceil(cam.width / cellSize) + 6;
    const rows = Math.ceil(cam.height / cellSize) + 6;

    const container = this.scene.add.container(cx, cy);
    container.setScrollFactor(0);
    container.setDepth(5000);

    const rects: Phaser.GameObjects.Rectangle[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rx = (c - cols / 2) * cellSize + cellSize / 2;
        const ry = (r - rows / 2) * cellSize + cellSize / 2;
        const rect = this.scene.add.rectangle(rx, ry, cellSize, cellSize, 0x000000);
        rect.setAlpha(initialAlpha);
        container.add(rect);
        rects.push(rect);
      }
    }

    this.fadeContainer = container;
    this.fadeRects = rects;
    this.fadeCols = cols;
    this.fadeRows = rows;
  }

  private distSq(obj: { x: number; y: number }): number {
    return obj.x * obj.x + obj.y * obj.y;
  }

  /**
   * Stable pseudo-random in [-0.5, 0.5], based only on cell position.
   * Produces consistent jitter across runs/resizes for the same grid cells.
   */
  private cellJitter(x: number, y: number): number {
    let h = Math.imul((x | 0) ^ 0x9e3779b9, 73856093) ^ Math.imul((y | 0) ^ 0x85ebca6b, 19349663);
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff - 0.5;
  }

  private cellJitterFromIndex(idx: number): number {
    const c = idx % this.fadeCols;
    const r = Math.floor(idx / this.fadeCols);
    return this.cellJitter(c, r);
  }

  private hash01(a: number, b: number): number {
    let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) ^ 0xc2b2ae35, 0x27d4eb2d);
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  }

  private buildCrackDistanceField(cols: number, rows: number): Int16Array {
    const size = cols * rows;
    const cracks = new Uint8Array(size);
    const centerC = (cols - 1) / 2;
    const centerR = (rows - 1) / 2;
    const crackCount = 4;

    const mark = (c: number, r: number) => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      cracks[r * cols + c] = 1;
    };

    for (let k = 0; k < crackCount; k++) {
      const side = Math.floor(this.hash01(17, k) * 4); // 0 top, 1 right, 2 bottom, 3 left
      let c = 0;
      let r = 0;
      if (side === 0) {
        c = Math.floor(this.hash01(29, k) * cols);
        r = 0;
      } else if (side === 1) {
        c = cols - 1;
        r = Math.floor(this.hash01(31, k) * rows);
      } else if (side === 2) {
        c = Math.floor(this.hash01(37, k) * cols);
        r = rows - 1;
      } else {
        c = 0;
        r = Math.floor(this.hash01(41, k) * rows);
      }

      let lateral = this.hash01(43, k) < 0.5 ? -1 : 1;
      const steps = Math.ceil(Math.max(cols, rows) * 1.7);
      for (let s = 0; s < steps; s++) {
        mark(c, r);
        if (this.hash01(47 + s, k) < 0.20) {
          // Slightly rough edges on crack line.
          if (Math.abs(centerC - c) > Math.abs(centerR - r)) mark(c, r + lateral);
          else mark(c + lateral, r);
        }

        const toCenterX = Math.sign(centerC - c);
        const toCenterY = Math.sign(centerR - r);
        const roll = this.hash01(53 + s, k);

        if (roll < 0.40) c += toCenterX;
        else if (roll < 0.80) r += toCenterY;
        else if (roll < 0.90) c += lateral;
        else r += lateral;

        if (this.hash01(59 + s, k) < 0.10) lateral *= -1;
        c = Phaser.Math.Clamp(c, 0, cols - 1);
        r = Phaser.Math.Clamp(r, 0, rows - 1);
      }
    }

    const dist = new Int16Array(size).fill(-1);
    const queue = new Int32Array(size);
    let head = 0;
    let tail = 0;

    for (let i = 0; i < size; i++) {
      if (!cracks[i]) continue;
      dist[i] = 0;
      queue[tail++] = i;
    }

    if (tail === 0) {
      // Safety fallback: radial field if no crack seed got produced.
      const fallback = new Int16Array(size);
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          const dx = cc - centerC;
          const dy = rr - centerR;
          fallback[rr * cols + cc] = Math.floor(Math.sqrt(dx * dx + dy * dy));
        }
      }
      return fallback;
    }

    while (head < tail) {
      const cur = queue[head++];
      const c = cur % cols;
      const r = Math.floor(cur / cols);
      const nextDist = (dist[cur] + 1) as number;

      if (c > 0) {
        const ni = cur - 1;
        if (dist[ni] < 0) {
          dist[ni] = nextDist;
          queue[tail++] = ni;
        }
      }
      if (c + 1 < cols) {
        const ni = cur + 1;
        if (dist[ni] < 0) {
          dist[ni] = nextDist;
          queue[tail++] = ni;
        }
      }
      if (r > 0) {
        const ni = cur - cols;
        if (dist[ni] < 0) {
          dist[ni] = nextDist;
          queue[tail++] = ni;
        }
      }
      if (r + 1 < rows) {
        const ni = cur + cols;
        if (dist[ni] < 0) {
          dist[ni] = nextDist;
          queue[tail++] = ni;
        }
      }
    }

    return dist;
  }

  destroy() {
    if (this.heartbeatActive) {
      this.heartbeatActive = false;
      emitSfxEvent("heartbeat-stop");
    }
    if (this.hitStopTimeoutId !== null) {
      clearTimeout(this.hitStopTimeoutId);
      this.hitStopTimeoutId = null;
      this.restoreGlobalTimeScale();
    }
    if (this.colorMatrix) {
      this.colorMatrix.reset();
      // postFX cleanup handled by camera destroy
      this.colorMatrix = null;
    }
    this.damageTween?.stop();
    this.damageTween = null;
    this.damageOverlay?.destroy();
    this.damageOverlay = null;
    this.fadeContainer?.destroy();
    this.fadeContainer = null;
    this.fadeRects = [];
    this.fadeCols = 0;
    this.fadeRows = 0;
  }
}
