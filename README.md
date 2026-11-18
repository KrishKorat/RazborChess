# RazborChess ♟️

> A professional, client-side chess analysis and game review workstation inspired by Chess.com and Lichess. Built with React 18, TypeScript, Tailwind CSS, and the official Stockfish 19 WASM engine.

[![Stockfish](https://img.shields.io/badge/Stockfish-19%20WASM-blue.svg)](https://stockfishchess.org/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-green.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
[![Tests](https://img.shields.io/badge/Vitest-125%20Passed-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)]()

---

## 🌟 Overview

**RazborChess** delivers an in-depth chess analysis experience directly in your browser. Unlike proprietary platforms gated behind paid monthly tiers or cloud servers, RazborChess executes **100% locally** on your device. Every move validation, engine search, game review calculation, and database persistence operation runs without external APIs or telemetry.

### Designed for Modest Hardware
Engineered specifically for everyday laptops (Intel Core i3 12th Gen, 8GB RAM, integrated graphics):
- **Single-Threaded Stockfish 19 WASM:** Runs in an isolated HTML5 Web Worker to keep the UI silky smooth at 60 FPS while avoiding `SharedArrayBuffer` cross-origin security barriers.
- **Low Memory Overhead:** Default 16MB engine Hash table (configurable to 32MB or 64MB) keeping total browser tab memory under 150MB.
- **Smart Resource Management:** Pauses live engine searches automatically when the browser tab is hidden or minimized (`visibilitychange` API) and terminates the Web Worker cleanly on tab close (`beforeunload`).
- **Throttling & Search Cancellation:** Debounced analysis triggers (150ms) and instant search abortion prevent CPU saturation during rapid move scrubbing.

---

## ✨ Key Features

### 1. Interactive Analysis Board
- **Smooth Board Play:** Powered by `react-chessboard` and `chess.js` with drag-and-drop, click-to-move, and destination dot indicators.
- **Rules Compliance:** Complete move validation including castling rights, en passant, and an interactive pawn promotion picker (Queen, Rook, Bishop, Knight).
- **Game State Badges:** Dynamic alerts for Check, Checkmate, Stalemate, Threefold Repetition, Insufficient Material, and 50-Move Draw.
- **Board Flipping:** Instantly switch between White and Black perspectives via the UI or `F` keyboard shortcut.

### 2. Stockfish 19 WASM Engine Service
- **Official Stockfish 19:** Powered by the official Stockfish 19 release (`stockfish@19.0.1` / `nmrugg/stockfish.js`).
- **UCI Protocol Communication:** Robust two-way asynchronous UCI queue (`uci`, `isready`, `position`, `go`, `stop`, `setoption`).
- **MultiPV Search:** Analyze up to 5 candidate lines simultaneously with live principal variation (PV) sequences converted to readable Standard Algebraic Notation (SAN).
- **Flexible Depth:** Adjustable target depth slider from 10 ply (Fast) to 25 ply (Deep).

### 3. Variation Tree & Non-Destructive Branching
- **Full Poly-Tree Explorer:** Branch alternative lines from any ply without altering or overwriting your mainline.
- **Nested Line Indentation:** Visually inspect sub-variations with clear move numbering.
- **Variation Promotion:** Elevate any alternative branch to become the new game mainline with one click.
- **Safe Branch Pruning:** Delete unwanted variations and descendant trees with an explicit confirmation dialog.
- **Engine Move Addition:** Click candidate moves directly in the engine panel to branch into variations.

### 4. Real-Time Visual Analysis
- **Dynamic Evaluation Bar:** Vertical advantage bar beside the board driven by a smooth sigmoid curve:
  $$\text{WinPct} = \frac{100}{1 + 10^{-\text{cp} / 400}}$$
  Correctly handles centipawns and forced mate scores (`M3`, `-M1`).
- **Interactive Evaluation Graph:** Full-game advantage chart showing White vs. Black swings. Click any bar or node in the chart to jump directly to that position.
- **On-Board Best-Move Arrows:** High-visibility SVG arrows indicating top candidate moves on the chessboard (configurable 1–3 arrows, color-coded by candidate rank).

### 5. Automated Game Review & Move Classification Overhaul
- **Batch Game Evaluation:** Analyzes every move of an imported or played game sequentially with a live progress bar, instant cancellation, and configurable analysis depth (Fast 12, Standard 14, Deep 16, Master 18).
- **Universal Classification Display:**
  - Move classifications appear directly beside their SAN notation in the **Move History list** for every turn (both White and Black).
  - Dedicated **Current-Move Information Panel** directly underneath the chessboard showing played move, classification badge, engine recommended move, and evaluation impact.
  - Classifications remain visible when switching between mainline and variations. Unanalyzed moves show no misleading badges.
- **10 Transparent Move Classifications:**
  - 📖 **Book:** Verified theoretical move from the built-in ECO opening database (CC0/Public Domain).
  - 💎 **Brilliant (!!):** Top engine move finding a sound, decisive piece sacrifice that preserves a winning position.
  - ⭐ **Great (!):** Exceptional find; the only move maintaining an advantage (MultiPV candidate gap $\ge 120$ cp) or saving the game under heavy pressure.
  - ★ **Best:** Top engine recommendation with zero centipawn loss ($CPL = 0$).
  - ✓ **Excellent:** Strong move with minimal concession ($CPL \le 25, \Delta\text{Win\%} \le 3\%$).
  - • **Good:** Playable move with minor concession ($CPL \le 40, \Delta\text{Win\%} < 5\%$).
  - ?! **Inaccuracy:** Suboptimal move ($CPL \ge 40$ or $\Delta\text{Win\%} \ge 5\%$).
  - ? **Mistake:** Serious error worsening position ($CPL \ge 90$ or $\Delta\text{Win\%} \ge 10\%$).
  - ?? **Blunder:** Critical error losing material or throwing game ($CPL \ge 200$ or $\Delta\text{Win\%} \ge 20\%$).
  - ✕ **Missed Win:** Overlooked a decisive winning advantage ($\ge 82\%$ win rate slipping to $< 60\%$).
- **Mathematical Correctness & Perspective Normalization:**
  - Strict White-relative to moving-player perspective conversion for both players.
  - Best Move Invariance: Playing the engine's best move strictly guarantees $CPL = 0$ and $\Delta\text{Win\%} = 0$, eliminating 1-ply search horizon penalties.
  - Forced Move Handling: Only legal moves receive Best ($CPL = 0$) and are never penalized.
  - Accurate Forced Mate Scoring: Handled separately from centipawns to prevent distorted deltas.
  - Cache Depth Validation: Never reuses shallow evaluations when deeper review is requested.
  - Accuracy Formula:
    $$\text{Accuracy} = 100 \times e^{-0.045 \times \Delta\text{Win\%}}$$
- **Game Phase Detection:** Automatically classifies positions into Opening, Middlegame, and Endgame based on piece count and development.
- **Estimated Performance ELO:** Rating calculation with confidence ranges and clear educational disclaimers.

### 6. Local Game Library & Persistence
- **Client-Side IndexedDB (`chesslab_db` v1):** Automatically saves your working board and variation tree every 500ms (debounced). Restore your workspace seamlessly upon page reload.
- **Library Management:** Save, search, filter (by result and review status), rename, duplicate, and delete saved games.
- **Multi-Game PGN Import & Export:** Bulk import PGN archives (up to 1,000 games / 15MB) or export your entire library.
- **Full JSON Backup & Restore:** Export complete database snapshots and restore them with either Non-Destructive Merge or Clean Overwrite.

### 7. Game Statistics Dashboard
- **Performance Overview:** Overall win rate %, White & Black average accuracy, Average Centipawn Loss (ACPL), and total analyzed moves.
- **Move Classification Breakdown:** Aggregated counts of Brilliant, Great, Best, Inaccuracies, Mistakes, and Blunders.
- **Phase Breakdown:** Side-by-side accuracy comparison across Opening, Middlegame, and Endgame.
- **Recent Reviewed Games:** Direct shortcuts to jump into your recently reviewed games.

---

## 🔒 Security & Privacy

| Security Measure | Implementation |
| :--- | :--- |
| **Strict Content Security Policy (CSP)** | Enforced via `<meta http-equiv="Content-Security-Policy">`. Disallows unsafe remote scripts and unauthorized connections. |
| **Zero Server Telemetry** | 100% client-side execution. No user data, game moves, or PGN files leave your device. |
| **Safe DOM Rendering** | Built with pure React JSX escaping. Zero usage of `dangerouslySetInnerHTML`. |
| **File Upload Hardening** | 15MB upload limit for PGN files, 25MB limit for JSON backups, and batch safety cap of 1,000 games. |
| **Storage Quota Protection** | Graceful quota error detection (`QuotaExceededError`) with user notifications. |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `←` (Left Arrow) | Navigate to previous move |
| `→` (Right Arrow) | Navigate to next move |
| `↑` (Up Arrow) | Jump to starting position (root) |
| `↓` (Down Arrow) | Jump to latest move in current branch |
| `F` | Flip board orientation (White / Black) |

---

## 🛠️ Technology Stack

- **UI & Architecture:** [React 18](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Vite 5](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Chess Logic:** [chess.js](https://github.com/jhlywa/chess.js) (v1.0.0-beta.6)
- **Board Component:** [react-chessboard](https://github.com/Clariity/react-chessboard)
- **Engine:** [Stockfish 19](https://stockfishchess.org/) via WebAssembly (`stockfish@19.0.1` / `nmrugg/stockfish.js`)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Testing:** [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm` or `pnpm`

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/RazborChess.git
cd RazborChess
npm install
```

### Development
Start the local development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Running Tests
Execute the automated test suite (106 tests across 17 test files):
```bash
npm test -- --run
```

### Production Build
Build the optimized production distribution:
```bash
npm run build
```
The output will be generated in the `dist/` directory.

### Preview Production Build
Preview the production build locally:
```bash
npm run preview
```

---

## ⚖️ License & Attribution

- **Stockfish Engine:** Stockfish is licensed under the [GNU General Public License v3 (GPL-3.0)](https://www.gnu.org/licenses/gpl-3.0.html). The Stockfish WASM binary and license text are included in `public/stockfish/LICENSE.txt`.
- **Disclaimer:** RazborChess is an independent open-source educational project and is not affiliated with, sponsored by, or endorsed by Chess.com or Lichess. Move classifications, accuracy calculations, and estimated ratings are transparent heuristics designed for learning and analysis.
