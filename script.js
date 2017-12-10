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

$.fn.makeEditable = function(autoSelect = true) {
	return this.attr('contenteditable', 'true')
		.data('auto-select', autoSelect)
		.keydown(event => {
			if (event.key === 'Escape' || event.key === 'Enter')$(event.target).blur();
		})
		.focus(event => {
			if (this.data('auto-select')) this.selectText();
		});
}

function concatClass(...args) {
	const save = Array.prototype.toString;
	Array.prototype.toString = function() {return this.join('-')};
	const result = args.toString();
	Array.prototype.toString = save;
	return result;
}

class KanbanBuilder {
	constructor(ownClass, tag = 'div', classPrefix = 'kanban') {
		this.ownClass = ownClass;
		this.classPrefix = classPrefix;
		this.prefixedClass = concatClass(classPrefix, ownClass);
		this.$element = $(`<${tag}>`).addClass(this.prefixedClass).fadeIn();
	}

	add$(classNames, tag = 'div', $parent = this.$element) {
		const prefixClassNames = () => $.isArray(classNames)
			? classNames.reduce((a, c) => a + ' ' + concatClass(this.classPrefix, c), '')
			: concatClass(this.classPrefix, classNames);
		const prefixedClassName = prefixClassNames();
		return $(`<${tag}>`).addClass(prefixedClassName).appendTo($parent);
	}

	addHeader(tag = 'div') {
		this.$header = this.add$('header', tag);
		return this;
	}

	addDrag() {
		this.add$('drag', 'span', this.$header).addClass('fa fa-bars');
		return this;
	}

	addTitle(tag = 'span') {
		this.add$('title', tag, this.$header)
			.text('Enter ' + this.ownClass + ' title')
			.makeEditable()
			.selectText();
		return this;
	}

	addRemoveButton() {
		this.add$(['btn', 'btn-remove'], 'button', this.$header)
			.addClass('fa fa-trash-o')
			.click(() => this.remove());
		return this;
	}

	setChildClass(childClass) {
		this.childClass = childClass;
		this.childContainerClass = concatClass(this.childClass, 'container');
		this.prefixedChildContainerClass = concatClass(this.classPrefix, this.childContainerClass);
		return this;
	}

	addChildContainer(tag = 'div') {
		if (this.childClass) {
			this.$childContainer = this.add$(['child-container',
				this.childContainerClass], tag).sortable({
					connectWith: `.${this.prefixedChildContainerClass}`,
					handle: `.${this.classPrefix}-drag`,
					tolerance: 'pointer'
				}
			);
		}	
		return this;
	}

	addChild(tag = 'div') {
		if (this.$childContainer) this.add$(childClass, tag, '>.child-container');
		return this;
	}

	addAddChildButton() {
		if (this.childClass) {
			this.add$(['btn', 'btn-add-child'], 'button', this.$header)
				.addClass('fa fa-plus-square')
				.click(() => {
					const child = kanbanFactory.build(this.childClass);
					this.$childContainer.append(child.$element);
				}
			);
		}
		return this;
	}

	remove() {
		this.$element.fadeOut(function() {this.remove()});
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
