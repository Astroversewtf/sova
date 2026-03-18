import { TurnPhase, TreasureType, CellType, type TilePos } from "../types";
import type { GameScene } from "../scenes/GameScene";
import { TREASURE_VALUES, getTier, TILE_SIZE, TILE_FULL_H } from "../constants";
import { Treasure } from "../entities/Treasure";
import { useGameStore } from "@/stores/gameStore";
import { emitSfxEvent } from "@/lib/audioEvents";

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

  handleSkip() {
    if (this.phase !== TurnPhase.PLAYER_INPUT || this.inputLocked) return;
    this.inputLocked = true;
    this.phase = TurnPhase.PLAYER_MOVE;
    useGameStore.getState().setTurnPhase(TurnPhase.PLAYER_MOVE);

    // Hide arrows during the action
    this.scene.hideMoveArrows();
    this.scene.events.emit("tutorial:pass-used");

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
    emitSfxEvent("user-step");
    this.scene.events.emit("tutorial:move-complete", target);

    // Spend energy
    this.scene.energyManager.spendMove();

    // Collect treasure
    this.scene.treasureManager.checkPickup(target);

    // Check fountain
    this.checkFountain(target);

    // Check trap
    this.checkTrap(target);

    // Check stairs BEFORE death — reaching stairs with 1 energy completes the floor
    // (the +10 energy bonus on floor complete keeps the player alive)
    if (this.scene.isOnStairs(target)) {
      if (!this.scene.canUseStairs()) {
        this.scene.onTutorialStairsBlocked();
        this.advanceToEnemyPhase();
        return;
      }
      // Stair entry is still a completed turn; tick timed buffs once.
      useGameStore.getState().advanceUpgradeRound();
      emitSfxEvent("stairs-enter");
      this.scene.completeFloor();
      return;
    }

    if (this.scene.energyManager.isDead()) {
      this.scene.endRun("energy");
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

    const store = useGameStore.getState();
    // Timed buffs advance once per completed player turn.
    store.advanceUpgradeRound();

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
   * Chest drops: 50% Energy, 20% Coin, 20% Orb, 10% Nothing
   */
  private breakChest(chest: import("../entities/Chest").Chest) {
    emitSfxEvent("breakbles");
    chest.open();
    useGameStore.getState().incrementChests();
    this.scene.events.emit("tutorial:chest-opened", pos);

    const pos = chest.pos;
    const tutorialMode = useGameStore.getState().tutorialMode;
    const roll = Math.random();

    let type: TreasureType | null;
    if (tutorialMode) {
      type = TreasureType.ENERGY;
    } else if (roll < 0.50) {
      type = TreasureType.ENERGY;
    } else if (roll < 0.70) {
      type = TreasureType.COIN;
    } else if (roll < 0.90) {
      type = TreasureType.ORB;
    } else {
      type = null;
    }

    if (!type) return;

    const id = `chest-loot-${Date.now()}`;
    const tier = getTier(this.scene.currentFloor);
    const keys = useGameStore.getState().keysUsed;
    const baseValue = TREASURE_VALUES[type];
    let finalValue: number;
    if (type === TreasureType.ENERGY) {
      finalValue = Math.floor(baseValue * tier.lootMult); // Energy NOT multiplied by keys
    } else if (type === TreasureType.ORB) {
      finalValue = baseValue * keys; // Linear key multiplier
    } else {
      // COIN
      finalValue = Math.floor(baseValue * tier.lootMult * keys); // Linear key multiplier
    }
    const t = new Treasure(
      this.scene, pos, type, finalValue, id,
    );
    this.scene.treasures.push(t);
    t.setVisible(this.scene.fogOfWar.isVisible(pos));
  }

  private checkFountain(pos: TilePos) {
    const fountain = this.scene.getFountainAt(pos);
    if (!fountain) return;

    const heal = fountain.use();
    if (heal > 0) {
      this.scene.events.emit("tutorial:fountain-used");
      const worldX = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = pos.y * TILE_FULL_H + TILE_SIZE / 2;
      this.scene.animateEnergyPickupToHud(worldX, worldY, () => {
        this.scene.energyManager.heal(heal);
        this.scene.player.flashHeal();
        emitSfxEvent("collect-energy");
      });
    }
  }

  private checkTrap(pos: TilePos) {
    const trap = this.scene.getTrapAt(pos);
    if (!trap) return;

    const store = useGameStore.getState();
    const baseDmg = trap.trigger();
    const tutorialMode = useGameStore.getState().tutorialMode;
    const appliedBase = tutorialMode ? 2 : baseDmg;
    this.scene.events.emit("tutorial:trap-triggered");
    const dmg = this.scene.energyManager.takeDamage(appliedBase);

    if (dmg > 0) {
      store.incrementTraps();
      this.scene.player.flashDamage();
      this.scene.vfxManager.flashDamageOverlay();
      this.scene.popupManager.showPlayerDamageNumber(this.scene.player.pos.x, this.scene.player.pos.y, dmg);
      emitSfxEvent("user-get-hit");
    }
  }

  private isWalkable(pos: TilePos): boolean {
    const map = this.scene.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    return map.cells[pos.y][pos.x] !== CellType.VOID;
  }
}
