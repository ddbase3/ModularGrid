# ModularGrid Feature Todo

This file is the main feature checklist for the project.

It is based on the originally requested feature set, translated into a more structured roadmap.

---

## Legend

- `[ ]` not started
- `[~]` in progress / partially available
- `[x]` available in some usable form

---

# 1. Foundation

## 1.1 Core architecture

- [x] Create a new Vanilla JavaScript core
- [x] Support multiple grid instances on one page
- [x] Separate adapters from the core
- [x] Introduce a command registry
- [x] Introduce a plugin manager
- [x] Introduce a free layout tree
- [~] Keep the core stable and small
- [x] Add a formal view manager
- [ ] Add formal renderer registries
- [~] Add driver concept for DnD / resizing / integrations

## 1.2 Documentation and continuation

- [x] Create project briefing docs for new chats
- [x] Create a central feature todo list
- [x] Create core contract documentation
- [x] Create plugin API documentation
- [x] Create layout model documentation
- [~] Keep docs updated as the implementation grows

---

# 2. Data sources

- [x] Array data adapter
- [x] Ajax adapter
- [x] HTML table adapter
- [x] Server-side paging strategy
- [x] Server-side sorting strategy
- [x] Server-side search strategy
- [x] Server-side filter strategy
- [x] Watched server-state reload strategy
- [x] Append-capable server load foundation
- [ ] Hybrid client/server processing strategy

---

# 3. Rendering and templating

- [x] Overridable cell rendering
- [x] Overridable header rendering
- [~] Free layout composition
- [~] Formal row renderer extension point
- [ ] Formal header row renderer extension point
- [ ] Formal filter row renderer extension point
- [x] Formal group row renderer extension point
- [x] Formal summary row renderer extension point
- [ ] Renderer registry instead of ad-hoc render callbacks

---

# 4. Column features

- [x] Column visibility plugin
- [x] Column pinning left
- [x] Column pinning right
- [x] Column width configuration
- [x] Column resize by drag handle
- [x] Column reorder by drag and drop
- [x] Column header menu
- [~] Column-specific sort strategies
- [ ] Column overflow strategies
- [ ] Column action selection for bulk operations

---

# 5. Sorting

- [x] Basic sorting
- [ ] Multi-column sorting
- [ ] Sort strategy registry
- [ ] Numeric sorting strategy
- [ ] String sorting strategy
- [ ] Date sorting strategy
- [ ] Datetime sorting strategy
- [ ] Boolean sorting strategy
- [x] Custom sort strategy support

---

# 6. Filtering and searching

- [x] Basic global search
- [x] Move global search into a plugin
- [x] Preserve search input focus during rerender
- [~] Column filter plugin foundation
- [ ] Header filter row
- [x] External filters
- [ ] Synchronization between header filters and external filters
- [x] Basic text filter
- [x] Select filter
- [ ] Date range filter plugin
- [~] Custom filter plugin API
- [~] Filter persistence
- [ ] Saved filter configurations

---

# 7. Paging and loading strategies

- [x] Page-based paging
- [x] Replace built-in paging UI with plugin-based paging UI
- [x] Alternative page size UI via plugin
- [x] Infinite scroll / auto paging
- [x] Append-capable server accumulation for incremental loading strategies
- [x] Pluggable paging controls

---

# 8. Selection and row actions

- [x] Selection plugin
- [x] Checkbox first column
- [~] Select all / clear selection
- [x] Bulk action toolbar
- [x] Row actions plugin
- [x] Three-dot row menu
- [~] Row menu extension mechanism

---

# 9. Grouping and hierarchical display

- [x] Grouping plugin
- [x] Group by one field
- [ ] Group by multiple fields
- [ ] Aggregate other fields automatically
- [ ] Expand / collapse groups
- [x] Group summary rendering
- [ ] Custom aggregation strategies

---

# 10. Row expansion and detail behavior

- [x] Expandable row details
- [x] Custom detail renderer
- [x] Row click action abstraction
- [ ] Dialog integration option
- [x] Inline detail expansion option
- [x] Shared row-detail state plugin
- [x] Table and card detail rendering from one feature

---

# 11. Views

- [x] Basic table view
- [x] View manager
- [x] Card view
- [x] Responsive mobile card mode
- [x] Detail split view
- [ ] Chart view
- [x] View switching control
- [x] Separate detail pane rendering

---

# 12. Responsive behavior

- [~] Basic mobile-safe layout behavior
- [x] Demo-specific modern control layout with CSS
- [~] Responsive cards plugin
- [ ] Adaptive column hiding strategy
- [ ] Narrow viewport table strategy
- [ ] Detail-first responsive strategy
- [x] Stable manual view switching while responsive plugin is active

---

# 13. Persistence and saved configurations

- [x] Storage adapter contract
- [x] Local storage plugin
- [x] Session storage plugin
- [ ] Ajax/database storage plugin
- [~] Persisted filters
- [x] Persisted sorting
- [x] Persisted column visibility
- [~] Persisted selection
- [~] Persisted view mode
- [~] Persisted split detail state
- [~] Persisted shared row detail state
- [~] Persisted grouping state
- [ ] Persisted layout/view settings
- [ ] Saved named grid configurations

---

# 14. Export

- [x] Export plugin
- [ ] Export all rows
- [ ] Export filtered rows
- [x] Export selected rows
- [x] Export with selected columns
- [x] CSV export
- [x] JSON export
- [ ] XLSX export or adapter strategy

---

# 15. Editing and data manipulation

- [ ] Inline editing support
- [ ] Editable cell renderer support
- [ ] Editable row behavior
- [ ] Save hook / callback support
- [ ] Row reorder plugin
- [ ] Sortable rows with configurable sort field updates

---

# 16. Styling and display options

- [x] Zebra rows option
- [x] Long text display strategies
- [x] Ellipsis strategy
- [x] Multi-line wrapping strategy
- [x] Clamp / expand strategy
- [x] Header-driven column hover highlight
- [ ] Theme organization

---

# 17. Charts and alternate visualizations

- [ ] Chart plugin
- [ ] Choose x/y fields
- [ ] Use current filtered data
- [ ] Switch between table and chart view

---

# 18. Reset and state management utilities

- [x] Reset plugin
- [x] Reset filters
- [x] Reset sorting
- [x] Reset grouping
- [x] Reset column visibility
- [~] Reset complete grid state

---

# 19. Menus and extensibility points

- [x] Header menu plugin
- [~] Header menu contributions by plugins
- [x] Row menu contributions by plugins
- [x] Toolbar contributions by plugins
- [x] Footer contributions by plugins
- [x] Column contributions by plugins
- [x] View contributions by plugins
- [x] Floating dropdown positioning
- [x] Persistent open state for multi-toggle column selector
- [x] Row-menu stacking above neighbouring table rows

---

# 20. Testing and demos

- [x] Basic runnable demo
- [x] Two independent grids demo
- [x] Ajax adapter demo
- [x] HTML table adapter demo
- [x] Column visibility demo
- [x] Browser smoke test
- [x] Reset demo
- [x] Storage demo
- [x] Selection demo
- [x] Row actions demo
- [x] Modern layout demo
- [x] Card view demo
- [x] Extended ajax demo
- [x] Infinite ajax demo
- [x] Smoke coverage for responsive view switching
- [x] Smoke coverage for inline row detail behavior
- [x] Smoke coverage for bulk actions
- [x] Smoke coverage for export events
- [x] Smoke coverage for filters plugin
- [x] Smoke coverage for header menu sort actions
- [x] Smoke coverage for grouping plugin
- [x] Smoke coverage for group summary rendering
- [x] Smoke coverage for text display and ellipsis handling
- [x] Smoke coverage for clamp and expand handling
- [x] Smoke coverage for pinned-column scrolling
- [x] Smoke coverage for column width configuration
- [x] Smoke coverage for column resizing
- [x] Smoke coverage for column reordering
- [x] Smoke coverage for synchronized column selector order
- [x] Smoke coverage for header-driven column hover highlighting
- [x] Smoke coverage for row-menu stacking behaviour
- [x] Smoke coverage for infinite-scroll append loading and bottom loader behaviour
- [ ] Export demo

---

# Recommended next implementation order

The next good steps are:

1. server-side grouping over full filtered dataset
2. header filter row
3. grouping expansion and collapse
4. export refinement for filtered/all rows
5. ajax/database storage adapter

