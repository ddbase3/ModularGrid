import { SplitDetailView } from '../views/SplitDetailView.js';

const splitDetailViewInstance = new SplitDetailView();

export const SplitDetailViewPlugin = {
	name: 'splitDetailView',

	install(context) {
		const state = context.peekState();

		if (!state.splitDetailView) {
			context.setState({
				splitDetailView: {
					selectedRowId: null
				}
			});
		}
	},

	commands: {
		setSplitDetailRow(context, payload) {
			context.setState({
				splitDetailView: {
					selectedRowId: payload
				}
			});

			context.events.emit('splitDetailView:changed', {
				grid: context.grid,
				selectedRowId: payload
			});

			return context.grid;
		}
	},

	views: [
		{
			name: 'split',
			label: 'Split',
			render: splitDetailViewInstance.render.bind(splitDetailViewInstance)
		}
	]
};
