const random = {
	getInteger: (min = 0, max = 1) => Math.floor(Math.random() * (max - min + 1) + min),
	getString: (targetLength, components) => {
		targetLength = targetLength || 10;
		components = components || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		let result = '';
		for (let i = 0; i < targetLength; i++) {
			result += components[random.getInteger(0, components.length - 1)];
		}
		return result;
	}
};

const hyphenate = (...args) => {
	const save = Array.prototype.toString;
	Array.prototype.toString = function() {return this.join('-')};
	const result = args.toString();
	Array.prototype.toString = save;
	return result;
}

const prefixClassNames = (classNames, prefix) => $.isArray(classNames)
	? classNames.reduce((a, c) => a + ' ' + hyphenate(prefix, c), '')
	: hyphenate(prefix, classNames);

$.fn.exists = function() {
	return this.length > 0;
}

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

$.fn.makeEditable = function(onblur, autoSelect = true) {
	return this.attr('contenteditable', 'true')
		.data('auto-select', autoSelect)
		.keydown(event => {
			if (event.key === 'Escape' || event.key === 'Enter') {
				if (event.key === 'Escape') this.text(this.data('backup-value'));
				$(event.target).blur();
			}
		})
		.blur(() => onblur(this.text()))
		.focus(() => {
			this.data('backup-value', this.text());
			if (this.data('auto-select')) this.selectText();
		});
}

class KanbanBuilder {
	constructor(template) {
		// Assign default properties
		this.id = random.getString(10);
		this.ownClass = '';
		this.tag = 'div';
		this.classPrefix = 'kanban';
		Object.defineProperty(this, 'process', {value: 'creatingNew', writable: true, enumerable: false});

		// Overwrite those properties that were passed in the argument
		Object.assign(this, template);

		// Create main element
		this.add$({
			classNames: this.ownClass,
			tag: this.tag,
			parent: null,
			jsObjectProperty: '$element'})
			.attr('id', this.id)
			.fadeIn();

		if (this.process === 'creatingNew') kanbanLocalStorage.post(this.id, this);
	}

	/**
	* add$ - adds new jQuery element to this object
	*
	* @params
	*     config (Object): {
	*         classNames (string or array of strings):
	*             - the class name(s) the new element is supposed to have,
	*         jsObjectProperty (string):
	*             - the name the new element will be accessible by in this object
	*               Example:
	*                   if (jsObjectProperty == '$header')
	*                       the object will be accessible as this.$header
	*               If undefined, no property in this will be created (only the jQuery object),
	*         parent (jQuery or DOM element):
	*             - the element to append the new element to, or:
	*                 - undefined - default = this.$element,
	*                 - null - don't append to anything,
	*         tag (string):
	*             - the HTML tag to use (default: 'div'),
	*     }
	*
	* @return jQuery wrapper for the created object
	*  
	*/
	add$(config) {
		if (config.parent === undefined) config.parent = this.$element;
		const $newElement = $(`<${config.tag}>`)
			.addClass(prefixClassNames(config.classNames, this.classPrefix));
		if (config.parent) $newElement.appendTo($(config.parent));
		if (config.jsObjectProperty) {
			Object.defineProperty(this, config.jsObjectProperty, {value: $newElement, enumerable: false});
		}
		return $newElement;
	}

	addHeader(tag = 'div') {
		this.add$({
			classNames: 'header',
			tag: tag,
			jsObjectProperty: '$header'});
		return this;
	}

	addDrag() {
		this.add$({
			classNames: 'drag',
			tag: 'span',
			parent: this.$header})
			.addClass('fa fa-bars');
		return this;
	}

	addTitle(tag = 'span') {
		const $title = this.add$({
			classNames: 'title',
			tag: tag,
			parent: this.$header})
			.text('Enter ' + this.ownClass + ' title')
			.makeEditable(title => kanbanLocalStorage.put(this.id, 'title', title));
		if (this.process === 'loading') {
			$title.text(this.title);
		} else if (this.process === 'creatingNew') {
			$title.selectText();
		}
		return this;
	}

	addRemoveButton() {
		this.add$({
			classNames: ['btn', 'btn-remove'],
			tag: 'button',
			parent: this.$header})
			.addClass('fa fa-trash-o')
			.click(() => this.remove());
		return this;
	}

	// for debugging
	addLogButton() {
		this.add$({
			classNames: ['btn', 'btn-log'],
			tag: 'button',
			parent: this.$header})
			.addClass('fa fa-eye')
			.click(() => this.log());
		return this;
	}

	setChildClass(childClass) {
		this.childClass = childClass;
		if (this.process === 'creatingNew') kanbanLocalStorage.put(this.id, 'childClass', this.childClass);
		return this;
	}

	addChildContainer(tag = 'div') {
		if (this.childClass) {
			this.add$({
				classNames: ['child-container', hyphenate(this.childClass, 'container')],
				tag: tag,
				jsObjectProperty: '$childContainer'});
			this.$childContainer.sortable({
				connectWith: `.${hyphenate(this.classPrefix, this.childClass, 'container')}`,
				handle: `.${this.classPrefix}-drag`,
				tolerance: 'pointer',
				start: (event, ui) => this.cut(ui.item),
				stop: (event, ui) => this.paste(ui.item)
			});
		}
		return this;
	}

	addAddChildButton() {
		if (this.childClass) {
			this.add$({
				classNames: ['btn', 'btn-add-child'],
				tag: 'button',
				parent: this.$header})
				.addClass('fa fa-plus-square')
				.click(() => this.addChild());
		}
		return this;
	}

	addChild() {
		const $newChild = kanbanFactory.build(this.childClass).$element;
		this.$childContainer.append($newChild);
		this.paste($newChild);
	}

	remove() {
		this.cut();
		kanbanLocalStorage.delete(this.id);
		this.$element.fadeOut(function() {this.remove()});
	}

	static getSurroundingIds($element) {
		let $next = $element.next();
		while ($next.is('[class*="placeholder"]')) $next = $next.next();
		return {
			own: $element.attr('id'),
			prev: $element.prev().attr('id'),
			next: $next.attr('id'),
			parent: $element.parent().parent().attr('id')
		}
	}

	cut($element = this.$element) {
		const ids = this.constructor.getSurroundingIds($element);
		if (ids.prev) {
			kanbanLocalStorage.put(ids.prev, 'nextSibling', ids.next);
		} else if (ids.parent) {
			kanbanLocalStorage.put(ids.parent, 'firstChild', ids.next);
		}
		return this;
	}

	paste($element = this.$element) {
		const ids = this.constructor.getSurroundingIds($element);
		if (ids.prev) {
			kanbanLocalStorage.put(ids.prev, 'nextSibling', ids.own);
		} else if (ids.parent) {
			kanbanLocalStorage.put(ids.parent, 'firstChild', ids.own);
		}
		kanbanLocalStorage.put(ids.own, 'nextSibling', ids.next);
		return this;
	}

	save() {
		kanbanLocalStorage.storage.setItem('kanban-default', this.id);
		return this;
	}

	// for debugging
	log() {
		console.log(JSON.stringify(kanbanLocalStorage.get(this.id)));
	}

}

const kanbanLocalStorage = {
	storage: localStorage,
	parseKey: key => 'kanban-' + (key instanceof jQuery ? key.attr('id') : key),
	post: function(key, data) {this.storage.setItem(this.parseKey(key), JSON.stringify(data))},
	put: function(key, property, value) {
		const data = JSON.parse(this.storage.getItem(this.parseKey(key)));
		if (value) {
			data[property] = value;
		} else {
			delete data[property];
		}
		this.post(key, data);
	},
	get: function(key) {return JSON.parse(this.storage.getItem(this.parseKey(key)))},
	delete: function(key) {this.storage.removeItem(this.parseKey(key))}
}

const kanbanFactory = {
	build: function(template) {
		if (typeof template !== 'object') template = {ownClass: template};
		switch (template.ownClass) {
			case 'board':
				return new KanbanBuilder(template)
					.setChildClass('column')
					.addHeader('h1')
					.addTitle()
					.addAddChildButton()
					// .addLogButton()
					.addRemoveButton()
					.addChildContainer()
					.save();
			case 'column':
				return new KanbanBuilder(template)
					.setChildClass('card')
					.addHeader('h2')
					.addDrag()
					.addTitle()
					.addAddChildButton()
					// .addLogButton()
					.addRemoveButton()
					.addChildContainer();
			case 'card':
				return new KanbanBuilder(template)
					.addHeader('h3')
					.addDrag()
					.addTitle()
					// .addLogButton()
					.addRemoveButton();
		}
	},
	load: function(id) {
		const savedObjectData = kanbanLocalStorage.get(id);
		if (!savedObjectData) return null;

		savedObjectData.process = 'loading';
		const objectBeingLoaded = this.build(savedObjectData);

		if (objectBeingLoaded.firstChild) {
			let child = this.load(objectBeingLoaded.firstChild);
			do {
				objectBeingLoaded.$childContainer.append(child.$element);
				Object.defineProperty(child, 'nextSibling', {enumerable: false});
				child = this.load(child.nextSibling);
			} while (child);
			Object.defineProperty(objectBeingLoaded, 'firstChild', {enumerable: false});
		}
		return objectBeingLoaded;
	}
}

$(function() {
	const kanbanBoard = kanbanFactory.load(kanbanLocalStorage.storage.getItem('kanban-default')) || kanbanFactory.build('board');
	kanbanBoard.$element.appendTo('#my-kanban');
})
