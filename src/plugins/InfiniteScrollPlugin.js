const instanceState = new WeakMap();

function resolveOptions(context) {
	return {
		enabled: true,
		threshold: 160,
		pageSize: null,
		containerSelector: '.mg-table-scroll',
		autoFill: true,
		...context.getPluginOptions('infiniteScroll')
	};
}

function isTableMode(context) {
	return (context.peekState().view?.mode || 'table') === 'table';
}

function getLoadedRowCount(context) {
	const rows = context.peekState().data?.rows;
	return Array.isArray(rows) ? rows.length : 0;
}

function getTotalRowCount(context) {
	return Math.max(0, Number(context.peekState().data?.total) || 0);
}

function hasMoreRows(context) {
	const total = getTotalRowCount(context);
	const loaded = getLoadedRowCount(context);

	return total > 0 && loaded < total;
}

function resolvePageSize(context, options) {
	return Math.max(1, Number(options.pageSize) || Number(context.peekState().query?.pageSize) || 1);
}

function createLoaderElement() {
	const loader = document.createElement('div');
	loader.className = 'mg-infinite-loader mg-infinite-loader-hidden';

	const dots = document.createElement('div');
	dots.className = 'mg-infinite-loader-dots';

	for (let index = 0; index < 3; index += 1) {
		const dot = document.createElement('span');
		dot.className = 'mg-infinite-loader-dot';
		dots.appendChild(dot);
	}

	loader.appendChild(dots);

	return loader;
}

function ensureLoaderElement(state) {
	if (!state.loaderElement) {
		state.loaderElement = createLoaderElement();
	}

	return state.loaderElement;
}

function detachScrollBinding(state) {
	if (state.scrollElement && state.onScroll) {
		state.scrollElement.removeEventListener('scroll', state.onScroll);
	}

	if (state.loaderElement && state.loaderElement.parentNode) {
		state.loaderElement.parentNode.removeChild(state.loaderElement);
	}

	state.scrollElement = null;
	state.onScroll = null;
}

function updateLoaderVisibility(context, state) {
	const loader = ensureLoaderElement(state);
	const showLoader = (state.requestPending || context.peekState().data?.loadingMore === true) && hasMoreRows(context);

	loader.classList.toggle('mg-infinite-loader-hidden', !showLoader);
}

function restoreScrollPosition(state) {
	if (!(state.scrollElement instanceof HTMLElement)) {
		return;
	}

	if (!Number.isFinite(state.pendingScrollTop)) {
		return;
	}

	const targetScrollTop = Math.max(0, Number(state.pendingScrollTop) || 0);

	state.scrollElement.scrollTop = targetScrollTop;

	if (state.restoreFrame) {
		window.cancelAnimationFrame(state.restoreFrame);
	}

	state.restoreFrame = window.requestAnimationFrame(() => {
		state.restoreFrame = null;

		if (!(state.scrollElement instanceof HTMLElement)) {
			state.pendingScrollTop = null;
			return;
		}

		state.scrollElement.scrollTop = targetScrollTop;
		state.pendingScrollTop = null;
	});
}

function requestNextPage(context, state, options) {
	if (state.requestPending) {
		return;
	}

	if (!isTableMode(context)) {
		return;
	}

	if (!hasMoreRows(context)) {
		updateLoaderVisibility(context, state);
		return;
	}

	const gridState = context.peekState();

	if (gridState.data?.loading || gridState.data?.loadingMore) {
		updateLoaderVisibility(context, state);
		return;
	}

	state.requestPending = true;
	state.pendingScrollTop = state.scrollElement instanceof HTMLElement
		? state.scrollElement.scrollTop
		: null;

	updateLoaderVisibility(context, state);

	Promise.resolve(context.execute('loadMore', {
		pageSize: resolvePageSize(context, options)
	})).finally(() => {
		state.requestPending = false;
		scheduleRefresh(context, state, options);
	});
}

function evaluateScrollPosition(context, state, options, allowAutoFill = false) {
	if (!(state.scrollElement instanceof HTMLElement)) {
		return;
	}

	if (!isTableMode(context)) {
		return;
	}

	if (state.requestPending) {
		return;
	}

	if (!hasMoreRows(context)) {
		updateLoaderVisibility(context, state);
		return;
	}

	const threshold = Math.max(0, Number(options.threshold) || 0);
	const remaining = state.scrollElement.scrollHeight - state.scrollElement.scrollTop - state.scrollElement.clientHeight;
	const shouldLoadByScroll = remaining <= threshold;
	const shouldLoadByAutoFill = allowAutoFill === true
		&& options.autoFill !== false
		&& state.scrollElement.scrollHeight <= state.scrollElement.clientHeight + threshold;

	if (shouldLoadByScroll || shouldLoadByAutoFill) {
		requestNextPage(context, state, options);
	}
}

function bindScrollElement(context, state, options) {
	if (!context.grid.viewContainer || !isTableMode(context)) {
		detachScrollBinding(state);
		return;
	}

	const nextScrollElement = context.grid.viewContainer.querySelector(options.containerSelector);

	if (!(nextScrollElement instanceof HTMLElement)) {
		detachScrollBinding(state);
		return;
	}

	if (state.scrollElement !== nextScrollElement) {
		detachScrollBinding(state);

		state.scrollElement = nextScrollElement;
		state.scrollElement.classList.add('mg-infinite-scroll-container');

		state.onScroll = () => {
			evaluateScrollPosition(context, state, options, false);
		};

		state.scrollElement.addEventListener('scroll', state.onScroll, {
			passive: true
		});
	}

	const loader = ensureLoaderElement(state);

	if (loader.parentNode !== state.scrollElement) {
		state.scrollElement.appendChild(loader);
	}

	updateLoaderVisibility(context, state);
	restoreScrollPosition(state);
	evaluateScrollPosition(context, state, options, true);
}

function scheduleRefresh(context, state, options) {
	if (state.refreshFrame) {
		window.cancelAnimationFrame(state.refreshFrame);
	}

	state.refreshFrame = window.requestAnimationFrame(() => {
		state.refreshFrame = null;
		bindScrollElement(context, state, options);
	});
}

export const InfiniteScrollPlugin = {
	name: 'infiniteScroll',

	install(context) {
		const options = resolveOptions(context);
		const state = {
			scrollElement: null,
			onScroll: null,
			loaderElement: null,
			refreshFrame: null,
			restoreFrame: null,
			requestPending: false,
			pendingScrollTop: null,
			unsubscribers: []
		};

		instanceState.set(context.grid, state);

		if (options.enabled === false) {
			return;
		}

		const schedule = () => {
			scheduleRefresh(context, state, options);
		};

		state.unsubscribers.push(
			context.events.on('grid:init', schedule),
			context.events.on('state:changed', schedule),
			context.events.on('data:loading', schedule),
			context.events.on('data:loaded', schedule),
			context.events.on('data:error', schedule),
			context.events.on('view:changed', schedule)
		);

		schedule();
	},

	destroy(context) {
		const state = instanceState.get(context.grid);

		if (!state) {
			return;
		}

		if (state.refreshFrame) {
			window.cancelAnimationFrame(state.refreshFrame);
		}

		if (state.restoreFrame) {
			window.cancelAnimationFrame(state.restoreFrame);
		}

		(state.unsubscribers || []).forEach((unsubscribe) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		detachScrollBinding(state);
		instanceState.delete(context.grid);
	}
};
