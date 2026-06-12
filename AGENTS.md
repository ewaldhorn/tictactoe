## Workflow

- install: `npm install -g esbuild minify http-server`
- build: `./build.sh`
- test all: N/A
- test file: N/A
- test case: N/A
- lint: N/A
- format: N/A
- typecheck: N/A
- after every edit: `./build.sh`
- debug: None discovered

## Conventions

- Core constants use uppercase, short names (`W = 1000`, `H = 700`, `GRID = 3`); layout variables follow the same convention (`TOP_MARGIN`, `SIDE_MARGIN`, `CELL_W`). Referenced across `computeLayout()`, `checkWin()`, `minimax()`, and all rendering functions.
- Board is a 9-element array with values `'X'`, `'O'`, or `''` (empty string, not `null`). Status is `'playing' | 'won' | 'draw'`, tracked separately from `winner` and `winCells`. Every major code path reads/writes these.
- A module-level `state` object (`state.btn`, `state.handler`, `state.draw`, `state.modeBtn`) stores all UI references. Read and written by `_clickHandler`, `_drawBoard`, resize handler, and touch handler — all UI manipulation goes through it.
- `init()` removes the previous click handler before adding a new one; calling it more than once replaces all handlers (not additive). The source HTML (`index.html`) is copied verbatim into `docs/`; build output always goes to `docs/`.

