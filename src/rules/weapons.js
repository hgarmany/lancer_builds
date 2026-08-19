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

import {
	getMountTypes
} from './frames.js';

const talents = cumulativeCatalog.talents;
const licenses = cumulativeCatalog.licenses;
const activeFrame = cumulativeCatalog.activeFrame;
const stats = cumulativeCatalog.stats;

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

export const MOUNT_SLOTS = Object.freeze({
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
	return doesItemHaveTag(srcData.weapons.get(id), tagId);
}

/**
 * Get the number of uses a limited weapon has
 * Non-limited weapons return 0
 * 
 * @param {string} id
 * @returns {number}
 */
export function getWeaponNumUses(id) {
	return getItemNumUses(srcData.weapons.get(id));
}

/**
 * Get essential slot information for a given mount
 * Configuration responds to installed weapons
 * 
 * @param {Object} mount
 * @returns {Array<Object>}
 * 
 */
export function getMountSlots(mount) {
	if (mount.type !== 'Flex')
		return MOUNT_SLOTS[mount.type] ?? [];

	// flex mount expands to include a second aux slot
	// if the first weapon is actually an auxiliary weapon
	const firstWeapon = srcData.weapons.get(mount.weapons?.[0]?.id);
	return firstWeapon?.mount === 'Auxiliary' ?
		[MAIN_SLOT, AUXILIARY_SLOT] :
		[MAIN_SLOT];
}

function cloneWeaponSlot(weapon = null) {
	return {
		...(weapon ?? {}),
		id: weapon?.id ?? null,
		tags: [...(weapon?.tags ?? [])]
	};
}

/**
 * Reconcile one saved mount with the slot topology required by its type.
 * Existing selections are preserved by slot where possible.
 *
 * @param {string} type
 * @param {Object} savedMount
 * @returns {Object}
 */
export function normalizeMount(type, savedMount = null) {
	const savedWeapons = savedMount?.weapons ?? [];
	const mount = {
		...(savedMount ?? {}),
		type,
		weapons: savedWeapons.map(cloneWeaponSlot),
		tags: [...(savedMount?.tags ?? [])]
	};

	const slots = getMountSlots(mount);
	mount.weapons = slots.map((_, idx) =>
		cloneWeaponSlot(savedWeapons[idx]));

	return mount;
}

/**
 * Reconcile saved selections with all mounts currently granted at a level.
 *
 * @param {number} level
 * @param {Array<Object>} savedMounts
 * @returns {Array<Object>}
 */
export function normalizeMounting(level, savedMounts = []) {
	const unmatchedMounts = [...savedMounts];

	return getMountTypes(level).map(type => {
		const savedIdx = unmatchedMounts.findIndex(
			mount => mount?.type === type);
		const savedMount = savedIdx < 0 ? null :
			unmatchedMounts.splice(savedIdx, 1)[0];

		return normalizeMount(type, savedMount);
	});
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

export function getEffectiveMounting(level) {
	let savedMounts = [];
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].mounts) {
			savedMounts = roadmap.ll[i].mounts;
			break;
		}
	}

	return normalizeMounting(level, savedMounts);
}

/**
 * Create this level's own loadout before applying a user weapon selection.
 * The derived configuration is cloned so prior levels remain unchanged.
 *
 * @param {number} level
 * @returns {Array<Object>}
 */
export function materializeMounting(level) {
	const mounts = getEffectiveMounting(level);
	roadmap.ll[level].mounts = mounts;
	return mounts;
}

/**
 * Apply a weapon selection and then restore the mount's slot invariant.
 *
 * @param {number} level
 * @param {number} mountIdx
 * @param {number} slotIdx
 * @param {string|null} id
 */
export function setWeaponSelection(level, mountIdx, slotIdx, id) {
	const mounts = roadmap.ll[level].mounts ?
		normalizeMounting(level, roadmap.ll[level].mounts) :
		materializeMounting(level);
	roadmap.ll[level].mounts = mounts;
	const mount = mounts[mountIdx];
	if (!mount)
		return;

	if (!mount.weapons[slotIdx])
		mount.weapons[slotIdx] = cloneWeaponSlot();
	mount.weapons[slotIdx].id = id ?? null;

	// This expands a Flex mount after an Aux selection and collapses it after
	// its first slot becomes Main or empty. It also fixes every static mount.
	mounts[mountIdx] = normalizeMount(mount.type, mount);
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
	if (!id)
		return true;

	const candidate = srcData.weapons.get(id);

	// reject invalid weapons, unpermitted exotics, integrated weapons
	if (!candidate ||
		!roadmap.allowExotics && doesWeaponHaveTag(id, TAGS.EXOTIC) ||
		isFrameIntegratedItem(id))
		return false;

	if (slotDefinition && !weaponFitsSlot(slotDefinition, candidate))
		return false;

	// superheavy weapons require two mounts
	if (candidate.mount === 'Superheavy' && getMountTypes(level).length < 2)
		return false;

	// determine whether adding/swapping weapons is within the level's budget
	if (candidate.sp) {
		const selectedWeapon = selectedId ? srcData.weapons.get(selectedId) : null;
		const withinBudget =
			Number(candidate.sp ?? 0) - Number(selectedWeapon?.sp ?? 0) <=
			stats[level].sp_budget;

		if (!withinBudget)
			return false;
	}

	// check for uniques, reject unique weapons already installed
	if (doesWeaponHaveTag(id, TAGS.UNIQUE) &&
		id != selectedId &&
		getEffectiveMounting(level).flatMap(mount => mount.weapons)
			.some(weapon => weapon.id === id))
		return false;

	// talent-issued weapons must match rank exactly
	if (candidate.talent_item)
		return candidate.talent_rank == talents[level].get(candidate.talent_id);

	// gms weapons are always eligible
	if (!candidate.license_id)
		return true;

	// allow weapons at or below the level's license rank
	return candidate.license_level <=
		licenses[level].get(candidate.license_id);
}

/**
 * Gets a list of weapon ids for all integrated weapons
 * 
 * @param {number} level
 * @returns {Array<string>}
 * 
 */
export function getIntegratedWeaponIds(level) {
	const frame = srcData.frames.get(activeFrame[level]);
	const weaponIds = [];

	// get integrated weapons from frame
	frame?.core_system?.integrated?.forEach(id => {
		weaponIds.push(id);
	});

	// get integrated weapons from talents
	talents[level]?.forEach((talentId, val) => {
		srcData.talents.get(talentId)?.ranks[val]?.integrated?.forEach(id => {
			weaponIds.push(id);
		})
	});

	return weaponIds;
}