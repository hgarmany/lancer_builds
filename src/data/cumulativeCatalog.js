// data/cumulativeCatalog.js

import {
	roadmap
} from './roadmap.js';

import {
	srcData
} from './loader.js';

import {
	calculateMechStats
} from '../rules/stats.js';

export const cumulativeCatalog = {
	skillTriggers: [],
	talents: [],
	hase: [],
	licenses: [],
	activeFrame: [],
	coreBonuses: [],
	stats: []
};

/**
 * Clear all data from catalog
 */
export function purgeCumulativeCatalog() {
	for (const catalog of Object.values(cumulativeCatalog))
		catalog.length = 0;
}

/**
 * Reset a catalog level to the contents of the previous level
 * 
 * @param {Number} level 
 * @returns 
 */
function initializeCatalogLevel(level) {
	if (level === 0) {
		cumulativeCatalog.skillTriggers[level] = {
			maxInstances: 1,
			numAtMax: 0
		};

		cumulativeCatalog.talents[level] = {};
		cumulativeCatalog.hase[level] = {};
		cumulativeCatalog.licenses[level] = {};
		cumulativeCatalog.coreBonuses[level] = [];
		cumulativeCatalog.activeFrame[level] = null;
		cumulativeCatalog.stats[level] = {};

		return;
	}

	const previousLevel = level - 1;

	cumulativeCatalog.skillTriggers[level] = {
		...cumulativeCatalog.skillTriggers[previousLevel]
	};

	cumulativeCatalog.talents[level] = {
		...cumulativeCatalog.talents[previousLevel]
	};

	cumulativeCatalog.hase[level] = {
		...cumulativeCatalog.hase[previousLevel]
	};

	cumulativeCatalog.licenses[level] = {
		...cumulativeCatalog.licenses[previousLevel]
	};

	cumulativeCatalog.coreBonuses[level] = [
		...cumulativeCatalog.coreBonuses[previousLevel]
	];

	cumulativeCatalog.activeFrame[level] =
		cumulativeCatalog.activeFrame[previousLevel];

	cumulativeCatalog.stats[level] = {
		...cumulativeCatalog.stats[previousLevel]
	};
}

/**
 * Add a new id to the catalog or increment an existing one
 * 
 * @param {Object} catalog 
 * @param {String} id 
 * @returns 
 */
function increment(catalog, id) {
	return catalog[id] = (catalog[id] ?? 0) + 1;
}

/**
 * Prepare a cumulative catalog reflecting the contents of the loaded roadmap
 */
export function initializeCatalog() {
	purgeCumulativeCatalog();

	for (let level = 0; level <= roadmap.maxLevel; level++) {
		const levelData = roadmap.ll[level];

		// prepare base catalog state
		initializeCatalogLevel(level);

		// load in skill triggers
		const inSkillTriggers = cumulativeCatalog.skillTriggers[level];
		for (const skillTriggerId of levelData.skillTriggerIds) {
			// skip non-choices
			if (!skillTriggerId)
				continue;

			increment(
				cumulativeCatalog.skillTriggers[level],
				skillTriggerId
			);

			// evaluate limits on trigger selection
			if (inSkillTriggers[skillTriggerId] > inSkillTriggers.maxInstances) {
				inSkillTriggers.maxInstances++;
				inSkillTriggers.numAtMax = 1;
			}
			else if (inSkillTriggers[skillTriggerId] === inSkillTriggers.maxInstances) {
				inSkillTriggers.numAtMax++;
			}
		}

		// load in talents
		for (const talentId of levelData.talentIds) {
			// skip non-choices
			if (!talentId)
				continue;

			increment(
				cumulativeCatalog.talents[level],
				talentId
			);
		}

		// load in mech skills
		for (const haseId of levelData.haseIds) {
			// skip non-choices
			if (!haseId)
				continue;

			increment(
				cumulativeCatalog.hase[level],
				haseId
			);
		}

		// load in license
		if (levelData.licenseId) {
			if (level === 0)
				throw new Error(`License found at invalid level LL${level}`);
			increment(
				cumulativeCatalog.licenses[level],
				levelData.licenseId
			);
		}

		// load in core bonus
		if (levelData.coreBonusId) {
			if (level === 0 || level % 3 !== 0)
				throw new Error(`Core bonus found at invalid level LL${level}`);
			cumulativeCatalog.coreBonuses[level][level / 3 - 1] = coreBonusId;
		}

		// load in active frame
		if (levelData.frameId)
			cumulativeCatalog.activeFrame[level] = levelData.frameId;

		// generate stats for this level
		if (cumulativeCatalog.activeFrame[level])
			calculateMechStats(cumulativeCatalog, level);
	}

	console.log(cumulativeCatalog);
}