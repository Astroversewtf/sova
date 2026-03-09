import Phaser from "phaser";
import { TILE_SIZE, C } from "../constants";

/**
 * Generates procedural pixel-art textures matching Maze of Gains style.
 * Two-color flat checkerboard floors, dark stone walls, chibi entities.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Ensure 8bit Wonder font is loaded before Phaser text objects use it
    const font = new FontFace("8bit Wonder", "url(/fonts/8bit-wonder.ttf)");
    font.load().then((loaded) => {
      document.fonts.add(loaded);
    }).catch(() => {
      // Fallback to Press Start 2P (loaded via Google Fonts in layout)
    });

    // Player sprite frames — idle, walk, attack for all directions
    const dirs = ["front", "back", "side"] as const;
    for (const dir of dirs) {
      for (let i = 1; i <= 4; i++) {
        this.load.image(
          `player-idle-${dir}-${i}`,
          `sprites/player/idle/astro_idle_${dir}_0${i}.png`,
        );
        this.load.image(
          `player-walk-${dir}-${i}`,
          `sprites/player/walk/astro_walk_${dir}_0${i}.png`,
        );
        this.load.image(
          `player-attack-${dir}-${i}`,
          `sprites/player/attack/astro_attack_${dir}_0${i}.png`,
        );
      }
    }

    // Rock enemy sprite frames (32×32 PNGs) — normal enemy visual
    for (const dir of dirs) {
      for (let i = 1; i <= 4; i++) {
        this.load.image(
          `enemy-rock-idle-${dir}-${i}`,
          `sprites/enemies/rock/idle/rock_${dir}_idle_0${i}.png`,
        );
        this.load.image(
          `enemy-rock-walk-${dir}-${i}`,
          `sprites/enemies/rock/walk/rock_${dir}_walk_0${i}.png`,
        );
        this.load.image(
          `enemy-rock-attack-${dir}-${i}`,
          `sprites/enemies/rock/attack/rock_${dir}_attack_0${i}.png`,
        );
      }
    }

    // Golem enemy sprite frames (32×32 PNGs) — slow tanky enemy
    for (const dir of dirs) {
      for (let i = 1; i <= 4; i++) {
        this.load.image(
          `enemy-golem-idle-${dir}-${i}`,
          `sprites/enemies/golem/idle/golem_${dir}_idle_0${i}.png`,
        );
        this.load.image(
          `enemy-golem-walk-${dir}-${i}`,
          `sprites/enemies/golem/walk/golem_${dir}_walk_0${i}.png`,
        );
        this.load.image(
          `enemy-golem-attack-${dir}-${i}`,
          `sprites/enemies/golem/attack/golem_${dir}_attack_0${i}.png`,
        );
      }
    }

    // Ghost enemy frames (idle only, 32×32 PNGs) — spectral enemy
    for (let i = 1; i <= 4; i++) {
      this.load.image(
        `enemy-ghost-idle-${i}`,
        `sprites/enemies/ghost/idle/ghost_idle_0${i}.png`,
      );
      this.load.image(
        `enemy-ghost-attack-side-${i}`,
        `sprites/enemies/ghost/attack/ghost_attack_0${i}.png`,
      );
    }

    // Boss Sova frames (idle only, 64×64 PNGs)
    for (let i = 1; i <= 4; i++) {
      this.load.image(
        `enemy-sova-idle-${i}`,
        `sprites/boss/sova/idle/boss_sova_idle_0${i}.png`,
      );
    }

    // HUD icons
    this.load.image("energy-icon", "sprites/energy-icon.png");

    // Movement arrows (pixel art PNGs)
    this.load.image("arrow-up", "sprites/ui/arrow-up.png");
    this.load.image("arrow-down", "sprites/ui/arrow-down.png");
    this.load.image("arrow-side", "sprites/ui/arrow-side.png");
    this.load.image("move-mark-up", "sprites/ui/movement_controls/move_up.png");
    this.load.image("move-mark-down", "sprites/ui/movement_controls/move_down.png");
    this.load.image("move-mark-side", "sprites/ui/movement_controls/move_side.png");

    // Floor tiles (PNG)
    this.load.image("tile-floor", "sprites/tiles/floor/floor_clean_01.png");
    this.load.image("tile-floor-alt", "sprites/tiles/floor/floor_dirty_01.png");
    this.load.image("tile-floor-dirty-2", "sprites/tiles/floor/floor_dirty_02.png");
    this.load.image("tile-floor-empty", "sprites/tiles/floor/floor_empty_01.png");
    this.load.image("tile-floor-cracked-lt", "sprites/tiles/floor/floor_cracked_lt_01.png");
    this.load.image("tile-floor-cracked-rt", "sprites/tiles/floor/floor_cracked_rt_01.png");
    this.load.image("tile-floor-cracked-lb", "sprites/tiles/floor/floor_cracked_lb_01.png");
    this.load.image("tile-floor-cracked-rb", "sprites/tiles/floor/floor_cracked_rb_01.png");

    // Wall tiles (32×32 PNGs)
    this.load.image("wall-straight-1", "sprites/walls/wall_straight_01.png");
    this.load.image("wall-straight-2", "sprites/walls/wall_straight_02.png");
    this.load.image("wall-top-1", "sprites/walls/wall_top_01.png");
    this.load.image("wall-top-2", "sprites/walls/wall_top_02.png");
    this.load.image("wall-side-l", "sprites/walls/wall_side_l_01.png");
    this.load.image("wall-side-r", "sprites/walls/wall_side_r_01.png");
    this.load.image("wall-corner-tl", "sprites/walls/wall_corner_tl_01.png");
    this.load.image("wall-corner-tr", "sprites/walls/wall_corner_tr_01.png");
    this.load.image("wall-corner-bl", "sprites/walls/wall_corner_bl_01.png");
    this.load.image("wall-corner-br", "sprites/walls/wall_corner_br_01.png");
    this.load.image("wall-fill", "sprites/walls/wall_fill_01.png");

    // Stairs
    this.load.image("stairs-unlocked", "sprites/tiles/stairs.png");
    this.load.image("stairs-locked", "sprites/tiles/stairs.png");

    // Enemy HP hearts
    this.load.image("heart-full", "sprites/ui/mob_full_heart.png");
    this.load.image("heart-empty", "sprites/ui/mob_empty_heart.png");

    // Skill icon (upgrade cards)
    this.load.image("skill-icon", "sprites/items/key/key_02.png");

    // Loot boxes (chests)
    this.load.image("loot-box-1", "sprites/props/loot_box_01.png");
    this.load.image("loot-box-2", "sprites/props/loot_box_02.png");

    // Chest (run end ceremony)
    this.load.image("chest-wood", "sprites/props/chest_wood_01.png");

    // Coin animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`coin-${i}`, `sprites/items/coin/coin_0${i}.png`);
    }

    // Energy item frames (4 frames, animated)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`energy-item-${i}`, `sprites/items/energy/energy_0${i}.png`);
    }

    // Orb
    this.load.image("treasure-orb", "sprites/items/orb/item_orb_01.png");
    this.load.image("treasure-golden-ticket", "sprites/items/golden_ticket/golden_ticket_lil_01.png");
    this.load.image("treasure-golden-ticket-big", "sprites/items/golden_ticket/golden_ticket_big_01.png");

    // Fountain (4 frames)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`fountain-${i}`, `sprites/props/fountain/fountain_idle_0${i}.png`);
    }

    // Decorative props (rocks)
    this.load.image("prop-rock-small", "sprites/props/rock_small.png");
    this.load.image("prop-rock-big", "sprites/props/rock_big.png");
    // Decorative static floor props (moss, rocks, quarter tiles)
    for (let i = 1; i <= 6; i++) {
      const suffix = i.toString().padStart(2, "0");
      this.load.image(
        `prop-static-decorative_musgo_${suffix}`,
        `sprites/props/static/decorative_musgo_${suffix}.png`,
      );
    }
    for (let i = 1; i <= 2; i++) {
      const suffix = i.toString().padStart(2, "0");
      this.load.image(
        `prop-static-decorative_rocks_${suffix}`,
        `sprites/props/static/decorative_rocks_${suffix}.png`,
      );
    }
    this.load.image(
      "prop-static-decorative_quarter01",
      "sprites/props/static/decorative_quarter01.png",
    );
    this.load.image(
      "prop-static-decorative_cuarter02",
      "sprites/props/static/decorative_cuarter02.png",
    );
    for (let i = 1; i <= 8; i++) {
      const suffix = i.toString().padStart(2, "0");
      this.load.image(
        `prop-static-decorative_cuarter_tile${suffix}`,
        `sprites/props/static/decorative_cuarter_tile${suffix}.png`,
      );
    }

    // Wall decorative props
    this.load.image("prop-wall-light", "sprites/props/wall/light_01.png");
    this.load.image("prop-wall-plank", "sprites/props/wall/wooden_plank_01.png");

    // Spike trap (4 frames)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`trap-spike-${i}`, `sprites/props/spikes/spikes_0${i}.png`);
    }

    // Death animation (shared ghost/soul, 4 frames)
    for (let i = 1; i <= 4; i++) {
      this.load.image(`death-${i}`, `sprites/enemies/death/enemies_death_0${i}.png`);
    }

    this.load.on("loaderror", () => {
      // Silently ignore — procedural fallback will be used
    });
  }

  create() {
    const g = this.add.graphics();

    // ── Floor tiles (PNG preferred, procedural fallback) ──
    if (!this.textures.exists("tile-floor")) {
      this.genFloorTile(g, "tile-floor", C.FLOOR_TOP);
    }
    if (!this.textures.exists("tile-floor-alt")) {
      this.genFloorTile(g, "tile-floor-alt", C.FLOOR_TOP_ALT);
    }

    // ── Wall tiles: loaded from PNGs, procedural fallback if missing ──
    if (!this.textures.exists("wall-fill")) {
      this.genWallTile(g, "tile-wall", false);
      this.genWallTile(g, "tile-wall-face", true);
    }

    // ── Player animations ──
    if (this.textures.exists("player-idle-front-1")) {
      this.createPlayerAnimations();
    } else {
      // Fallback: procedural static sprite
      this.genPlayerTexture(g);
    }

    // ── Enemies ──
    if (this.textures.exists("enemy-rock-idle-front-1")) {
      this.createRockAnimations();
    } else {
      this.genBlobEnemy(g, "enemy-rock-fb", C.ENEMY_ROCK, C.ENEMY_ROCK_DARK);
    }
    if (this.textures.exists("enemy-golem-idle-front-1")) {
      this.createGolemAnimations();
    } else {
      this.genGolemEnemy(g, "enemy-golem-fb", C.ENEMY_GOLEM, C.ENEMY_GOLEM_DARK);
    }
    if (this.textures.exists("enemy-ghost-idle-1")) {
      this.createGhostAnimations();
    } else {
      this.genBlobEnemy(g, "enemy-ghost-fb", C.ENEMY_GHOST, C.ENEMY_GHOST_DARK);
    }
    if (this.textures.exists("enemy-sova-idle-1")) {
      this.createSovaAnimations();
    } else {
      this.genBossTexture(g);
    }

    // ── Treasure ──
    if (this.textures.exists("coin-1")) {
      this.anims.create({
        key: "coin-spin",
        frames: [1, 2, 3, 4].map((i) => ({ key: `coin-${i}` })),
        frameRate: 5,
        repeat: -1,
      });
    } else {
      this.genCoinTexture(g);
    }
    if (this.textures.exists("energy-item-1")) {
      this.anims.create({
        key: "energy-pulse",
        frames: [1, 2, 3, 4].map((i) => ({ key: `energy-item-${i}` })),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.textures.exists("treasure-orb")) {
      this.genOrbTexture(g);
    }
    // Fountain animation
    if (this.textures.exists("fountain-1")) {
      this.anims.create({
        key: "fountain-idle",
        frames: [1, 2, 3, 4].map((i) => ({ key: `fountain-${i}` })),
        frameRate: 6,
        repeat: -1,
      });
    }
    // Death animation (ghost/soul rising)
    if (this.textures.exists("death-1")) {
      this.anims.create({
        key: "death-soul",
        frames: [1, 2, 3, 4].map((i) => ({ key: `death-${i}` })),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.textures.exists("treasure-golden-ticket")) {
      this.genRareTexture(g);
    }

    // ── Stairs (PNG) ──
    // stairs-locked/unlocked both use the same PNG now
    // (loaded in preload)

    // ── Statue ──
    this.genStatueTexture(g);

    // ── Chests (fallback if PNGs missing) ──
    if (!this.textures.exists("loot-box-1")) {
      this.genChestTexture(g, "chest-closed", false);
      this.genChestTexture(g, "chest-open", true);
    }

    // ── Traps (procedural fallback if PNG missing) ──
    if (!this.textures.exists("trap-spike-1")) {
      this.genTrapSpike(g);
    } else if (!this.anims.exists("trap-spike-jab")) {
      // 4-frame spike animation: retracted → extending → full → retracting
      this.anims.create({
        key: "trap-spike-jab",
        frames: [
          { key: "trap-spike-1" },
          { key: "trap-spike-2" },
          { key: "trap-spike-3" },
          { key: "trap-spike-4" },
        ],
        frameRate: 10,
        repeat: 0,
      });
      // Idle loop: stays retracted (frame 1), subtle pulse
      this.anims.create({
        key: "trap-spike-idle",
        frames: [
          { key: "trap-spike-1" },
          { key: "trap-spike-2" },
          { key: "trap-spike-1" },
        ],
        frameRate: 3,
        repeat: -1,
        repeatDelay: 1500,
      });
    }

    // ── Dust particle ──
    this.genParticleDust(g);

    // ── Move markers (chalk style) ──
    if (
      !this.textures.exists("move-mark-up") ||
      !this.textures.exists("move-mark-down") ||
      !this.textures.exists("move-mark-side")
    ) {
      this.genChalkMoveMarks(g);
    }

    // ── D-pad buttons (mobile) ──
    this.genDPad(g);

    g.destroy();

    // Start game (HUD is now a React overlay)
    this.scene.start("GameScene");
  }

  // ── Floor tile: flat solid color, 32×32 square ──
  private genFloorTile(
    g: Phaser.GameObjects.Graphics,
    key: string,
    color: number,
  ) {
    g.clear();
    g.fillStyle(color);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  }

  // ── Wall tile: plain solid dark block (MoG style) ──
  private genWallTile(
    g: Phaser.GameObjects.Graphics,
    key: string,
    hasSouthFace: boolean,
  ) {
    const s = TILE_SIZE;
    g.clear();

    g.fillStyle(C.WALL_TOP);
    g.fillRect(0, 0, s, s);

    if (hasSouthFace) {
      g.fillStyle(C.WALL_FACE);
      g.fillRect(0, s - 6, s, 6);
    }

    g.generateTexture(key, s, s);
  }

  // ── Player animations from sprite frames ──
  private createPlayerAnimations() {
    const dirs = ["front", "back", "side"] as const;
    for (const dir of dirs) {
      this.anims.create({
        key: `player-idle-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `player-idle-${dir}-${i}` })),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `player-walk-${dir}`,
        frames: (
          dir === "front"
            ? [1, 4]
            : dir === "back"
              ? [2, 3]
              : [1, 2, 3, 4]
        ).map((i) => ({ key: `player-walk-${dir}-${i}` })),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: `player-attack-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `player-attack-${dir}-${i}` })),
        frameRate: 12,
        repeat: 0,
      });
    }
  }

  private createRockAnimations() {
    const dirs = ["front", "back", "side"] as const;

    for (const dir of dirs) {
      this.anims.create({
        key: `enemy-rock-idle-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-rock-idle-${dir}-${i}` })),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `enemy-rock-walk-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-rock-walk-${dir}-${i}` })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `enemy-rock-attack-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-rock-attack-${dir}-${i}` })),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  private createGolemAnimations() {
    const dirs = ["front", "back", "side"] as const;

    for (const dir of dirs) {
      this.anims.create({
        key: `enemy-golem-idle-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-golem-idle-${dir}-${i}` })),
        frameRate: 5,
        repeat: -1,
      });
      this.anims.create({
        key: `enemy-golem-walk-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-golem-walk-${dir}-${i}` })),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `enemy-golem-attack-${dir}`,
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-golem-attack-${dir}-${i}` })),
        frameRate: 8,
        repeat: 0,
      });
    }
  }

  private createGhostAnimations() {
    this.anims.create({
      key: "enemy-ghost-idle",
      frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-ghost-idle-${i}` })),
      frameRate: 7,
      repeat: -1,
    });
    if (this.textures.exists("enemy-ghost-attack-side-1")) {
      this.anims.create({
        key: "enemy-ghost-attack-side",
        frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-ghost-attack-side-${i}` })),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  private createSovaAnimations() {
    this.anims.create({
      key: "enemy-sova-idle",
      frames: [1, 2, 3, 4].map((i) => ({ key: `enemy-sova-idle-${i}` })),
      frameRate: 6,
      repeat: -1,
    });
  }

  // ── Player: chibi knight character (procedural fallback) ──
  private genPlayerTexture(g: Phaser.GameObjects.Graphics) {
    const s = TILE_SIZE;
    g.clear();

    // Shadow on ground
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(s / 2, s - 3, 18, 6);

    // Body / armor
    g.fillStyle(C.PLAYER_BODY);
    g.fillRect(10, 14, 12, 12);
    g.fillStyle(C.PLAYER_BODY_DARK);
    g.fillRect(10, 20, 12, 6);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(12, 15, 3, 4);

    // Legs
    g.fillStyle(C.PLAYER_BODY_DARK);
    g.fillRect(11, 26, 4, 4);
    g.fillRect(17, 26, 4, 4);
    g.fillStyle(0x5a3e28);
    g.fillRect(10, 28, 5, 3);
    g.fillRect(17, 28, 5, 3);

    // Arms
    g.fillStyle(C.PLAYER_BODY);
    g.fillRect(7, 15, 3, 8);
    g.fillRect(22, 15, 3, 8);
    g.fillStyle(C.PLAYER_SKIN);
    g.fillRect(7, 22, 3, 3);
    g.fillRect(22, 22, 3, 3);

    // Head
    g.fillStyle(C.PLAYER_SKIN);
    g.fillRect(11, 4, 10, 11);
    g.fillStyle(C.PLAYER_HAIR);
    g.fillRect(10, 2, 12, 5);
    g.fillRect(10, 2, 3, 8);
    g.fillRect(19, 2, 3, 8);

    // Eyes
    g.fillStyle(C.PLAYER_EYES);
    g.fillRect(13, 8, 2, 3);
    g.fillRect(17, 8, 2, 3);
    g.fillStyle(C.WHITE);
    g.fillRect(13, 8, 1, 1);
    g.fillRect(17, 8, 1, 1);

    // Mouth
    g.fillStyle(0xc4866e);
    g.fillRect(14, 12, 4, 1);

    // Sword (right side)
    g.fillStyle(C.PLAYER_SWORD);
    g.fillRect(25, 6, 2, 16);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(25, 6, 1, 16);
    g.fillStyle(C.PLAYER_SWORD_HANDLE);
    g.fillRect(24, 21, 4, 2);
    g.fillRect(25, 23, 2, 4);

    g.generateTexture("player", s, s);
  }

  // ── Pink blob enemy (basic) ──
  private genBlobEnemy(
    g: Phaser.GameObjects.Graphics,
    key: string,
    color: number,
    darkColor: number,
  ) {
    const s = TILE_SIZE;
    g.clear();

    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(s / 2, s - 3, 20, 6);

    g.fillStyle(darkColor);
    g.fillEllipse(s / 2, s / 2 + 2, 22, 20);
    g.fillStyle(color);
    g.fillEllipse(s / 2, s / 2, 20, 18);

    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(s / 2 - 3, s / 2 - 4, 8, 6);

    g.fillStyle(C.WHITE);
    g.fillCircle(s / 2 - 4, s / 2 - 1, 4);
    g.fillCircle(s / 2 + 4, s / 2 - 1, 4);
    g.fillStyle(0x1a1a2e);
    g.fillCircle(s / 2 - 3, s / 2, 2.5);
    g.fillCircle(s / 2 + 5, s / 2, 2.5);
    g.fillStyle(C.WHITE);
    g.fillCircle(s / 2 - 4, s / 2 - 2, 1);
    g.fillCircle(s / 2 + 4, s / 2 - 2, 1);

    g.fillStyle(darkColor);
    g.fillEllipse(s / 2, s / 2 + 6, 4, 3);

    g.generateTexture(key, s, s);
  }

  // ── Grey stone golem enemy (tanky) ──
  private genGolemEnemy(
    g: Phaser.GameObjects.Graphics,
    key: string,
    color: number,
    darkColor: number,
  ) {
    const s = TILE_SIZE;
    g.clear();

    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(s / 2, s - 2, 22, 6);

    g.fillStyle(darkColor);
    g.fillRoundedRect(5, 6, 22, 24, 3);
    g.fillStyle(color);
    g.fillRoundedRect(6, 5, 20, 22, 3);

    g.fillStyle(0x000000, 0.1);
    g.fillRect(10, 10, 12, 1);
    g.fillRect(8, 18, 16, 1);

    g.fillStyle(0xffffff, 0.1);
    g.fillRect(8, 6, 6, 3);
    g.fillRect(18, 12, 5, 4);

    g.fillStyle(0xff6b35);
    g.fillRect(10, 12, 4, 3);
    g.fillRect(18, 12, 4, 3);
    g.fillStyle(0xffd700);
    g.fillRect(11, 13, 2, 1);
    g.fillRect(19, 13, 2, 1);

    g.fillStyle(darkColor);
    g.fillRect(2, 10, 4, 12);
    g.fillRect(26, 10, 4, 12);
    g.fillStyle(color);
    g.fillRect(3, 10, 3, 10);
    g.fillRect(26, 10, 3, 10);

    g.generateTexture(key, s, s);
  }

  // ── Boss SOVA: large purple entity ──
  private genBossTexture(g: Phaser.GameObjects.Graphics) {
    const s = 48;
    g.clear();

    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(s / 2, s - 3, 36, 10);

    g.fillStyle(C.ENEMY_BOSS_DARK);
    g.fillRoundedRect(4, 8, s - 8, s - 14, 6);
    g.fillStyle(C.ENEMY_BOSS);
    g.fillRoundedRect(5, 6, s - 10, s - 14, 6);

    g.fillStyle(0xc084fc, 0.3);
    g.fillRoundedRect(3, 5, s - 6, s - 12, 8);
    g.fillStyle(C.ENEMY_BOSS);
    g.fillRoundedRect(5, 6, s - 10, s - 14, 6);

    g.fillStyle(0x22c55e, 0.3);
    g.fillCircle(14, 14, 5);
    g.fillCircle(34, 28, 4);
    g.fillCircle(22, 34, 3);

    g.fillStyle(0x000000, 0.08);
    g.fillRect(10, 16, s - 20, 1);
    g.fillRect(10, 24, s - 20, 1);

    g.fillStyle(C.WHITE);
    g.fillCircle(18, 20, 6);
    g.fillCircle(30, 20, 6);
    g.fillStyle(0xff0040);
    g.fillCircle(19, 20, 4);
    g.fillCircle(31, 20, 4);
    g.fillStyle(0x1a1a2e);
    g.fillCircle(19, 20, 2);
    g.fillCircle(31, 20, 2);
    g.fillStyle(C.WHITE);
    g.fillCircle(17, 18, 1.5);
    g.fillCircle(29, 18, 1.5);

    g.fillStyle(0xfbbf24);
    g.fillTriangle(14, 8, 12, 0, 16, 8);
    g.fillTriangle(24, 6, 22, -2, 26, 6);
    g.fillTriangle(34, 8, 32, 0, 36, 8);

    g.generateTexture("enemy-boss", s, s);
  }

  // ── Coin treasure ──
  private genCoinTexture(g: Phaser.GameObjects.Graphics) {
    const s = 20;
    g.clear();

    g.fillStyle(C.TREASURE_COIN_DARK);
    g.fillCircle(s / 2, s / 2, 8);
    g.fillStyle(C.TREASURE_COIN);
    g.fillCircle(s / 2, s / 2, 7);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(s / 2 - 2, s / 2 - 2, 3);
    g.fillStyle(C.TREASURE_COIN_DARK, 0.6);
    g.fillRect(s / 2 - 1, s / 2 - 4, 2, 8);
    g.fillRect(s / 2 - 3, s / 2 - 2, 6, 2);
    g.fillRect(s / 2 - 3, s / 2 + 1, 6, 2);

    g.generateTexture("treasure-coin", s, s);
  }

  // ── Orb treasure (procedural fallback) ──
  private genOrbTexture(g: Phaser.GameObjects.Graphics) {
    const s = 20;
    g.clear();

    g.fillStyle(C.TREASURE_ORB_DARK);
    g.fillTriangle(s / 2, 1, 1, s / 2, s / 2, s - 1);
    g.fillTriangle(s / 2, 1, s - 1, s / 2, s / 2, s - 1);
    g.fillStyle(C.TREASURE_ORB);
    g.fillTriangle(s / 2, 3, 3, s / 2, s / 2, s - 3);
    g.fillTriangle(s / 2, 3, s - 3, s / 2, s / 2, s - 3);
    g.fillStyle(0xffffff, 0.35);
    g.fillTriangle(s / 2, 4, 5, s / 2 - 1, s / 2, s / 2);
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(s / 2 + 1, s / 2 - 4, 2, 3);

    g.generateTexture("treasure-orb", s, s);
  }

  // ── Rare artifact treasure ──
  private genRareTexture(g: Phaser.GameObjects.Graphics) {
    const s = 20;
    g.clear();

    g.fillStyle(C.TREASURE_RARE, 0.2);
    g.fillCircle(s / 2, s / 2, 9);
    g.fillStyle(C.TREASURE_RARE_DARK);
    g.fillCircle(s / 2, s / 2, 7);
    g.fillStyle(C.TREASURE_RARE);
    g.fillCircle(s / 2, s / 2, 6);
    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(s / 2 + 1, s / 2 + 1, 4);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(s / 2 - 1, s / 2 - 4, 2, 3);
    g.fillRect(s / 2 - 1, s / 2 + 2, 2, 3);
    g.fillRect(s / 2 - 4, s / 2 - 1, 3, 2);
    g.fillRect(s / 2 + 2, s / 2 - 1, 3, 2);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(s / 2 - 2, s / 2 - 2, 2);

    g.generateTexture("treasure-golden-ticket", s, s);
  }

  // ── Stairs: stone steps descending into dark pit (MoG style) ──
  private genStairsTexture(
    g: Phaser.GameObjects.Graphics,
    key: string,
    locked: boolean,
  ) {
    const s = TILE_SIZE;
    g.clear();

    g.fillStyle(C.FLOOR_TOP);
    g.fillRect(0, 0, s, s);

    g.fillStyle(0x0a0a1a);
    g.fillRect(2, 2, s - 4, s - 4);

    if (locked) {
      g.fillStyle(0x555555);
      g.fillRect(4, 18, 7, 10);
      g.fillStyle(0x4a4a4a);
      g.fillRect(5, 18, 1, 10);
      g.fillStyle(0x555555);
      g.fillRect(12, 12, 7, 16);
      g.fillStyle(0x4a4a4a);
      g.fillRect(13, 12, 1, 16);
      g.fillStyle(0x555555);
      g.fillRect(20, 6, 7, 22);
      g.fillStyle(0x4a4a4a);
      g.fillRect(21, 6, 1, 22);
      g.fillStyle(0xff0000, 0.15);
      g.fillRect(2, 2, s - 4, s - 4);
    } else {
      g.fillStyle(0x6b6b99);
      g.fillRect(4, 18, 7, 10);
      g.fillStyle(0x52527a);
      g.fillRect(5, 18, 1, 10);
      g.fillStyle(0x3d3d66);
      g.fillRect(10, 18, 1, 10);

      g.fillStyle(0x5a5a88);
      g.fillRect(12, 12, 7, 16);
      g.fillStyle(0x48486e);
      g.fillRect(13, 12, 1, 16);
      g.fillStyle(0x3a3a5c);
      g.fillRect(18, 12, 1, 16);

      g.fillStyle(0x4a4a77);
      g.fillRect(20, 6, 7, 22);
      g.fillStyle(0x3d3d66);
      g.fillRect(21, 6, 1, 22);
      g.fillStyle(0x2e2e55);
      g.fillRect(26, 6, 1, 22);

      g.fillStyle(C.STAIRS_UNLOCKED, 0.12);
      g.fillRect(2, 2, s - 4, s - 4);
    }

    g.fillStyle(0xffffff, 0.1);
    g.fillRect(0, 0, s, 1);
    g.fillRect(0, 0, 1, s);
    g.fillStyle(0x000000, 0.15);
    g.fillRect(0, s - 1, s, 1);
    g.fillRect(s - 1, 0, 1, s);

    g.generateTexture(key, s, s);
  }

  // ── Statue ──
  private genStatueTexture(g: Phaser.GameObjects.Graphics) {
    const s = TILE_SIZE;
    g.clear();

    g.fillStyle(C.STATUE_DARK);
    g.fillRect(8, 24, 16, 6);
    g.fillStyle(C.STATUE);
    g.fillRect(10, 8, 12, 16);
    g.fillStyle(C.STATUE);
    g.fillCircle(s / 2, 8, 6);
    g.fillStyle(C.STATUE_DARK);
    g.fillRect(13, 7, 2, 2);
    g.fillRect(17, 7, 2, 2);
    g.fillStyle(C.STATUE_DARK);
    g.fillRect(8, 10, 3, 4);
    g.fillRect(21, 10, 3, 4);

    g.generateTexture("statue", s, s);
  }

  // ── D-pad buttons (mobile) ──
  private genDPad(g: Phaser.GameObjects.Graphics) {
    const dirs = [
      { key: "dpad-up", dx: 0, dy: -8 },
      { key: "dpad-down", dx: 0, dy: 8 },
      { key: "dpad-left", dx: -8, dy: 0 },
      { key: "dpad-right", dx: 8, dy: 0 },
    ];

    for (const { key, dx, dy } of dirs) {
      g.clear();
      g.fillStyle(C.WHITE, 0.15);
      g.fillRoundedRect(0, 0, 40, 40, 6);
      g.lineStyle(1, C.WHITE, 0.2);
      g.strokeRoundedRect(0, 0, 40, 40, 6);
      g.fillStyle(C.WHITE, 0.5);
      if (dy < 0) g.fillTriangle(20, 8, 12, 26, 28, 26);
      else if (dy > 0) g.fillTriangle(20, 32, 12, 14, 28, 14);
      else if (dx < 0) g.fillTriangle(8, 20, 26, 12, 26, 28);
      else g.fillTriangle(32, 20, 14, 12, 14, 28);
      g.generateTexture(key, 40, 40);
    }
  }

  // ── Chest texture (brown wooden box) ──
  private genChestTexture(
    g: Phaser.GameObjects.Graphics,
    key: string,
    opened: boolean,
  ) {
    const s = 24;
    g.clear();

    if (opened) {
      g.fillStyle(0x8b6914);
      g.fillRect(2, 10, 20, 12);
      g.fillStyle(0x6b4a10);
      g.fillRect(2, 18, 20, 4);
      g.fillStyle(0xa07818);
      g.fillRect(1, 4, 22, 7);
      g.fillStyle(0x8b6914);
      g.fillRect(3, 4, 18, 2);
      g.fillStyle(0xd4d4d8);
      g.fillRect(10, 5, 4, 5);
      g.fillStyle(0x1a1a2e);
      g.fillRect(4, 10, 16, 6);
      g.fillStyle(0xfbbf24);
      g.fillCircle(8, 14, 2);
      g.fillCircle(12, 13, 2);
      g.fillCircle(16, 14, 2);
    } else {
      g.fillStyle(0x8b6914);
      g.fillRect(2, 6, 20, 16);
      g.fillStyle(0x6b4a10);
      g.fillRect(2, 16, 20, 6);
      g.fillStyle(0xa07818);
      g.fillRect(1, 4, 22, 4);
      g.fillStyle(0xd4d4d8);
      g.fillRect(2, 8, 20, 1);
      g.fillStyle(0xd4d4d8);
      g.fillRect(10, 7, 4, 5);
      g.fillStyle(0xfbbf24);
      g.fillRect(11, 9, 2, 2);
      g.fillStyle(0x000000, 0.08);
      g.fillRect(5, 10, 1, 8);
      g.fillRect(12, 10, 1, 8);
      g.fillRect(19, 10, 1, 8);
      g.fillStyle(0xffffff, 0.1);
      g.fillRect(3, 5, 8, 1);
    }

    g.generateTexture(key, s, s);
  }

  // ── Spike trap (red spikes) ──
  private genTrapSpike(g: Phaser.GameObjects.Graphics) {
    const s = 20;
    g.clear();

    g.fillStyle(0x555555, 0.5);
    g.fillRect(2, 12, 16, 6);

    g.fillStyle(0xdc2626);
    g.fillTriangle(4, 14, 2, 18, 6, 18);
    g.fillTriangle(10, 12, 7, 18, 13, 18);
    g.fillTriangle(16, 14, 14, 18, 18, 18);

    g.fillStyle(0xfca5a5);
    g.fillRect(3, 14, 2, 1);
    g.fillRect(9, 12, 2, 1);
    g.fillRect(15, 14, 2, 1);

    g.generateTexture("trap-spike", s, s);
  }


  // ── Dust particle (4×4 white circle) ──
  private genParticleDust(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0xffffff);
    g.fillCircle(2, 2, 2);
    g.generateTexture("particle-dust", 4, 4);
  }

  // ── Move markers (chalk-like hand-drawn strokes) ──
  private genChalkMoveMarks(g: Phaser.GameObjects.Graphics) {
    const s = TILE_SIZE;

    const drawRoughPath = (pts: Array<[number, number]>) => {
      const passes: Array<{ ox: number; oy: number; w: number; a: number }> = [
        { ox: 0, oy: 0, w: 3.2, a: 0.50 },
        { ox: -0.7, oy: 0.6, w: 2.4, a: 0.32 },
        { ox: 0.8, oy: -0.5, w: 1.8, a: 0.24 },
      ];
      for (const p of passes) {
        g.lineStyle(p.w, 0xd4e5ff, p.a);
        g.beginPath();
        g.moveTo(pts[0][0] + p.ox, pts[0][1] + p.oy);
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i][0] + p.ox, pts[i][1] + p.oy);
        }
        g.strokePath();
      }
    };

    const drawSpecks = (cx: number, cy: number) => {
      g.fillStyle(0xd4e5ff, 0.24);
      g.fillCircle(cx - 3, cy + 2, 0.8);
      g.fillCircle(cx + 2, cy - 1, 0.9);
      g.fillCircle(cx + 5, cy + 3, 0.7);
    };

    const drawMark = (
      key: string,
      shaft: Array<[number, number]>,
      wingA: Array<[number, number]>,
      wingB: Array<[number, number]>,
      speckX: number,
      speckY: number,
    ) => {
      g.clear();
      drawRoughPath(shaft);
      drawRoughPath(wingA);
      drawRoughPath(wingB);
      drawSpecks(speckX, speckY);
      g.generateTexture(key, s, s);
    };

    drawMark(
      "move-mark-up",
      [[16, 23], [16, 11]],
      [[16, 11], [12, 15]],
      [[16, 11], [20, 15]],
      16,
      20,
    );
    drawMark(
      "move-mark-down",
      [[16, 9], [16, 21]],
      [[16, 21], [12, 17]],
      [[16, 21], [20, 17]],
      16,
      12,
    );
    drawMark(
      "move-mark-left",
      [[23, 16], [11, 16]],
      [[11, 16], [15, 12]],
      [[11, 16], [15, 20]],
      20,
      16,
    );
    drawMark(
      "move-mark-right",
      [[9, 16], [21, 16]],
      [[21, 16], [17, 12]],
      [[21, 16], [17, 20]],
      12,
      16,
    );
  }
}
