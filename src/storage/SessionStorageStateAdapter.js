import { BrowserStorageStateAdapter } from './BrowserStorageStateAdapter.js';

export class SessionStorageStateAdapter extends BrowserStorageStateAdapter {
	constructor() {
		super(() => {
			if (typeof window === 'undefined') {
				return null;
			}

			return window.sessionStorage;
		});
	}
}
