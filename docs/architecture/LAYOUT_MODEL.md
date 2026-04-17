# ModularGrid Layout Model

This file defines the intended layout system.

## Main idea

The layout system must remain free and declarative.

The project should not drift back to hardcoded layout assumptions such as:

- header-left
- header-center
- header-right
- footer-left
- footer-right

Those patterns are too rigid for the project goals.

## Default layout rule

The core default layout should be minimal and neutral.

The current intended default is effectively view-only.

That means controls are not mandatory.

If a grid needs search bars, reset buttons, paging controls or status information, those should be added through explicit layout zones and plugins.

## Layout tree

A grid layout is described as a tree of layout nodes.

Current conceptual node types:

- `stack`
- `row`
- `column`
- `zone`
- `view`

## Node meanings

### `stack`

A vertical sequence of children.

### `row`

A horizontal grouping of children.

### `column`

A vertical subgroup, useful inside a row or other layout structures.

### `zone`

A named render target for plugins or future built-in components.

### `view`

The main container for the active grid view.

## Example

```js
const layout = {
	type: 'stack',
	children: [
		{
			type: 'row',
			children: [
				{ type: 'zone', key: 'toolbar' },
				{ type: 'zone', key: 'actions' }
			]
		},
		{
			type: 'view',
			key: 'main'
		},
		{
			type: 'row',
			children: [
				{ type: 'zone', key: 'footerInfo' },
				{ type: 'zone', key: 'footerPaging' }
			]
		}
	]
};
Why this model exists

The layout model should allow:

simple grids
complex grids
full-width plugin rows
multi-column tool areas
plugin-defined action areas
future view switching
future detail panes
future chart areas

without hardcoding structural assumptions into the core.

Zones

Zones are named extension targets.

Plugins may render into zones if they exist.

Examples:

toolbar
actions
filters
footerInfo
footerPaging
bulkActions
statusBar
secondaryTools

Zone names are intentionally free.

Important rule

The core should not assume that all grids have the same zones.

Different demos and feature sets may use different layout trees.

Optional helper layouts

Convenience helpers may exist outside the core default behavior, for example a helper that creates a common demo-friendly layout with top and bottom rows.

That is acceptable as long as:

it remains optional
it does not become mandatory core structure
the core itself stays layout-neutral
Recommended usage pattern

Use the layout tree to decide where UI belongs, not what the feature does.

The feature behavior should still live in plugins, commands and state.

Long-term design intention

The layout model should become the stable compositional skeleton of the system.

Views, plugins and controls should adapt to layout definitions instead of forcing one global page structure.
