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
const frameCatalog = cumulativeCatalog.activeFrame;

/**
 * Get frame id for the active frame at this level
 * regardless of empty roadmap id
 *  
 * @param {number} level 
 * @returns 
 */
export function getEffectiveFrameId(level) {
	return frameCatalog[level];
}

/**
 * Get the list of mount sizes that come with the active frame
 * 
 * @param {number} level 
 * @returns {Array<string>}
 */
export function getActiveFrameMountTypes(level) {
	return srcData.frames[frameCatalog[level]]?.mounts ?? [];
}

/**
 * Determine whether the frame with the given id
 * is a valid choice at this level
 * 
 * @param {number} level 
 * @param {string} id 
 * @param {boolean} selected 
 * @returns 
 */
export function isFrameEligible(level, id, selected = false) {
	// frame must be either GMS or within the scope of selected licenses
	const frame = srcData.frames[id];
	return Number(licenses[level][frame.license_id]) >= frame.license_level ||
		frame.source === 'GMS';
}