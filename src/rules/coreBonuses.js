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
 *		selected: boolean
 *	}}
 * @returns {boolean}
 */
export function isCoreBonusEligible({
	level, coreBonus = null, id = null, selected = false
}) {
	// forbid repeat selections
	if (!(id === selectedId) && hasCoreBonus(level, id))
		return false;

	if (!coreBonus)
		coreBonus = srcData.coreBonuses[id];
	const manufacturer = coreBonus.source;
	// allow all GMS core bonuses
	if (manufacturer == 'GMS')
		return true;

	// otherwise evaluate unspent license levels
	let total = 0;
	licenses[level]?.forEach((key, value) => {
		if (srcData.frames?.[key] == manufacturer)
			total += value;
	});
	
	if (level > 3) {
		for (const refCBId of cbCatalog[level - 1]) {
			if (srcData.coreBonuses[refCBId]?.source === manufacturer)
				total -= 3;
		}
	}

	return total >= 3;
}