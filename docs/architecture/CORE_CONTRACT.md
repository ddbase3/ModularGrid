# ModularGrid Core Contract

This file defines what the core is responsible for and what must preferably stay outside the core.

The purpose is to keep the core stable.

## Core mission

The core exists to coordinate the system, not to own every feature.

The core should be boring, stable and difficult to break.

## Core responsibilities

The core is responsible for these areas:

### 1. Instance lifecycle

The core owns:

- creation
- initialization
- reload
- render coordination
- destroy

### 2. State coordination

The core owns:

- central grid state
- state updates
- state subscriptions
- safe instance-local state behavior

### 3. Events

The core owns:

- instance-local event bus
- standard lifecycle and state-related events

### 4. Commands

The core owns:

- command registry
- built-in essential commands
- command dispatching

### 5. Data loading coordination

The core owns:

- invoking the active adapter
- building requests from state
- normalizing load results
- handing data into the rendering pipeline
- deciding whether rows should be prepared client-side or treated as already prepared server-side
- watching configured top-level state sections in server mode and coordinating reloads
- supporting both replace-style and append-style server loading when incremental loading strategies need accumulated rows

Important: backend-specific request mapping still belongs to adapters or demo/application code, not the core.

Important: paging UI or infinite-scroll UI still belongs outside the core even when the core exposes a neutral append-capable loading path.

### 6. Layout coordination

The core owns:

- resolving the declarative layout tree
- providing named zones
- providing the main view container

Important: the core must not require a fixed controls layout.

The default layout should stay neutral.

### 7. View coordination

The core owns:

- view registration and lookup
- selecting the active view
- providing the active view with prepared model data
- coordinating rerendering for the active view

Important: concrete row-detail UI remains a view/plugin concern even when the core provides the state and render coordination needed to support it.

Important: text wrapping, overflow and long-text presentation strategy remain view/rendering concerns even when columns expose configuration for those strategies.

Important: when a rendering feature needs stable interaction state across rerenders, a small generic state-backed command hook in the core is acceptable, as long as the concrete UI stays inside views.

### 8. Plugin installation

The core owns:

- plugin installation lifecycle
- plugin command registration
- plugin layout contributions
- plugin column contributions
- plugin view registration
- plugin teardown

## What should NOT go into the core if avoidable

The core should preferably not directly implement:

- search UI
- page size UI
- info UI
- paging UI
- column visibility logic
- reset behavior
- selection UI
- row actions UI
- concrete card view switching UI
- row-detail UI
- grouping UI
- export UI
- chart UI
- advanced filters
- storage persistence strategies
- drag and drop implementations
- resizable columns
- reorderable rows or columns
- infinite-scroll UI, scroll listeners or demo-specific loading indicators

These belong in plugins, views, drivers or adapters.

## Allowed core changes

Core changes are allowed only when a new feature genuinely requires a new stable extension point.

Good examples of acceptable core changes:

- a missing lifecycle hook
- a missing registry
- a missing plugin contribution type
- a missing view activation mechanism
- a missing adapter normalization contract
- a missing plugin-driven render-column extension point
- a missing plugin-driven view registration point
- a missing data preparation strategy such as explicit server mode
- a missing watched-state reload mechanism for adapter-backed grids
- a small generic state-backed command needed for stable rendering interactions across rerenders
- a neutral append-style server loading path that can be reused by plugin-driven incremental loading strategies

Bad examples of unnecessary core changes:

- adding concrete feature UI to the core
- adding hardcoded feature flags for one plugin
- special-casing one future feature directly inside `ModularGrid.js`
- forcing a mandatory toolbar/footer control structure
- hardcoding one particular infinite-scroll or loader UI implementation into the core

## Core stability goal

The long-term goal is:

- the core rarely changes
- new features mostly arrive as plugins
- demos and use cases grow without forcing core rewrites

## Stable extension points the project should rely on

Over time, most future growth should use these extension points:

- state
- events
- commands
- layout contributions
- column contributions
- views
- adapters
- renderers
- storage adapters
- drivers

## Warning sign

If a new feature requires large changes in multiple unrelated parts of the core, stop and check whether the architecture is drifting in the wrong direction.

