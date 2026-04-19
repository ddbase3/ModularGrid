function getDropdownStateStore(grid) {
	if (!grid) {
		return {};
	}

	if (!grid._mgDropdownState) {
		grid._mgDropdownState = {};
	}

	return grid._mgDropdownState;
}

function getContextRect(trigger, grid) {
	const margin = 8;
	const tableScroll = trigger?.closest?.('.mg-table-scroll');

	if (tableScroll instanceof HTMLElement) {
		return tableScroll.getBoundingClientRect();
	}

	if (grid?.container instanceof HTMLElement) {
		return grid.container.getBoundingClientRect();
	}

	return {
		top: margin,
		right: window.innerWidth - margin,
		bottom: window.innerHeight - margin,
		left: margin,
		width: Math.max(0, window.innerWidth - (margin * 2)),
		height: Math.max(0, window.innerHeight - (margin * 2))
	};
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(value, max));
}

function resolveHorizontalAlignment(triggerRect, menuWidth, preferredAlign) {
	const margin = 8;
	const availableStart = window.innerWidth - margin - triggerRect.left;
	const availableEnd = triggerRect.right - margin;
	let align = preferredAlign === 'start' ? 'start' : 'end';

	if (align === 'start' && menuWidth > availableStart && availableEnd > availableStart) {
		align = 'end';
	}

	if (align === 'end' && menuWidth > availableEnd && availableStart > availableEnd) {
		align = 'start';
	}

	return align;
}

function positionFloatingDropdown(details, summary, menu, grid, preferredAlign = 'end') {
	if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
		return;
	}

	if (!details.open) {
		return;
	}

	const margin = 8;
	const gap = 4;
	const triggerRect = summary.getBoundingClientRect();
	const contextRect = getContextRect(summary, grid);

	menu.classList.add('mg-dropdown-menu-floating');
	menu.style.position = 'fixed';
	menu.style.left = '0px';
	menu.style.top = '0px';
	menu.style.maxHeight = '';
	menu.style.overflowY = 'auto';

	const menuWidth = Math.ceil(menu.offsetWidth || parseFloat(window.getComputedStyle(menu).minWidth) || 180);
	const align = resolveHorizontalAlignment(triggerRect, menuWidth, preferredAlign);

	const availableBelow = Math.max(
		80,
		Math.min(window.innerHeight - margin, contextRect.bottom - margin) - (triggerRect.bottom + gap)
	);

	const availableAbove = Math.max(
		80,
		triggerRect.top - Math.max(margin, contextRect.top + margin) - gap
	);

	const openUpward = availableBelow < 220 && availableAbove > availableBelow;
	const availableHeight = openUpward ? availableAbove : availableBelow;
	const contextHeightLimit = Math.max(160, Math.floor((contextRect.height || window.innerHeight) - (margin * 2)));
	const maxHeight = Math.max(120, Math.min(availableHeight, contextHeightLimit));

	menu.style.maxHeight = `${Math.round(maxHeight)}px`;
	menu.style.overflowY = 'auto';

	const measuredHeight = Math.min(Math.ceil(menu.offsetHeight || maxHeight), maxHeight);

	let left = align === 'start'
		? triggerRect.left
		: triggerRect.right - menuWidth;

	left = clamp(left, margin, window.innerWidth - margin - menuWidth);

	let top = openUpward
		? triggerRect.top - gap - measuredHeight
		: triggerRect.bottom + gap;

	top = clamp(top, margin, window.innerHeight - margin - measuredHeight);

	menu.style.left = `${Math.round(left)}px`;
	menu.style.top = `${Math.round(top)}px`;
	menu.style.maxHeight = `${Math.round(maxHeight)}px`;
	menu.dataset.mgDropdownAlign = align;
	menu.dataset.mgDropdownVertical = openUpward ? 'up' : 'down';
}

export function isFloatingDropdownOpen(grid, stateKey) {
	if (!grid || !stateKey) {
		return false;
	}

	return getDropdownStateStore(grid)[stateKey] === true;
}

export function setFloatingDropdownOpenState(grid, stateKey, isOpen) {
	if (!grid || !stateKey) {
		return;
	}

	getDropdownStateStore(grid)[stateKey] = isOpen === true;
}

export function attachFloatingDropdown(details, {
		grid,
		summary,
		menu,
		preferredAlign = 'end',
		stateKey = ''
}) {
	if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
		return details;
	}

	let rafId = 0;
	let listenersAttached = false;

	const requestPosition = () => {
		window.cancelAnimationFrame(rafId);
		rafId = window.requestAnimationFrame(() => {
			positionFloatingDropdown(details, summary, menu, grid, preferredAlign);
		});
	};

	const onViewportChange = () => {
		requestPosition();
	};

	const attachViewportListeners = () => {
		if (listenersAttached) {
			return;
		}

		listenersAttached = true;
		window.addEventListener('resize', onViewportChange);
		window.addEventListener('scroll', onViewportChange, true);
	};

	const detachViewportListeners = () => {
		if (!listenersAttached) {
			return;
		}

		listenersAttached = false;
		window.removeEventListener('resize', onViewportChange);
		window.removeEventListener('scroll', onViewportChange, true);
	};

	details.addEventListener('toggle', () => {
		if (stateKey) {
			setFloatingDropdownOpenState(grid, stateKey, details.open);
		}

		if (details.open) {
			attachViewportListeners();
			requestPosition();
		}
		else {
			detachViewportListeners();
			menu.classList.remove('mg-dropdown-menu-floating');
		}
	});

	details.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	summary.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	if (stateKey && isFloatingDropdownOpen(grid, stateKey)) {
		details.open = true;
		attachViewportListeners();
		requestPosition();
	}

	return details;
}
