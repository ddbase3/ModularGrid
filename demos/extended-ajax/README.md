# Extended Ajax Demo

This demo uses the public endpoint:

- `https://base3.de/modulargriddemoservice.json`

## Goal

The demo shows the framework-level combination of:

- server-side paging
- server-side search
- server-side sorting
- server-side filter state outside the default query object
- shared row-detail rendering in both table and card view
- responsive automatic switching between table and cards
- manual view switching that still works on wide screens
- wide table rendering with horizontal scrolling
- left/right column pinning through the header menu
- default pinned utility columns for selection and row actions
- row-actions header menu support for unpinning all pinned data columns
- long-text clamp rendering using a combined text column
- optional extra columns exposed through the column selector

This remains the page-based server demo baseline.

Classic paging stays available as a first-class option even while the core now also exposes an append-capable server loading foundation for plugin-driven alternatives such as infinite scroll.

## Relevant framework features

### `dataMode: "server"`

When `dataMode` is set to `server`, the grid no longer performs local search, sorting and paging on the loaded rows. Instead, it treats the adapter result as already prepared by the backend.

### `server.watchStateKeys`

The grid can watch additional top-level state keys and reload automatically when they change.

This demo uses:

```js
server: {
	searchDebounceMs: 220,
	watchStateKeys: ['query', 'filters']
}
```

That is why changes in the query state and the external filters state trigger backend reloads.

## Wide table rendering

The table view renders inside a dedicated horizontal scroll container.

This matters for this demo because the visible baseline includes several wide render columns and optional extra columns.

## Column pinning

The header menu can pin columns to the left or right edge of the table viewport.

The current baseline intentionally keeps the pinning rules strict:

- only the outermost still-unpinned visible column on the left can be pinned left
- only the outermost still-unpinned visible column on the right can be pinned right
- unpinning also happens step by step at the current pinned boundary
- if hidden columns are shown again beyond an already pinned boundary, they automatically join that same pinned boundary

Utility columns stay pinned by default:

- selection stays pinned left
- row actions stay pinned right

The row-actions header menu also exposes an Unpin all action whenever pinned data columns exist.

## Long-text column

The demo includes a long-text render column so that clamp behaviour remains visible in the table, card and split views.

## Row detail behavior

The same detail state is used in both the table and card view.

The demo configures it like this:

```js
rowDetail: {
	rowIdKey: 'id',
	clearOnDataReload: true
}
```

## Expected backend request shape

The demo sends a POST body like:

```json
{
	"mode": "page",
	"page": 1,
	"pageSize": 10,
	"search": "",
	"sort": [
		{
			"key": "lastname",
			"dir": "asc",
			"type": "string"
		}
	],
	"filters": {
		"status": "active"
	},
	"group": []
}
```

## Expected backend response shape

At minimum:

```json
{
	"data": [],
	"total": 0
}
```

Optional fields such as columns can also be returned and are accepted by AjaxAdapter.

## Related architecture notes

### Server mode

ModularGrid supports:

```js
dataMode: 'server'
```

In server mode, the grid does not apply client-side:

- search
- sorting
- paging

The loaded rows are treated as the final page returned by the backend, while `data.total` is used to compute pager information.

### Append-capable server loading foundation

The core now also exposes a neutral append-capable server loading path through `loadMore`.

That foundation is not used by this demo, because this demo intentionally remains the reference for classic page-based server paging.

### Shared row detail state

RowDetailPlugin provides:

- `setDetailRow`
- `clearDetailRow`
- `toggleDetailRow`

Default state key:

- `detailView.rowId`

### Rendering row details in multiple views

Both TableView and CardView understand `pluginOptions.rowDetail`.

Example:

```js
rowDetail: {
	stateKey,
	rowIdKey,
	toggleOnRowClick,
	renderInTable,
	renderInCards,
	showLabels,
	emptyPlaceholder,
	detailRenderer,
	clearOnDataReload
}
```

### Responsive view switching fix

ResponsiveViewPlugin switches only on breakpoint transitions.

That means:

- entering narrow mode still forces the configured narrow view
- leaving narrow mode restores the last wide view
- manually selecting the card view on a wide screen is no longer reverted immediately

This removes the previous issue where the view switcher button could not keep the card view active on wide screens.

The new companion demo for the alternative loading strategy is:

**`demos/infinite-ajax/` for plugin-driven infinite scrolling on top of the append-capable server loading foundation**.

