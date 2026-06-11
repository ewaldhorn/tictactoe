# Tic Tac Toe

A responsive, glassmorphic Tic Tac Toe game with an unbeatable AI opponent. Built with vanilla JavaScript and the Canvas API — no frameworks, no dependencies.

## Features

- **Glassmorphic UI** — gradient background, frosted glass panel, glowing X and O marks
- **Unbeatable AI** — minimax algorithm ensures the AI never loses
- **Responsive** — scales to any screen size, works on mobile
- **Sound effects** — soft click sound on every move (Web Audio API)
- **Win/draw detection** — highlights winning cells in gold

## Project Structure

```
tictactoe/
├── src/
│   ├── index.js      → Game logic + rendering
│   └── style.css     → Page centering styles
├── docs/             → Build output (generated)
│   ├── index.html
│   ├── index.min.js
│   └── style.min.css
├── index.html        → HTML template (source)
├── build.sh          → Build script
└── run.sh            → Build + serve script
```

## Build

Requires: `esbuild`, `minify`, `http-server` (all globally installed).

```bash
./build.sh
```

This compiles and minifies JavaScript, minifies CSS, and copies HTML into `docs/`.

## Run

```bash
./run.sh
```

Builds the project, then serves `docs/` on `http://localhost:9000`.

## How It Works

- **Rendering** — A 1000×700 canvas is scaled to fit the viewport. All layout (grid, text, buttons) is computed dynamically from the canvas size.
- **Game state** — A 9-element array tracks the board. Turns alternate between X (player) and O (AI).
- **AI** — Uses the minimax algorithm to evaluate every possible game state. It plays optimally: it will win if you make a mistake, and draw if you play perfectly.
- **Input** — Mouse/touch clicks are mapped to grid cells. A glass-styled reset button restarts the game.
