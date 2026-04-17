function isPlainObject(value) {
	if (value === null || typeof value !== 'object') {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);

	return prototype === Object.prototype || prototype === null;
}

export function cloneValue(value) {
	if (Array.isArray(value)) {
		return value.map(cloneValue);
	}

	if (isPlainObject(value)) {
		const result = {};

		Object.keys(value).forEach((key) => {
			result[key] = cloneValue(value[key]);
		});

		return result;
	}

	return value;
}

export function deepMerge(target, source) {
	const base = cloneValue(target);

	if (!isPlainObject(source)) {
		return cloneValue(source);
	}

	Object.keys(source).forEach((key) => {
		const sourceValue = source[key];
		const targetValue = base[key];

		if (Array.isArray(sourceValue)) {
			base[key] = sourceValue.map(cloneValue);
			return;
		}

		if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
			base[key] = deepMerge(targetValue, sourceValue);
			return;
		}

		if (isPlainObject(sourceValue)) {
			base[key] = deepMerge({}, sourceValue);
			return;
		}

		base[key] = sourceValue;
	});

	return base;
}
