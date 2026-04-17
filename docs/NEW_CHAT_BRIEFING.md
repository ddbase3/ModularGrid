# ModularGrid New Chat Briefing

Use the text below to brief a new chat.

---

You are working on the `ModularGrid` project.

Please read these files first:

1. `docs/README.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/WORKING_RULES.md`
4. `docs/architecture/CORE_CONTRACT.md`
5. `docs/architecture/PLUGIN_API.md`
6. `docs/architecture/LAYOUT_MODEL.md`
7. `docs/todo/FEATURE_TODO.md`

## Important project context

ModularGrid is a modern Vanilla JavaScript data grid framework.

It is **not** meant to be a direct recreation of the old jQuery plugin.

The project priorities are:

- small stable core
- features implemented as plugins whenever possible
- flexible layout tree with named zones
- multiple independent grid instances on one page
- clean long-term extensibility
- no monolithic architecture

## Current technical status

The project already has:

- core instance class
- event bus
- state store
- layout engine
- data controller
- command registry
- plugin manager
- view manager
- table view
- card view
- split detail view
- array adapter
- ajax adapter
- html table adapter
- plugin-based search
- plugin-based external filters
- plugin-based header menus
- plugin-based page size control
- plugin-based info display
- plugin-based summaries
- plugin-based paging control
- column visibility plugin
- reset plugin
- storage plugins
- selection plugin
- row actions plugin
- bulk actions plugin
- export plugin
- row detail plugin
- plugin-driven render-column contributions
- responsive view switching
- server-mode data handling in the core
- multifunction ajax demo using watched server state sections and many plugins together

## Important current design rules

The core default layout is view-only.

The core must not assume a built-in controls structure such as fixed top/bottom or left/center/right control areas.

Any controls should be added by:

- plugins
- explicit layout zones
- optional layout helpers

Shared inline detail behavior should remain plugin-driven and view-integrated, not become a one-off core special case.

## Working rule

Do not expand the core unless it is truly necessary.

Prefer implementing new features through:

- plugins
- adapters
- views
- drivers

## Output preference

Please provide full files with paths, not partial fragments, unless a tiny change is clearly enough.

## Continuation rule

If the current task changes stable user-visible behavior, also keep these files aligned:

- `README.md`
- `docs/CURRENT_STATUS.md`
- `docs/todo/FEATURE_TODO.md`
- `tests/browser-smoke/smoke.js`

## Current task

[Replace this line with the specific next feature or goal.]

---

## Suggested usage

When starting a new chat, replace:

`[Replace this line with the specific next feature or goal.]`

with something like:

- `Add a storage adapter abstraction without breaking the current local storage plugin.`
- `Add a card view without bloating the core.`
- `Design grouping so that it remains plugin-driven.`
- `Add a header menu plugin using state and existing view rendering.`
- `Extend the configurable filters plugin without coupling backend request shape into the core.`
