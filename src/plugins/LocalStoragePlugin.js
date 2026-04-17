import { createStorageStatePlugin } from './createStorageStatePlugin.js';
import { LocalStorageStateAdapter } from '../storage/LocalStorageStateAdapter.js';

export const LocalStoragePlugin = createStorageStatePlugin({
	name: 'localStorage',
	createDefaultAdapter() {
		return new LocalStorageStateAdapter();
	}
});
