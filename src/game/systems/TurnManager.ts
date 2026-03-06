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

    // Update facing direction before resolving action
    player.setFacing(dx, dy);

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

    // Check for chest on target → bump to break
    const chest = this.scene.getChestAt(target);
    if (chest) {
      player.playAttack(() => {
        this.breakChest(chest);
        this.advanceToEnemyPhase();
      });
      return;
    }

    // Move player via GridEngine
    this.moveTarget = target;

    // Play walk animation
    player.playWalk();

    const direction = this.scene.toDirection(dx, dy);
    this.scene.gridEngine.move("player", direction);
    // Post-move logic handled by onPlayerMoveComplete() via GridEngine event
  }

  /** Spend a turn without moving (MoG-style skip/pass action) */
  handleSkip() {
    if (this.phase !== TurnPhase.PLAYER_INPUT || this.inputLocked) return;
    this.inputLocked = true;
    this.phase = TurnPhase.PLAYER_MOVE;
    useGameStore.getState().setTurnPhase(TurnPhase.PLAYER_MOVE);

    // Hide arrows during the action
    this.scene.hideMoveArrows();

    // Consume turn energy as if it were a normal move
    this.scene.energyManager.spendMove();

    if (this.scene.energyManager.isDead()) {
      this.scene.endRun("energy");
      return;
    }

    this.advanceToEnemyPhase();
  }

  /** Store the pending move target for post-move logic */
  private moveTarget: TilePos | null = null;

  /** Called by GameScene when GridEngine position change finishes */
  onPlayerMoveComplete() {
    const target = this.moveTarget;
    if (!target) return;
    this.moveTarget = null;

    // Return to idle animation
    this.scene.player.stopWalk();

    // Spend energy
    this.scene.energyManager.spendMove();

    // Collect treasure
    this.scene.treasureManager.checkPickup(target);

    // Check fountain
    this.checkFountain(target);

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

  private static readonly MIN_TURN_MS = 120;

  private advanceToEnemyPhase() {
    this.phase = TurnPhase.ENEMY_MOVE;
    useGameStore.getState().setTurnPhase(TurnPhase.ENEMY_MOVE);

    const t0 = performance.now();
    this.scene.enemyAI.processAllEnemies(() => {
      if (this.scene.energyManager.isDead()) {
        this.scene.endRun("energy");
        return;
      }
      const elapsed = performance.now() - t0;
      const remaining = TurnManager.MIN_TURN_MS - elapsed;
      if (remaining > 0) {
        this.scene.time.delayedCall(remaining, () => this.endTurn());
      } else {
        this.endTurn();
      }
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
      this.scene.vfxManager.flashDamageOverlay();
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
    // Reset action state directly — don't call onActionComplete() to avoid
    // held-key recursion (wall → cancel → onActionComplete → executeMove → wall → ...)
    this.scene.resetActionState();
    // Re-show movement arrows (hideMoveArrows() was called at start of handleInput)
    this.scene.updateMoveArrows();
  }

  /**
   * Chest drops: 50% Energy, 30% Coin, 20% Orb
   */
  private breakChest(chest: import("../entities/Chest").Chest) {
    chest.open();
    useGameStore.getState().incrementChests();

    const pos = chest.pos;
    const roll = Math.random();

    let type: TreasureType;
    if (roll < 0.50) {
      type = TreasureType.ENERGY;
    } else if (roll < 0.80) {
      type = TreasureType.COIN;
    } else {
      type = TreasureType.ORB;
    }

    const id = `chest-loot-${Date.now()}`;
    const t = new Treasure(
      this.scene, pos, type, TREASURE_VALUES[type], id,
    );
    this.scene.treasures.push(t);
    t.setVisible(this.scene.fogOfWar.isVisible(pos));
  }

  private checkFountain(pos: TilePos) {
    const fountain = this.scene.getFountainAt(pos);
    if (!fountain) return;

    const heal = fountain.use();
    if (heal > 0) {
      this.scene.energyManager.heal(heal);
      this.scene.player.flashHeal();
      this.scene.popupManager.showEnergyBonus(pos.x, pos.y, heal);
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
      this.scene.vfxManager.flashDamageOverlay();
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
