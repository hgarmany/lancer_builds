export function getEffectiveSystemIds(roadmap, level) {
	let effectiveIds = [];

	for (
		let targetLevel = 0;
		targetLevel <= level;
		targetLevel++
	) {
		const roadmapLevel = roadmap.levels[targetLevel];

		if (systemSelectionIsExplicit(roadmapLevel)) {
			effectiveIds = (
				roadmapLevel.systems ?? []
			).filter(Boolean);
		}
	}

	return [...effectiveIds];
}

export function setSystemSelection({
	roadmap,
	level,
	index,
	systemId
}) {
	const systemIds = getEffectiveSystemIds(roadmap, level);
	systemIds[index] = systemId;

	roadmap.levels[level].systems = systemIds.filter(Boolean);
	roadmap.levels[level].systemsSet = true;
}

export function getNextExplicitSystemLevel(roadmap, level) {
	for (
		let targetLevel = level + 1;
		targetLevel < roadmap.levels.length;
		targetLevel++
	) {
		if (systemSelectionIsExplicit(roadmap.levels[targetLevel]))
			return targetLevel;
	}

	return Infinity;
}

function systemSelectionIsExplicit(roadmapLevel) {
	return (
		roadmapLevel?.systemsSet === true ||
		roadmapLevel?.systems?.some(Boolean) === true
	);
}
