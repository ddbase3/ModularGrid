# ModularGrid Current Status

This file describes the currently implemented baseline.

## Current implementation status

The project currently has a runnable Vanilla JavaScript foundation with a small core, plugin-driven controls, multiple view types and first-class server-mode support for ajax-backed grids.

### Core principles already in place

- Vanilla JavaScript
- ES modules
- no build step
- instance-based architecture
- multiple grid instances on the same page
- small core with separate adapters and plugin manager
- free layout tree instead of fixed header/footer slot assumptions
- default core layout is view-only
- plugin-first feature growth
- state-driven rendering instead of DOM-driven behavior

## Current source structure

The current code base already contains:

- `src/ModularGrid.js`
- `src/index.js`

### Core classes

- `src/core/GridEventBus.js`
- `src/core/GridStateStore.js`
- `src/core/GridLayoutEngine.js`
- `src/core/GridDataController.js`
- `src/core/GridCommandRegistry.js`
- `src/core/GridPluginManager.js`
- `src/core/GridViewManager.js`

### Adapters

- `src/adapters/ArrayAdapter.js`
- `src/adapters/AjaxAdapter.js`
- `src/adapters/HtmlTableAdapter.js`

### View classes

- `src/views/TableView.js`
- `src/views/CardView.js`
- `src/views/SplitDetailView.js`

### Layout helper

- `src/layouts/createClassicLayout.js`

### Storage adapters

- `src/storage/BrowserStorageStateAdapter.js`
- `src/storage/LocalStorageStateAdapter.js`
- `src/storage/SessionStorageStateAdapter.js`

### Plugins

- `src/plugins/createStorageStatePlugin.js`
- `src/plugins/SearchPlugin.js`
- `src/plugins/FiltersPlugin.js`
- `src/plugins/GroupingPlugin.js`
- `src/plugins/HeaderMenuPlugin.js`
- `src/plugins/PageSizePlugin.js`
- `src/plugins/InfoPlugin.js`
- `src/plugins/SummaryPlugin.js`
- `src/plugins/PagingPlugin.js`
- `src/plugins/ResetPlugin.js`
- `src/plugins/LocalStoragePlugin.js`
- `src/plugins/SessionStoragePlugin.js`
- `src/plugins/ColumnVisibilityPlugin.js`
- `src/plugins/SelectionPlugin.js`
- `src/plugins/RowActionsPlugin.js`
- `src/plugins/BulkActionsPlugin.js`
- `src/plugins/ExportPlugin.js`
- `src/plugins/RowDetailPlugin.js`
- `src/plugins/CardViewPlugin.js`
- `src/plugins/SplitDetailViewPlugin.js`
- `src/plugins/ViewSwitcherPlugin.js`
- `src/plugins/ResponsiveViewPlugin.js`

### Utilities

- `src/utils/dom.js`
- `src/utils/object.js`
- `src/utils/rowDetail.js`
- `src/utils/summary.js`
- `src/utils/textDisplay.js`

### Styles

- `src/styles/modulargrid.css`

## Current working feature set

The following already work in the current foundation:

- array-based data adapter
- ajax-based data adapter
- html table adapter
- basic search via plugin
- configurable external filters via plugin
- configurable grouping via plugin
- search input focus is preserved across rerenders
- basic sorting
- header menu with configurable sort options per column
- direct header label sorting with configurable default sort field
- basic paging with plugin UI
- page size control via plugin
- info display via plugin
- summary metrics via plugin
- group summary rendering in table view
- zebra row classes in table view with per-grid on/off option
- zebra row parity classes also applied to inline detail rows
- dedicated horizontal scroll container for wide table layouts
- width-based column sizing for wide table rendering
- per-column text display strategies across table, card and split-detail rendering
- ellipsis strategy with title tooltip support
- nowrap and wrap text strategies
- clamp strategy with configurable line count
- expand / collapse support for clamped text
- state-backed text expansion handling
- unified lightweight dropdown action styling for header menus and row menus
- reset via plugin
- storage abstraction for browser storage-backed persistence
- local storage state persistence via plugin
- session storage state persistence via plugin
- selection via plugin
- plugin-driven checkbox column
- row actions via plugin
- plugin-driven action column
- row-actions header menu for column visibility controls
- bulk action toolbar via plugin
- export actions via plugin
- column visibility plugin
- formal view manager
- plugin-registered views
- table view
- card view
- split detail view
- view switching control via plugin
- responsive auto-switch to cards on narrow width
- manual card/table view switching on wide layout with responsive plugin active
- shared row-detail state via plugin
- inline row details in table view
- inline row details in card view
- custom detail renderers via plugin options
- server-mode data preparation in the core
- watched server-state reload strategy
- server-mode paging/search/sort/filter demo wiring via adapter request mapping
- custom layout tree
- named zones
- plugin layout contributions
- plugin column contributions
- plugin view contributions
- multiple independent grid instances on one page

## Current demos

The repo currently includes demos for:

- basic array data
- two independent grids
- ajax data
- html table source
- column visibility plugin
- reset and local storage
- selection plugin
- row actions plugin
- modern layout with session storage
- responsive cards and split detail demo
- multifunction ajax demo with plugin-driven search, filters, grouping, header menus, selection, row actions, bulk actions, export, summaries, row details, multiple views and a wide-table baseline with horizontal scrolling and clamp-based long-text rendering

## Current architectural direction

The project is intentionally **not** trying to recreate the old jQuery plugin one-to-one.

Instead it is being rebuilt as a modern modular framework with these priorities:

1. stable small core
2. features as plugins whenever possible
3. flexible layout model
4. extensibility over short-term hacks
5. clean multiple-instance behavior

## Current important design decisions

The core no longer hardcodes a top or bottom controls area.

That means:

- no required toolbar zone
- no required footer zone
- no fixed three-column controls layout
- no assumption that every grid needs the same control structure

Controls are optional and layout-driven.

The core now supports a dedicated `dataMode: 'server'` strategy for adapter-backed grids, while request shaping remains adapter-level and plugin state can participate through watched top-level state keys.

Shared row-detail behavior is plugin-driven and view-integrated, not hardcoded as a one-off demo behavior.

Filters, grouping, header menus, export, summaries and bulk actions are plugin-driven and can be composed through configuration without additional core work.

Table zebra row styling is handled in the table view with explicit parity classes on rendered data rows, so grouping rows and group summaries do not break the alternating pattern.

Wide table rendering is handled through a dedicated scroll container in the table view, so future pinned-column work can build on a stable baseline instead of relying on ad-hoc demo CSS.

Long-text display is handled in the views through per-column rendering options, so wrapping and overflow strategy remain presentation concerns instead of becoming adapter or core logic.

Clamp expansion is state-backed, so rerendering and view switching do not depend on DOM-only toggle state.

## Current known design intent

The core should remain small and stable.

The following should preferably be implemented as plugins instead of expanding the core:

- search/filter UI
- grouping UI
- group summaries
- header menus
- column visibility
- reset
- selection
- row actions
- bulk actions
- export
- summaries
- row detail behavior
- storage
- responsive cards
- charts
- advanced filters
- resize and reorder behavior

## Current important technical note

`deepMerge()` must not destroy class instances such as adapters or other service objects.
Only plain objects should be deeply merged.
