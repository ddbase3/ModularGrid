# ModularGrid Working Rules

These rules should guide all future development.

## Main rule

Do not grow the core casually.

If a feature can reasonably be implemented as a plugin, it should be implemented as a plugin.

## Architectural priorities

Priority order:

1. keep the core stable
2. keep the public behavior predictable
3. implement features in modular form
4. avoid hidden coupling between features
5. avoid DOM-driven architecture
6. avoid monolithic files

## Core philosophy

The core should mainly handle:

- lifecycle
- state
- commands
- events
- data loading coordination
- layout rendering coordination
- view rendering coordination
- plugin installation and plugin contributions

The core should not become the place where every concrete feature is hardcoded.

## Plugin-first rule

Before adding a new feature to the core, ask:

- Can this be implemented as a plugin?
- Can it render into an existing or custom zone?
- Can it use existing state and commands?
- Can it listen to events instead of changing the core?
- Can it expose commands instead of introducing special-case code?

If the answer is yes, do not put it into the core.

## Layout rule

Do not reintroduce fixed assumptions like:

- header-left
- header-center
- header-right
- footer-left
- footer-right

The layout must stay free and declarative.

## Multiple-instance rule

Every change must remain safe for multiple independent grid instances on one page.

Avoid:

- global mutable state
- document-wide behavior without instance scoping
- selectors that assume a single grid

## State rule

DOM must not become the source of truth.

The grid state must remain in the state store, and DOM must be treated as rendered output.

## File size rule

Prefer small focused files.

Do not let `ModularGrid.js` become a monolith again.

## Extension rule

When adding a new feature, prefer this order:

1. plugin
2. adapter
3. view
4. driver
5. core change only if strictly necessary

## Documentation rule

Whenever a new architectural concept is introduced, update the relevant file in `docs/`.

At minimum, update one or more of:

- `CURRENT_STATUS.md`
- `architecture/CORE_CONTRACT.md`
- `architecture/PLUGIN_API.md`
- `architecture/LAYOUT_MODEL.md`
- `todo/FEATURE_TODO.md`

## Chat continuation rule

New chats should be briefed using `docs/NEW_CHAT_BRIEFING.md` plus one or more focused docs depending on the task.

## Anti-patterns to avoid

Avoid these unless there is a very strong reason:

- rebuilding the old jQuery plugin architecture
- feature logic hardcoded into the view
- feature logic hardcoded into the core
- feature behavior hidden in CSS hacks
- feature behavior hidden in DOM traversal
- random option flags without architectural fit
- adapter-specific behavior leaking into unrelated core code
