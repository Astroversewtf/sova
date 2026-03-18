import type { GameScene } from "../scenes/GameScene";
import type { Player } from "../entities/Player";
import type { Enemy } from "../entities/Enemy";
import { EnemyType, TreasureType } from "../types";
import { getTier, getEnemyDMG } from "../constants";
import { Treasure } from "../entities/Treasure";
import { useGameStore } from "@/stores/gameStore";
import { emitSfxEvent } from "@/lib/audioEvents";

/** Golden Ticket multiplier — diminishing returns: keys^0.25 */
function jackpotMultiplier(keys: number): number {
  return Math.pow(Math.max(keys, 1), 0.25);
}

export class CombatSystem {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  /**
   * Player bumps into enemy.
   * Both take damage simultaneously.
   * Returns true if the enemy died.
   */
  resolveBump(player: Player, enemy: Enemy): boolean {
    const store = useGameStore.getState();
    const baseAtk = store.atk + store.getAttackBonus();
    const critChance = store.getCritChance();

    // Enemy damage = base DMG × tier dmgMult
    const tier = getTier(this.scene.currentFloor);
    const baseDMG = getEnemyDMG(enemy.type);
    const damageTaken = enemy.type === EnemyType.BOSS
      ? (useGameStore.getState().tutorialMode ? 3 : 7)
      : Math.ceil(baseDMG * tier.dmgMult);

    // Player attacks enemy
    if (enemy.type === EnemyType.BOSS) {
      this.scene.enemyAI.registerBossHit(enemy);
    }
    emitSfxEvent("user-attack");
    const atkRoll = this.resolveFractionalDamage(baseAtk);
    const isCrit = critChance > 0 && Math.random() < critChance;
    const finalAtk = Math.max(1, isCrit ? atkRoll * 2 : atkRoll);
    enemy.takeDamage(finalAtk);

    // Enemy attacks player
    const damageApplied = this.scene.energyManager.takeDamage(damageTaken);
    if (damageApplied > 0) {
      player.flashDamage();
      this.scene.vfxManager.flashDamageOverlay();
      emitSfxEvent("user-get-hit");
      this.scene.popupManager.showPlayerDamageNumber(player.pos.x, player.pos.y, damageApplied);
      this.scene.events.emit("combat:hit", { damage: damageApplied });
    }

    if (!enemy.isAlive()) {
      enemy.die();
      if (enemy.type === EnemyType.BOSS) {
        emitSfxEvent("boss-intro-stop");
      }
      this.scene.events.emit("combat:kill", enemy);
      this.scene.vfxManager.playKillImpact(enemy.type === EnemyType.BOSS);

      // Track kill
      if (enemy.type === EnemyType.BOSS) {
        store.incrementBossKills();
      } else {
        store.incrementKills();
      }

      const regenChance = store.getRegenOnKillChance();
      if (regenChance > 0 && Math.random() < regenChance) {
        const recovered = store.consumeDamageTakenPool();
        if (recovered > 0) {
          this.scene.energyManager.heal(recovered);
          this.scene.events.emit("energy:heal", recovered);
        }
      }

      // Drop loot at enemy position
      this.dropLoot(enemy.pos.x, enemy.pos.y, enemy.type);

      return true;
    }

    return false;
  }

  /**
   * Enemy bumps into player (enemy moves onto player tile).
   * Only the player takes damage.
   */
  resolveEnemyBump(enemy: Enemy, player: Player) {
    enemy.playAttack(player.pos);

    const tier = getTier(this.scene.currentFloor);
    const baseDMG = getEnemyDMG(enemy.type);
    const damageTaken = enemy.type === EnemyType.BOSS
      ? (useGameStore.getState().tutorialMode ? 3 : 7)
      : Math.ceil(baseDMG * tier.dmgMult);
    const damageApplied = this.scene.energyManager.takeDamage(damageTaken);
    if (damageApplied > 0) {
      player.flashDamage();
      this.scene.vfxManager.flashDamageOverlay();
      emitSfxEvent("user-get-hit");
      this.scene.popupManager.showPlayerDamageNumber(player.pos.x, player.pos.y, damageApplied);
      this.scene.events.emit("combat:hit", { damage: damageApplied });
    }
  }

  /**
   * Drop 1 loot item at the killed enemy's position.
   * Each enemy type has its own drop table and base values.
   * Boss drop table is separate (Golden Ticket chance by floor).
   */
  private dropLoot(tileX: number, tileY: number, enemyType: EnemyType) {
    const pos = { x: tileX, y: tileY };
    const roll = Math.random();

    // Boss — always drops something
    if (enemyType === EnemyType.BOSS) {
      if (useGameStore.getState().tutorialMode) {
        const id = `enemy-loot-${Date.now()}`;
        const t = new Treasure(this.scene, pos, TreasureType.GOLDEN_TICKET, 1, id);
        this.scene.treasures.push(t);
        t.setVisible(this.scene.fogOfWar.isVisible(pos));
        return;
      }

      const floor = Math.max(7, this.scene.currentFloor);
      const goldenChance = Math.min(0.08 + (floor - 7) * 0.01, 0.12);
      const coinChance = 0.55;
      // Orb = remaining (1 - golden - coin)

      let type: TreasureType;
      if (roll < goldenChance) type = TreasureType.GOLDEN_TICKET;
      else if (roll < goldenChance + coinChance) type = TreasureType.COIN;
      else type = TreasureType.ORB;
      const keys = useGameStore.getState().keysUsed;
      const baseBossValue = type === TreasureType.ORB ? 1 : type === TreasureType.COIN ? 150 : 1;
      const keyMult = type === TreasureType.GOLDEN_TICKET ? jackpotMultiplier(keys) : keys;
      const bossValue = Math.floor(baseBossValue * keyMult);
      const id = `enemy-loot-${Date.now()}`;
      const t = new Treasure(this.scene, pos, type, bossValue, id);
      this.scene.treasures.push(t);
      t.setVisible(this.scene.fogOfWar.isVisible(pos));
      return;
    }

    // Normal enemies — per-type drop tables
    const isGhostLike =
      enemyType === EnemyType.GHOST || enemyType === EnemyType.FLYING_ROCK;
    const isTankLike =
      enemyType === EnemyType.GOLEM || enemyType === EnemyType.ROCK2;
    const isTree = enemyType === EnemyType.TREE;
    const energyChance = isGhostLike ? 0.45 : 0.50;
    const coinsChance = isGhostLike ? 0.25 : 0.27;
    const orbsChance = isGhostLike ? 0.15 : 0.08;
    // Nada = 15% for all

    let type: TreasureType | null;
    if (roll < energyChance) type = TreasureType.ENERGY;
    else if (roll < energyChance + coinsChance) type = TreasureType.COIN;
    else if (roll < energyChance + coinsChance + orbsChance) type = TreasureType.ORB;
    else type = null; // 15% nothing

    if (!type) return;

    // Base values per enemy type, scaled by tier lootMult (orbs always 1)
    const tier = getTier(this.scene.currentFloor);
    const keys = useGameStore.getState().keysUsed;
    let value: number;
    if (type === TreasureType.ORB) {
      value = 1 * keys; // Linear key multiplier
    } else if (type === TreasureType.ENERGY) {
      const base = isTree ? 12 : isTankLike ? 10 : isGhostLike ? 7 : 5;
      value = Math.floor(base * tier.lootMult); // Energy NOT multiplied by keys
    } else {
      // COIN
      const base = isTree ? 40 : isTankLike ? 30 : isGhostLike ? 25 : 15;
      value = Math.floor(base * tier.lootMult * keys); // Linear key multiplier
    }

    const id = `enemy-loot-${Date.now()}`;
    const t = new Treasure(this.scene, pos, type, value, id);
    this.scene.treasures.push(t);
    t.setVisible(this.scene.fogOfWar.isVisible(pos));
  }

  private resolveFractionalDamage(amount: number): number {
    if (amount <= 0) return 0;
    const whole = Math.floor(amount);
    const fractional = amount - whole;
    return whole + (Math.random() < fractional ? 1 : 0);
  }
}
