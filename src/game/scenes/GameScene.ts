import Phaser from "phaser";
import { Direction } from "grid-engine";
import type { GridEngine } from "grid-engine";
import { CellType, TurnPhase, type FloorMap, type TilePos } from "../types";
import {
  TILE_SIZE, GAME_WIDTH, GAME_HEIGHT,
  CAMERA_ZOOM, CAMERA_LERP, C,
} from "../constants";
import { generateFloor } from "../systems/RoomGenerator";
import { TurnManager } from "../systems/TurnManager";
import { EnergyManager } from "../systems/EnergyManager";
import { FogOfWar } from "../systems/FogOfWar";
import { EnemyAI } from "../systems/EnemyAI";
import { CombatSystem } from "../systems/CombatSystem";
import { TreasureManager } from "../systems/TreasureManager";
import { VFXManager } from "../systems/VFXManager";
import { UpgradeManager } from "../systems/UpgradeManager";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Treasure } from "../entities/Treasure";
import { Chest } from "../entities/Chest";
import { Trap } from "../entities/Trap";
import { Stairs } from "../entities/Stairs";
import { useGameStore } from "@/stores/gameStore";

export class GameScene extends Phaser.Scene {
  // GridEngine (injected by plugin)
  declare gridEngine: GridEngine;
  private collisionMap: Phaser.Tilemaps.Tilemap | null = null;
  private geSubscription: { unsubscribe: () => void } | null = null;

  // Systems
  turnManager!: TurnManager;
  energyManager!: EnergyManager;
  fogOfWar!: FogOfWar;
  enemyAI!: EnemyAI;
  combatSystem!: CombatSystem;
  treasureManager!: TreasureManager;
  vfxManager!: VFXManager;
  upgradeManager!: UpgradeManager;

  // Track last energy for dirty-check
  private lastEnergy = -1;

  // Entities
  player!: Player;
  enemies: Enemy[] = [];
  treasures: Treasure[] = [];
  chests: Chest[] = [];
  traps: Trap[] = [];
  stairs!: Stairs;
  statueSprite: Phaser.GameObjects.Image | null = null;

  // Map
  floorMap!: FloorMap;
  tileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  currentFloor = 1;

  // Checkered overlay
  private checkeredOverlay: Phaser.GameObjects.RenderTexture | null = null;

  // Movement arrows
  private moveArrows!: {
    up: Phaser.GameObjects.Image;
    down: Phaser.GameObjects.Image;
    left: Phaser.GameObjects.Image;
    right: Phaser.GameObjects.Image;
  };

  // Movement queue (MoG-style pendingMove)
  private pendingMove: { dx: number; dy: number } | null = null;
  isProcessingAction = false;
  private actionTimeout: ReturnType<typeof setTimeout> | null = null;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private chatFocused = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);

    // Camera — keep player locked to center while moving
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setDeadzone(0, 0);

    // Init systems
    this.turnManager = new TurnManager(this);
    this.energyManager = new EnergyManager(this);
    this.combatSystem = new CombatSystem(this);
    this.enemyAI = new EnemyAI(this);
    this.treasureManager = new TreasureManager(this);
    this.vfxManager = new VFXManager(this);
    this.upgradeManager = new UpgradeManager(this);

    // Init store
    useGameStore.getState().startRun();

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey("W"),
        A: this.input.keyboard.addKey("A"),
        S: this.input.keyboard.addKey("S"),
        D: this.input.keyboard.addKey("D"),
      };
    }

    // Chat focus bridge
    const onChatFocus = () => { this.chatFocused = true; };
    const onChatBlur = () => { this.chatFocused = false; };
    window.addEventListener("sova:chat-focus", onChatFocus);
    window.addEventListener("sova:chat-blur", onChatBlur);
    this.events.on("shutdown", () => {
      window.removeEventListener("sova:chat-focus", onChatFocus);
      window.removeEventListener("sova:chat-blur", onChatBlur);
    });

    // Build first floor
    this.buildFloor(1);
  }

  buildFloor(floor: number) {
    this.currentFloor = floor;

    // Cleanup previous floor
    this.cleanupFloor();

    // Generate new floor
    this.floorMap = generateFloor(floor);
    const { width, height, cells, spawn, stairs, enemySpawns, treasureSpawns, chestSpawns, trapSpawns, bossSpawn, statuePos } = this.floorMap;

    // Update store
    const store = useGameStore.getState();
    if (floor > 1) store.nextFloor();
    store.setEnemiesRemaining(enemySpawns.length);

    // Energy
    this.energyManager.energy = store.energy;
    this.energyManager.maxEnergy = store.maxEnergy;

    // Half-viewport in tiles (how far camera can see from player)
    const halfVP = Math.ceil(Math.max(
      GAME_WIDTH / (CAMERA_ZOOM * TILE_SIZE),
      GAME_HEIGHT / (CAMERA_ZOOM * TILE_SIZE),
    ) / 2);

    // Wall-fill tiles extend further than camera bounds so walls are always visible
    const wallPad = halfVP + 7; // extra margin so camera never reaches the edge
    this.renderTiles(cells, width, height, wallPad);

    // Checkered overlay — 12% black on alternating floor tiles (MoG depth 1)
    this.createCheckeredOverlay(cells, width, height);

    // Camera bounds — tighter than wall-fill, so camera can never see past wall tiles
    const boundsPad = halfVP * TILE_SIZE;
    const worldW = width * TILE_SIZE;
    const worldH = height * TILE_SIZE;
    this.cameras.main.setBounds(
      -boundsPad, -boundsPad,
      worldW + boundsPad * 2, worldH + boundsPad * 2,
    );

    // Player
    this.player = new Player(this, spawn);

    // GridEngine — collision tilemap + character registration
    this.setupGridEngine(cells, width, height, spawn);

    // Movement arrows around player
    this.createMoveArrows();

    // Camera follow — snap to player immediately and keep initial spawn centered
    this.cameras.main.startFollow(this.player.sprite, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);

    // Stairs
    this.stairs = new Stairs(this, stairs);

    // Statue (boss room)
    if (statuePos) {
      this.statueSprite = this.add.image(
        statuePos.x * TILE_SIZE + TILE_SIZE / 2,
        statuePos.y * TILE_SIZE + TILE_SIZE / 2,
        "statue",
      );
      this.statueSprite.setDepth(350);
    }

    // Enemies
    this.enemies = enemySpawns.map((e, i) =>
      new Enemy(this, e.pos, e.type, floor, `enemy-${i}`),
    );

    // Treasures
    this.treasures = treasureSpawns.map((t, i) =>
      new Treasure(this, t.pos, t.type, t.value, `treasure-${i}`),
    );

    // Chests
    this.chests = chestSpawns.map((pos, i) =>
      new Chest(this, pos, `chest-${i}`),
    );

    // Traps
    this.traps = trapSpawns.map((t, i) =>
      new Trap(this, t.pos, t.type, `trap-${i}`),
    );

    // Fog of war
    this.fogOfWar = new FogOfWar(this, width, height);
    const radius = this.energyManager.getVisionRadius();
    this.fogOfWar.update(spawn, radius);

    // Initial entity visibility
    this.updateEntityVisibility();

    // Position arrows for spawn
    this.updateMoveArrows();

    // Turn manager
    this.turnManager.reset();

    // Notify HUD of new floor
    this.game.events.emit("sova:floor-start", { floor, isBoss: !!bossSpawn });
  }

  private renderTiles(cells: CellType[][], w: number, h: number, pad: number) {
    this.tileSprites.clear();

    const isFloor = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < w && y < h && cells[y][x] === CellType.FLOOR;

    const usePngWalls = this.textures.exists("wall-fill");

    // Render map tiles + wall-fill border (pad tiles on each side)
    for (let y = -pad; y < h + pad; y++) {
      for (let x = -pad; x < w + pad; x++) {
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        const inMap = x >= 0 && y >= 0 && x < w && y < h;

        if (inMap && cells[y][x] === CellType.FLOOR) {
          // Floor tile
          const isAlt = (x + y) % 2 === 0;
          const img = this.add.image(px, py, isAlt ? "tile-floor" : "tile-floor-alt");
          img.setDepth(100).setOrigin(0.5, 0.5);
          this.tileSprites.set(`${x},${y}`, img);
        } else if (inMap && usePngWalls) {
          // Map wall — pick contextual wall tile
          const key = this.pickWallTile(x, y, isFloor);
          const img = this.add.image(px, py, key);
          img.setDepth(95).setOrigin(0.5, 0.5);
          this.tileSprites.set(`w${x},${y}`, img);
        } else if (inMap) {
          // Map wall — fallback (no PNG walls loaded)
          const hasFloorSouth = isFloor(x, y + 1);
          const img = this.add.image(px, py, hasFloorSouth ? "tile-wall-face" : "tile-wall");
          img.setDepth(95).setOrigin(0.5, 0.5);
          this.tileSprites.set(`w${x},${y}`, img);
        } else {
          // Outside map — continuous wall-fill so void is never visible
          const key = usePngWalls ? "wall-fill" : "tile-wall";
          const img = this.add.image(px, py, key);
          img.setDepth(95).setOrigin(0.5, 0.5);
          this.tileSprites.set(`p${x},${y}`, img);
        }
      }
    }
  }

  /** Pick the correct wall PNG based on adjacent floor tiles */
  private pickWallTile(
    x: number,
    y: number,
    isFloor: (x: number, y: number) => boolean,
  ): string {
    const fN = isFloor(x, y - 1);
    const fS = isFloor(x, y + 1);
    const fW = isFloor(x - 1, y);
    const fE = isFloor(x + 1, y);

    // Corners (two adjacent floor edges)
    if (fS && fW) return "wall-corner-bl";
    if (fS && fE) return "wall-corner-br";
    if (fN && fW) return "wall-corner-tl";
    if (fN && fE) return "wall-corner-tr";

    // Edges — alternate variants with deterministic hash
    const v = ((x * 7 + y * 13) & 1) + 1;
    if (fS) return `wall-straight-${v}`;
    if (fN) return `wall-top-${v}`;
    if (fW) return "wall-side-l";
    if (fE) return "wall-side-r";

    // Interior wall — no adjacent floor
    return "wall-fill";
  }

  private setupGridEngine(cells: CellType[][], w: number, h: number, spawn: TilePos) {
    // Convert cells to tilemap data: 0 = walkable (floor), 1 = blocked (void/wall)
    const mapData: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        row.push(cells[y][x] === CellType.FLOOR ? 0 : 1);
      }
      mapData.push(row);
    }

    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    // Create a blank texture for the collision tileset (invisible layer)
    if (!this.textures.exists("ge-blank")) {
      const gfx = this.make.graphics({});
      gfx.generateTexture("ge-blank", TILE_SIZE * 2, TILE_SIZE);
      gfx.destroy();
    }

    const tileset = map.addTilesetImage("ge-blank")!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setVisible(false);
    map.setCollision(1); // Tile index 1 = wall/void

    this.collisionMap = map;

    // Initialize GridEngine with player character
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: this.player.dummySprite,
          startPosition: { x: spawn.x, y: spawn.y },
          speed: 6,
          offsetX: TILE_SIZE / 2,
          offsetY: TILE_SIZE / 2,
        },
      ],
      numberOfDirections: 4,
    });

    // Subscribe to position changes for turn flow
    this.geSubscription = this.gridEngine.positionChangeFinished().subscribe(
      ({ charId }: { charId: string }) => {
        if (charId === "player") {
          // Update logical position from GridEngine
          const gePos = this.gridEngine.getPosition("player");
          this.player.pos = { x: gePos.x, y: gePos.y };
          this.turnManager.onPlayerMoveComplete();
        }
      },
    );
  }

  private createCheckeredOverlay(cells: CellType[][], w: number, h: number) {
    const rt = this.add.renderTexture(0, 0, w * TILE_SIZE, h * TILE_SIZE);
    rt.setOrigin(0, 0);
    rt.setDepth(101); // Just above floor tiles (100)

    const stamp = this.add.graphics();
    stamp.fillStyle(0x000000, 0.12);
    stamp.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    stamp.setVisible(false);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (cells[y][x] === CellType.FLOOR && (x + y) % 2 === 1) {
          rt.draw(stamp, x * TILE_SIZE, y * TILE_SIZE);
        }
      }
    }

    stamp.destroy();
    this.checkeredOverlay = rt;
  }

  private cleanupFloor() {
    this.player?.destroy();
    this.moveArrows?.up.destroy();
    this.moveArrows?.down.destroy();
    this.moveArrows?.left.destroy();
    this.moveArrows?.right.destroy();
    this.enemies.forEach((e) => e.destroy());
    this.treasures.forEach((t) => t.destroy());
    this.chests.forEach((c) => c.destroy());
    this.traps.forEach((tr) => tr.destroy());
    this.stairs?.destroy();
    this.statueSprite?.destroy();
    this.statueSprite = null;
    this.fogOfWar?.destroy();
    this.checkeredOverlay?.destroy();
    this.vfxManager?.destroy();
    this.checkeredOverlay = null;

    // GridEngine cleanup
    this.geSubscription?.unsubscribe();
    this.geSubscription = null;
    this.collisionMap?.destroy();
    this.collisionMap = null;

    for (const s of this.tileSprites.values()) s.destroy();
    this.tileSprites.clear();

    this.enemies = [];
    this.treasures = [];
    this.chests = [];
    this.traps = [];
  }

  update() {
    // Sync player visual sprite with GridEngine-controlled dummy
    if (this.player?.dummySprite) {
      this.player.syncWithGridEngine();
    }

    // Desaturation VFX — update only when energy changes
    const energy = this.energyManager.energy;
    if (energy !== this.lastEnergy) {
      this.lastEnergy = energy;
      this.vfxManager.updateDesaturation(energy, this.energyManager.maxEnergy);
    }

    if (this.chatFocused) return;

    // Read directional input
    const kb = Phaser.Input.Keyboard;
    let dx = 0, dy = 0;
    if (kb.JustDown(this.cursors.up) || kb.JustDown(this.wasd.W)) {
      dy = -1;
    } else if (kb.JustDown(this.cursors.down) || kb.JustDown(this.wasd.S)) {
      dy = 1;
    } else if (kb.JustDown(this.cursors.left) || kb.JustDown(this.wasd.A)) {
      dx = -1;
    } else if (kb.JustDown(this.cursors.right) || kb.JustDown(this.wasd.D)) {
      dx = 1;
    }

    if (dx !== 0 || dy !== 0) {
      if (this.isProcessingAction) {
        // Queue for after current action completes (MoG pendingMove)
        this.pendingMove = { dx, dy };
      } else if (this.turnManager.phase === TurnPhase.PLAYER_INPUT) {
        this.executeMove(dx, dy);
      }
    }
  }

  /** Execute a move or queued move */
  private executeMove(dx: number, dy: number) {
    this.isProcessingAction = true;

    // 8-second safety timeout (MoG pattern)
    this.actionTimeout = setTimeout(() => {
      this.isProcessingAction = false;
      this.pendingMove = null;
    }, 8000);

    this.turnManager.handleInput(dx, dy);
  }

  /** Called by TurnManager when action completes */
  onActionComplete() {
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }
    this.isProcessingAction = false;

    // Execute pending move if walkable (MoG pattern: only walk, not attacks)
    if (this.pendingMove) {
      const { dx, dy } = this.pendingMove;
      this.pendingMove = null;

      const target: TilePos = {
        x: this.player.pos.x + dx,
        y: this.player.pos.y + dy,
      };

      // Only execute pending if it's a walkable tile (no enemy = walk only)
      const map = this.floorMap;
      const walkable = target.x >= 0 && target.y >= 0 &&
        target.x < map.width && target.y < map.height &&
        map.cells[target.y][target.x] !== CellType.VOID;

      if (walkable && this.turnManager.phase === TurnPhase.PLAYER_INPUT) {
        this.executeMove(dx, dy);
      }
    }
  }

  /** Snap player to exact tile position (for desync correction, floor transitions) */
  snapPlayerToPosition(x: number, y: number) {
    this.player.pos = { x, y };
    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;
    this.player.sprite.setPosition(px, py);
    this.player.dummySprite.setPosition(px, py);

    // Also update GridEngine's internal position
    if (this.gridEngine) {
      this.gridEngine.setPosition("player", { x, y });
    }
  }

  /** Convert dx/dy to GridEngine Direction */
  toDirection(dx: number, dy: number): Direction {
    if (dy < 0) return Direction.UP;
    if (dy > 0) return Direction.DOWN;
    if (dx < 0) return Direction.LEFT;
    return Direction.RIGHT;
  }

  // ── Public helpers used by systems ──

  getEnemyAt(pos: TilePos): Enemy | undefined {
    return this.enemies.find(
      (e) => e.isAlive() && e.pos.x === pos.x && e.pos.y === pos.y,
    );
  }

  getChestAt(pos: TilePos): Chest | undefined {
    return this.chests.find(
      (c) => !c.opened && c.pos.x === pos.x && c.pos.y === pos.y,
    );
  }

  getTrapAt(pos: TilePos): Trap | undefined {
    return this.traps.find(
      (tr) => tr.pos.x === pos.x && tr.pos.y === pos.y,
    );
  }

  removeEnemy(_enemy: Enemy) {
    // Mark as dead — AI skips dead enemies
  }

  isOnStairs(pos: TilePos): boolean {
    return (
      pos.x === this.stairs.pos.x &&
      pos.y === this.stairs.pos.y
    );
  }

  updateEntityVisibility() {
    for (const e of this.enemies) {
      e.setVisible(e.isAlive() && this.fogOfWar.isVisible(e.pos));
    }
    for (const t of this.treasures) {
      if (t.collected) continue;
      t.setVisible(this.fogOfWar.isVisible(t.pos));
    }
    for (const c of this.chests) {
      c.setVisible(this.fogOfWar.isVisible(c.pos) || this.fogOfWar.isExplored(c.pos));
    }
    for (const tr of this.traps) {
      tr.setVisible(this.fogOfWar.isVisible(tr.pos));
    }
    this.stairs.setVisible(
      this.fogOfWar.isVisible(this.stairs.pos) ||
      this.fogOfWar.isExplored(this.stairs.pos),
    );
    if (this.statueSprite) {
      const sPos = this.floorMap.statuePos;
      this.statueSprite.setVisible(
        !!sPos && (this.fogOfWar.isVisible(sPos) || this.fogOfWar.isExplored(sPos)),
      );
    }
  }

  private createMoveArrows() {
    const alpha = 0.4;
    const depth = 450;
    const scale = 0.75;

    const up = this.add.image(0, 0, "arrow-up").setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    const down = this.add.image(0, 0, "arrow-down").setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    const left = this.add.image(0, 0, "arrow-side").setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    const right = this.add.image(0, 0, "arrow-side").setAlpha(alpha).setDepth(depth).setScale(scale).setFlipX(true).setVisible(false);

    this.moveArrows = { up, down, left, right };
  }

  hideMoveArrows() {
    if (!this.moveArrows) return;
    this.moveArrows.up.setVisible(false);
    this.moveArrows.down.setVisible(false);
    this.moveArrows.left.setVisible(false);
    this.moveArrows.right.setVisible(false);
  }

  updateMoveArrows() {
    if (!this.moveArrows || !this.player) return;

    const px = this.player.pos.x;
    const py = this.player.pos.y;

    const dirs = [
      { key: "up" as const, dx: 0, dy: -1 },
      { key: "down" as const, dx: 0, dy: 1 },
      { key: "left" as const, dx: -1, dy: 0 },
      { key: "right" as const, dx: 1, dy: 0 },
    ];

    for (const { key, dx, dy } of dirs) {
      const tx = px + dx;
      const ty = py + dy;
      const arrow = this.moveArrows[key];

      // Show arrow only on walkable floor tiles
      if (this.isWalkable({ x: tx, y: ty })) {
        arrow.setPosition(
          tx * TILE_SIZE + TILE_SIZE / 2,
          ty * TILE_SIZE + TILE_SIZE / 2,
        );
        arrow.setVisible(true);
      } else {
        arrow.setVisible(false);
      }
    }
  }

  private isWalkable(pos: TilePos): boolean {
    const map = this.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    return map.cells[pos.y][pos.x] !== CellType.VOID;
  }

  completeFloor() {
    const bossKilled = this.floorMap.bossSpawn &&
      this.enemies.some((e) => e.type === "boss" && !e.isAlive());

    // Fade to black before showing anything
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (bossKilled) {
          this.scene.pause();
          this.scene.launch("BossResultScene", {
            floor: this.currentFloor,
            onContinue: () => {
              this.scene.resume();
              this.showUpgradeScreen();
            },
          });
          return;
        }
        this.showUpgradeScreen();
      },
    );
  }

  private showUpgradeScreen() {
    this.scene.pause();
    this.scene.launch("UpgradeScene", {
      floor: this.currentFloor,
      onComplete: (chosenUpgrade: string) => {
        this.upgradeManager.applyUpgrade(chosenUpgrade as any);
        this.scene.resume();
        this.buildFloor(this.currentFloor + 1);
        // Fade in to reveal the new floor
        this.cameras.main.fadeIn(500, 0, 0, 0);
      },
    });
  }

  endRun(_reason: "energy" | "exit") {
    this.scene.start("RunEndScene", {
      stats: useGameStore.getState().getStats(),
      floor: this.currentFloor,
    });
  }
}
