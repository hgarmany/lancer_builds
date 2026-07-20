import { workingCatalog } from '../data/roadmap-table.js';

/**
 * Evaluate a skill trigger that is in the build and
 * update the catalog to reflect selection limits.
 *
 * @param {number} level
 * @param {string} skillTriggerId
 */
export function skillTriggersUpdateCatalog(level, skillTriggerId) {
	if (workingCatalog.skillTriggers[level] === undefined)
		addSkillTriggerLevelToCatalog(level);
	const catalog = workingCatalog.skillTriggers[level];

	if (catalog[skillTriggerId] === undefined) {
		catalog[skillTriggerId] = 1;
	} else {
		catalog[skillTriggerId]++;
	}

	if (catalog[skillTriggerId] > catalog.maxInstances) {
		catalog.maxInstances++;
		catalog.numAtMax = 1;
	} else if (catalog[skillTriggerId] === catalog.maxInstances) {
		catalog.numAtMax++;
	}
}

export function skillTriggerIsEligible(level, skillTriggerId, roadmap) {
	if (workingCatalog.skillTriggers[level] === undefined)
		addSkillTriggerLevelToCatalog(level);
	const catalog = workingCatalog.skillTriggers[level];

	return (
		catalog === undefined ||
		catalog[skillTriggerId] === undefined ||
		catalog[skillTriggerId] < catalog.maxInstances ||
		catalog.numAtMax >= 4
	);
}

/**
 * Clears all working data for skill triggers
 * at or above the specified level
 * 
 * @param {number} level 
 */
export function skillTriggersResetCatalog(level) {
	workingCatalog.skillTriggers.splice(parseInt(level));
}

export function addSkillTriggerLevelToCatalog(level) {
	if (level > 0 &&
		workingCatalog.skillTriggers[level - 1] !== undefined) {
		// Create an independent snapshot of the previous level.
		workingCatalog.skillTriggers[level] = {
			...workingCatalog.skillTriggers[level - 1]
		};
	}
	else {
		workingCatalog.skillTriggers[level] = {
			maxInstances: 1,
			numAtMax: 0
		};
	}
}