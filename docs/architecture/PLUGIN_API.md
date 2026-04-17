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

Column contributions

Column contributions allow plugins to prepend or append extra render columns without mutating the grid's core data columns.

Storage abstraction

Storage-backed state persistence should be implemented with:

a storage plugin
a storage adapter

The plugin is responsible for:

deciding which sections of state are persisted
deciding when save/restore occurs
mapping plugin options to persistence behavior

The adapter is responsible for:

reading stored values
writing stored values
removing stored values

This separation keeps persistence transport-specific logic out of the grid core.

Examples of adapters:

local storage adapter
session storage adapter
ajax/database storage adapter
custom browser or app storage adapter
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
Plugin options

Plugin options should live under:

pluginOptions: {
	pluginName: {
		...
	}
}
Example usage
import {
	ModularGrid,
	SearchPlugin,
	SessionStoragePlugin
} from './src/index.js';

const grid = new ModularGrid('#grid', {
	layout,
	data,
	plugins: [
		SearchPlugin,
		SessionStoragePlugin
	],
	pluginOptions: {
		sessionStorage: {
			key: 'example-grid',
			sections: ['query', 'columns']
		}
	}
});

await grid.init();
Long-term goal

The plugin API should become stable enough that most future features can be added without major core rewrites.
