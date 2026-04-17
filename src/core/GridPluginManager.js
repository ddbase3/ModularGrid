import { appendContent } from '../utils/dom.js';

export class GridPluginManager {
	constructor(grid) {
		this.grid = grid;
		this.plugins = [];
	}

	createContext(pluginName = null) {
		return {
			grid: this.grid,
			store: this.grid.store,
			events: this.grid.events,
			commands: this.grid.commands,

			getState: () => {
				return this.grid.getState();
			},

			peekState: () => {
				return this.grid.store.peek();
			},

			setState: (patch) => {
				this.grid.setState(patch);
				return this.grid;
			},

			execute: (commandName, payload) => {
				return this.grid.execute(commandName, payload);
			},

			requestRender: () => {
				this.grid.render();
				return this.grid;
			},

			requestReload: () => {
				return this.grid.reload();
			},

			getZone: (zoneKey) => {
				return this.grid.zones.get(zoneKey) || null;
			},

			getOptions: () => {
				return this.grid.options;
			},

			getPluginOptions: (name = pluginName) => {
				if (!name) {
					return {};
				}

				return this.grid.options.pluginOptions?.[name] || {};
			}
		};
	}

	resolvePlugin(pluginDefinition) {
		if (!pluginDefinition || typeof pluginDefinition !== 'object') {
			throw new Error('Plugins must be objects.');
		}

		if (!pluginDefinition.name) {
			throw new Error('Plugins require a unique name.');
		}

		return pluginDefinition;
	}

	resolveLayoutContributions(plugin, context) {
		if (typeof plugin.layoutContributions === 'function') {
			const contributions = plugin.layoutContributions(context) || [];
			return Array.isArray(contributions) ? contributions : [];
		}

		if (Array.isArray(plugin.layoutContributions)) {
			return plugin.layoutContributions;
		}

		return [];
	}

	resolveColumnContributions(plugin, context) {
		if (typeof plugin.columnContributions === 'function') {
			const contributions = plugin.columnContributions(context) || [];
			return Array.isArray(contributions) ? contributions : [];
		}

		if (Array.isArray(plugin.columnContributions)) {
			return plugin.columnContributions;
		}

		return [];
	}

	resolveViews(plugin, context) {
		if (typeof plugin.views === 'function') {
			const views = plugin.views(context) || [];
			return Array.isArray(views) ? views : [];
		}

		if (Array.isArray(plugin.views)) {
			return plugin.views;
		}

		return [];
	}

	async installAll(pluginDefinitions = []) {
		for (const pluginDefinition of pluginDefinitions) {
			const plugin = this.resolvePlugin(pluginDefinition);
			const context = this.createContext(plugin.name);

			if (plugin.commands && typeof plugin.commands === 'object') {
				Object.entries(plugin.commands).forEach(([commandName, handler]) => {
					this.grid.commands.register(commandName, handler);
				});
			}

			const views = this.resolveViews(plugin, context);

			views.forEach((view) => {
				if (!view || !view.name) {
					return;
				}

				this.grid.viewManager.register(view.name, view);
			});

			if (typeof plugin.install === 'function') {
				await plugin.install(context);
			}

			const layoutContributions = this.resolveLayoutContributions(plugin, context);
			const columnContributions = this.resolveColumnContributions(plugin, context);

			this.plugins.push({
				plugin,
				context,
				layoutContributions,
				columnContributions
			});
		}
	}

	getRenderColumns(baseColumns = []) {
		const startColumns = [];
		const endColumns = [];

		this.plugins.forEach((entry) => {
			(entry.columnContributions || []).forEach((contribution) => {
				if (!contribution || !contribution.column) {
					return;
				}

				if (contribution.position === 'end') {
					endColumns.push(contribution);
					return;
				}

				startColumns.push(contribution);
			});
		});

		startColumns.sort((a, b) => {
			return Number(a.order || 0) - Number(b.order || 0);
		});

		endColumns.sort((a, b) => {
			return Number(a.order || 0) - Number(b.order || 0);
		});

		return [
			...startColumns.map((entry) => entry.column),
			...baseColumns,
			...endColumns.map((entry) => entry.column)
		];
	}

	renderZone(zoneKey, container, viewModel) {
		const contributions = this.plugins
			.flatMap((entry) => {
				return entry.layoutContributions.map((contribution) => {
					return {
						contribution,
						context: entry.context,
						plugin: entry.plugin
					};
				});
			})
			.filter((entry) => {
				return entry.contribution.zone === zoneKey;
			})
			.sort((a, b) => {
				const aOrder = Number(a.contribution.order || 0);
				const bOrder = Number(b.contribution.order || 0);
				return aOrder - bOrder;
			});

		contributions.forEach(({ contribution, context }) => {
			if (typeof contribution.render !== 'function') {
				return;
			}

			const content = contribution.render({
				...context,
				viewModel,
				zone: zoneKey
			});

			appendContent(container, content);
		});
	}

	destroyAll() {
		this.plugins
			.slice()
			.reverse()
			.forEach(({ plugin, context }) => {
				if (typeof plugin.destroy === 'function') {
					plugin.destroy(context);
				}
			});

		this.plugins = [];
	}
}
