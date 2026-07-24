export function equipmentIsExotic(item) {
	return (
		item?.source === 'EXOTIC' ||
		item?.tags?.some(tag => tag.id === 'tg_exotic') === true
	);
}

export function exoticEquipmentIsUnlocked(
	item,
	unlockedEquipmentIds = []
) {
	return (
		!equipmentIsExotic(item) ||
		unlockedEquipmentIds.includes(item.id)
	);
}
