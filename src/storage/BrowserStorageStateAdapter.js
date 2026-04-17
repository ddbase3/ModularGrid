export class BrowserStorageStateAdapter {
	constructor(storageResolver) {
		this.storageResolver = storageResolver;
	}

	getStorage() {
		const storage = typeof this.storageResolver === 'function'
			? this.storageResolver()
			: this.storageResolver;

		if (!storage) {
			throw new Error('Browser storage is not available.');
		}

		return storage;
	}

	read(key) {
		const storage = this.getStorage();
		const raw = storage.getItem(key);

		if (!raw) {
			return null;
		}

		return JSON.parse(raw);
	}

	write(key, value) {
		const storage = this.getStorage();
		storage.setItem(key, JSON.stringify(value));
		return true;
	}

	remove(key) {
		const storage = this.getStorage();
		storage.removeItem(key);
		return true;
	}
}
