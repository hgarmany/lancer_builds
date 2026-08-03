// rules/weapons.js

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
	TAGS,
	doesItemHaveTag,
	getItemNumUses,
	isFrameIntegratedItem
} from './installsCommon.js';

const talents = cumulativeCatalog.talents;
const licenses = cumulativeCatalog.licenses;
const activeFrame = cumulativeCatalog.activeFrame;
const budgets = cumulativeCatalog.budgets;

const AUXILIARY_SLOT = Object.freeze({
	label: 'Aux',
	allowedWeaponMounts: Object.freeze(['Auxiliary'])
});

const MAIN_SLOT = Object.freeze({
	label: 'Main / Aux',
	allowedWeaponMounts: Object.freeze(['Main', 'Auxiliary'])
});

const HEAVY_SLOT = Object.freeze({
	label: 'Heavy / Main / Aux',
	allowedWeaponMounts: Object.freeze([
		'Superheavy',
		'Heavy',
		'Main',
		'Auxiliary'
	])
});

const MOUNT_SLOTS = Object.freeze({
	'Superheavy': Object.freeze([HEAVY_SLOT]),
	'Heavy': Object.freeze([HEAVY_SLOT]),
	'Main': Object.freeze([MAIN_SLOT]),
	'Main/Aux': Object.freeze([MAIN_SLOT, AUXILIARY_SLOT]),
	'Aux/Aux': Object.freeze([AUXILIARY_SLOT, AUXILIARY_SLOT]),
	'Aux': Object.freeze([AUXILIARY_SLOT])
});

/**
 * Get whether a weapon has a given tag
 * 
 * @param {string} id
 * @param {string} tagId
 * @returns {boolean}
 */
export function doesWeaponHaveTag(id, tagId) {
	return doesItemHaveTag(srcData.weapons[id], tagId);
}

/**
 * Get the number of uses a limited weapon has
 * Non-limited weapons return 0
 * 
 * @param {string} id
 * @returns {number}
 */
export function getWeaponNumUses(id) {
	return getItemNumUses(srcData.weapons[id]);
}

/**
 * Get essential slot information for a given mount
 * Configuration responds to installed weapons
 * 
 * @param {string} mountType
 * @param {Array<string>} selectedIds
 * @returns {Array<Object>}
 * 
 */
export function getMountSlots(mountType, selectedIds) {
	if (mountType !== 'Flex')
		return MOUNT_SLOTS[mountType] ?? [];

	// flex mount expands to include a second aux slot
	// if the first weapon is aux
	return srcData.weapons[selectedIds[0]]?.mount === 'Auxiliary' ?
		[MAIN_SLOT, AUXILIARY_SLOT] :
		[MAIN_SLOT];
}

/**
 * Checks if a given weapon can fit on a given mount slot
 * 
 * @param {Object} slotDefinition
 * @param {Object} weapon
 * @returns {boolean}
 * 
 */
function weaponFitsSlot(slotDefinition, weapon) {
	return slotDefinition.allowedWeaponMounts.includes(weapon.mount);
}

/**
 * Determine whether the weapon with the given id
 * is a valid choice at this level
 * 
 * @param {number} level
 * @param {string} id
 * @param {string} selectedId
 * @returns {boolean}
 */
export function isWeaponEligible(
	level,
	id,
	selectedId = null,
	slotDefinition = null
) {
	const candidate = srcData.weapons[id];

	// reject invalid weapons, unpermitted exotics, integrated weapons
	if (!candidate ||
		!roadmap.allowExotics && doesWeaponHaveTag(id, TAGS.EXOTIC) ||
		isFrameIntegratedItem(id))
		return false;

	if (slotDefinition && !weaponFitsSlot(slotDefinition, candidate))
		return false;

	// superheavy weapons require two mounts
	if (candidate.mount === 'Superheavy' &&
		Number(slotDefinition?.mountCount ?? 0) < 2) {
		return false;
	}

	// determine whether adding/swapping weapons is within the level's budget
	if (candidate.sp) {
		const selectedWeapon = selectedId ? srcData.weapons[selectedId] : null;
		const withinBudget =
			Number(candidate.sp ?? 0) - Number(selectedWeapon?.sp ?? 0) <=
			stats[level].sp_budget;

		if (!withinBudget)
			return false;
	}

	// check for uniques, reject unique weapons already installed
	if (doesWeaponHaveTag(id, TAGS.UNIQUE) &&
		id != selectedId &&
		roadmap.ll[level].weapons.find(weapon => weapon.id === id) !== null)
		return false;

	// talent-issued weapons must match rank exactly
	if (candidate.talent_item)
		return candidate.talent_rank == talents[level][candidate.talent_id];

	// gms weapons are always eligible
	if (!weapon.license_id)
		return true;

	// allow weapons at or below the level's license rank
	return weapon.license_level <=
		licenses[level][weapon.license_id];
}

/**
 * Gets a list of weapon ids for all integrated weapons
 * 
 * @param {number} level
 * @returns {Array<string>}
 * 
 */
export function getStaticWeaponIds(level) {
	const frame = srcData.frames[activeFrame[level]];
	const staticWeaponIds = [];

	// get integrated weapons from frame
	frame?.core_system?.integrated?.forEach(id => {
		staticWeaponIds.push(id);
	});

	// get integrated weapons from talents
	talents?.forEach((talentId, val) => {
		srcData.talents[talentId]?.ranks[val]?.integrated?.forEach(id => {
			staticWeaponIds.push(id);
		})
	});

	return staticWeaponIds;
}