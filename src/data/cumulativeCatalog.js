// data/cumulativeCatalog.js

import {
	roadmap
} from './roadmap.js';

export const cumulativeCatalog = {
	skillTriggers: [],
	talents: [],
	mechSkills: [],
	licenses: [],
	frames: [],
	coreBonuses: [],
	stats: [],
	systems: []
};

export function purgeCumulativeCatalog() {
	for (const catalog of Object.values(cumulativeCatalog))
		catalog.length = 0;
}

function initializeCatalogLevel(level) {
	if (level === 0) {
		cumulativeCatalog.skillTriggers[level] = {
			maxInstances: 1,
			numAtMax: 0
		};

		cumulativeCatalog.talents[level] = {};
		cumulativeCatalog.mechSkills[level] = {};
		cumulativeCatalog.licenses[level] = {};
		cumulativeCatalog.coreBonuses[level] = [];

		return;
	}

	const previousLevel = level - 1;

	cumulativeCatalog.skillTriggers[level] = {
		...cumulativeCatalog.skillTriggers[previousLevel]
	};

	cumulativeCatalog.talents[level] = {
		...cumulativeCatalog.talents[previousLevel]
	};

	cumulativeCatalog.mechSkills[level] = {
		...cumulativeCatalog.mechSkills[previousLevel]
	};

	cumulativeCatalog.licenses[level] = {
		...cumulativeCatalog.licenses[previousLevel]
	};

	cumulativeCatalog.coreBonuses[level] = [
		...cumulativeCatalog.coreBonuses[previousLevel]
	];
}

function increment(catalog, id) {
	return catalog[id] = (catalog[id] ?? 0) + 1;
}

export function initializeCatalog() {
	purgeCumulativeCatalog();

	for (let level = 0; level <= roadmap.maxLevel; level++) {
		const levelData = roadmap.ll[level];
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
			} else if (inSkillTriggers[skillTriggerId] === inSkillTriggers.maxInstances) {
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
		for (const mechSkillId of levelData.mechSkillIds) {
			// skip non-choices
			if (!mechSkillId)
				continue;

			increment(
				cumulativeCatalog.mechS[level],
				mechSkillId
			);
		}

		if (levelData.licenseId) {
			increment(
				cumulativeCatalog.licenses[level],
				levelData.licenseId
			);
		}

		if (levelData.coreBonusId) {
			if (level === 0 || level % 3 !== 0)
				throw new Error(`Core bonus found at invalid level LL${level}`);
			cumulativeCatalog.coreBonuses[level][level / 3 - 1] = coreBonusId;
		}
	}
}