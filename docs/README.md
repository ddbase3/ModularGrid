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

## Important current design rule

The core no longer assumes a built-in controls layout.

The default layout is view-only.

Search bars, paging controls, info bars, reset buttons and other UI controls should be added through:

- plugins
- named layout zones
- optional layout helpers for demos or convenience

This keeps the core neutral and prevents fixed top/bottom control structures from becoming mandatory.

## Current loading-strategy note

Classic page-based paging remains part of the stable baseline.

The core now also has a neutral append-capable server loading foundation, and the project includes a plugin-driven infinite-scroll variant on top of that foundation.

This means consumers can now choose between:

- classic page-based paging with paging and page-size plugins
- plugin-driven infinite scrolling with automatic append loads and a bottom loader inside the scrollable table area

