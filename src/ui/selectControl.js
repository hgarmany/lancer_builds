// ui/selectControl.js

/**
 * 
 * 
 * @param {{
 *	className: string,
 *	srcItems: Array<Object>,
 *	placeholderText: string,
 *	getLabel: function,
 *	getDescription: function,
 *	getEligibility: function
 * }}
 * @returns {Element}
 */
export function createCommonSelect({
	className,
	srcItems,
	placeholderText,
	getLabel,
	getDescription,
	getEligibility
}) {
	const selectTemplate = document.createElement('select');
	selectTemplate.className = `${className}-select`;

	// prepare a default pseudo-option for unfilled selectors
	const placeholderOption = document.createElement('option');
	placeholderOption.value = '';
	placeholderOption.innerHTML = placeholderText;
	selectTemplate.append(placeholderOption);
	
	Object.entries(srcItems).forEach(([id, item]) => {
		// prepare an option for each item
		const option = document.createElement('option');
		option.value = id;
		if (getLabel)
			option.innerHTML = getLabel(item) ?? '';

		if (getDescription)
			option.title = getDescription(item) ?? '';

		if (getEligibility && !getEligibility(id)) {
			option.disabled = true;
			option.hidden = true;
		}

		selectTemplate.append(option);
	});

	return selectTemplate;
}