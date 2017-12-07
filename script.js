const jw = {
	random: {
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
	},

	strings: {
		camelize: (str, separators = [' ', '_', '-']) => {
			let separatorIndex;
			separators.forEach(separator => {
				console.log(`Checking for the '${separator}' separator...`);
				while ((separatorIndex = str.indexOf(separator)) !== -1) {
					console.log(`Separator '${separator}' found at index ${separatorIndex}.`);
					str = str.substring(0, separatorIndex).concat(str[separatorIndex + 1].toUpperCase(), str.substring(separatorIndex + 2, str.length));
				}
			});
			return str;
		},

		concatClass: (...args) => {
			const save = Array.prototype.toString;
			Array.prototype.toString = function() {return this.join('-')};
			const result = args.toString();
			Array.prototype.toString = save;
			return result;
		},

		generateCompoundClass: function(...args) {
			if (args.length < 2) args = args[0];
			if (!$.isArray(args)) return this.concatClass(args);
			{
				let result = this.concatClass(args[0]);
				let lastClass = result;
				let currentClass;
				for (let i = 1; i < args.length; i++) {
					currentClass = lastClass + '-' + this.concatClass(args[i]);
					result += ' ' + currentClass;
					lastClass = currentClass;
				}
				return result;
			}
		},

		decamelize: (str, separator = '-') => {
			for (let i = 0; i < str.length; i++) {
				if (str[i] === str[i].toUpperCase()) {
					str = str.substring(0, i).concat(separator, str.substring(i, str.length));
					i += separator.length;
				}
			}
			return str.toLowerCase();
		}
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

class KanbanBuilder {
	constructor(ownClass, tag = 'div', classPrefix = 'kanban') {
		this.id = jw.random.getString(20);
		this.ownClass = ownClass;
		this.completeClassName = jw.strings.concatClass(classPrefix, ownClass);
		this.$element = $(`<${tag}>`).addClass(this.completeClassName).attr('id', this.id);
	}

	add$(classNames, tag = 'div', $parentElement = this.$element) {
		const jsObjectPropertyName = jw.strings.camelize(classNames[classNames.length - 1]);
		const htmlClassString = jw.strings.concatClass(this.completeClassName, jw.strings.generateCompoundClass(classNames));
		this[`\$${jsObjectPropertyName}`] = $(`<${tag}>`).$newElement.addClass(htmlClassString).appendTo($parentElement);
		return this;
	}

	addHeader() {
		return this.add$('header');
	}

	addDrag() {
		return this.add$('drag', 'button', this.$header);
	}

	addTitle(tag) {
		return this.add$('title', tag, this.$header).text('Enter ' + this.ownClass + ' title').makeEditable(this, 'title');
	}

	addRemoveButton() {
		return this.add$(['btn', `remove-${this.ownClass}`], 'button', this.$header);
	}

	setChildClass(childClass) {
		this.childClass = childClass;
		this.childrenMapName = childClass + 's';
		this[childrenMapName] = {};
		this.addChildMethodName = jw.strings.camelize(`add ${this.childClass}`);
		this.childContainerHtmlClass = jw.strings.concatClass(this.childClass, 'container');
		this.childContainerObjectProperty = '$' + jw.strings.camelize(this.childContainerHtmlClass);
		this[addChildMethodName] = function(child) {
			this[childContainerObjectProperty].append(child.$element);
			this[childrenMapName][child.id] = child;
		}
		return this;
	}

	addChildContainer(tag = 'div') {
		if (!this.childClass) return this;
		this.add$(this.childContainerHtmlClass, tag);
		this.$element.sortable({
			connectWith: `.${this.completeClassName}`
		})
		return this;
	}

	addAddChildButton(childClass) {
		if (!this.childClass) return this;
		this.add$(['btn', jw.strings.concatClass('add', this.childClass)], 'button', this.$header).click(this[addChildMethodName]);
	}

	remove() {
		if (this.parent) delete this.parent[this.ownClass + 's'][this.id];
		this.$element.remove();
	}

}

class KanbanBoard {
	constructor(container, name) {
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

$(function() {
	// const kt = new KanbanBoard($('#my-kanban'));
})
