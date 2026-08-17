// rules/coreBonuses.js

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

const cbCatalog = cumulativeCatalog.coreBonuses;
const licenses = cumulativeCatalog.licenses;

/**
 * Detect matching ids in the cumulative catalog
 * 
 * @param {number} level 
 * @param {string} id 
 * @returns {boolean}
 */
export function hasCoreBonus(level, id) {
	return cbCatalog[level]?.includes(id) ?? false;
}

/**
 * Determine whether the core bonus with the given id
 * is a valid choice at this level
 * 
 * @param {{
 *		level: number,
 *		coreBonus: Object,
 *		id: string,
 *		selectedId: string
 *	}}
 * @returns {boolean}
 */
export function isCoreBonusEligible(level, id, selectedId = null) {
	if (!id)
		return true;

	// forbid repeat selections
	if (hasCoreBonus(level - 1, id))
		return false;

	const candidate = srcData.coreBonuses.get(id);
	const manufacturer = candidate.source;

	// allow all GMS core bonuses
	if (manufacturer == 'GMS')
		return true;

	// otherwise evaluate unspent license levels
	let total = 0;
	licenses[level]?.forEach((value, key) => {
		if (srcData.frames?.get(key).source === manufacturer)
			total += value;
	});
	
	if (level > 3) {
		for (const refCBId of cbCatalog[level - 1]) {
			if (srcData.coreBonuses.get(refCBId)?.source === manufacturer)
				total -= 3;
		}
	}

	return total >= 3;
}