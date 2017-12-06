const random = {
	getInteger: (min = 0, max = 1) => Math.floor(Math.random() * (max - min + 1) + min),
	getString: (targetLength, components) => {
		targetLength = targetLength || 10;
		components = components || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		let result = '';
		for (let i = 0; i < targetLength; i++) {
			result += components[random.getInteger(0, components.length)];
		}
		return result;
	}
}

/*const matchByType = (array, ...pairings) => {
	let result = {};
	for (pairing in pairings) {
		const variableName = Object.keys(pairing)[0];
		const variableType = pairing[variableName];
		
	}
}*/

$.fn.selectText = function() {
	var range, selection;
	setTimeout(() => {
		this.each(function() {
			if (document.body.createTextRange) {
				range = document.body.createTextRange();
				range.moveToElementText(this);
				range.select();
			} else if (window.getSelection) {
				selection = window.getSelection();
				range = document.createRange();
				range.selectNodeContents(this);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		})
	}, 5);
	return this;
}

$.fn.makeEditable = function(linkedObject, linkedProperty, autoSelect = true) {
	return this.text(linkedObject[linkedProperty])
		.attr('contenteditable', 'true')
		.data('auto-select', autoSelect)
		.keydown(event => {
		switch (event.key) {
			case 'Enter':
			linkedObject[linkedProperty] = $(event.target).text();
			case 'Escape':
			$(event.target).text(linkedObject[linkedProperty]);
				// Losing focus should take place in all above cases, hence no "break" statements above here
				$(event.target).blur();
				break;
			}
		})
		.focus(event => {
			const $element = $(event.target);
			if ($element.data('auto-select')) $element.selectText();
		})
		.blur(event => linkedObject[linkedProperty] = $(event.target).text());
}

class KanbanBoard {
	constructor(container, name) {
		this.id = random.getString(20);
		this.name = name;
		this.columns = [];
		this.generateHTML();
		if (container) this.$element.prependTo(container);
		if (!this.name) this.$title.text('Enter board name').selectText();
	}

	generateHTML() {
		this.$element = $('<div>')
			.addClass('kanban-board')
			.attr('id', this.id);
		this.$title = $('<h1>')
			.addClass('kanban-board-title')
			.makeEditable(this, 'name')
			.appendTo(this.$element);
		this.$controls = $('<div>')
			.addClass('kanban-board-controls')
			.appendTo(this.$element);
		this.$btnAddColumn = $('<button>')
			.addClass('kanban-btn kanban-btn-add-column')
			.html('<i class="fa fa-lg fa-plus-square">')
			.click(() => this.addColumn(new KanbanColumn()))
			.appendTo(this.$controls);
		this.$columnContainer = $('<ul>')
			.addClass('kanban-board-column-container')
			.sortable({
				handle: '.kanban-drag-column',
				revert: true,
				tolerance: 'pointer'
			})
			.appendTo(this.$element);
		return this.$element;
	}

	addColumn(column) {
		this.columns.push(column);
		column.parent = this;
		this.$columnContainer.append(column.$element);
	}
}

class KanbanColumn {
	constructor(name) {
		this.id = random.getString(20);
		this.name = name;
		this.cards = [];
		this.generateHTML();
		if (!this.name) this.$title.text('Enter column name').selectText();
	}

	generateHTML() {
		this.$element = $('<li>')
			.addClass('kanban-column')
			.attr('id', this.id)
		this.$header = $('<div>')
			.addClass('kanban-column-header')
			.appendTo(this.$element);
		this.$dragIcon = $('<div>')
			.addClass('kanban-drag kanban-drag-column')
			.html('<i class="fa fa-lg fa-bars">')
			.appendTo(this.$header);
		this.$title = $('<h2>')
			.addClass('kanban-column-title')
			.makeEditable(this, 'name')
			.appendTo(this.$header);
		this.$controls = $('<div>')
			.addClass('kanban-column-controls')
			.appendTo(this.$element);
		this.$btnAddCard = $('<button>')
			.addClass('kanban-btn kanban-btn-add-card')
			.html('<i class="fa fa-lg fa-plus-square">')
			.appendTo(this.$controls);
		this.$btnRemoveColumn = $('<button>')
			.addClass('kanban-btn kanban-btn-remove-column')
			.html('<i class="fa fa-lg fa-trash-o">')
			.click(this.remove.bind(this))
			.appendTo(this.$controls)
		this.$cardContainer = $('<div>')
			.addClass('kanban-column-card-container')
			.appendTo(this.$element);
		return this.$element;
	}

	addCard(card) {
		this.cards.push(card);
		card.parent = this;
		this.$cardContainer.append(card.$element);
	}

	remove() {
		this.$element.remove();
		this.parent.columns = this.parent.columns.filter(item => item != this);
	}
}

const kt = new KanbanBoard($('#my-kanban'));