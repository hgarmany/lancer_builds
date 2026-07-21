// ui/select-control.js

/**
 * createChoiceSelect
 * 
 * @param {any} param0
 * @returns
 */
export function createChoiceSelect({
	placeholderText,
	items,
	selectedId,
	index,
	getLabel,
	getDescription,
	isEligible,
	showDisabledOptions = false,
	onSelected,
	onChange
}) {
	const select = document.createElement('select');
	select.dataset.idx = String(index);

	const placeholderOption = document.createElement('option');
	placeholderOption.value = '';
	placeholderOption.textContent = placeholderText;
	select.append(placeholderOption);

	let selectedItem = null;

	for (const item of items) {
		const eligible = isEligible(item);
		if (!isEligible || showDisabledOptions || eligible) {
			const option = document.createElement('option');
			option.value = item?.id;
			option.textContent = getLabel(item);
			option.selected = item.id === selectedId;

			if (getDescription)
				option.title = getDescription(item);
			if (option.selected)
				selectedItem = item;
			option.disabled = !eligible;

			select.append(option);
		}
	}

	if (selectedItem && onSelected) {
		onSelected(selectedItem);
	}
	select.classList.toggle('occupied', selectedId !== null);

	const selectedOption = select.selectedOptions[0];
	select.classList.toggle(
		'error',
		selectedOption?.disabled === true
	);

	if (onChange)
		select.addEventListener('change', onChange);

	return select;
}