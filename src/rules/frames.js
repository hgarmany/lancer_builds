// rules/frames.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

const licenses = cumulativeCatalog.licenses;
const activeFrame = cumulativeCatalog.activeFrame;

/**
 * Get frame id for the active frame at this level
 * regardless of empty roadmap id
 *  
 * @param {number} level 
 * @returns 
 */
export function getEffectiveFrameId(level) {
	if (level < 0)
		return null;
	return activeFrame[level];
}

/**
 * Determine whether the frame with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id
 * @returns {boolean}
 */
export function isFrameEligible(level, id) {
	// frame must be either GMS or within the scope of selected licenses
	const frame = srcData.frames.get(id);
	return Number(licenses[level].get(frame.license_id)) >=
		frame.license_level || frame.source === 'GMS';
}