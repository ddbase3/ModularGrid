# Grouping Infinite Ajax Demo

This demo uses the dedicated endpoint:

- `https://base3.de/modulargridgroupeddemoservice.json`

## Goal

This demo starts from the same workbench baseline as `demos/infinite-ajax/` and then adds a safer first step toward server-side grouping.

That means it still demonstrates:

- server-side search
- server-side sorting
- external filters
- header menus
- info display
- selection
- row actions
- bulk actions
- export
- column visibility
- reset
- async row detail
- session storage
- automatic append loading through the infinite-scroll plugin

On top of that, it adds demo-scoped grouping controls without changing the existing infinite ajax service.

## Why a separate service exists

The original `modulargriddemoservice` also serves other demos.

This grouping demo therefore uses its own service class and endpoint so that deeper grouping experiments do not accidentally change or destabilize the existing demos.

## Grouping interaction model

The demo starts in the normal infinite-table mode.

Grouping is optional and controlled outside the grid through dedicated dropdowns:

- add a grouping field
- change the field per grouping level
- remove individual grouping levels
- clear grouping completely

The order of the selected fields defines the grouping path.

Examples:

- `City`
- `City → Status`
- `Country → Category → Verified`

## Server response modes

The demo switches between two list modes depending on the current grouping state.

### No grouping selected

The grid sends a normal page request:

```json
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
        "filters": {},
        "group": []
}
```

### Grouping selected

The grid switches to grouped rows:

```json
{
        "mode": "grouped-page",
        "page": 1,
        "pageSize": 50,
        "search": "",
        "sort": [
                {
                        "key": "city",
                        "dir": "asc",
                        "type": "string"
                }
        ],
        "filters": {},
        "group": [
                {
                        "key": "city",
                        "dir": "asc"
                },
                {
                        "key": "status",
                        "dir": "asc"
                }
        ]
}
```

The response then contains grouped rows instead of plain records.

## Group row detail

When you open a grouped row, the demo sends a second request:

```json
{
        "mode": "grouped-detail",
        "search": "",
        "filters": {},
        "group": [
                {
                        "key": "city",
                        "dir": "asc"
                },
                {
                        "key": "status",
                        "dir": "asc"
                }
        ],
        "groupValues": {
                "city": "Berlin",
                "status": "active"
        }
}
```

The response contains the matching child entries and the demo renders them as a child table inside the expanded detail row.

## Clamp / expand behaviour

The visible `Text overview` column keeps the same clamp / expand baseline as the original infinite ajax demo.

That means:

- in normal mode it clamps record text fields
- in grouped mode it clamps the aggregated member preview text
- the `More` / `Less` toggle continues to work in both modes because the column still renders plain text content into the existing text-display system

## Current design intent

This demo is intentionally a bridge step.

It proves three things:

1. the infinite ajax workbench can stay intact
2. grouping can be introduced without rewriting the existing server demo
3. grouped rows can expose their members through a child table in the detail layer

The next deeper grouping step would be true nested server-side hierarchy rendering directly in the table body.

