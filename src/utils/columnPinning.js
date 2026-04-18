function normalizeExplicitPinnedSide(column) {
	if (column?.pinned === 'left' || column?.pinned === 'right') {
		return column.pinned;
	}

	return '';
}

export function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
}

export function isSelectionUtilityColumn(column) {
	const key = String(column?.key || '');
	return isUtilityColumn(column) && key.includes('selection');
}

export function isRowActionsUtilityColumn(column) {
	return String(column?.key || '') === '__mg_row_actions__';
}

export function resolveEffectivePinnedSide(column) {
	if (isSelectionUtilityColumn(column)) {
		return 'left';
	}

	if (isRowActionsUtilityColumn(column)) {
		return 'right';
	}

	return normalizeExplicitPinnedSide(column);
}

export function hasPinnedDataColumns(columns) {
	return (columns || []).some((column) => {
		return !isUtilityColumn(column) && normalizeExplicitPinnedSide(column) !== '';
	});
}

export function normalizeColumnPinning(columns) {
	const nextColumns = (columns || []).map((column) => {
		return {
			...column
		};
	});

	const visibleDataColumns = nextColumns.filter((column) => {
		return column.visible !== false && !isUtilityColumn(column);
	});

	const visiblePositions = new Map(
		visibleDataColumns.map((column, index) => {
			return [column.key, index];
		})
	);

	let lastLeftPinnedVisibleIndex = -1;
	let firstRightPinnedVisibleIndex = -1;

	visibleDataColumns.forEach((column, index) => {
		const pinnedSide = normalizeExplicitPinnedSide(column);

		if (pinnedSide === 'left') {
			lastLeftPinnedVisibleIndex = index;
		}

		if (pinnedSide === 'right' && firstRightPinnedVisibleIndex === -1) {
			firstRightPinnedVisibleIndex = index;
		}
	});

	return nextColumns.map((column) => {
		if (isUtilityColumn(column) || column.visible === false) {
			return column;
		}

		const position = visiblePositions.get(column.key);
		const explicitPinnedSide = normalizeExplicitPinnedSide(column);
		let nextPinnedSide = explicitPinnedSide || null;

		if (lastLeftPinnedVisibleIndex !== -1 && position <= lastLeftPinnedVisibleIndex) {
			nextPinnedSide = 'left';
		}
		else if (firstRightPinnedVisibleIndex !== -1 && position >= firstRightPinnedVisibleIndex) {
			nextPinnedSide = 'right';
		}
		else if (explicitPinnedSide) {
			nextPinnedSide = null;
		}

		return {
			...column,
			pinned: nextPinnedSide
		};
	});
}
