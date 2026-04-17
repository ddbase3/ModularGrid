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

Controls such as search, filters, paging, info bars, summaries, bulk actions, export buttons or extra tools must be added through:

plugins
named layout zones
optional layout helpers

This keeps the core neutral and avoids hardcoded toolbar/footer structures.


---

## `docs/README.md`
```markdown id="dfz89o"
# ModularGrid Documentation Index

This directory contains the project briefing and architecture files that should be used to continue work across multiple chats.

## Read order for a new chat

A new chat should ideally read these files in this order:

1. `docs/README.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/WORKING_RULES.md`
4. `docs/architecture/CORE_CONTRACT.md`
5. `docs/architecture/PLUGIN_API.md`
6. `docs/architecture/LAYOUT_MODEL.md`
7. `docs/todo/FEATURE_TODO.md`

If the new chat only needs a short briefing, provide:

- `docs/NEW_CHAT_BRIEFING.md`

## Purpose of these files

- `CURRENT_STATUS.md`  
	Summary of what already exists and what is already working.

- `WORKING_RULES.md`  
	Project rules for how new work should be done.

- `NEW_CHAT_BRIEFING.md`  
	A ready-to-copy briefing for starting a new chat.

- `architecture/CORE_CONTRACT.md`  
	Defines what the core is allowed to do and what should be handled via plugins.

- `architecture/PLUGIN_API.md`  
	Defines the plugin system, plugin responsibilities and usage patterns.

- `architecture/LAYOUT_MODEL.md`  
	Defines the free layout tree and zone-based rendering model.

- `todo/FEATURE_TODO.md`  
	Main feature roadmap and checklist.

## Main project goal

ModularGrid is intended to become a modern, modular, extensible data grid framework with:

- a small stable core
- optional adapters
- optional plugins
- multiple independent instances on one page
- flexible layout composition
- views beyond classic tables
- clean long-term extensibility

The project should not drift back into a monolithic legacy-style widget.

## Important current design rules

The core no longer assumes a built-in controls layout.

The default layout is view-only.

Search bars, filters, paging controls, info bars, summaries, export controls, row details and other UI controls should be added through:

- plugins
- views
- named layout zones
- optional layout helpers for demos or convenience

This keeps the core neutral and prevents fixed top/bottom control structures from becoming mandatory.

## Testing reminder

When user-visible behavior changes, keep the browser smoke test aligned with the current framework behavior.

Relevant files:

- `tests/browser-smoke/index.html`
- `tests/browser-smoke/smoke.js`

## Demo reminder

The ajax-based multifunction demo lives in:

- `demos/extended-ajax/`

It is currently the main example for “many features through plugin configuration instead of special-purpose demo code”.
