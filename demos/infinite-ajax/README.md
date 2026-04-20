# Infinite Ajax Demo

This demo uses the public endpoint:

- `https://base3.de/modulargriddemoservice.json`

## Goal

This demo shows the alternative server-loading strategy based on incremental append loading instead of classic page navigation.

It keeps the ajax source and composes the grid mainly through plugins and configuration:

- server-side search
- server-side sorting
- server-side filter state outside the default query object
- header menus
- info display
- selection
- row actions
- bulk actions
- export
- column visibility
- reset
- row detail
- session storage
- automatic append loading through the infinite-scroll plugin

This demo intentionally exists alongside the page-based `extended-ajax` demo.

Classic paging remains a first-class option in ModularGrid.
This demo exists to show that a grid can use a different loading strategy without removing the classic paging plugins or changing the classic server demo baseline.

## Internal scroll area

The table view in this demo uses a fixed-height internal scroll area.

That means:

- the page itself does not drive record loading
- the table viewport is the relevant scroll container
- the next server page is requested when the current scroll position approaches the bottom threshold
- newly loaded rows are appended to the already loaded rows

The table header is intended to stay sticky inside that internal scroll area so column labels remain visible while scrolling through larger result sets.

## Loading indicator

While an append request is in flight, the demo shows a small loading indicator with three pulsing dots inside the scrollable table area near the bottom.

The indicator disappears again after the additional rows have been loaded.

## Data loading model

The demo starts by loading the first batch from the backend.

After that, additional batches are loaded incrementally.

Typical behavior:

1. initial load of the first server page
2. user scrolls near the bottom of the internal table viewport
3. the next page is requested automatically
4. returned rows are appended to the already loaded rows
5. loading stops automatically when the loaded row count reaches the server total

## Relevant framework features

### `dataMode: "server"`

When `dataMode` is set to `server`, the grid no longer performs local search, sorting and paging on the loaded rows.

Instead, it treats the adapter result as already prepared by the backend.

### `server.watchStateKeys`

The grid can watch additional top-level state keys and reload automatically when they change.

This demo uses:

```js
server: {
	searchDebounceMs: 220,
	watchStateKeys: ['query', 'filters']
}

That is why changes in the query state and the external filters state trigger backend reloads.

Append-capable server loading foundation

The core provides a neutral append-capable server loading path through loadMore.

This demo uses that foundation through the infinite-scroll plugin.

The core itself does not implement scroll listeners or a fixed infinite-scroll UI.
Those remain plugin-driven.

Info display semantics

Because this demo accumulates rows incrementally, the info display should be understood as a loaded-progress indicator rather than classic page navigation info.

Typical examples are:

Loaded 50 of 734 records
Loaded all 734 records
No records

This differs intentionally from classic page-based demos, where the info display describes the current visible page window.

Expected backend request shape

The demo sends a POST body like:

{
	"mode": "page",
	"page": 1,
	"pageSize": 50,
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

The first request usually uses page 1.
Later append requests continue with page 2, page 3, and so on.

Expected backend response shape

At minimum:

{
	"data": [],
	"total": 0
}

Optional fields such as columns can also be returned and are accepted by AjaxAdapter.

Important reset behavior

Search, filter, sort and reset actions are not append operations.

They restart the result set from the beginning.

That means the expected behavior is:

clear previously accumulated rows
request the first batch again
rebuild the loaded result set from the new backend state

This keeps infinite loading compatible with server-driven filtering and sorting.

Relationship to the classic server demo

This demo does not replace the classic server paging demo.

Use demos/extended-ajax/ when you want to demonstrate:

classic page navigation
page-size switching
stable page-based server interaction

Use demos/infinite-ajax/ when you want to demonstrate:

internal scroll-based loading
append accumulation
automatic next-page loading
an alternative paging strategy without page-picker UI
Current design scope

This demo currently focuses on incremental loading over a filtered and sorted server result set.

It is intentionally separate from the larger future topic:

server-side grouping over the full filtered dataset

That topic should be handled as its own backend-aware feature step instead of being mixed into the first infinite-scroll baseline.

Next architectural step

The current infinite-scroll baseline proves that ModularGrid can support more than one server-loading strategy.

The next deeper technical step is to improve append rendering so that large append operations do not require rebuilding more DOM than necessary in the table view.
