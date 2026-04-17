export function clearElement(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

export function appendContent(target, content) {
	if (content === null || content === undefined || content === false) {
		return;
	}

	if (Array.isArray(content)) {
		content.forEach((item) => appendContent(target, item));
		return;
	}

	if (content instanceof Node) {
		target.appendChild(content);
		return;
	}

	target.appendChild(document.createTextNode(String(content)));
}

export function createElement(tagName, className = '') {
	const element = document.createElement(tagName);

	if (className) {
		element.className = className;
	}

	return element;
}
