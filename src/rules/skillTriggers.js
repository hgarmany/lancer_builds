// rules/skillTriggers.js

import {
	MAX_SKILL_RANK
} from '../constants.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

const skillTriggers = cumulativeCatalog.skillTriggers;

/**
 * Determine whether the skill with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns {boolean}
 */
export function isSkillTriggerEligible(level, id, selected = false) {
	// all ll0 skills must be different
	if (level === 0)
		return selected || roadmap.ll[0].skillTriggerIds.includes(id);
	// skills limited by total rank
	else
		return (skillTriggers[level][id] ?? 0) <
			(selected ? MAX_SKILL_RANK + 1 : MAX_SKILL_RANK);
}