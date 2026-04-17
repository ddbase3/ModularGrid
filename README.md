# ModularGrid

Minimal first runnable version of ModularGrid.

## Current scope

This first version intentionally stays small:

- Vanilla JavaScript
- No build step
- No jQuery
- Multiple grid instances on one page
- Array-based data source
- Search
- Sorting
- Paging
- Minimal flexible layout tree
- Simple browser smoke test

## Project structure

- `src/` core source files
- `demos/` manual demos
- `tests/` browser-based smoke tests

## How to run

Use any static web server from the project root.

Example with Python:

```bash
python3 -m http.server 8000

Then open:

http://localhost:8000/demos/basic-array/
http://localhost:8000/demos/two-grids/
http://localhost:8000/tests/browser-smoke/
Notes

This is the deliberately small starting point.

The next steps after this version should be:

extract built-in controls into plugins
add ajax adapter
add html table adapter
add view switching
add storage
add column visibility
add row actions
add grouping
add resizing and reordering
```

---

## 3) `/src/index.js`

```js
export { ModularGrid } from './ModularGrid.js';
export { ArrayAdapter } from './adapters/ArrayAdapter.js';
```
