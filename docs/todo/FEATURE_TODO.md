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
- [ ] Add a formal view manager
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
- [ ] Server-side paging strategy
- [ ] Server-side sorting strategy
- [ ] Server-side search strategy
- [ ] Server-side filter strategy
- [ ] Hybrid client/server processing strategy

---

# 3. Rendering and templating

- [x] Overridable cell rendering
- [x] Overridable header rendering
- [~] Free layout composition
- [~] Formal row renderer extension point
- [ ] Formal header row renderer extension point
- [ ] Formal filter row renderer extension point
- [ ] Formal group row renderer extension point
- [ ] Formal summary row renderer extension point
- [ ] Renderer registry instead of ad-hoc render callbacks

---

# 4. Column features

- [x] Column visibility plugin
- [ ] Column pinning left
- [ ] Column pinning right
- [ ] Column width configuration
- [ ] Column resize by drag handle
- [ ] Column reorder by drag and drop
- [ ] Column header menu
- [ ] Column-specific sort strategies
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
- [ ] Custom sort strategy support

---

# 6. Filtering and searching

- [x] Basic global search
- [x] Move global search into a plugin
- [ ] Column filter plugin foundation
- [ ] Header filter row
- [ ] External filters
- [ ] Synchronization between header filters and external filters
- [ ] Basic text filter
- [ ] Select filter
- [ ] Date range filter plugin
- [ ] Custom filter plugin API
- [~] Filter persistence
- [ ] Saved filter configurations

---

# 7. Paging and loading strategies

- [x] Page-based paging
- [x] Replace built-in paging UI with plugin-based paging UI
- [x] Alternative page size UI via plugin
- [ ] Infinite scroll / auto paging
- [~] Pluggable paging controls

---

# 8. Selection and row actions

- [x] Selection plugin
- [x] Checkbox first column
- [~] Select all / clear selection
- [~] Bulk action toolbar
- [x] Row actions plugin
- [x] Three-dot row menu
- [~] Row menu extension mechanism

---

# 9. Grouping and hierarchical display

- [ ] Grouping plugin
- [ ] Group by one field
- [ ] Group by multiple fields
- [ ] Aggregate other fields automatically
- [ ] Expand / collapse groups
- [ ] Group summary rendering
- [ ] Custom aggregation strategies

---

# 10. Row expansion and detail behavior

- [ ] Expandable row details
- [ ] Custom detail renderer
- [ ] Row click action abstraction
- [ ] Dialog integration option
- [ ] Inline detail expansion option

---

# 11. Views

- [x] Basic table view
- [ ] View manager
- [ ] Card view
- [ ] Responsive mobile card mode
- [ ] Detail split view
- [ ] Chart view
- [ ] View switching control
- [ ] Separate detail pane rendering

---

# 12. Responsive behavior

- [~] Basic mobile-safe layout behavior
- [ ] Responsive cards plugin
- [ ] Adaptive column hiding strategy
- [ ] Narrow viewport table strategy
- [ ] Detail-first responsive strategy

---

# 13. Persistence and saved configurations

- [ ] Storage adapter contract
- [x] Local storage plugin
- [ ] Session storage plugin
- [ ] Ajax/database storage plugin
- [~] Persisted filters
- [x] Persisted sorting
- [x] Persisted column visibility
- [ ] Persisted layout/view settings
- [ ] Saved named grid configurations

---

# 14. Export

- [ ] Export plugin
- [ ] Export all rows
- [ ] Export filtered rows
- [ ] Export selected rows
- [ ] Export with selected columns
- [ ] CSV export
- [ ] JSON export
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

- [ ] Zebra rows option
- [ ] Long text display strategies
- [ ] Ellipsis strategy
- [ ] Multi-line wrapping strategy
- [ ] Clamp / expand strategy
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
- [ ] Reset filters
- [x] Reset sorting
- [ ] Reset grouping
- [x] Reset column visibility
- [~] Reset complete grid state

---

# 19. Menus and extensibility points

- [ ] Header menu plugin
- [ ] Header menu contributions by plugins
- [x] Row menu contributions by plugins
- [x] Toolbar contributions by plugins
- [x] Footer contributions by plugins
- [x] Column contributions by plugins

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
- [ ] Card view demo
- [ ] Grouping demo
- [ ] Export demo

---

# Recommended next implementation order

The next good steps are:

1. storage adapter abstraction
2. view manager and card view
3. header menu foundation
4. grouping
5. export
