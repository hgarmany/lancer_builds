// ui/selectControl.js

/**
 * 
 * 
 * @param {{
 *	className: string,
 *	srcItems: Map<string, Object>,
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

	for (const [id, item] of srcItems) {
		const context = { id, item };

		// prepare an option for each item
		const option = document.createElement('option');
		option.value = id;
		if (getLabel)
			option.innerHTML = getLabel?.(context) ?? '';

		if (getDescription)
			option.title = getDescription?.(context) ?? '';

		if (getEligibility && !getEligibility?.(context)) {
			option.disabled = true;
			option.hidden = true;
		}

		selectTemplate.append(option);
	}

	return selectTemplate;
}