// data/roadmap.js

const MAX_LICENSE_LEVELS = 12;

export let roadmap = {};

/**
 * Return the number of advancement choices
 * granted at a LL
 *
 * @param {number} level
 * @returns {{
 *   skillTriggers: number,
 *   talents: number,
 *   licenses: number,
 *   coreBonuses: number
 * }}
 */
function getChoiceLimits(level) {
	if (level === 0) {
		return {
			skillTriggers: 4,
			talents: 3,
			mechSkills: 2
		};
	}

	return {
		skillTriggers: 1,
		talents: 1,
		mechSkills: 1
	};
}

/**
 * Makes empty arrays of the specified length
 * 
 * @param {number} length
 * @returns {Array<null>}
 */
function createEmptySlots(length) {
	return Array.from({ length }, () => null);
}

/**
 * Create a blank level for the roadmap
 * LL0 starts with the Everest loaded in
 * 
 * @param {any} level
 * @returns
 */
function createDefaultRoadmapLevel(level) {
	const limits = getChoiceLimits(level);

	return {
		skillTriggerIds: createEmptySlots(limits.skillTriggers),
		talentIds: createEmptySlots(limits.talents),
		mechSkillIds: createEmptySlots(limits.mechSkills),
		licenseId: null,
		coreBonusId: null,
		weaponIds: [],
		systemIds: [],
		loadoutTags: {},

		// null means "continue using the previously active frame"
		frameId: level == 0 ? 'mf_standard_pattern_i_everest' : null
	};
}

export function createRoadmap({
    name = 'New Roadmap',
    maxLevel = MAX_LICENSE_LEVELS
} = {}) {
    roadmap = {
        name,
        maxLevel,
        ll: Array.from(
            { length: maxLevel + 1 },
            (_, level) => createDefaultRoadmapLevel(level)
        )
    }

    console.log(roadmap);
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