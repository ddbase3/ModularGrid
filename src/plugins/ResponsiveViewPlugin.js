function resolveOptions(context) {
	return {
		breakpoint: 920,
		narrowMode: 'cards',
		wideModeFallback: 'table',
		...context.getPluginOptions('responsiveView')
	};
}

export const ResponsiveViewPlugin = {
	name: 'responsiveView',

	install(context) {
		const options = resolveOptions(context);
		const container = context.grid.container;
		const narrowMode = options.narrowMode;
		let lastWideMode = context.peekState().view?.mode || options.wideModeFallback;
		let isCurrentlyNarrow = null;

		function getWidth() {
			return container.clientWidth || window.innerWidth || 0;
		}

		function enforceMode() {
			const width = getWidth();
			const shouldBeNarrow = width <= Number(options.breakpoint || 0);
			const currentMode = context.peekState().view?.mode || 'table';

			if (isCurrentlyNarrow === null) {
				isCurrentlyNarrow = shouldBeNarrow;

				if (shouldBeNarrow) {
					if (currentMode !== narrowMode) {
						lastWideMode = currentMode;
					}

					if (currentMode !== narrowMode && context.grid.viewManager.has(narrowMode)) {
						context.execute('setViewMode', narrowMode);
					}
				} else if (currentMode !== narrowMode) {
					lastWideMode = currentMode;
				}

				return;
			}

			if (shouldBeNarrow === isCurrentlyNarrow) {
				return;
			}

			if (shouldBeNarrow) {
				isCurrentlyNarrow = true;

				if (currentMode !== narrowMode) {
					lastWideMode = currentMode;
				}

				if (currentMode !== narrowMode && context.grid.viewManager.has(narrowMode)) {
					context.execute('setViewMode', narrowMode);
				}

				return;
			}

			isCurrentlyNarrow = false;

			if (currentMode === narrowMode && context.grid.viewManager.has(lastWideMode)) {
				context.execute('setViewMode', lastWideMode);
			}
		}

		const cleanup = [];

		cleanup.push(
			context.events.on('grid:init', () => {
				enforceMode();
			})
		);

		cleanup.push(
			context.events.on('view:changed', ({ mode }) => {
				if (isCurrentlyNarrow === true) {
					if (mode !== narrowMode && context.grid.viewManager.has(narrowMode)) {
						requestAnimationFrame(() => {
							context.execute('setViewMode', narrowMode);
						});
					}

					return;
				}

				if (mode !== narrowMode) {
					lastWideMode = mode;
				}
			})
		);

		if (typeof ResizeObserver !== 'undefined') {
			const observer = new ResizeObserver(() => {
				enforceMode();
			});

			observer.observe(container);

			cleanup.push(() => {
				observer.disconnect();
			});
		} else {
			const onResize = () => {
				enforceMode();
			};

			window.addEventListener('resize', onResize);

			cleanup.push(() => {
				window.removeEventListener('resize', onResize);
			});
		}

		context._responsiveViewCleanup = cleanup;
	},

	destroy(context) {
		const cleanup = context._responsiveViewCleanup || [];

		cleanup.forEach((unsubscribe) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		context._responsiveViewCleanup = [];
	}
};
