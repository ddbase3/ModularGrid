import { createStorageStatePlugin } from './createStorageStatePlugin.js';
import { SessionStorageStateAdapter } from '../storage/SessionStorageStateAdapter.js';

export const SessionStoragePlugin = createStorageStatePlugin({
	name: 'sessionStorage',
	createDefaultAdapter() {
		return new SessionStorageStateAdapter();
	}
});
