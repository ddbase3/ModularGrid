import { BrowserStorageStateAdapter } from './BrowserStorageStateAdapter.js';

export class LocalStorageStateAdapter extends BrowserStorageStateAdapter {
	constructor() {
		super(() => {
			if (typeof window === 'undefined') {
				return null;
			}

			return window.localStorage;
		});
	}
}
