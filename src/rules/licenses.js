// rules/licenses.js

import {
	MAX_LICENSE_RANK
} from '../constants.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

const licenses = cumulativeCatalog.licenses;

/**
 * Gets the appropriate display rank for the id'd license
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns {number}
 */
export function getLicenseRank(level, id, selectedId = null) {
	const rank = licenses[level][id] ?? 0;
	return (id === selectedId) ? rank - 1 : rank;
}

/**
 * Determine whether the license with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns {boolean}
 */
export function isLicenseEligible(level, id, selectedId = null) {
	// licenses limited by total rank
	return getLicenseRank(level, id, selectedId) < MAX_LICENSE_RANK;
}