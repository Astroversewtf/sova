import { TurnPhase, TreasureType, CellType, type TilePos } from "../types";
import type { GameScene } from "../scenes/GameScene";
import { TREASURE_VALUES } from "../constants";
import { Treasure } from "../entities/Treasure";
import { useGameStore } from "@/stores/gameStore";

export class TurnManager {
  phase: TurnPhase = TurnPhase.PLAYER_INPUT;
  private inputLocked = false;
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  reset() {
    this.phase = TurnPhase.PLAYER_INPUT;
    this.inputLocked = false;
    useGameStore.getState().setTurnPhase(TurnPhase.PLAYER_INPUT);
  }

  handleInput(dx: number, dy: number) {
    if (this.phase !== TurnPhase.PLAYER_INPUT || this.inputLocked) return;
    this.inputLocked = true;
    this.phase = TurnPhase.PLAYER_MOVE;
    useGameStore.getState().setTurnPhase(TurnPhase.PLAYER_MOVE);

    // Hide arrows during movement
    this.scene.hideMoveArrows();

    const player = this.scene.player;
    const target: TilePos = {
      x: player.pos.x + dx,
      y: player.pos.y + dy,
    };

    // Check bounds & walkability
    if (!this.isWalkable(target)) {
      this.cancelInput();
      return;
    }

    // Check for enemy on target → bump attack
    const enemy = this.scene.getEnemyAt(target);
    if (enemy) {
      // Play attack animation, then resolve combat
      player.playAttack(() => {
        const killed = this.scene.combatSystem.resolveBump(player, enemy);
        if (killed) {
          this.scene.removeEnemy(enemy);
        }
        // Player stays in place but spends energy for the turn
        this.scene.energyManager.spendMove();

        if (this.scene.energyManager.isDead()) {
          this.scene.endRun("energy");
          return;
        }
        this.advanceToEnemyPhase();
      });
      return;
    }

    // Move player via GridEngine
    this.moveTarget = target;
    player.updateFacingFromDir(dx, dy);

    // Dust puff at previous position
    player.emitDust();

    const direction = this.scene.toDirection(dx, dy);
    this.scene.gridEngine.move("player", direction);
    // Post-move logic handled by onPlayerMoveComplete() via GridEngine event
  }

  /** Store the pending move target for post-move logic */
  private moveTarget: TilePos | null = null;

  /** Called by GameScene when GridEngine position change finishes */
  onPlayerMoveComplete() {
    const target = this.moveTarget;
    if (!target) return;
    this.moveTarget = null;

    // Spend energy
    this.scene.energyManager.spendMove();

    // Collect treasure
    this.scene.treasureManager.checkPickup(target);

    // Check chest
    this.checkChest(target);

    // Check trap
    this.checkTrap(target);

    if (this.scene.energyManager.isDead()) {
      this.scene.endRun("energy");
      return;
    }

    // Check stairs
    if (this.scene.isOnStairs(target)) {
      this.scene.completeFloor();
      return;
    }

    this.advanceToEnemyPhase();
  }

  private advanceToEnemyPhase() {
    this.phase = TurnPhase.ENEMY_MOVE;
    useGameStore.getState().setTurnPhase(TurnPhase.ENEMY_MOVE);

    this.scene.enemyAI.processAllEnemies(() => {
      if (this.scene.energyManager.isDead()) {
        this.scene.endRun("energy");
        return;
      }
      this.endTurn();
    });
  }

  private endTurn() {
    this.phase = TurnPhase.CHECK_CONDITIONS;

    // Tick poison DoT
    const store = useGameStore.getState();
    const poisonDmg = store.tickPoison();
    if (poisonDmg > 0) {
      this.scene.energyManager.energy = store.energy;
      this.scene.player.flashDamage();
      if (this.scene.energyManager.isDead()) {
        this.scene.endRun("energy");
        return;
      }
    }

    // Update fog
    const radius = this.scene.energyManager.getVisionRadius();
    this.scene.fogOfWar.update(this.scene.player.pos, radius);

    // Update entity visibility
    this.scene.updateEntityVisibility();

    // Update movement arrows
    this.scene.updateMoveArrows();

    // Ready for next input
    this.phase = TurnPhase.PLAYER_INPUT;
    this.inputLocked = false;
    useGameStore.getState().setTurnPhase(TurnPhase.PLAYER_INPUT);

    // Notify GameScene that action is complete (movement queue)
    this.scene.onActionComplete();
  }

  private cancelInput() {
    this.phase = TurnPhase.PLAYER_INPUT;
    this.inputLocked = false;
    useGameStore.getState().setTurnPhase(TurnPhase.PLAYER_INPUT);
    this.scene.onActionComplete();
  }

  private checkChest(pos: TilePos) {
    const chest = this.scene.getChestAt(pos);
    if (!chest) return;

    chest.open();
    useGameStore.getState().incrementChests();

    // Spawn 2-4 treasure items in adjacent empty tiles
    const map = this.scene.floorMap;
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
    ];
    const emptyAdj: TilePos[] = [];
    for (const d of dirs) {
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;
      if (
        nx >= 0 && ny >= 0 && nx < map.width && ny < map.height &&
        map.cells[ny][nx] === CellType.FLOOR
      ) {
        emptyAdj.push({ x: nx, y: ny });
      }
    }

    const count = Math.min(2 + Math.floor(Math.random() * 3), emptyAdj.length);
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let type: TreasureType;
      if (roll < 0.5) type = TreasureType.COIN;
      else if (roll < 0.85) type = TreasureType.GEM;
      else type = TreasureType.GOLDEN_TICKET;

      const tPos = emptyAdj[i];
      const id = `chest-loot-${Date.now()}-${i}`;
      const t = new Treasure(
        this.scene, tPos, type, TREASURE_VALUES[type], id,
      );
      this.scene.treasures.push(t);
      t.setVisible(this.scene.fogOfWar.isVisible(tPos));
    }
  }

  private checkTrap(pos: TilePos) {
    const trap = this.scene.getTrapAt(pos);
    if (!trap) return;

    const store = useGameStore.getState();
    const thickSkin = store.getUpgradeStacks("thick_skin");
    const dmg = trap.trigger(thickSkin);

    if (dmg > 0) {
      store.incrementTraps();
      this.scene.energyManager.energy = Math.max(0, this.scene.energyManager.energy - dmg);
      store.setEnergy(this.scene.energyManager.energy);
      this.scene.player.flashDamage();
    }

    // Poison trap: set 3 turns of DoT
    if (trap.type === "poison") {
      const current = store.poisonTurns;
      store.setPoisonTurns(Math.max(current, 3));
    }
  }

  private isWalkable(pos: TilePos): boolean {
    const map = this.scene.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    return map.cells[pos.y][pos.x] !== CellType.VOID;
  }
}
