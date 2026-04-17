export class ArrayAdapter {
	constructor(rows = []) {
		this.setRows(rows);
	}

	setRows(rows) {
		this.rows = Array.isArray(rows) ? rows.slice() : [];
	}

	async load() {
		return {
			rows: this.rows.slice(),
			total: this.rows.length
		};
	}
}
