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
import { PopupManager } from "../systems/PopupManager";
import { UpgradeManager } from "../systems/UpgradeManager";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Treasure } from "../entities/Treasure";
import { Chest } from "../entities/Chest";
import { Trap } from "../entities/Trap";
import { Fountain } from "../entities/Fountain";
import { Stairs } from "../entities/Stairs";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { emitSfxEvent } from "@/lib/audioEvents";

export class GameScene extends Phaser.Scene {
  private static readonly INPUT_ACTIONS = ["up", "down", "left", "right", "pass", "mute"] as const;
  private static readonly DEFAULT_KEY_MAP = {
    up: ["UP", "W"],
    down: ["DOWN", "S"],
    left: ["LEFT", "A"],
    right: ["RIGHT", "D"],
    pass: ["SPACE"],
    mute: ["M"],
  } as const;

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
  popupManager!: PopupManager;
  upgradeManager!: UpgradeManager;

  // Track last energy for dirty-check
  private lastEnergy = -1;

  // Entities
  player!: Player;
  enemies: Enemy[] = [];
  treasures: Treasure[] = [];
  chests: Chest[] = [];
  traps: Trap[] = [];
  fountain: Fountain | null = null;
  stairs!: Stairs;
  statueSprite: Phaser.GameObjects.Image | null = null;
  props: Phaser.GameObjects.Image[] = [];

  // Map
  floorMap!: FloorMap;
  tileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  currentFloor = 1;
  private bossKilledInRun = false;
  private bossSpottedThisFloor = false;

  // Checkered overlay
  private checkeredOverlay: Phaser.GameObjects.RenderTexture | null = null;

  // Movement arrows
  private moveArrows!: {
    up: Phaser.GameObjects.Image;
    down: Phaser.GameObjects.Image;
    left: Phaser.GameObjects.Image;
    right: Phaser.GameObjects.Image;
  };
  private moveArrowPulseTweens = new WeakMap<Phaser.GameObjects.Image, Phaser.Tweens.Tween>();
  private moveArrowPulseState = new WeakMap<Phaser.GameObjects.Image, "normal" | "blocked" | "stairs">();

  // Movement queue (MoG-style pendingMove)
  private pendingMove: { dx: number; dy: number } | null = null;
  isProcessingAction = false;
  private actionTimeout: ReturnType<typeof setTimeout> | null = null;
  private runEnding = false;

  // Input
  private inputKeys: Record<
    "up" | "down" | "left" | "right" | "pass" | "mute",
    Phaser.Input.Keyboard.Key[]
  > = {
      up: [],
      down: [],
      left: [],
      right: [],
      pass: [],
      mute: [],
    };
  private chatFocused = false;
  private heldInputDir: { dx: number; dy: number } | null = null;
  private heldInputStartedAt = 0;
  private heldInputLastRepeatAt = 0;
  private static readonly INPUT_REPEAT_DELAY_MS = 190;
  private static readonly INPUT_REPEAT_MS = 85;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor(0x676767);
    this.runEnding = false;

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
    this.popupManager = new PopupManager(this);
    this.upgradeManager = new UpgradeManager(this);

    // Init store
    useGameStore.getState().startRun();
    this.bossKilledInRun = false;
    this.events.on("combat:kill", (enemy: Enemy) => {
      if (enemy.type === "boss") this.bossKilledInRun = true;
    });

    this.rebuildInputKeys();

    // Chat focus bridge
    const onChatFocus = () => { this.chatFocused = true; };
    const onChatBlur = () => { this.chatFocused = false; };
    const onSkipTurn = () => { this.executeSkip(); };
    const onControlsUpdated = () => { this.rebuildInputKeys(); };
    window.addEventListener("sova:chat-focus", onChatFocus);
    window.addEventListener("sova:chat-blur", onChatBlur);
    window.addEventListener("sova:skip-turn", onSkipTurn);
    window.addEventListener("sova:controls-updated", onControlsUpdated);
    this.events.on("shutdown", () => {
      window.removeEventListener("sova:chat-focus", onChatFocus);
      window.removeEventListener("sova:chat-blur", onChatBlur);
      window.removeEventListener("sova:skip-turn", onSkipTurn);
      window.removeEventListener("sova:controls-updated", onControlsUpdated);
    });

    // Build first floor
    this.buildFloor(1);
  }

  buildFloor(floor: number) {
    this.currentFloor = floor;
    this.bossSpottedThisFloor = false;
    emitSfxEvent("boss-intro-stop");

    // Reset action state so input isn't blocked on the new floor
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }
    this.isProcessingAction = false;
    this.pendingMove = null;
    this.heldInputDir = null;
    this.heldInputStartedAt = 0;
    this.heldInputLastRepeatAt = 0;
    this.enemyAI.reset();

    // Cleanup previous floor
    this.cleanupFloor();

    // Generate new floor
    this.floorMap = generateFloor(floor, this.bossKilledInRun);
    const { width, height, cells, spawn, stairs, enemySpawns, treasureSpawns, chestSpawns, trapSpawns, fountainSpawn, propSpawns, wallPropSpawns, bossSpawn, statuePos } = this.floorMap;

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

    // No checkered overlay when using varied floor PNGs.

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
      new Trap(this, t.pos, `trap-${i}`, this.currentFloor),
    );

    // Fountain
    this.fountain = fountainSpawn
      ? new Fountain(this, fountainSpawn, "fountain-0")
      : null;

    // Decorative floor props disabled
    this.props = [];

    // Wall decorative props (lights & planks on south-facing walls)
    for (const wp of wallPropSpawns) {
      const texKey = wp.type === "light" ? "prop-wall-light" : "prop-wall-plank";
      if (!this.textures.exists(texKey)) continue;
      const isLight = wp.type === "light";
      const yOffset = isLight ? 8 : 0;
      const img = this.add.image(
        wp.pos.x * TILE_SIZE + TILE_SIZE / 2,
        wp.pos.y * TILE_SIZE + TILE_SIZE / 2 + yOffset,
        texKey,
      );
      img.setDepth(200);
      img.setOrigin(0.5, 0.5);
      // Use the floor tile below (y+1) for fog visibility — wall tiles are VOID and never revealed
      img.setData("tilePos", { x: wp.pos.x, y: wp.pos.y + 1 });
      this.props.push(img);

      if (isLight) {
        // Soft yellow glow behind the wall light.
        const glow = this.add.image(
          wp.pos.x * TILE_SIZE + TILE_SIZE / 2,
          wp.pos.y * TILE_SIZE + TILE_SIZE / 2 + yOffset + 2,
          texKey,
        );
        glow.setDepth(199);
        glow.setOrigin(0.5, 0.5);
        glow.setScale(1.35);
        glow.setTint(0xffe76b);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        glow.setAlpha(0.18);
        glow.setData("tilePos", { x: wp.pos.x, y: wp.pos.y + 1 });
        this.props.push(glow);

        this.tweens.add({
          targets: glow,
          alpha: { from: 0.14, to: 0.3 },
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 900 + Math.floor(Math.random() * 300),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    // Fog of war
    this.fogOfWar = new FogOfWar(this, width, height, cells);
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
    const floorVariants: string[] = [];
    const addWeighted = (key: string, weight: number) => {
      if (!this.textures.exists(key) || weight <= 0) return;
      for (let i = 0; i < weight; i++) floorVariants.push(key);
    };

    // Make clean tile appear much more often than the others.
    addWeighted("tile-floor", 20);
    addWeighted("tile-floor-alt", 2);
    addWeighted("tile-floor-dirty-2", 1);
    addWeighted("tile-floor-empty", 1);
    addWeighted("tile-floor-cracked-lt", 1);
    addWeighted("tile-floor-cracked-rt", 1);
    addWeighted("tile-floor-cracked-lb", 1);
    addWeighted("tile-floor-cracked-rb", 1);

    if (floorVariants.length === 0) {
      floorVariants.push("tile-floor");
    }

    // Render map tiles + wall-fill border (pad tiles on each side)
    for (let y = -pad; y < h + pad; y++) {
      for (let x = -pad; x < w + pad; x++) {
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        const inMap = x >= 0 && y >= 0 && x < w && y < h;

        if (inMap && cells[y][x] === CellType.FLOOR) {
          // Floor tile (no checkerboard): deterministic pseudo-random variant per tile.
          const hash = Math.abs((x * 73856093) ^ (y * 19349663) ^ (this.currentFloor * 83492791));
          const key = floorVariants[hash % floorVariants.length];
          const img = this.add.image(px, py, key);
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
    this.fountain?.destroy();
    this.fountain = null;
    this.props.forEach((p) => p.destroy());
    this.props = [];
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

  update(_time: number, delta: number) {
    // Fog reveal animation
    this.fogOfWar?.tick(delta);

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

    if (this.chatFocused || useSettingsStore.getState().isOpen) {
      this.heldInputDir = null;
      return;
    }

    if (this.anyJustDown(this.inputKeys.mute)) {
      useSettingsStore.getState().toggleMuteAll();
    }

    if (this.anyJustDown(this.inputKeys.pass)) {
      this.executeSkip();
      return;
    }

    const now = this.time.now;
    const justDown = this.getJustDownDirection();
    const held = this.getHeldDirection();

    // First press: always execute once (1 tap = 1 tile).
    if (justDown) {
      this.heldInputDir = justDown;
      this.heldInputStartedAt = now;
      this.heldInputLastRepeatAt = now;
      this.submitDirectionalInput(justDown.dx, justDown.dy);
      return;
    }

    // Nothing held: clear repeat state.
    if (!held) {
      this.heldInputDir = null;
      return;
    }

    // Direction changed while keys are already held.
    if (!this.heldInputDir || held.dx !== this.heldInputDir.dx || held.dy !== this.heldInputDir.dy) {
      this.heldInputDir = held;
      this.heldInputStartedAt = now;
      this.heldInputLastRepeatAt = now;
      return;
    }

    // Hold repeat with a delay to avoid accidental double-steps on a quick tap.
    if (now - this.heldInputStartedAt < GameScene.INPUT_REPEAT_DELAY_MS) return;
    if (now - this.heldInputLastRepeatAt < GameScene.INPUT_REPEAT_MS) return;

    this.heldInputLastRepeatAt = now;
    this.submitDirectionalInput(held.dx, held.dy);

  }

  private getJustDownDirection(): { dx: number; dy: number } | null {
    if (this.anyJustDown(this.inputKeys.up)) return { dx: 0, dy: -1 };
    if (this.anyJustDown(this.inputKeys.down)) return { dx: 0, dy: 1 };
    if (this.anyJustDown(this.inputKeys.left)) return { dx: -1, dy: 0 };
    if (this.anyJustDown(this.inputKeys.right)) return { dx: 1, dy: 0 };
    return null;
  }

  private getHeldDirection(): { dx: number; dy: number } | null {
    if (this.anyDown(this.inputKeys.up)) return { dx: 0, dy: -1 };
    if (this.anyDown(this.inputKeys.down)) return { dx: 0, dy: 1 };
    if (this.anyDown(this.inputKeys.left)) return { dx: -1, dy: 0 };
    if (this.anyDown(this.inputKeys.right)) return { dx: 1, dy: 0 };
    return null;
  }

  private anyJustDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
    for (const key of keys) {
      if (Phaser.Input.Keyboard.JustDown(key)) return true;
    }
    return false;
  }

  private anyDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
    for (const key of keys) {
      if (key.isDown) return true;
    }
    return false;
  }

  private rebuildInputKeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    const bindings = useSettingsStore.getState().bindings;

    for (const action of GameScene.INPUT_ACTIONS) {
      const raw = bindings[this.bindingActionToStoreKey(action)] ?? GameScene.DEFAULT_KEY_MAP[action];
      const list = raw.length > 0 ? raw : [...GameScene.DEFAULT_KEY_MAP[action]];
      const uniqueCodes = new Set<number>();
      const keys: Phaser.Input.Keyboard.Key[] = [];

      for (const binding of list) {
        const code = this.toPhaserKeyCode(binding);
        if (code === null || uniqueCodes.has(code)) continue;
        uniqueCodes.add(code);
        keys.push(keyboard.addKey(code));
      }

      if (keys.length === 0) {
        for (const fallback of GameScene.DEFAULT_KEY_MAP[action]) {
          const code = this.toPhaserKeyCode(fallback);
          if (code === null || uniqueCodes.has(code)) continue;
          uniqueCodes.add(code);
          keys.push(keyboard.addKey(code));
        }
      }

      this.inputKeys[action] = keys;
    }
  }

  private bindingActionToStoreKey(
    action: typeof GameScene.INPUT_ACTIONS[number],
  ): "moveUp" | "moveDown" | "moveLeft" | "moveRight" | "skipTurn" | "mute" {
    switch (action) {
      case "up": return "moveUp";
      case "down": return "moveDown";
      case "left": return "moveLeft";
      case "right": return "moveRight";
      case "pass": return "skipTurn";
      case "mute": return "mute";
      default: return "moveUp";
    }
  }

  private toPhaserKeyCode(binding: string): number | null {
    const normalized = binding.trim().toUpperCase();
    const keyCodes = Phaser.Input.Keyboard.KeyCodes as Record<string, number>;
    const code = keyCodes[normalized];
    return typeof code === "number" ? code : null;
  }

  private submitDirectionalInput(dx: number, dy: number) {
    if (this.isProcessingAction) {
      // Queue for after current action completes (single-slot latest direction).
      this.pendingMove = { dx, dy };
      return;
    }
    if (this.turnManager.phase === TurnPhase.PLAYER_INPUT) {
      this.executeMove(dx, dy);
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

  /** Execute a skip/pass turn action (spend turn without movement) */
  private executeSkip() {
    if (this.isProcessingAction || this.turnManager.phase !== TurnPhase.PLAYER_INPUT) return;

    this.isProcessingAction = true;

    // 8-second safety timeout (MoG pattern)
    this.actionTimeout = setTimeout(() => {
      this.isProcessingAction = false;
      this.pendingMove = null;
    }, 8000);

    this.turnManager.handleSkip();
  }

  /** Reset action state without chaining held-direction (used by cancelInput) */
  resetActionState() {
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
      this.actionTimeout = null;
    }
    this.isProcessingAction = false;
    this.pendingMove = null;
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
      return;
    }

    // Do not auto-chain held keys here:
    // one key press must result in exactly one tile movement.
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

  getFountainAt(pos: TilePos): Fountain | null {
    if (!this.fountain || this.fountain.used) return null;
    if (this.fountain.pos.x === pos.x && this.fountain.pos.y === pos.y) {
      return this.fountain;
    }
    return null;
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
      const isVisible = e.isAlive() && this.fogOfWar.isVisible(e.pos);
      e.setVisible(isVisible);
      if (!this.bossSpottedThisFloor && e.type === "boss" && isVisible) {
        this.bossSpottedThisFloor = true;
        emitSfxEvent("boss-spot");
        emitSfxEvent("boss-intro-start");
      }
    }
    for (const t of this.treasures) {
      if (t.collected) continue;
      t.setVisible(this.fogOfWar.isExplored(t.pos));
    }
    for (const c of this.chests) {
      c.setVisible(this.fogOfWar.isVisible(c.pos) || this.fogOfWar.isExplored(c.pos));
    }
    for (const tr of this.traps) {
      tr.setVisible(false);
    }
    if (this.fountain) {
      this.fountain.setVisible(
        this.fogOfWar.isVisible(this.fountain.pos) ||
        this.fogOfWar.isExplored(this.fountain.pos) ||
        this.fogOfWar.isVisible(this.fountain.topPos) ||
        this.fogOfWar.isExplored(this.fountain.topPos),
      );
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
    for (const p of this.props) {
      const pos = p.getData("tilePos") as TilePos;
      p.setVisible(this.fogOfWar.isVisible(pos) || this.fogOfWar.isExplored(pos));
    }
  }

  private createMoveArrows() {
    const alpha = 0.5;
    // Keep controls above floor/fog tiles but always below world entities.
    // Entity depths start at 300 (treasure/chest/fountain), enemy is 400, player is 500.
    const depth = 120;
    const scale = 0.75;

    const upKey = this.textures.exists("move-mark-up") ? "move-mark-up" : "arrow-up";
    const downKey = this.textures.exists("move-mark-down") ? "move-mark-down" : "arrow-down";
    const sideKey = this.textures.exists("move-mark-side") ? "move-mark-side" : null;
    const leftKey = sideKey ?? (this.textures.exists("move-mark-left") ? "move-mark-left" : "arrow-side");
    const rightKey = sideKey ?? (this.textures.exists("move-mark-right") ? "move-mark-right" : "arrow-side");

    const up = this.add.image(0, 0, upKey).setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    const down = this.add.image(0, 0, downKey).setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    const left = this.add.image(0, 0, leftKey).setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    const right = this.add.image(0, 0, rightKey).setAlpha(alpha).setDepth(depth).setScale(scale).setVisible(false);
    // Shared side asset points one direction; mirror for the opposite.
    if (rightKey === leftKey || rightKey === "arrow-side") right.setFlipX(true);

    this.bindMoveArrowInteraction(up, 0, -1);
    this.bindMoveArrowInteraction(down, 0, 1);
    this.bindMoveArrowInteraction(left, -1, 0);
    this.bindMoveArrowInteraction(right, 1, 0);

    this.moveArrows = { up, down, left, right };
  }

  private bindMoveArrowInteraction(arrow: Phaser.GameObjects.Image, dx: number, dy: number) {
    arrow.setInteractive({ useHandCursor: true });
    arrow.on("pointerdown", () => {
      if (!arrow.visible || this.chatFocused) return;
      this.submitDirectionalInput(dx, dy);
    });
  }

  hideMoveArrows() {
    if (!this.moveArrows) return;
    this.setMoveArrowVisual(this.moveArrows.up, "normal");
    this.setMoveArrowVisual(this.moveArrows.down, "normal");
    this.setMoveArrowVisual(this.moveArrows.left, "normal");
    this.setMoveArrowVisual(this.moveArrows.right, "normal");
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
        const target = { x: tx, y: ty };
        const isStairs = this.isOnStairs(target);
        const blockedByEnemyOrChest = !!this.getEnemyAt(target) || !!this.getChestAt(target);
        const visualState: "normal" | "blocked" | "stairs" = isStairs
          ? "stairs"
          : blockedByEnemyOrChest
            ? "blocked"
            : "normal";
        this.setMoveArrowVisual(arrow, visualState);
        arrow.setVisible(true);
      } else {
        this.setMoveArrowVisual(arrow, "normal");
        arrow.setVisible(false);
      }
    }
  }

  private setMoveArrowVisual(
    arrow: Phaser.GameObjects.Image,
    state: "normal" | "blocked" | "stairs",
  ) {
    const prev = this.moveArrowPulseState.get(arrow);
    if (prev === state) return;

    const currentTween = this.moveArrowPulseTweens.get(arrow);
    if (currentTween) {
      currentTween.stop();
      currentTween.remove();
      this.moveArrowPulseTweens.delete(arrow);
    }

    if (state === "normal") {
      arrow.clearTint();
      arrow.setAlpha(0.5);
      this.moveArrowPulseState.set(arrow, state);
      return;
    }

    if (state === "stairs") {
      arrow.setTint(0x78f56b);
      arrow.setAlpha(0.52);
      const tween = this.tweens.add({
        targets: arrow,
        alpha: 0.9,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.moveArrowPulseTweens.set(arrow, tween);
      this.moveArrowPulseState.set(arrow, state);
      return;
    }

    // blocked (enemy/chest)
    arrow.setTint(0xff8f8f);
    arrow.setAlpha(0.38);
    const tween = this.tweens.add({
      targets: arrow,
      alpha: 0.68,
      duration: 560,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.moveArrowPulseTweens.set(arrow, tween);
    this.moveArrowPulseState.set(arrow, state);
  }

  private isWalkable(pos: TilePos): boolean {
    const map = this.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    return map.cells[pos.y][pos.x] !== CellType.VOID;
  }

  completeFloor() {
    const bossKilled = this.floorMap.bossSpawn &&
      this.enemies.some((e) => e.type === "boss" && !e.isAlive());

    // Slower transition feel: longer fade to black, same flow.
    this.vfxManager.playPixelatedFadeToBlack(1200, () => {
      this.time.delayedCall(50, () => {
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
      });
    });
  }

  private showUpgradeScreen() {
    this.scene.pause();

    // Apply +10 energy bonus
    const store = useGameStore.getState();
    const energyBonus = 10;
    store.setEnergy(Math.min(store.energy + energyBonus, store.maxEnergy));

    // Show React upgrade overlay
    store.showUpgradeScreen(this.currentFloor);

    // Listen for React overlay upgrade choice
    const onUpgradeChosen = (e: Event) => {
      window.removeEventListener("sova:upgrade-chosen", onUpgradeChosen);
      const upgradeId = (e as CustomEvent).detail as string;
      this.upgradeManager.applyUpgrade(upgradeId as any);
      useGameStore.getState().hideUpgradeScreen();
      this.scene.resume();
      this.buildFloor(this.currentFloor + 1);
      this.vfxManager.playPixelatedFadeFromBlack(1000);
    };
    window.addEventListener("sova:upgrade-chosen", onUpgradeChosen);
  }


  endRun(_reason: "energy" | "exit") {
    // Multiple systems can hit endRun in the same turn; run this sequence once.
    if (this.runEnding) return;
    this.runEnding = true;
    emitSfxEvent("boss-intro-stop");

    const stats = useGameStore.getState().getStats();
    const floor = this.currentFloor;
    const cam = this.cameras.main;

    // 1. Camera shake
    cam.shake(200, 0.008);

    // 2. Slow motion
    this.time.timeScale = 0.35;
    this.tweens.timeScale = 0.35;
    this.anims.globalTimeScale = 0.35;

    // 3. Camera zoom in (keep SOVA signature)
    const baseZoom = cam.zoom;
    this.tweens.add({
      targets: cam,
      zoom: baseZoom * 1.3,
      duration: 400,
      ease: "Quad.easeOut",
    });

    // 4. Death desaturation
    this.vfxManager.applyDeathDesaturation();

    // 5. Player death animation (purple burst + soul rise)
    this.player.playDeath();

    // Slower transition feel: longer fade to black, same flow.
    this.time.delayedCall(400, () => {
      this.vfxManager.playPixelatedFadeToBlack(1800, () => {
        this.time.delayedCall(200, () => {
          // Reset time scale before transitioning
          this.time.timeScale = 1;
          this.tweens.timeScale = 1;
          this.anims.globalTimeScale = 1;
          this.scene.start("RunEndScene", { stats, floor });
        });
      });
    });
  }

  isRunEnding(): boolean {
    return this.runEnding;
  }
}
