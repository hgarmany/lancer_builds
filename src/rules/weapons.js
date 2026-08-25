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
	MAX_MOUNT_COUNT
} from '../constants.js';

import {
	TAGS,
	doesItemHaveTag,
	getItemNumUses,
	isFrameIntegratedItem
} from './installsCommon.js';

const talents = cumulativeCatalog.talents;
const licenses = cumulativeCatalog.licenses;
const coreBonuses = cumulativeCatalog.coreBonuses;
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

const SHIP_CLASS = Object.freeze({
	label: 'Ship-Class',
	allowedWeaponMounts: Object.freeze(['Ship-class'])
});

export const MOUNT_SLOTS = Object.freeze({
	'Ship-class': Object.freeze([SHIP_CLASS]),
	'Superheavy': Object.freeze([HEAVY_SLOT]),
	'Heavy': Object.freeze([HEAVY_SLOT]),
	'Main': Object.freeze([MAIN_SLOT]),
	'Flex': Object.freeze([MAIN_SLOT]),
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

	// flex mount acts like an aux/aux mount
	// if either slot has an aux weapon
	const firstWeapon = srcData.weapons.get(mount.weapons?.[0]?.id);
	const secondWeapon = srcData.weapons.get(mount.weapons?.[1]?.id);
	const doTwoSlots = firstWeapon?.mount === 'Auxiliary' ||
		!firstWeapon && secondWeapon?.mount === 'Auxiliary';
	return doTwoSlots ? [MAIN_SLOT, AUXILIARY_SLOT] : [MAIN_SLOT];
}

function createEmptyMount(type, tags) {
	const weapons = MOUNT_SLOTS[type].map(() => ({ id: null, tags: {} }));
	return { type, weapons, tags };
}

/**
 * Builds a list of weaponless mounts from scratch
 * 
 * @param {number} level
 * @returns
 */
function buildMountConfiguration(level) {
	const frame = srcData.frames.get(activeFrame[level]);
	const frameMounts = frame?.mounts
		?.map(mount => createEmptyMount(mount, {})) ?? [];
	let numMounts = frameMounts.length;
	let mountsOut = [];

	// integrated mount changes
	const frameIntegrations = frame?.core_system?.integrated
		?.map(weapon => ({ source: activeFrame[level], weapon })) ?? [];
	const talentIntegrations = [...talents[level]].flatMap(([id, rank]) =>
		srcData.talents.get(id)?.ranks[rank - 1]?.integrated
			?.map(weapon => ({ source: id, weapon })) ?? []);
	const integratedElements = [
		...frameIntegrations,
		...talentIntegrations
	];

	for (const integration of integratedElements ?? []) {
		const weapon = srcData.weapons.get(integration.weapon);
		if (weapon) {
			const newMount = {
				type: weapon.mount,
				weapons: [{ id: integration.weapon, tags: {} }],
				tags: {
					source: integration.source,
					integrated: integration.weapon
				}
			};
			mountsOut.push(newMount);
		}
	}

	// source bonus mounts from core bonuses
	for (const coreBonus of coreBonuses[level] ?? []) {
		const srcCB = srcData.coreBonuses.get(coreBonus);

		if (!srcCB?.bonuses)
			continue;

		for (const bonus of srcCB?.bonuses) {
			if (bonus.id === 'add_mount' &&
				(!bonus.max || bonus.max > numMounts)
			) {
				const mountName = bonus.val.charAt(0).toUpperCase() +
					bonus.val.slice(1);
				mountsOut.push(
					createEmptyMount(mountName, { source: coreBonus }));
				numMounts++;
			}
		}
	}

	return mountsOut.concat(frameMounts);
}

function cloneMount(mount, tags = mount.tags ?? {}) {
	return {
		...mount,
		weapons: (mount.weapons ?? []).map(weapon => ({
			...weapon,
			tags: { ...(weapon.tags ?? {}) }
		})),
		tags: { ...tags }
	};
}

function mountsHaveSameSource(savedMount, newMount) {
	const savedIntegrated = savedMount.tags?.integrated;
	const newIntegrated = newMount.tags?.integrated;

	if (savedIntegrated || newIntegrated) {
		return savedMount.type === newMount.type &&
			savedIntegrated === newIntegrated;
	}

	return savedMount.type === newMount.type &&
		savedMount.tags?.source === newMount.tags?.source;
}

/**
 * Reconcile saved selections with all mounts currently granted at a level
 *
 * @param {number} level
 * @param {Array<Object>} savedMounts
 * @returns {Array<Object>}
 */
export function normalizeMounts(level, savedMounts = []) {
	const unmatchedMounts = [...savedMounts];
	const newMounts = buildMountConfiguration(level);

	for (let i = 0; i < newMounts.length; i++) {
		const matchingMountIdx = unmatchedMounts.findIndex(
			mount => mountsHaveSameSource(mount, newMounts[i]));
		if (matchingMountIdx < 0)
			continue;

		const savedMount = unmatchedMounts.splice(matchingMountIdx, 1)[0];

		// integrated mounts handling
		if (!newMounts[i].tags?.integrated)
			newMounts[i] = cloneMount(savedMount, newMounts[i].tags);
	}

	return newMounts;
}

/**
 * Get the last populated mod list up to this level
 * 
 * @param {number} level
 * @returns {Array<string>}
 */
export function getEffectiveMods(level) {
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].unusedModIds?.length > 0)
			return roadmap.ll[i].unusedModIds;
	}

	return [];
}

/**
 * Get the last populated weapon loadout up to this level
 * 
 * @param {number} level
 * @returns {Array<Object>}
 */
export function getEffectiveMounts(level) {
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].mounts)
			return roadmap.ll[i].mounts;
	}

	return [];
}

/**
 * Create this level's own loadout before applying a user weapon selection.
 * The derived configuration is cloned so prior levels remain unchanged.
 *
 * @param {number} level
 * @returns {Array<Object>}
 */
export function reconfigureMounts(level) {
	const normalizedMounts = normalizeMounts(level, getEffectiveMounts(level));
	roadmap.ll[level].mounts = normalizedMounts;
	return normalizedMounts;
}

/**
 * Apply a weapon selection to an existing mount
 * Where a level's loadout is inherited, create a new roadmap entry
 *
 * @param {number} level
 * @param {number} mountIdx
 * @param {number} slotIdx
 * @param {string} id
 */
export function setWeaponSelection(level, mountIdx, slotIdx, id, data = null) {
	const mounts = normalizeMounts(level, getEffectiveMounts(level));
	const mount = mounts[mountIdx];
	if (!mount)
		return;

	const weapon = mount.weapons[slotIdx];

	if (!id && weapon?.tags?.mod) {
		// remove any mods on this weapon and return to the unused mod list
		roadmap.ll[level].unusedModIds.push(weapon.tags.mod);
		delete weapon.tags.mod;
	}

	if (weapon?.tags && data?.mod)
		// add specified mod
		weapon.tags.mod = data.mod;

	// set loadout at this level, with updated weapon slot
	roadmap.ll[level].mounts = mounts;
	mount.weapons[slotIdx].id = id ?? null;

	// dynamic weapon slots for flex mounts
	if (mount.type === 'Flex') {
		mount.weapons = getMountSlots(mount).map((slot, idx) => {
			if (idx >= mount.weapons.length)
				return { id: null, tags: {} };
			return mount.weapons[idx];
		});
	}
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
	const mounts = getEffectiveMounts(level);

	// reject invalid weapons, unpermitted exotics, integrated weapons
	if (!candidate ||
		!roadmap.allowExotics && doesWeaponHaveTag(id, TAGS.EXOTIC) ||
		isFrameIntegratedItem(id))
		return false;

	// reject weapons that cannot fit on the target slot
	if (!slotDefinition?.allowedWeaponMounts.includes(candidate.mount))
		return false;

	// superheavy weapons require two mounts
	if (candidate.mount === 'Superheavy' && mounts.length < 2)
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
		id !== selectedId &&
		mounts.flatMap(mount => mount.weapons)
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