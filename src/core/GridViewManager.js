export class GridViewManager {
	constructor(grid) {
		this.grid = grid;
		this.views = new Map();
	}

	register(name, viewDefinition) {
		if (!name) {
			throw new Error('A view requires a name.');
		}

		if (!viewDefinition || typeof viewDefinition.render !== 'function') {
			throw new Error(`View "${name}" requires a render() function.`);
		}

		this.views.set(name, {
			name,
			label: viewDefinition.label || name,
			...viewDefinition
		});

		return this;
	}

	has(name) {
		return this.views.has(name);
	}

	get(name) {
		return this.views.get(name) || null;
	}

	getAll() {
		return Array.from(this.views.values());
	}

	getActiveMode() {
		const state = this.grid.store.peek();
		return state.view?.mode || 'table';
	}

	getActiveView() {
		const mode = this.getActiveMode();

		if (this.views.has(mode)) {
			return this.views.get(mode);
		}

		return this.views.get('table') || null;
	}

	render(container, viewModel) {
		const activeView = this.getActiveView();

		if (!activeView) {
			throw new Error('No active view is registered.');
		}

		activeView.render(container, this.grid, viewModel);

		return activeView;
	}
}
