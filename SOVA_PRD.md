# SOVA - Product Requirements Document
**Version:** 1.0
**Date:** 2026-03-02
**Team:** Rui (Code), Rodrigo (Code), Lozax (Art)
**Target:** Avalanche Build Games 2026

---

## 1. Executive Summary

SOVA is a top-down, turn-based dungeon crawler roguelike browser game built with Phaser.js 3 on the Avalanche blockchain. Players purchase Keys with AVAX to enter procedurally generated dungeon runs, collect treasure, defeat enemies, and hunt the rare boss SOVA for jackpot rewards. The game follows the proven Maze of Gains (Onchain Heroes) model — same structure, same economy — but deployed on Avalanche with superior game feel, fluid animations, and a distinctive floor-bounce mechanic that makes every step satisfying. Built by a team of 3 for the Avalanche Build Games 2026 hackathon.

---

## 2. Problem Statement

### Pain Points
- **No skill-based earn game on Avalanche**: The AVAX ecosystem lacks a polished dungeon crawler with real crypto rewards. Maze of Gains proved the model works on Abstract/ETH — Avalanche has nothing equivalent.
- **Web3 games feel cheap**: Most on-chain games sacrifice game feel for blockchain features. Players tolerate clunky UX because of rewards, not because it's fun.
- **High barrier to entry**: Many crypto games require NFTs, complex onboarding, or deep DeFi knowledge before you can play.

### Current Solutions & Gaps
| Solution | Gap |
|----------|-----|
| Maze of Gains (Abstract) | Not on Avalanche. Game feel is functional but not polished. |
| Generic web3 idle games | No real gameplay — just clicking and waiting. |
| Traditional roguelikes | No crypto rewards, no on-chain economy. |

### Why Now?
- Avalanche Build Games 2026 hackathon = launch catalyst + visibility + potential prizes
- Web3 gaming entering maturity phase — players expect real games, not just token mechanics
- Avalanche ecosystem actively incentivizing game development

---

## 3. Target Users

### Primary Persona: "Crypto Gamer Carlos"
- **Age:** 22-35
- **Profile:** Plays casual/mid-core games, holds some AVAX, active in web3 communities
- **Behaviors:** Checks Twitter/X for alpha, plays 2-3 web3 games, competitive about leaderboards
- **Needs:** Fun game that respects his time (10-15 min sessions), real chance to earn, easy onboarding
- **Frustrations:** Games that feel like spreadsheets, rug pulls, high entry cost

### Secondary Persona: "Avax Degen Diana"
- **Age:** 20-30
- **Profile:** Deep in the Avalanche ecosystem, trades regularly, loves new dApps
- **Behaviors:** Tries every new Avax project, active on Discord, shares wins on Twitter
- **Needs:** Something fun to do with AVAX besides trading, bragging rights
- **Frustrations:** Avalanche ecosystem has fewer games than ETH/Solana

### User Journey Map
```
[1. Discovery]          [2. Onboarding]        [3. First Run]
Twitter/Discord    →    Connect Wallet    →    Buy 1 Key (AVAX)
See jackpot pool        ~30 seconds             Enter dungeon
                                                Learn turn-based movement

[4. Core Loop]          [5. Progression]       [6. Retention]
Play runs          →    Get better at     →    Chase jackpot
Collect treasure        ability choices         Climb leaderboard
Earn from prize pool    Optimize key usage      Share wins on Twitter
```

---

## 4. Solution Overview

### Core Value Proposition
**"The best-feeling dungeon crawler on Avalanche — play for fun, earn for real."**

A proven game model (Maze of Gains) brought to the Avalanche ecosystem with polished game feel that makes it genuinely enjoyable to play, not just profitable.

### Key Differentiators
1. **Game Feel** — Smooth floor-bounce animation on every step, fluid sprite animations, polished transitions. The game *feels* good to play.
2. **On Avalanche** — First skill-based dungeon crawler earn game on AVAX. Low gas fees, fast transactions.
3. **HD Pixel Art** — Moonlighter-quality art, chibi characters, rich shading. Not retro 8-bit.
4. **Lore/Identity** — Unique world (The Black Room cave), distinctive character (Astro), memorable boss (SOVA stone golem).

---

## 5. Feature Requirements

### P0 — MVP (Must Have for Hackathon)

#### Onboarding
- [ ] Wallet connection screen (Avalanche C-Chain)
- [ ] Account creation/linking via wallet
- [ ] Simple tutorial overlay on first run

#### Lobby
- [ ] Home screen with Play button
- [ ] Key purchase UI (buy Keys with AVAX)
- [ ] Key quantity selector (1x, 2x, 3x multiplier)
- [ ] Stash/earnings screen (view + withdraw AVAX)
- [ ] Leaderboard (weekly treasure ranking + best run)
- [ ] Settings (audio, controls)

#### Core Game
- [ ] Turn-based movement system (player moves → enemies move)
- [ ] Energy system: 100 energy, 1 per move, run ends at 0
- [ ] Procedural room/floor generation
- [ ] Floor progression with 3-choice upgrade system between floors
- [ ] Upgrade abilities: Sharp Blade, Eagle Eye, Life Steal, + minimum 10 others
- [ ] Normal enemy AI (patrol, chase, attack patterns)
- [ ] Player combat (melee attack in facing direction)
- [ ] Treasure/loot spawning and collection
- [ ] Boss SOVA spawn mechanic (8% chance on floors 7+)
- [ ] Boss fight with unique mechanics
- [ ] Run end screen (treasure summary, AVAX earned)

#### Visual / Game Feel
- [ ] Floor tile bounce animation on player walk
- [ ] Fluid 4-directional walk + idle animations
- [ ] Attack animations (4 directions)
- [ ] Hit/death animations
- [ ] Treasure sparkle animations
- [ ] Projectile glow/trail effects
- [ ] No-wall void/abyss visual system (floating platforms)
- [ ] 3/4 top-down perspective with tile depth faces

#### On-Chain
- [ ] Smart contract: Key purchase (entry fee)
- [ ] Smart contract: Prize pool distribution (60/30/10 split)
- [ ] Smart contract: Jackpot pool + payout tiers (Minor 0.1%, Major 0.5%, Mega 2%)
- [ ] Smart contract: Weekly prize pool claiming
- [ ] Transaction confirmation UX (non-blocking)

### P1 — Polish (If Time Allows)

- [ ] Mobile-responsive controls (virtual d-pad + action buttons)
- [ ] Sound effects (footsteps, attacks, treasure pickup, boss roar)
- [ ] Background music (lobby + dungeon ambience)
- [ ] Particle effects (dust on walk, impact sparks)
- [ ] Enemy variety (minimum 4-5 enemy types with distinct behaviors)
- [ ] Floor environment variations (stone, mossy, dark, grassy)
- [ ] Transition animations between floors
- [ ] Key purchase history in stash

### P2 — Future (Post-Hackathon)

- [ ] Seasonal system with resets
- [ ] Additional bosses beyond SOVA
- [ ] Cosmetic items/skins for Astro
- [ ] Social features (friend leaderboards, spectate)
- [ ] Multi-language support
- [ ] Achievement system
- [ ] Daily/weekly challenges

---

## 6. User Stories

### US-1: Connect Wallet
**As a** new player, **I want to** connect my Avalanche wallet, **so that** I can start playing.
- **Acceptance Criteria:**
  - Support Core Wallet / MetaMask / WalletConnect
  - Auto-detect Avalanche C-Chain, prompt network switch if wrong
  - Show wallet address (truncated) after connection
  - Redirect to Lobby on success

### US-2: Purchase Keys
**As a** player, **I want to** buy Keys with AVAX, **so that** I can enter the dungeon.
- **Acceptance Criteria:**
  - Display key price in AVAX
  - Select quantity (1x, 2x, 3x)
  - Show total cost before confirmation
  - On-chain transaction with loading state
  - Keys appear in inventory immediately after confirmation

### US-3: Start a Run
**As a** player, **I want to** start a dungeon run, **so that** I can play the game and earn treasure.
- **Acceptance Criteria:**
  - Select number of keys to use (more keys = more loot multiplier)
  - Enter Floor 1 with 100 energy
  - Procedurally generated room layout
  - Energy counter visible on HUD

### US-4: Navigate the Dungeon
**As a** player, **I want to** move through the dungeon turn by turn, **so that** I can explore, avoid enemies, and collect treasure.
- **Acceptance Criteria:**
  - Arrow keys / WASD / tap to move (1 tile per input)
  - Each move costs 1 energy
  - After player moves, all enemies take their turn
  - Floor tiles bounce smoothly when walked on
  - Movement feels responsive and fluid

### US-5: Choose Upgrades Between Floors
**As a** player, **I want to** pick an ability upgrade after each floor, **so that** I can customize my run strategy.
- **Acceptance Criteria:**
  - Show 3 random abilities with name, icon, description
  - Player picks 1, other 2 disappear
  - Abilities stack (can pick same ability multiple times for stronger effect)
  - Transition to next floor after selection

### US-6: Fight Enemies
**As a** player, **I want to** attack enemies, **so that** I can survive and collect their loot.
- **Acceptance Criteria:**
  - Attack in facing direction
  - Enemies have HP and deal damage on contact/attack
  - Defeated enemies drop treasure/loot
  - Player has visible HP bar

### US-7: Encounter Boss SOVA
**As a** player, **I want to** encounter and fight SOVA, **so that** I can win a jackpot payout.
- **Acceptance Criteria:**
  - 8% spawn chance on floors 7+
  - SOVA has unique attack patterns and higher HP
  - On defeat: roll jackpot tier (Minor/Major/Mega)
  - Instant AVAX payout from jackpot pool
  - Victory celebration screen with amount won

### US-8: End Run & Claim Rewards
**As a** player, **I want to** see my run results and claim earnings, **so that** I know how I performed.
- **Acceptance Criteria:**
  - Run ends when energy = 0 or player dies
  - Summary screen: floors cleared, treasure collected, abilities used
  - Treasure added to weekly pool share calculation
  - Option to start new run or return to lobby

### US-9: Check Leaderboard
**As a** player, **I want to** see rankings, **so that** I can compete with others.
- **Acceptance Criteria:**
  - Weekly leaderboard (by treasure collected)
  - All-time best run leaderboard
  - Show player's rank highlighted
  - Update in real-time or near real-time

### US-10: Withdraw Earnings
**As a** player, **I want to** withdraw my AVAX earnings, **so that** I can realize my profits.
- **Acceptance Criteria:**
  - Stash shows: weekly pool earnings (claimable after week ends) + jackpot wins (instant)
  - Withdraw button triggers on-chain transaction
  - Show transaction status and confirmation
  - Balance updates after successful withdrawal

---

## 7. Technical Considerations

### Stack
| Layer | Technology |
|-------|-----------|
| Game Engine | Phaser.js 3 |
| Frontend/Lobby | Next.js (existing project setup) |
| Blockchain | Avalanche C-Chain |
| Smart Contracts | Solidity |
| Wallet Integration | ethers.js / wagmi + Core Wallet SDK |
| Backend (if needed) | Vercel serverless functions or Supabase |
| Art Pipeline | Aseprite (Lozax) → sprite sheets → Phaser atlas |

### Key Integrations
- **Avalanche C-Chain RPC** — for all on-chain transactions
- **Wallet Providers** — Core Wallet, MetaMask, WalletConnect
- **Price Feed** — Chainlink or similar for AVAX/USD display (optional)

### Scalability Notes
- Game logic runs client-side (Phaser.js) — no server bottleneck for gameplay
- On-chain only for: key purchase, prize pool distribution, jackpot payouts
- Leaderboard can be derived from on-chain events (or cached in DB for speed)
- Procedural generation is deterministic from seed (can be verified if needed)

### Architecture Decisions
- **Client-side game, on-chain economy**: Game runs in browser, blockchain handles money only
- **No NFT requirement**: Lower barrier to entry than Maze of Gains (no Genesis Hero needed)
- **Weekly pool vs instant jackpot**: Two reward streams keep players engaged short-term (jackpot excitement) and long-term (weekly grind)

---

## 8. Success Metrics & KPIs

### North Star Metric
**Weekly Active Players (WAP)** — unique wallets that complete at least 1 run per week

### Leading Indicators
| Metric | Target (Month 1) |
|--------|------------------|
| Wallet connections | 500+ |
| Keys purchased | 2,000+ |
| Runs completed | 5,000+ |
| Average runs per player per week | 3+ |
| Prize pool size (weekly) | Growth week over week |
| Jackpot pool size | Growing (proves retention) |
| Leaderboard participation | 50%+ of active players |

### Hackathon-Specific Metrics
- Working demo with full game loop
- Successful on-chain transactions on Avalanche testnet/mainnet
- Positive feedback from judges on game feel and polish

---

## 9. Go-to-Market Strategy

### Launch Approach
1. **Hackathon Demo** — Polished, playable build for Avalanche Build Games 2026 judges
2. **Testnet Launch** — Free-to-play testnet version for community testing
3. **Mainnet Launch** — Seed the jackpot pool, open key purchases

### Initial Channels
| Channel | Action |
|---------|--------|
| Avalanche Discord/Twitter | Announce during hackathon, share gameplay clips |
| Web3 gaming communities | Post in r/CryptoGaming, web3 gaming Discords |
| CT (Crypto Twitter) | Share jackpot wins, leaderboard highlights |
| Gameplay clips | Short clips of the floor-bounce feel, boss fights |
| Avalanche ecosystem partners | List on Avalanche dApp directories |

### Viral Mechanics
- Auto-generated share cards on jackpot wins ("I just won X AVAX from SOVA!")
- Leaderboard bragging rights
- Visible growing jackpot pool creates FOMO

---

## 10. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Smart contract vulnerability | Critical (loss of funds) | Medium | Audit before mainnet, start with small pool, use battle-tested patterns (OpenZeppelin) |
| Low initial player count | High (empty prize pool = no incentive) | Medium | Seed jackpot pool with team funds, target Avax community directly |
| Hackathon time pressure | High (incomplete MVP) | Medium | Strict P0 scope, parallelize work (Rui: game engine, Rodrigo: smart contracts + lobby, Lozax: all art) |
| Game balance issues | Medium (unfun or exploitable) | High | Copy Maze of Gains balance directly (proven model), tune later |
| Avalanche gas cost spikes | Low (cheap chain) | Low | Batch transactions where possible, use Avalanche C-Chain (low fees) |
| Mobile browser performance | Medium (bad UX on phones) | Medium | Optimize Phaser rendering, P1 priority — desktop-first for hackathon |
| Regulatory risk (gambling classification) | High | Low | Skill-based game with entry fee, not pure chance. No guaranteed returns. Consult legal post-hackathon. |

---

## 11. Open Questions

1. **Key pricing**: What is the price of 1 Key in AVAX? Fixed price or dynamic?
2. **Jackpot pool seed**: How much AVAX does the team seed into the initial jackpot pool?
3. **Weekly cycle**: When exactly does the weekly prize pool reset? (Sunday midnight UTC?)
4. **Anti-bot measures**: How to prevent bot farming of the dungeon? (Captcha? Rate limiting? Minimum play time?)
5. **Ability list**: Full list of upgrade abilities to implement — copy Maze of Gains list exactly or create custom set?
6. **Enemy types**: How many enemy types for MVP? What are their behaviors?
7. **Floor count**: How many floors per run maximum? (Energy = 100 moves, so roughly 8-12 floors depending on room size?)
8. **Death penalty**: When player HP reaches 0, does the run end? Do they keep treasure collected so far?
9. **Wallet requirements**: Core Wallet only or any EVM wallet?
10. **Testnet strategy**: Launch on Fuji testnet first for testing?

---

## Appendix: Work Split Suggestion

| Person | Responsibilities |
|--------|-----------------|
| **Rui** | Phaser.js game engine, core gameplay, turn-based system, procedural generation, game feel (floor bounce, animations), HUD |
| **Rodrigo** | Smart contracts (Solidity), wallet integration, lobby UI (Next.js), on-chain economy, leaderboard, stash/withdrawal |
| **Lozax** | All visual assets: Astro sprite sheet, SOVA boss, enemies, floor tiles (42-56 variations), items, projectiles, UI elements, lobby art |

---

*Generated for SOVA — Avalanche Build Games 2026*
*Team: Rui, Rodrigo, Lozax, Artur*