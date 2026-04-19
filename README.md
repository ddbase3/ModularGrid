# ModularGrid

ModularGrid is a modular Vanilla JavaScript data grid framework.

It is intentionally being rebuilt as a modern, instance-based system instead of recreating the old jQuery-style widget architecture.

## Current direction

The project currently focuses on:

- Vanilla JavaScript
- ES modules
- no build step
- small stable core
- plugin-first feature growth
- free layout tree with named zones
- multiple independent grid instances on one page
- table, card and split-detail style views
- browser-based smoke coverage

## Current implemented baseline

The current code base already includes:

- core instance lifecycle
- state store
- event bus
- command registry
- plugin manager
- view manager
- layout engine
- array adapter
- ajax adapter
- html table adapter
- plugin-based search
- plugin-based filters
- plugin-based grouping
- plugin-based header menus
- plugin-based paging UI
- plugin-based page size UI
- plugin-based info UI
- plugin-based summaries
- plugin-based selection
- plugin-based row actions
- plugin-based bulk actions
- plugin-based export
- column visibility plugin
- reset plugin
- storage plugins
- card view
- split detail view
- responsive view switching
- shared inline row detail behavior
- group summary rendering in table view
- configurable zebra rows in table view
- per-column long-text display strategies
- clamp / expand strategy for long text
- unified lightweight dropdown action styling
- header-driven column hover highlighting in table view
- sticky pinned columns in horizontally scrollable tables
- configurable column widths
- column resize handles
- visible-column reordering by drag and drop
- synchronized column order in the column selector
- server-mode loading strategy for ajax-backed grids

## Project structure

- `src/` core source, adapters, plugins, views and styles
- `demos/` manual demos
- `tests/` browser-based smoke coverage
- `docs/` continuation and architecture documentation

## How to run

Use any static web server from the project root.

Example with Python:

```bash
python3 -m http.server 8000

Then open for example:

http://localhost:8000/demos/basic-array/
http://localhost:8000/demos/card-view/
http://localhost:8000/demos/extended-ajax/
http://localhost:8000/tests/browser-smoke/
Table zebra rows

The table view supports zebra row classes by default.

Visible data rows receive alternating classes:

mg-row-odd
mg-row-even

Inline detail rows receive matching classes:

mg-detail-row-odd
mg-detail-row-even

This keeps zebra styling stable even when grouped table sections insert additional non-data rows.

You can disable zebra classes per grid instance like this:

const grid = new ModularGrid('#grid', {
	table: {
		zebraRows: false
	}
});
Long text display strategies

Columns can define how text should be displayed across table, card and split-detail rendering.

Supported strategies:

wrap
ellipsis
nowrap
clamp

Example:

const grid = new ModularGrid('#grid', {
	columns: [
		{
			key: 'notes',
			label: 'Notes',
			textDisplay: 'ellipsis'
		},
		{
			key: 'shortCode',
			label: 'Short code',
			textDisplay: 'nowrap'
		},
		{
			key: 'description',
			label: 'Description',
			textDisplay: {
				strategy: 'wrap'
			}
		},
		{
			key: 'summary',
			label: 'Summary',
			textDisplay: {
				strategy: 'clamp',
				lines: 3,
				expandable: true
			}
		}
	]
});

For ellipsis, the full value is exposed through the title attribute by default.

For clamp, the rendered text is limited to a configured number of lines and can optionally be expanded through a small view-level toggle. The expanded state is stored in the grid state instead of being handled only in the DOM.

Table column interaction baseline

In table view, hovering a visible header cell highlights the whole rendered column.

This includes:

the hovered header cell
the visible body cells that belong to the same column

Pinned cells keep their sticky behavior while still participating in the same hover state.

Open row-action menus are also raised above neighbouring table rows, so action dropdowns are not visually clipped by later-rendered row cells.

Documentation

For continuation across chats, start with:

docs/README.md
docs/CURRENT_STATUS.md
docs/WORKING_RULES.md
docs/architecture/CORE_CONTRACT.md
docs/architecture/PLUGIN_API.md
docs/architecture/LAYOUT_MODEL.md
docs/todo/FEATURE_TODO.md
Important design rule

The core default layout is view-only.

Controls such as search, filters, grouping, paging, info bars, summaries, bulk actions, export buttons or extra tools must be added through:

plugins
named layout zones
optional layout helpers

This keeps the core neutral and avoids hardcoded toolbar/footer structures.
