function normalizeZone(zone, index, prefix) {
	if (typeof zone === 'string') {
		return {
			type: 'zone',
			key: zone,
			className: `${prefix}-zone ${prefix}-zone-${index + 1}`
		};
	}

	if (zone && typeof zone === 'object') {
		return {
			type: 'zone',
			key: zone.key,
			className: zone.className || `${prefix}-zone ${prefix}-zone-${index + 1}`
		};
	}

	throw new Error('Layout zones must be strings or objects with a key.');
}

export function createClassicLayout(options = {}) {
	const {
		rootClassName = 'mg-layout-root',
		topRowClassName = 'mg-classic-top-row',
		bottomRowClassName = 'mg-classic-bottom-row',
		viewClassName = 'mg-view-zone',
		top = ['toolbar', 'actions'],
		bottom = ['footerInfo', 'footerPaging']
	} = options;

	const children = [];

	if (Array.isArray(top) && top.length > 0) {
		children.push({
			type: 'row',
			className: topRowClassName,
			children: top.map((zone, index) => normalizeZone(zone, index, 'mg-top'))
		});
	}

	children.push({
		type: 'view',
		key: 'main',
		className: viewClassName
	});

	if (Array.isArray(bottom) && bottom.length > 0) {
		children.push({
			type: 'row',
			className: bottomRowClassName,
			children: bottom.map((zone, index) => normalizeZone(zone, index, 'mg-bottom'))
		});
	}

	return {
		type: 'stack',
		className: rootClassName,
		children
	};
}
