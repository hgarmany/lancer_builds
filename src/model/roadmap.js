// src/model/roadmap.js

import {
	workingCatalog
} from "../data/roadmap-table.js"

const MAX_LICENSE_LEVELS = 12;

/**
 * Return the number of advancement choices granted at an LL.
 *
 * @param {number} level
 * @returns {{
 *   skillTriggers: number,
 *   talents: number,
 *   licenses: number,
 *   coreBonuses: number
 * }}
 */
export function getChoiceLimits(level) {
	validateLevel(level);

	if (level === 0) {
		return {
			skillTriggers: 4,
			talents: 3,
			mechSkills: 2,
			licenses: 0,
			coreBonuses: 0
		};
	}

	return {
		skillTriggers: 1,
		talents: 1,
		mechSkills: 1,
		licenses: 1,
		coreBonuses: level % 3 === 0 ? 1 : 0
	};
}

/**
 * Create one row of roadmap choices.
 *
 * Arrays contain one entry per available selection slot. An unfilled slot
 * contains null.
 *
 * @param {number} level
 * @returns {RoadmapLevel}
 */
function createRoadmapLevel(level) {
	const limits = getChoiceLimits(level);

	return {
		level,

		skillTriggerIds: createEmptySlots(limits.skillTriggers),
		talentIds: createEmptySlots(limits.talents),
		mechSkillIds: createEmptySlots(limits.mechSkills),
		licenseId: null,
		coreBonusId: null,

		// null means "continue using the previously active frame."
		frameId: null
	};
}

/**
 * @param {number} count
 * @returns {Array<null>}
 */
function createEmptySlots(count) {
	return Array.from({ length: count }, () => null);
}

/**
 * @param {Object} [options]
 * @param {number} [options.maxLevel=12]
 * @param {string} [options.name="New Roadmap"]
 * @returns {Roadmap}
 */
export function createRoadmap({
	maxLevel = 12,
	name = "New Roadmap"
} = {}) {
	validateLevel(maxLevel);

	return {
		version: 1,
		name,
		maxLevel,
		levels: Array.from(
			{ length: maxLevel + 1 },
			(_, level) => createRoadmapLevel(level)
		)
	};
}

export function initializeRoadmapCatalog(roadmap) {
	for (let level = 0; level <= roadmap.maxLevel; level++) {
		// base state for new level
		if (level > 0) {
			workingCatalog.skillTriggers[level] = {
				...workingCatalog.skillTriggers[level - 1]
			};
			workingCatalog.talents[level] = {
				...workingCatalog.talents[level - 1]
			};
			workingCatalog.mechSkills[level] = {
				...workingCatalog.mechSkills[level - 1]
			};
			workingCatalog.licenses[level] = {
				...workingCatalog.licenses[level - 1]
			};
			workingCatalog.coreBonuses[level] = [
				...workingCatalog.coreBonuses[level - 1]
			];
		}
		else {
			workingCatalog.skillTriggers[level] = {
				maxInstances: 1,
				numAtMax: 0
			};
			workingCatalog.talents[level] = {};
        	workingCatalog.mechSkills[level] = {};
			workingCatalog.licenses[level] = {};
			workingCatalog.coreBonuses[level] = [];
		}

		// load in skill triggers
		const catalogSkillTriggers = workingCatalog.skillTriggers[level];
		for (const skillTriggerId of roadmap.levels[level].skillTriggerIds) {
			if (catalogSkillTriggers[skillTriggerId] === undefined) {
				catalogSkillTriggers[skillTriggerId] = 1;
			} else {
				catalogSkillTriggers[skillTriggerId]++;
			}
		
			if (catalogSkillTriggers[skillTriggerId] > catalogSkillTriggers.maxInstances) {
				catalogSkillTriggers.maxInstances++;
				catalogSkillTriggers.numAtMax = 1;
			} else if (catalogSkillTriggers[skillTriggerId] === catalogSkillTriggers.maxInstances) {
				catalogSkillTriggers.numAtMax++;
			}
		}

		// load in talents
		const catalogTalents = workingCatalog.talents[level];
		for (const talentId of roadmap.levels[level].talentIds) {
			if (catalogTalents[talentId] === undefined)
				catalogTalents[talentId] = 1;
			else
				catalogTalents[talentId]++;
		}

		// load in mech skills
		const catalogMechSkills = workingCatalog.mechSkills[level];
		for (const mechSkillId of roadmap.levels[level].mechSkillIds) {
			if (catalogMechSkills[mechSkillId] === undefined)
				catalogMechSkills[mechSkillId] = 1;
			else
				catalogMechSkills[mechSkillId]++;
		}

		const catalogLicenses = workingCatalog.licenses[level];
		const licenseId = roadmap.levels[level].licenseId;
		if (licenseId) {
			if (catalogLicenses[licenseId] === undefined)
				catalogLicenses[licenseId] = 1;
			else
				catalogLicenses[licenseId]++;
		}

		const coreBonusId = roadmap.levels[level].coreBonusId;
		if (coreBonusId)
			workingCatalog.coreBonuses[level][level / 3 - 1] = coreBonusId;
	}
}

/**
 * @param {Roadmap} roadmap
 * @param {number} maxLevel
 */
export function setMaxLevel(roadmap, maxLevel) {
	validateLevel(maxLevel);

	if (maxLevel > roadmap.maxLevel) {
		for (
			let level = roadmap.maxLevel + 1;
			level <= maxLevel;
			level += 1
		) {
			roadmap.levels.push(createRoadmapLevel(level));
		}
	} else if (maxLevel < roadmap.maxLevel) {
		roadmap.levels.length = maxLevel + 1;
	}

	roadmap.maxLevel = maxLevel;
}

function validateLevel(level) {
	if (!Number.isInteger(level) || level < 0) {
		throw new RangeError(
			"License level must be a non-negative integer."
		);
	}
}

/**
 * @typedef {Object} RoadmapLevel
 * @property {number} level
 * @property {(string|null)[]} skillTriggerIds
 * @property {(string|null)[]} talentIds
 * @property {string|null} mechSkillId
 * @property {string|null} licenseId
 * @property {string|null} coreBonusId
 * @property {string|null} frameId
 */

/**
 * @typedef {Object} Roadmap
 * @property {number} version
 * @property {string} name
 * @property {number} maxLevel
 * @property {RoadmapLevel[]} levels
 */