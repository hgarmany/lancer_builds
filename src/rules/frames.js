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

import {
	MAX_MOUNT_COUNT
} from '../constants.js';

const licenses = cumulativeCatalog.licenses;
const coreBonuses = cumulativeCatalog.coreBonuses;
const frameCatalog = cumulativeCatalog.activeFrame;

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
	return frameCatalog[level];
}

/**
 * Get the list of mount sizes that come with the active frame
 * 
 * @param {number} level 
 * @returns {Array<string>}
 */
export function getMountTypes(level) {
	const frameMounts = srcData.frames.get(frameCatalog[level])?.mounts ?? [];
	let numMounts = frameMounts.length;

	let mountsOut = [];

	for (const coreBonus of coreBonuses[level] ?? []) {
		if (numMounts >= MAX_MOUNT_COUNT)
			break;

		switch (coreBonus) {
			case 'cb_integrated_weapon':
				mountsOut.push('Auxiliary');
				numMounts++;
				break;
			case 'cb_improved_armament':
				mountsOut.push('Flex');
				numMounts++;
				break;
			case 'cb_superheavy_mounting':
				mountsOut.push('Superheavy');
				numMounts++;
				break;
		}
	}

	return mountsOut.concat(frameMounts);
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