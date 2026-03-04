# SOVA — Game PRD (Phaser.js MVP)

> PRD exclusivo para o gameplay. Sem lobby, wallet, smart contracts, ou economia on-chain.
> Para colar no Cursor e implementar o jogo em Phaser.js 3.

---

## 1. Overview

SOVA is a top-down, turn-based dungeon crawler roguelike built with **Phaser.js 3**. The player controls Astro, navigating procedurally generated floors, collecting treasure, defeating enemies, and hunting the rare boss SOVA.

| Spec | Value |
|------|-------|
| Engine | Phaser.js 3 |
| Resolution | 800 x 600 px |
| Perspective | Top-down with slight 3/4 view |
| Tile size | 32 x 32 px (32 x 40 with depth face) |
| Platform | Browser — desktop + mobile |
| Controls | Arrow keys / WASD (desktop) + virtual d-pad (mobile) |
| Genre | Turn-based roguelike dungeon crawler |

---

## 2. Core Loop

```
Start Run (100 Energy)
    ↓
Enter Floor 1
    ↓
┌─────────────────────────────┐
│  Explore room (turn-based)  │
│  Collect treasure            │
│  Bump-attack enemies         │
│  Find stairs (locked)        │
│  Kill all enemies → unlock   │
│  Step on stairs              │
└─────────────┬───────────────┘
              ↓
    Pick 1 of 3 Upgrades
              ↓
    Enter next floor (harder)
              ↓
    Floor 7+: 8% chance of Boss Room
              ↓
    Repeat until Energy = 0
              ↓
    Run End → Treasure Summary
```

---

## 3. Movement & Turn System

- **Turn-based pure**: 1 input = player moves 1 tile → then ALL enemies take their turn (move 1 tile each).
- **Input**: Arrow keys / WASD on desktop. Virtual d-pad overlay on mobile (touch).
- **Cost**: Each player move costs **1 Energy**.
- **Idle**: If the player doesn't move, nothing happens. The game waits.
- **Camera**: Follows the player. The room is larger than the viewport.

### Movement Feel
- Player sprite moves smoothly between tiles (tween, not teleport).
- **Floor bounce**: When the player steps on a tile, that tile does a subtle smooth bounce animation (scale Y squish + recover, ~150ms). This is the signature game feel of SOVA.
- Adjacent tiles may also react with a smaller, delayed bounce (ripple effect) for extra polish.

---

## 4. Energy System

Energy is the **only resource**. It serves as both HP and movement fuel.

| Event | Energy Cost |
|-------|-------------|
| Move 1 tile | -1 |
| Take damage from Basic enemy (1 HP) | -1 |
| Take damage from Tanky enemy (3-5 HP) | -3 to -5 (equal to enemy's HP) |
| Take damage from Boss SOVA (10-15 HP) | -10 to -15 (equal to SOVA's HP) |

- **Starting Energy**: 100
- **Max Energy**: 100 (upgradeable via abilities)
- **Run ends** when Energy reaches 0 (no death animation distinction — energy depletion IS death)
- **No separate HP, ATK, or DEF stats.**

### Damage Rule
**Enemy contact damage = enemy's HP.** A Basic enemy with 1 HP deals 1 damage. A Tanky enemy with 5 HP deals 5 damage. This makes tanky enemies extremely dangerous to fight head-on without upgrades.

---

## 5. Fog of War & Vision System

The dungeon uses a **fog of war** system. The player has limited visibility around them, and unexplored areas are hidden.

### Three Visibility States

| State | Visual | Description |
|-------|--------|-------------|
| **Unexplored** | Completely black | Areas the player has never been near. Nothing visible. |
| **Explored (out of vision)** | Dim/dark tiles | Areas the player has previously seen. Floor tiles/layout visible at reduced opacity (~40-50%). Enemies and treasure are **NOT visible** — only the terrain structure. |
| **Active vision (in range)** | Fully lit | Area within the player's current vision radius. Everything visible: tiles, enemies, treasure, stairs. |

### Vision Radius — Scales with Energy

The player's vision radius **shrinks as Energy decreases**, creating increasing tension and claustrophobia as the run progresses.

| Energy Range | Vision Radius (tiles) |
|-------------|----------------------|
| 100-76 | 7 tiles |
| 75-51 | 6 tiles |
| 50-26 | 5 tiles |
| 25-1 | 3-4 tiles (minimum) |

- Vision is **circular** (or diamond-shaped) centered on the player.
- The transition between radius steps should be **smooth** (animate the fog edges), not instant jumps.
- **Minimum vision radius**: 3-4 tiles — player is nearly blind but still playable.

### Implementation Notes
- Fog of war is rendered as a **dark overlay layer** on top of the tilemap.
- Tiles within active vision: overlay fully transparent (100% visible).
- Explored tiles outside vision: overlay at ~50-60% opacity (dim but layout recognizable).
- Unexplored tiles: overlay at 100% opacity (pure black).
- When the player moves, update the revealed tiles set and recalculate the vision circle.
- The fog edge can have a soft gradient (1-2 tile feathering) for a polished look instead of hard cutoffs.

### Interaction with Eagle Eye Ability
The **Eagle Eye** upgrade (from the ability pool) increases the vision radius, counteracting the natural shrink. Each stack adds +1 tile to the current vision radius.

---

## 6. Combat — Bump Attack

There is no attack button. Combat is **bump-to-attack**:

1. Player moves into an enemy tile → player deals damage to enemy AND enemy deals damage to player (simultaneous trade).
2. **Player ATK = 1** (base, fixed). Upgrades can increase this.
3. **Enemy damage to player = enemy's current HP** at the moment of contact.
4. If player ATK kills the enemy in one hit (enemy HP ≤ player ATK), the player still takes damage equal to the enemy's HP at that moment.

### Combat Example
```
Player (ATK 1) bumps Basic enemy (1 HP):
  → Player deals 1 damage → enemy dies
  → Enemy deals 1 damage → player loses 1 Energy
  → Net: player spends 1 Energy (move) + 1 Energy (damage) = 2 Energy total

Player (ATK 1) bumps Tanky enemy (3 HP):
  → Player deals 1 damage → enemy has 2 HP remaining
  → Enemy deals 3 damage → player loses 3 Energy
  → Next turn: player bumps again → deals 1, enemy has 1 HP
  → Enemy deals 2 damage → player loses 2 Energy
  → Next turn: player bumps again → deals 1, enemy dies
  → Enemy deals 1 damage → player loses 1 Energy
  → Total cost: 3 moves (3 Energy) + 6 damage (6 Energy) = 9 Energy to kill a 3 HP enemy
```

This system rewards upgrades (+ATK abilities reduce total Energy spent per enemy) and avoidance (skipping enemies saves Energy).

---

## 7. Floor / Room Generation

Each floor is a **procedurally generated room** made of floating stone platform tiles over a void/abyss.

### Room Structure
- **No walls**. The play area boundary IS the floor itself. Where there are no tiles, there is void (the player cannot walk there).
- Floor tiles form a **maze-like layout** with corridors, open areas, and dead ends.
- Each tile = 32x40px visual (32px top face + 8px front face for depth illusion).

### Room Size (Variable, scales with floor)
| Floor | Approx. Room Size | Notes |
|-------|-------------------|-------|
| 1-3 | 14x12 to 16x14 tiles | Small, quick to clear |
| 4-6 | 16x14 to 20x16 tiles | Medium, more complex paths |
| 7-9 | 20x16 to 24x20 tiles | Large, labyrinthine |
| 10+ | 24x20 to 28x24 tiles | Very large, very complex |

### Room Contents
Each room contains:
1. **Floor tiles** — walkable stone platforms (maze layout)
2. **Enemies** — placed in strategic positions (patrolling corridors, guarding treasure)
3. **Treasure** — scattered across the room (coins, gems, rare artifacts)
4. **Stairs** — 1 per room, initially **locked** (blocked/inactive). Unlocks when all enemies are killed. Player steps on stairs to advance to next floor.
5. **Player spawn** — entry point (opposite side from stairs when possible)

### Floor Tile Variations
- Base stone block (primary)
- Cracked stone
- Mossy stone
- Grassy stone
- Dark stone
- Light stone
- Edge tiles: N, S, E, W + inner/outer corners
- **Minimum**: 14 base tiles x 3-4 variations = ~42-56 floor tile sprites
- **Environment**: Cave beneath the Black Room — underground of an old, run-down wooden house on stone foundations

---

## 8. Difficulty Scaling

**Everything scales with floor number:**

| Aspect | Floor 1-3 | Floor 4-6 | Floor 7-9 | Floor 10+ |
|--------|-----------|-----------|-----------|-----------|
| Room size | Small | Medium | Large | Very large |
| Enemy count | 2-3 | 4-6 | 6-8 | 8-12 |
| Enemy types | Basic only | Basic + Tanky | Basic + Tanky | Basic + Tanky (more tankys) |
| Maze complexity | Simple corridors | Branching paths | Dead ends, loops | Full labyrinth |
| Treasure amount | Low | Medium | High | Very high |
| Boss chance | 0% | 0% | 8% per floor | 8% per floor |

---

## 9. Enemies

### 9.1 Basic Enemy
| Stat | Value |
|------|-------|
| HP | 1 |
| Damage to player | 1 Energy |
| Sprite size | 48x48 px |
| Behavior | Moves 1 tile toward player per turn if within detection range (~5 tiles). Otherwise patrols (moves randomly between adjacent tiles). |
| Appearance | Small cave creature (thematic to Black Room cave) |

### 9.2 Tanky Enemy
| Stat | Value |
|------|-------|
| HP | 3-5 (scales with floor: 3 on floor 4-6, 4 on floor 7-9, 5 on floor 10+) |
| Damage to player | Equal to current HP |
| Sprite size | 48x48 px |
| Behavior | Moves 1 tile toward player per turn if within detection range (~4 tiles). Slower to react but relentless. Does NOT patrol — stays still until player is detected. |
| Appearance | Larger, armored cave creature |

### 9.3 Boss — SOVA
| Stat | Value |
|------|-------|
| HP | 10-15 (high, exact value TBD during playtesting) |
| Damage to player | Equal to current HP |
| Sprite size | 96x96 px or 128x128 px |
| Behavior | Moves 1 tile toward player per turn. No detection range — always active once room is entered. No special mechanics — just very high HP. |
| Appearance | Mossy stone golem, cracked stone body covered in moss/vines, big dark eyes, dripping slime |
| Spawn | 8% chance per floor on floors 7+. Boss room replaces normal room. |

### Boss Room — Easter Egg
When a boss room spawns:
- The room layout is a **normal room** (same generation as regular floors).
- A **stone statue of SOVA** is placed in the room as a visual hint.
- **Easter egg**: The statue's position indicates the boss's position by opposition:
  - Statue on **left** side → Boss is on **right** side
  - Statue on **top** → Boss is on **bottom**
  - Statue on **right** → Boss is on **left**
  - Statue on **bottom** → Boss is on **top**
- No other enemies in the boss room — only SOVA.
- Stairs still locked until SOVA is defeated.

---

## 10. Upgrade System (Between Floors)

After clearing each floor (all enemies dead + stepping on stairs), the player is shown a **pick screen** with 3 random abilities. The player picks 1. The other 2 disappear.

### Abilities (6-8 for MVP)

| # | Name | Effect | Stackable |
|---|------|--------|-----------|
| 1 | **Sharp Blade** | +1 ATK per stack | Yes |
| 2 | **Vitality Surge** | +10 Max Energy per stack | Yes |
| 3 | **Life Steal** | Recover 2 Energy per enemy killed, per stack | Yes |
| 4 | **Eagle Eye** | Increase enemy detection visibility (show enemies through fog/distance) | Yes (range increases) |
| 5 | **Thick Skin** | Reduce damage taken by 1 per stack (minimum 1 damage) | Yes |
| 6 | **Treasure Magnet** | Auto-collect treasure within 2-tile radius per stack | Yes (radius increases) |
| 7 | **Swift Feet** | 10% chance per stack to not spend Energy on move | Yes |
| 8 | **Second Wind** | Recover 15 Energy immediately when picked | No (instant effect) |

### Pick Screen UI
- Full-screen overlay (game pauses behind)
- 3 cards side by side, each showing: ability icon + name + description + stack count (if already owned)
- Player clicks/taps one card → short animation → transition to next floor

---

## 11. Treasure / Loot

Three types of treasure, each with different value and rarity:

| Type | Points | Drop Rate | Sprite Size | Visual |
|------|--------|-----------|-------------|--------|
| **Coin** | 1 pt | Common (60%) | 24x24 px | Gold coin with sparkle animation |
| **Gem** | 5 pts | Uncommon (30%) | 24x24 px | Colored gem (varies) with sparkle |
| **Rare Artifact** | 20 pts | Rare (10%) | 24x24 px | Unique glowing item with pulsing aura |

- Treasure is placed during room generation (scattered on floor tiles, not on enemy tiles or stairs).
- **Pickup**: Player walks over treasure tile to collect (auto-pickup, costs the normal 1 Energy for the move).
- **Treasure counter** visible on HUD at all times.
- Treasure resets to 0 at the start of each new run.
- Sparkle/glow idle animation on all treasure items to make them visible and enticing.

---

## 12. HUD

Persistent overlay during gameplay:

```
┌──────────────────────────────────────┐
│ [Energy Bar ██████████░░ 73/100]     │
│                                      │
│ Floor: 4              🪙 127 💎 3 ⭐ 1│
│                                      │
│                                      │
│         (Game viewport)              │
│                                      │
│                                      │
│                                      │
│ [Active Abilities: 🗡️x2  ❤️x1  👁️x1] │
└──────────────────────────────────────┘
```

| Element | Position | Details |
|---------|----------|---------|
| Energy bar | Top-left | Horizontal bar, numeric display (current/max). Color changes: green (>50%), yellow (25-50%), red (<25%) |
| Floor number | Top-left (below energy) | "Floor: X" |
| Treasure count | Top-right | Show count per type: coins, gems, artifacts (with icons) |
| Active abilities | Bottom | Icons of owned abilities with stack count. Compact row. |

---

## 13. In-Game Chat Panel

A global chat panel is displayed on the **left side** of the screen during gameplay, identical to the Maze of Gains chat. This is NOT part of the Phaser canvas — it's a separate HTML/CSS panel beside the game viewport.

### Layout (Desktop)
```
┌────────────────┬──────────────────────────────┐
│                │                              │
│   CHAT PANEL   │      PHASER GAME CANVAS      │
│   (~280px)     │      (remaining width)       │
│                │                              │
│  ● CONNECTED   │   [ENERGY BAR]    [TREASURE] │
│                │                              │
│  👤 TANAKA     │                              │
│    GGS         │       (gameplay area)        │
│                │                              │
│  👤 KORKA      │                              │
│    kekeke      │                              │
│                │                              │
│  👤 RXIX       │                              │
│    hello!      │                              │
│                │                              │
│  ...           │                              │
│                │                              │
│ [TYPE A MSG] [SEND]   [ACTIVE ABILITIES]      │
└────────────────┴──────────────────────────────┘
```

### Chat Panel Spec

| Property | Value |
|----------|-------|
| Width | ~280px fixed |
| Position | Left side of screen, full height |
| Background | Dark/semi-transparent (matches game UI aesthetic) |
| Font | Pixel-style font (matching game aesthetic) |

### Header
- **"CHAT"** title — top-left, bold pixel font
- **Connection status** — top-right: green dot + "CONNECTED" when connected, red dot + "DISCONNECTED" when not

### Message List
- Scrollable area taking up most of the panel height
- Each message shows:
  - **Username** (bold, colored — truncated wallet address or display name) + timestamp (small, dimmed)
  - **Message text** (below username, regular weight)
- New messages appear at the bottom, auto-scroll to latest
- Pixel-art styled scrollbar or hidden scrollbar

### Input Area (Bottom)
- Text input field: placeholder "TYPE A MESSAGE..."
- **SEND** button (right of input)
- Pressing Enter also sends the message
- Input is styled to match the dark game UI (pixel-art borders)

### Behavior
- **Global chat**: All players currently online can see and send messages
- Messages are **real-time** (WebSocket or similar)
- Username = truncated wallet address (e.g., "0xA502...B0F7") or display name if set
- **Chat does NOT pause the game** — typing in the input field should NOT trigger game movement (keyboard input must be captured by the chat input, not the game, when the input field is focused)
- Max message length: ~200 characters
- Basic spam protection: rate limit ~1 message per 2 seconds per user

### Mobile Behavior
- Chat panel is **hidden by default** on mobile (screen too narrow)
- Toggle button (chat icon) to slide panel in/out as overlay
- When chat is open on mobile, it overlays the game (semi-transparent background)
- Game input is disabled while chat is open on mobile

### Technical Notes
- Chat panel is a **React/HTML component** (part of the Next.js page), NOT rendered inside Phaser canvas
- Page layout: `display: flex` → `[ChatPanel (280px)] [PhaserGame (flex: 1)]`
- WebSocket connection for real-time messaging (or Supabase Realtime / similar)
- Chat state is independent of game state — chat persists across runs
- **Critical**: When chat input is focused, keyboard events (arrow keys, WASD) must NOT propagate to the Phaser game. When chat input is blurred, keyboard returns to game control.

---

## 14. Visual / Art Spec

### Style: HD Pixel Art
- **NOT retro 8-bit.** High resolution per sprite, almost looks like 2D illustration but keeps pixel art aesthetic.
- High-res sprites: 48-64px per character
- Consistent black outline: 1-2px on all sprites
- Manual anti-aliasing: smooth curves with intermediate pixels
- Rich shading: 3-4 tones per color
- Chibi proportions: big head, small body (2-3 heads ratio)
- NO heavy dithering, NO blocky 8-bit aesthetic
- **Primary reference**: Maze of Gains (Onchain Heroes)
- **Secondary reference**: Moonlighter (environment + polish)

### Player — Astro
- Ice blue alien with flame-shaped head
- Casual streetwear: white t-shirt with orange sleeves, dark baggy pants, navy sneakers
- Sprite size: 48x48 or 64x64 px

#### Sprite Sheet
| Animation | Directions | Frames | Total |
|-----------|-----------|--------|-------|
| Idle | 4 (N/S/E/W) | 4 | 16 |
| Walk | 4 | 4-6 | 16-24 |
| Attack (bump) | 4 | 3-4 | 12-16 |
| Hit | — | 2 | 2 |
| Death | — | 4-6 | 4-6 |
| **Total** | | | **~50-64 frames** |

### Boss — SOVA
- Mossy stone golem with big dark eyes
- Cracked stone body covered in moss/vines, dripping slime
- Sprite size: 96x96 or 128x128 px
- Animations: Idle (4 frames), Walk (4 dir x 4 frames), Hit (2 frames), Death (6 frames)

### SOVA Statue (Easter Egg)
- Static sprite: stone statue of SOVA, slightly different shade/style to distinguish from the real boss
- Size: 32x32 or 48x48 (fits on a single tile or small cluster)
- No animation (static prop)

### Floor Tiles
- Each tile: 32x40 px (32px top face + 8px front face for depth)
- Top face: where player walks
- Front face: darker shade to create depth/3D illusion
- Minimum 42-56 tile variations (14 base x 3-4 themes)
- Edge tiles for all directions + inner/outer corners

### Other Assets
| Asset | Size | Notes |
|-------|------|-------|
| Basic enemy | 48x48 | Idle + walk + death animations |
| Tanky enemy | 48x48 | Idle + walk + hit + death animations |
| Coins | 24x24 | Sparkle idle animation (4-6 frames) |
| Gems | 24x24 | Sparkle idle animation (4-6 frames) |
| Rare artifacts | 24x24 | Pulsing glow animation (6-8 frames) |
| Stairs (locked) | 32x32 | Dim/inactive visual |
| Stairs (unlocked) | 32x32 | Bright/glowing visual |
| Ability icons | 32x32 | 1 icon per ability (8 total for MVP) |
| Virtual d-pad (mobile) | — | Semi-transparent overlay |

---

## 15. Game Feel Details

### Floor Bounce (Signature Mechanic)
When the player moves to a new tile:
1. The destination tile plays a **bounce animation**: scale Y squishes down ~10-15% then springs back to normal over ~150-200ms (ease-out elastic or ease-out back).
2. Optional: 1-2 adjacent tiles do a **smaller delayed bounce** (~5% squish, 50ms delay) for a ripple effect.
3. The bounce should feel **smooth and satisfying**, not jarring. Subtle but noticeable.

### Animation Fluidity
- Player movement between tiles: smooth tween over ~120-150ms (not instant teleport).
- Enemy movement: smooth tween over ~100ms (slightly faster than player to not feel sluggish).
- Treasure pickup: small "pop" scale animation (scale up 120% then back to 0 as it disappears) + floating "+1" text.
- Enemy death: flash white → fade out (or small poof particle).
- Damage taken: energy bar flashes red briefly. Player sprite flashes/blinks white for ~200ms.

### Audio

#### SFX
| Event | Sound |
|-------|-------|
| Player move / footstep | Soft stone step |
| Floor tile bounce | Subtle "boop" / soft thud (low pitch) |
| Bump attack (hit enemy) | Impact / slash |
| Take damage | Dull thud + UI blip |
| Enemy death | Pop / crumble |
| Treasure pickup (coin) | Classic coin chime |
| Treasure pickup (gem) | Higher-pitched sparkle |
| Treasure pickup (artifact) | Magical shimmer |
| Stairs unlock | Stone grinding / unlock sound |
| Floor transition | Whoosh / descend |
| Boss room enter | Low rumble / dramatic sting |
| Boss death | Heavy crumble + victory chime |
| Energy low warning (<25%) | Subtle heartbeat or pulse |
| Run end (energy = 0) | Fade out + game over tone |

#### Music
- **Dungeon ambience**: Looping ambient track — dark, atmospheric, subtle percussion. Not intense. Think: underground cave with distant echoes.
- Single track for MVP is fine. Can vary intensity with floor depth later.

---

## 16. Screens & Flow (Game Only)

```
[Game Start]
     ↓
[Floor Enter] → Camera pans to player spawn → "Floor X" text fades in/out
     ↓
[Gameplay] → Turn-based exploration + combat
     ↓
[All Enemies Dead] → Stairs unlock (visual + SFX)
     ↓
[Player Steps on Stairs]
     ↓
[Upgrade Pick Screen] → 3 cards → player picks 1
     ↓
[Floor Transition] → Brief fade/animation → next floor generates
     ↓
[Repeat from Floor Enter]
     ↓
[Energy = 0] → Death/collapse animation
     ↓
[Run End Screen]
  - "Run Over" header
  - Floor reached
  - Treasure breakdown (coins / gems / artifacts + total points)
  - Abilities collected during run
  - [Play Again] button → new run (fresh, 0 treasure, 100 energy, no abilities)
  - [Exit] button → return to lobby (external, not part of this PRD)
```

### Boss Room Variant
```
[Floor 7+ generated with 8% boss roll = success]
     ↓
[Boss Room Enter] → camera pans → shows SOVA statue → dramatic audio sting
     ↓
[Player explores room] → finds SOVA (opposite side from statue)
     ↓
[Combat with SOVA] → bump attack, high HP
     ↓
[SOVA defeated] → heavy death animation → jackpot tier roll (Minor/Major/Mega)
     ↓
[Jackpot Result Screen] → shows tier + amount won
     ↓
[Stairs unlock] → continue run as normal
```

---

## 17. Mobile Controls

Virtual d-pad overlay on touch devices:

- **Position**: Bottom-left of screen
- **Style**: Semi-transparent, doesn't obscure too much gameplay
- **Behavior**: Tap a direction = 1 tile move (same as pressing arrow key once). Hold = repeat moves with ~200ms delay between each.
- **Size**: Large enough for thumb input (~120px diameter area)
- No additional buttons needed (bump attack is automatic on movement into enemy).

---

## 18. Procedural Generation Rules

### Room Generation Algorithm
1. Start with an empty grid (size based on floor number).
2. Place **player spawn tile** on one edge.
3. Place **stairs tile** on the opposite edge (or far corner).
4. Generate a **connected path** from spawn to stairs (guarantee solvability).
5. Branch out corridors and open areas from the main path.
6. Place **enemies** along corridors and in open areas (not on spawn, not on stairs, not adjacent to spawn).
7. Place **treasure** on accessible tiles (not on enemies, not on stairs).
8. On boss floors: place **SOVA statue** on one side, **SOVA** on the opposite side. No other enemies.

### Constraints
- All floor tiles must be **connected** (no isolated platforms).
- Stairs must be **reachable** from spawn.
- Minimum distance between spawn and stairs: at least 60% of room diagonal.
- Enemies should not be placed within 3 tiles of spawn (give player breathing room).

---

## 19. Technical Notes (Phaser.js Implementation)

### Scenes
| Scene | Purpose |
|-------|---------|
| `GameScene` | Main gameplay (turn loop, player, enemies, tiles, treasure) |
| `HUDScene` | Overlay scene for energy bar, floor number, treasure count, abilities |
| `UpgradeScene` | Overlay for upgrade pick between floors |
| `RunEndScene` | End-of-run summary screen |
| `BossResultScene` | Jackpot tier result overlay (after boss kill) |

### Key Systems
- **TurnManager**: Manages turn order (player input → process player move → process all enemy moves → check win/lose conditions → wait for next input).
- **EnergyManager**: Tracks current/max energy. Provides methods: `spend(amount)`, `recover(amount)`, `isDead()`.
- **RoomGenerator**: Procedural generation of floor layouts. Input: floor number. Output: 2D tile map + entity positions.
- **EnemyAI**: Per-enemy behavior (detection range, pathfinding toward player using simple Manhattan distance or A*).
- **UpgradeManager**: Pool of abilities, random selection of 3, application of effects.
- **TreasureManager**: Tracks collected treasure per run. Resets on new run.
- **TileBounceSystem**: Handles the floor bounce animation on player movement.
- **FogOfWarSystem**: Manages three visibility states (unexplored/explored/active). Tracks revealed tiles, calculates vision radius based on current Energy, renders dark overlay layer with soft edges.

### Tilemap
- Use Phaser tilemap or custom sprite-based grid (sprite-based recommended for the bounce animation, since individual tiles need to animate independently).
- Each tile is a sprite with its own tween capability.

### Camera
- Follow player with smooth lerp (not instant snap).
- Clamp to room bounds.
- Slight deadzone so camera doesn't move on every tiny step.

---

## 20. MVP Scope Summary

**In scope:**
- Turn-based movement + bump attack combat
- Energy as single resource (HP + movement)
- Procedural room generation (variable size, scaling difficulty)
- 3 enemy types (Basic, Tanky, Boss SOVA)
- 6-8 upgrade abilities (pick 1 of 3 between floors)
- 3 treasure types (Coin, Gem, Rare Artifact)
- Boss room with statue easter egg
- Fog of war + vision system (shrinks with Energy)
- Floor bounce animation (signature game feel)
- Fluid animations (walk, attack, death, treasure pickup)
- HUD (energy bar, floor number, treasure, active abilities)
- In-game global chat panel (left side, real-time, WebSocket)
- SFX + ambient music
- Desktop (keyboard) + mobile (virtual d-pad) controls
- Run end screen with summary

**Out of scope (not in this PRD):**
- Wallet connection / blockchain / smart contracts
- Lobby / menus / onboarding
- Leaderboard
- Key purchase / economy
- Prize pool / jackpot pool payouts
- Settings screen
- Stash / withdrawal
- Seasons / resets
