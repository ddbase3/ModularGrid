# ModularGrid Plugin API

This file defines the intended plugin model.

The exact implementation may evolve, but the conceptual contract should remain stable.

## Plugin purpose

A plugin adds a feature without forcing feature logic into the core.

Plugins should be the default mechanism for expanding ModularGrid.

## What a plugin may do

A plugin may:

- register commands
- listen to events
- contribute UI into layout zones
- contribute render columns
- register views
- read and update grid state
- trigger behavior through commands
- expose reusable feature behavior

A plugin should not directly rewrite unrelated core behavior.

## Plugin shape

A plugin is an object with a unique name.

Typical shape:

```javascript
export const ExamplePlugin = {
	name: 'example',

	install(context) {},

	destroy(context) {},

	commands: {
		exampleCommand(context, payload) {}
	},

	layoutContributions(context) {
		return [
			{
				zone: 'toolbar',
				order: 100,
				render(renderContext) {
					return document.createTextNode('Example');
				}
			}
		];
	},

	columnContributions(context) {
		return [
			{
				position: 'start',
				order: 10,
				column: {
					key: '__example__',
					sortable: false,
					render() {
						return document.createTextNode('X');
					}
				}
			}
		];
	},

	views: [
		{
			name: 'cards',
			label: 'Cards',
			render(container, grid, viewModel) {}
		}
	]
};
```

## Plugin fields

### `name`

Required. Must be unique per grid instance.

### `install(context)`

Optional. Called when the plugin is installed.

### `destroy(context)`

Optional. Called when the grid is destroyed.

### `commands`

Optional object of command handlers.

### `layoutContributions(context)`

Optional. Returns an array of layout contributions.

### `columnContributions(context)`

Optional. Returns an array of render-column contributions.

### `views`

Optional. A plugin may register one or more named views.

This is useful for:

- card views
- split detail views
- chart views
- specialized domain views

## Plugin context

The plugin context should be treated as the safe plugin API surface.

Typical context capabilities:

- `grid`
- `store`
- `events`
- `commands`
- `getState()`
- `peekState()`
- `setState(patch)`
- `execute(commandName, payload)`
- `requestRender()`
- `requestReload(options)`
- `requestLoadMore(options)`
- `getPluginOptions(pluginName)`

The exact context may grow, but plugins should prefer the smallest necessary surface.

Built-in commands may evolve, but plugins should prefer command dispatching over reaching into unrelated core internals.

For incremental server-loading features, a plugin can use either:

- `execute('loadMore')`
- `requestLoadMore()`

instead of implementing adapter orchestration on its own.

## Plugin-owned state sections

Plugins may own dedicated top-level state sections beyond the core defaults.

Examples:

- `selection`
- `splitDetailView`
- `detailView`
- `filters`
- `grouping`

This is important because server-mode grids may watch additional top-level state keys and reload when those keys change.

The core should not need feature-specific knowledge of those state sections.

## Layout contributions

Layout contributions allow plugins to render UI into named layout zones.

Important rule:

Plugins must not assume that all grids have all zones.

If a layout does not contain the requested zone, the plugin contribution simply will not be shown.

This is intentional and keeps layout composition flexible.

## Column contributions

Column contributions allow plugins to prepend or append extra render columns without mutating the grid's core data columns.

Header-menu style enhancements may also be implemented plugin-side by decorating existing column metadata, as long as the plugin remains responsible for that behavior.

## View registration

Views are named render strategies.

A view receives:

- the target container
- the current grid instance
- the prepared view model

The view manager decides which registered view is currently active.

Example use cases:

- classic table
- cards
- split detail
- chart view

Important note:

Feature-specific rendering extensions such as grouped rows or group summary rows may be implemented in the relevant view while still being controlled by plugin-owned state and plugin options.

## Responsive view behavior

A plugin may react to width or resize changes and switch the active view through commands.

This should be implemented as plugin behavior, not as hardcoded core layout rules.

## Storage abstraction

Storage-backed state persistence should be implemented with:

- a storage plugin
- a storage adapter

The plugin is responsible for:

- deciding which sections of state are persisted
- deciding when save/restore occurs
- mapping plugin options to persistence behavior

The adapter is responsible for:

- reading stored values
- writing stored values
- removing stored values

## Recommended plugin boundaries

A plugin should ideally own one coherent feature area.

Good examples:

- search
- filters
- grouping
- header menu
- page size
- paging
- info
- summary
- column visibility
- reset
- selection
- row actions
- bulk actions
- export
- row detail
- card view
- split detail view
- view switcher
- responsive view switching
- storage
- infinite scroll

## Plugin options

Plugin options should live under:

```javascript
pluginOptions: {
	pluginName: {
		...
	}
}
```

## Example usage

```javascript
import {
	FiltersPlugin,
	HeaderMenuPlugin,
	InfiniteScrollPlugin,
	InfoPlugin,
	ModularGrid
} from './src/index.js';

const grid = new ModularGrid('#grid', {
	layout,
	adapter,
	dataMode: 'server',
	features: {
		paging: false
	},
	plugins: [
		FiltersPlugin,
		HeaderMenuPlugin,
		InfoPlugin,
		InfiniteScrollPlugin
	],
	pluginOptions: {
		info: {
			zone: 'footerInfo',
			displayMode: 'loaded'
		},
		infiniteScroll: {
			threshold: 180,
			pageSize: 50
		}
	}
});

await grid.init();
```

## Long-term goal

The plugin API should become stable enough that most future features can be added without major core rewrites.

