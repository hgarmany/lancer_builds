export let workingCatalog = {
    skillTriggers: [],
    talents: [],
    mechSkills: [],
    licenses: [],
	frames: [],
    coreBonuses: [],
	stats: []
};

/**
 * Clears all working data for licenses
 * at or above the specified level
 * 
 * @param {number} level 
 */
export function coreBonusesResetCatalog(level) {
	const catalog = workingCatalog.coreBonuses;
	for (let idx = level; idx < catalog.length; idx++) {
		catalog[idx] = [
			...catalog[idx - 1]
		];
	}
}
