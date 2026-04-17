# ModularGrid Current Status

This file describes the currently implemented baseline.

## Current implementation status

The project currently has a first runnable Vanilla JavaScript foundation without jQuery.

### Core principles already in place

- Vanilla JavaScript
- ES modules
- no build step
- instance-based architecture
- multiple grid instances on the same page
- small core with separate adapters and plugin manager
- free layout tree instead of fixed header/footer slot assumptions
- default core layout is now view-only

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

### Adapters

- `src/adapters/ArrayAdapter.js`
- `src/adapters/AjaxAdapter.js`
- `src/adapters/HtmlTableAdapter.js`

### View

- `src/views/TableView.js`

### Layout helper

- `src/layouts/createClassicLayout.js`

### Storage adapters

- `src/storage/BrowserStorageStateAdapter.js`
- `src/storage/LocalStorageStateAdapter.js`
- `src/storage/SessionStorageStateAdapter.js`

### Plugins

- `src/plugins/createStorageStatePlugin.js`
- `src/plugins/ColumnVisibilityPlugin.js`
- `src/plugins/SearchPlugin.js`
- `src/plugins/PageSizePlugin.js`
- `src/plugins/InfoPlugin.js`
- `src/plugins/PagingPlugin.js`
- `src/plugins/ResetPlugin.js`
- `src/plugins/LocalStoragePlugin.js`
- `src/plugins/SessionStoragePlugin.js`
- `src/plugins/SelectionPlugin.js`
- `src/plugins/RowActionsPlugin.js`

### Utilities

- `src/utils/dom.js`
- `src/utils/object.js`

### Styles

- `src/styles/modulargrid.css`

## Current working feature set

The following already work in the current foundation:

- array-based data adapter
- ajax-based data adapter
- html table adapter
- basic search via plugin
- search input focus is preserved across rerenders
- basic sorting
- basic paging with plugin UI
- page size control via plugin
- info display via plugin
- reset via plugin
- storage abstraction for browser storage-backed persistence
- local storage state persistence via plugin
- session storage state persistence via plugin
- selection via plugin
- plugin-driven checkbox column
- row actions via plugin
- plugin-driven action column
- table rendering
- custom layout tree
- named zones
- plugin layout contributions
- plugin column contributions
- column visibility plugin
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

## Current architectural direction

The project is intentionally **not** trying to recreate the old jQuery plugin one-to-one.

Instead it is being rebuilt as a modern modular framework with these priorities:

1. stable small core
2. features as plugins whenever possible
3. flexible layout model
4. extensibility over short-term hacks
5. clean multiple-instance behavior

## Current important design decision

The core no longer hardcodes a top or bottom controls area.

That means:

- no required toolbar zone
- no required footer zone
- no fixed three-column controls layout
- no assumption that every grid needs the same control structure

Controls are optional and layout-driven.

## Current known design intent

The core should remain small and stable.

The following should preferably be implemented as plugins instead of expanding the core:

- column visibility
- reset
- selection
- row actions
- storage
- grouping
- export
- detail view
- responsive cards
- charts
- advanced filters
- resize and reorder behavior

## Current important technical note

`deepMerge()` must not destroy class instances such as adapters or other service objects.  
Only plain objects should be deeply merged.
