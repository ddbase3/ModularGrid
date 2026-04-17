import { clearElement, createElement } from '../utils/dom.js';

export function createDefaultLayout() {
	return {
		type: 'stack',
		className: 'mg-layout-root',
		children: [
			{
				type: 'view',
				key: 'main',
				className: 'mg-view-zone'
			}
		]
	};
}

export class GridLayoutEngine {
	render(container, layout) {
		clearElement(container);

		const zones = new Map();
		let viewContainer = null;

		const root = this.createNode(layout, zones, (element) => {
			viewContainer = element;
		});

		container.appendChild(root);

		return {
			root,
			zones,
			viewContainer
		};
	}

	createNode(node, zones, onViewFound) {
		const type = node?.type;

		if (type === 'stack' || type === 'column') {
			const element = createElement('div', `mg-layout-stack ${node.className || ''}`.trim());

			(node.children || []).forEach((child) => {
				element.appendChild(this.createNode(child, zones, onViewFound));
			});

			return element;
		}

		if (type === 'row') {
			const element = createElement('div', `mg-layout-row ${node.className || ''}`.trim());

			(node.children || []).forEach((child) => {
				element.appendChild(this.createNode(child, zones, onViewFound));
			});

			return element;
		}

		if (type === 'zone') {
			const element = createElement('div', `mg-zone ${node.className || ''}`.trim());

			if (!node.key) {
				throw new Error('Layout zone nodes require a key.');
			}

			element.dataset.zone = node.key;
			zones.set(node.key, element);

			return element;
		}

		if (type === 'view') {
			const element = createElement('div', `mg-view ${node.className || ''}`.trim());

			element.dataset.view = node.key || 'main';
			onViewFound(element);

			return element;
		}

		throw new Error(`Unsupported layout node type "${type}".`);
	}
}
