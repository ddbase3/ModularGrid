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
- read and update grid state
- request rendering
- request reloading
- expose reusable feature behavior

A plugin should not directly rewrite unrelated core behavior.

## Plugin shape

A plugin is an object with a unique name.

Typical shape:

```js
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
	}
};
Plugin fields
name

Required. Must be unique per grid instance.

install(context)

Optional. Called when the plugin is installed.

Use it for:

subscriptions
setup
initial state coordination
light registration work
destroy(context)

Optional. Called when the grid is destroyed.

Use it for:

cleanup
unsubscribing
detaching listeners
commands

Optional object of command handlers.

Example:

commands: {
	toggleSomething(context, payload) {}
}
layoutContributions(context)

Optional. Returns an array of layout contributions.

Each contribution typically contains:

zone
order
render(...)
columnContributions(context)

Optional. Returns an array of render-column contributions.

Each contribution typically contains:

position (start or end)
order
column

This is useful for plugin-driven utility columns such as:

selection checkboxes
row action buttons
drag handles
detail toggles
Plugin context

The plugin context should be treated as the safe plugin API surface.

Typical context capabilities:

grid
store
events
commands
getState()
peekState()
setState(patch)
execute(commandName, payload)
requestRender()
requestReload()
getZone(zoneKey)
getOptions()
getPluginOptions(pluginName)

Plugins should use this context instead of reaching into private internals.

Layout contributions

Layout contributions allow plugins to render UI into named layout zones.

Typical contribution shape:

{
	zone: 'toolbar',
	order: 100,
	render({ grid, viewModel, zone }) {
		const button = document.createElement('button');
		button.textContent = 'Action';
		return button;
	}
}
Column contributions

Column contributions allow plugins to prepend or append extra render columns without mutating the grid's core data columns.

Typical contribution shape:

{
	position: 'start',
	order: 10,
	column: {
		key: '__selection__',
		label: '',
		sortable: false,
		render(value, row, column, grid) {
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			return checkbox;
		}
	}
}
Important layout rule

Plugins must not assume that all grids have all zones.

If a layout does not contain the requested zone, the plugin contribution simply will not be shown.

This is intentional and keeps layout composition flexible.

Recommended plugin boundaries

A plugin should ideally own one coherent feature area.

Good examples:

search
page size
paging
info
column visibility
reset
selection
row actions
export
storage
grouping
responsive cards

Bad example:

one giant plugin that tries to own half the framework
State usage recommendations

Plugins may update state, but they should do so carefully.

Recommended pattern:

read current state
derive a focused patch
update only the relevant slice
emit domain events if useful

Avoid large blind state rewrites unless necessary.

Event usage recommendations

Use events for loose coordination.

Useful plugin patterns:

react to grid:init
react to state:changed
emit columns:changed
emit selection:changed
emit filters:changed
emit grid:reset

Do not rely on unrelated private implementation details.

Command usage recommendations

Commands are useful when:

UI actions should be callable from multiple places
plugins should expose reusable actions
the same behavior may later be triggered by menus, buttons, hotkeys or tests

Good examples:

setColumnVisibility
toggleColumn
resetGridState
saveStoredState
restoreStoredState
clearStoredState
toggleRowSelection
clearSelection
Plugin options

Plugin options should live under:

pluginOptions: {
	pluginName: {
		...
	}
}

Example:

pluginOptions: {
	selection: {
		zone: 'actions',
		rowIdKey: 'id'
	}
}
Example usage
import {
	ModularGrid,
	SearchPlugin,
	SelectionPlugin,
	ResetPlugin,
	createClassicLayout
} from './src/index.js';

const grid = new ModularGrid('#grid', {
	layout: createClassicLayout({
		top: ['toolbar', 'actions'],
		bottom: ['footerInfo', 'footerPaging']
	}),
	data,
	plugins: [
		SearchPlugin,
		SelectionPlugin,
		ResetPlugin
	],
	pluginOptions: {
		selection: {
			zone: 'actions'
		}
	}
});

await grid.init();
Long-term goal

The plugin API should become stable enough that most future features can be added without major core rewrites.
