import { CardView } from '../views/CardView.js';

export const CardViewPlugin = {
	name: 'cardView',

	views(context) {
		return [
			{
				name: 'cards',
				label: context.getString('cards'),
				render: new CardView().render.bind(new CardView())
			}
		];
	}
};
