// rules/installsCommon.js

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

const stats = cumulativeCatalog.stats;

export const TAGS = Object.freeze({
	EXOTIC: 'tg_exotic',
	UNIQUE: 'tg_unique',
	AI: 'tg_ai',
    LIMITED: 'tg_limited'
});

/**
 * Get whether an item has a given tag
 * 
 * @param {Object} item
 * @param {string} tag
 * @returns {boolean}
 */
export function doesItemHaveTag(item, tagId) {
    return item?.tags?.find(tag => tag.id === tagId) !== undefined;
}

/**
 * Get the number of uses a limited item has
 * Non-limited items return -1
 * 
 * @param {number} level
 * @param {Object} item
 * @returns {number}
 */
export function getItemNumUses(level, item) {
	const limited = item?.tags?.find(tag => tag.id === TAGS.LIMITED);
    return limited ? Number(limited.val) + stats[level].limited_bonus : -1;
}

/**
 * Get whether an item appears as an integrated element of a frame
 * 
 * @param {string} id
 * @returns {boolean}
 */
export function isFrameIntegratedItem(id) {
	for (const frame of srcData.frames.values()) {
		if (frame.core_system?.integrated?.includes(id))
			return true;
	}

	return false;
}