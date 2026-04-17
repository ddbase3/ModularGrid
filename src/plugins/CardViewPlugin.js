import { CardView } from '../views/CardView.js';

export const CardViewPlugin = {
	name: 'cardView',

	views: [
		{
			name: 'cards',
			label: 'Cards',
			render: new CardView().render.bind(new CardView())
		}
	]
};
