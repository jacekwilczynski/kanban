const jw = {
	random: {
		getInteger: (min = 0, max = 1) => Math.floor(Math.random() * (max - min + 1) + min),
		getString: (targetLength, components) => {
			targetLength = targetLength || 10;
			components = components || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
			let result = '';
			for (let i = 0; i < targetLength; i++) {
				result += components[jw.random.getInteger(0, components.length)];
			}
			return result;
		}
	},

	strings: {
		camelize: (str, separators = [' ', '_', '-']) => {
			let separatorIndex;
			separators.forEach(separator => {
				// console.log(`Checking for the '${separator}' separator...`);
				while ((separatorIndex = str.indexOf(separator)) !== -1) {
					// console.log(`Separator '${separator}' found at index ${separatorIndex}.`);
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
			if (this.data('auto-select')) this.selectText();
		})
		.blur(event => linkedObject[linkedProperty] = $(event.target).text());
}

class KanbanBuilder {
	constructor(ownClass, tag = 'div', classPrefix = 'kanban') {
		this.id = jw.random.getString(20);
		this.ownClass = ownClass;
		this.classPrefix = classPrefix;
		this.completeClassName = jw.strings.concatClass(classPrefix, ownClass);
		this.$element = $(`<${tag}>`).addClass(this.completeClassName).attr('id', this.id).fadeIn();
	}

	add$(classNames, tag = 'div', $parentElement = this.$element) {
		let lastClassName;
		if ($.isArray(classNames)) {
			lastClassName = classNames[classNames.length - 1];
			classNames[0] = jw.strings.concatClass(this.classPrefix, classNames[0]);
		} else {
			lastClassName = classNames;
			classNames = jw.strings.concatClass(this.classPrefix, classNames);
		}
		const jsObjectPropertyName = jw.strings.camelize(lastClassName);
		const htmlClassString = jw.strings.generateCompoundClass(classNames);
		return this[`\$${jsObjectPropertyName}`] = $(`<${tag}>`).addClass(htmlClassString).appendTo($parentElement);
	}

	addHeader(tag = 'div') {
		this.add$('header', tag);
		return this;
	}

	addDrag() {
		this.add$('drag', 'span', this.$header).addClass('fa fa-bars');
		return this;
	}

	addTitle(tag = 'span') {
		this.add$('title', tag, this.$header).text('Enter ' + this.ownClass + ' title').makeEditable(this, 'title').selectText();
		return this;
	}

	addRemoveButton() {
		this.add$(['btn', `remove-${this.ownClass}`], 'button', this.$header)
			.addClass('fa fa-trash-o')
			.click(() => this.remove());
		return this;
	}

	setChildClass(childClass) {
		this.childClass = childClass;
		this.childrenMapName = childClass + 's';
		this[this.childrenMapName] = {};
		this.addChildMethodName = jw.strings.camelize(`add ${this.childClass}`);
		this.childContainerHtmlClass = jw.strings.concatClass(this.childClass, 'container');
		this.completeChildContainerHtmlClass = jw.strings.concatClass(this.classPrefix, this.childContainerHtmlClass);
		// console.log('childContainerHtmlClass: ' + this.childContainerHtmlClass);
		this.childContainerObjectProperty = '$' + jw.strings.camelize(this.childContainerHtmlClass);
		// console.log('childContainerObjectProperty: ' + this.childContainerObjectProperty);
		this[this.addChildMethodName] = child => {
			// console.log(this.childContainerObjectProperty);
			this[this.childContainerObjectProperty].append(child.$element);
			this[this.childrenMapName][child.id] = child;
		};
		return this;
	}

	addChildContainer(tag = 'div') {
		if (!this.childClass) return this;
		// console.log('Adding child container for ' + this.childClass + ' elements.');
		console.log('Child container class: ' + this.childContainerHtmlClass);
		this.add$(this.childContainerHtmlClass, tag).sortable({
			connectWith: `.${this.completeChildContainerHtmlClass}`,
			handle: `.${this.classPrefix}-drag`
		});
		// console.log(this);
		return this;
	}

	addAddChildButton() {
		if (!this.childClass) return this;
		// console.log(`${this.ownClass}.addChildMethodName: ${this.addChildMethodName}\n`);
		// console.log(this[this.addChildMethodName]);
		this.add$(['btn', jw.strings.concatClass('add', this.childClass)], 'button', this.$header)
			.addClass('fa fa-plus-square')
			.click(() => this[this.addChildMethodName](kanbanFactory.build(this.childClass)))
		return this;
	}

	remove() {
		// console.log(`Attempting removal of ${this.ownClass}.`);
		this.$element.fadeOut(this.$element.remove);
		if (this.parent) delete this.parent[this.ownClass + 's'][this.id];
	}

}

const kanbanFactory = {
	build: objectClass => {
		switch (objectClass) {
			case 'board':
				return new KanbanBuilder('board')
					.setChildClass('column')
					.addHeader('h1')
					.addTitle()
					.addAddChildButton()
					.addChildContainer();
			case 'column':
				return new KanbanBuilder('column')
					.setChildClass('card')
					.addHeader('h2')
					.addDrag()
					.addTitle()
					.addRemoveButton()
					.addAddChildButton()
					.addChildContainer();
			case 'card':
				return new KanbanBuilder('card')
					.addHeader('h3')
					.addDrag()
					.addTitle()
					.addRemoveButton();
		}
	}
}

$(function() {
	const kt = kanbanFactory.build('board')
	kt.$element.appendTo('#my-kanban');
	console.log(kt);
})
