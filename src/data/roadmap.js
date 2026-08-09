// data/roadmap.js

const MAX_LICENSE_LEVEL = 12;

export let roadmap = {};

/**
 * Return the number of advancement choices
 * granted at a LL
 *
 * @param {number} level
 * @returns {{
 *		skillTriggers: number,
 *		talents: number,
 *		licenses: number,
 *		coreBonuses: number
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
		haseIds: createEmptySlots(limits.mechSkills),
		licenseId: null,
		coreBonusId: null,
		systems: [],

		// null means "continue using the previously active frame"
		frameId: level == 0 ? 'mf_standard_pattern_i_everest' : null,
		mounts: level == 0 ? [
			{ type: 'Flex', weapons: [ null ] },
			{ type: 'Main', weapons: [ null ] },
			{ type: 'Heavy', weapons: [ null ] }
		] : []
	};
}

/**
 * Configure roadmap to default blank
 */
export function createDefaultRoadmap() {
	roadmap = {
		name: 'New Roadmap',
		maxLevel: MAX_LICENSE_LEVEL,
		allowExotics: false,
		ll: Array.from(
			{ length: MAX_LICENSE_LEVEL + 1 },
			(_, level) => createDefaultRoadmapLevel(level)
		)
	};

	roadmap.ll[1].licenseId = 'mf_hydra';
	roadmap.ll[2].licenseId = 'mf_hydra';
	roadmap.ll[3].licenseId = 'mf_hydra';
	roadmap.ll[2].frameId = 'mf_hydra';
	roadmap.ll[4].licenseId = 'mf_balor';
	roadmap.ll[3].coreBonusId = 'cb_the_lesson_of_the_held_image';
	roadmap.ll[0].talentIds[1] = 't_ace';
	roadmap.ll[1].talentIds[0] = 't_ace';
	roadmap.ll[0].haseIds[0] = 'hull';
	roadmap.ll[0].haseIds[1] = 'hull';
	roadmap.ll[1].haseIds[0] = 'agility';

	console.log(roadmap);
}

/**
 * Resize roadmap to match new maximum level
 * 
 * @param {Roadmap} roadmap
 * @param {number} maxLevel
 */
export function setMaxLevel(roadmap, maxLevel) {
	if (maxLevel > roadmap.maxLevel) {
		for (let i = roadmap.maxLevel + 1; i <= maxLevel; i++)
			roadmap.ll.push(createDefaultRoadmapLevel(i));
	}
	else if (maxLevel < roadmap.maxLevel) {
		roadmap.ll.length = maxLevel + 1;
	}

	roadmap.maxLevel = maxLevel;
}