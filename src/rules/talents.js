// rules/talents.js

import {
	MAX_TALENT_RANK
} from '../constants.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

const talents = cumulativeCatalog.talents;

/**
 * Gets the appropriate display rank for the id'd talent
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns {number}
 */
export function getTalentRank(level, id, selected = false) {
	const rank = talents[level][id] ?? 0;
	return selected ? rank - 1 : rank;
}

/**
 * Determine whether the talent with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns {boolean}
 */
export function isTalentEligible(level, id, selected = false) {
	// all ll0 talents must be different
	if (level === 0)
		return selected || roadmap.ll[0].talentIds.includes(id);
	// talents limited by total rank
	else
		return getTalentRank(level, id, selected) < MAX_TALENT_RANK;
}