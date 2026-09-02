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

export const MOUNT_ATTACHMENT = Object.freeze({
	AUTO_STABILIZING: 'cb_auto_stabilizing_hardpoints',
	MOUNT_RETROFITTING: 'cb_mount_retrofitting',
	SUPERHEAVY_BRACING: 'superheavy_bracing'
});

const MOUNT_ATTACHMENT_LABELS = Object.freeze({
	[MOUNT_ATTACHMENT.AUTO_STABILIZING]: 'Auto-Stabilizing Hardpoints',
	[MOUNT_ATTACHMENT.MOUNT_RETROFITTING]: 'Mount Retrofitting',
	[MOUNT_ATTACHMENT.SUPERHEAVY_BRACING]: 'Superheavy Bracing'
});

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
 * @param {number} level
 * @param {string} id
 * @returns {string}
 */
export function getWeaponNumUses(level, id) {
	return getItemNumUses(level, srcData.weapons.get(id));
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
	if (mount.tags?.attachments?.includes(
		MOUNT_ATTACHMENT.SUPERHEAVY_BRACING))
		return [];

	const mountType = getEffectiveMountType(mount);
	if (mountType !== 'Flex')
		return MOUNT_SLOTS[mountType] ?? [];

	// flex mount acts like an aux/aux mount
	// if either slot has an aux weapon
	const firstWeapon = srcData.weapons.get(mount.weapons?.[0]?.id);
	const secondWeapon = srcData.weapons.get(mount.weapons?.[1]?.id);
	const doTwoSlots = firstWeapon?.mount === 'Auxiliary' ||
		!firstWeapon && secondWeapon?.mount === 'Auxiliary';
	return doTwoSlots ? [MAIN_SLOT, AUXILIARY_SLOT] : [MAIN_SLOT];
}

/**
 * Get the mount type after special mount alterations are applied
 *
 * @param {Object} mount
 * @returns {string}
 */
export function getEffectiveMountType(mount) {
	return mount.tags?.attachments?.includes(
		MOUNT_ATTACHMENT.MOUNT_RETROFITTING)
		? 'Main/Aux'
		: mount.type;
}

export function getMountAttachmentLabel(id) {
	return srcData.coreBonuses.get(id)?.name ??
		MOUNT_ATTACHMENT_LABELS[id] ?? id;
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
	const attachments = mount.tags?.attachments;
	return {
		...mount,
		weapons: (mount.weapons ?? []).map(weapon => ({
			...weapon,
			tags: { ...(weapon.tags ?? {}) }
		})),
		tags: {
			...(mount.tags ?? {}),
			...tags,
			...(attachments ? { attachments: [...attachments] } : {})
		}
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

export function getUnassignedMountTags(level) {
	const unassigned = getGrantedMountTags(level);
	const assigned = getEffectiveMounts(level)
		.flatMap(mount => mount.tags?.attachments ?? []);

	for (const id of assigned) {
		const index = unassigned.indexOf(id);
		if (index >= 0)
			unassigned.splice(index, 1);
	}

	return unassigned;
}

function getGrantedMountTags(level, mounts = getEffectiveMounts(level)) {
	const granted = [];

	for (const id of [
		MOUNT_ATTACHMENT.AUTO_STABILIZING,
		MOUNT_ATTACHMENT.MOUNT_RETROFITTING
	]) {
		if (coreBonuses[level]?.includes(id))
			granted.push(id);
	}

	for (const mount of mounts) {
		for (const weapon of mount.weapons ?? []) {
			if (srcData.weapons.get(weapon.id)?.mount === 'Superheavy')
				granted.push(MOUNT_ATTACHMENT.SUPERHEAVY_BRACING);
		}
	}

	return granted;
}

function resizeMountToAttachments(level, mount) {
	const slotCount = getMountSlots(mount).length;
	while (mount.weapons.length > slotCount) {
		const removedWeapon = mount.weapons.pop();
		if (removedWeapon?.tags?.mod)
			reconfigureMods(level).push(removedWeapon.tags.mod);
	}

	while (mount.weapons.length < slotCount)
		mount.weapons.push({ id: null, tags: {} });
}

function mountCanReceiveAttachment(mount, id) {
	if (!mount || mount.tags?.integrated ||
		mount.tags?.attachments?.includes(id))
		return false;

	switch (id) {
		case MOUNT_ATTACHMENT.MOUNT_RETROFITTING:
			return getEffectiveMountType(mount) !== 'Main/Aux';
		case MOUNT_ATTACHMENT.SUPERHEAVY_BRACING:
			return !(mount.weapons ?? []).some(weapon => weapon.id);
	}

	return true;
}

/**
 * Attach an available mount effect from either
 * another mount or the unused attachment list
 */
export function assignMountAttachment(
	level,
	targetMountIdx,
	id,
	sourceMountIdx = null
) {
	if (!id)
		return false;

	const mounts = normalizeMounts(level, getEffectiveMounts(level));
	const target = mounts[targetMountIdx];
	if (!mountCanReceiveAttachment(target, id))
		return false;

	if (sourceMountIdx == null) {
		if (!getUnassignedMountTags(level).includes(id))
			return false;
	}
	else {
		const sourceAttachments = mounts[sourceMountIdx]?.tags?.attachments;
		const sourceIndex = sourceAttachments?.indexOf(id) ?? -1;
		if (sourceIndex < 0)
			return false;
		sourceAttachments.splice(sourceIndex, 1);
		resizeMountToAttachments(level, mounts[sourceMountIdx]);
	}

	target.tags.attachments ??= [];
	target.tags.attachments.push(id);
	resizeMountToAttachments(level, target);
	roadmap.ll[level].mounts = mounts;
	return true;
}

export function removeMountAttachment(level, mountIdx, id) {
	const mounts = normalizeMounts(level, getEffectiveMounts(level));
	const mount = mounts[mountIdx];
	const attachmentIndex = mount?.tags?.attachments?.indexOf(id) ?? -1;
	if (attachmentIndex < 0)
		return false;

	mount.tags.attachments.splice(attachmentIndex, 1);
	resizeMountToAttachments(level, mount);
	roadmap.ll[level].mounts = mounts;
	return true;
}

/**
 * Remove mount attachments that are no longer granted at this level
 * Returns the indexes whose display/slot configuration changed
 */
export function reconcileMountAttachments(level) {
	const effectiveMounts = getEffectiveMounts(level);
	const mounts = normalizeMounts(level, effectiveMounts);
	const available = getGrantedMountTags(level, mounts);
	const affected = [];

	for (let mountIdx = 0; mountIdx < mounts.length; mountIdx++) {
		const mount = mounts[mountIdx];
		const current = mount.tags?.attachments ?? [];
		const retained = [];

		for (const id of current) {
			const availableIdx = available.indexOf(id);
			if (availableIdx < 0)
				continue;
			available.splice(availableIdx, 1);
			retained.push(id);
		}

		if (retained.length !== current.length) {
			mount.tags.attachments = retained;
			resizeMountToAttachments(level, mount);
			affected.push(mountIdx);
		}
	}

	if (affected.length)
		roadmap.ll[level].mounts = mounts;

	return affected;
}

/**
 * Get the last populated mod list up to this level
 * 
 * @param {number} level
 * @returns {Array<string>}
 */
export function getEffectiveMods(level) {
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].unusedModIds != null)
			return roadmap.ll[i].unusedModIds;
	}

	return null;
}

/**
 * Grab the correct mods for this level and
 * assign a copy list if the list is null
 *
 * @param {number} level
 * @returns {Array<string>}
 */
export function reconfigureMods(level) {
	const levelData = roadmap.ll[level];
	if (levelData.unusedModIds == null)
		levelData.unusedModIds = [...getEffectiveMods(level) ?? []];

	return levelData.unusedModIds;
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
 * Produces a string to uniquely identify mount configurations
 * Is agnostic toward the actual contents of mounts: weapons, mods, etc.
 * 
 * @param {Array<Object>} mounts
 * @returns {string}
 */
function getMountConfigurationKey(mounts) {
	return JSON.stringify(mounts.map(mount => [
		mount.type,
		mount.tags?.source ?? null,
		mount.tags?.integrated ?? null
	]));
}

/**
 * Create this level's own loadout before applying a user weapon selection.
 * The derived configuration is cloned so prior levels remain unchanged.
 *
 * @param {number} level
 * @returns {Array<Object>}
 */
export function reconfigureMounts(level) {
	const effectiveMounts = getEffectiveMounts(level);
	const normalizedMounts = normalizeMounts(level, effectiveMounts);
	if (getMountConfigurationKey(normalizedMounts) ===
		getMountConfigurationKey(effectiveMounts))
		return effectiveMounts;

	roadmap.ll[level].mounts = normalizedMounts;

	return normalizedMounts;
}

/**
 * Resize a Flex mount when its first weapon changes size
 * Transfers mods to new mount type as necessary
 *
 * @param {number} level
 * @param {Object} mount
 */
function resizeFlexMount(level, mount) {
	const slotCount = getMountSlots(mount).length;

	if (mount.weapons.length > slotCount) {
		const removedWeapon = mount.weapons[1];
		mount.weapons.length = 1;

		const modId = removedWeapon.tags.mod;
		if (modId)
			mount.weapons[0].tags.mod = modId;
	}
	else if (mount.weapons.length < slotCount) {
		mount.weapons.push({ id: null, tags: {} });
	}
}

/**
 * Attach a mod to an unmodded slot
 * Draws mod from a source slot or the unused mod list
 *
 * @param {number} level
 * @param {number} targetMountIdx
 * @param {number} targetSlotIdx
 * @param {string} modId
 * @param {{ mountIdx: number, slotIdx: number }|null} source
 * @returns {boolean}
 */
export function assignWeaponMod(
	level,
	targetMountIdx,
	targetSlotIdx,
	modId,
	source = null
) {
	if (!modId)
		return false;

	const mounts = normalizeMounts(level, getEffectiveMounts(level));
	const targetWeapon = mounts[targetMountIdx]?.weapons[targetSlotIdx];
	if (!targetWeapon?.id || targetWeapon.tags?.mod)
		return false;
	roadmap.ll[level].mounts = mounts;

	if (source) {
		// remove mod from its source slot
		delete mounts[source.mountIdx]?.weapons[source.slotIdx]?.tags.mod;
	}
	else {
		// remove mod from the unused mod list
		const unusedModIds = reconfigureMods(level);
		const modIdx = unusedModIds.indexOf(modId);
		if (modIdx < 0)
			return false;
		unusedModIds.splice(modIdx, 1);
	}

	// add mod to the target slot
	targetWeapon.tags.mod = modId;
	return true;
}

/**
 * Remove a mod from a weapon and return it to this level's unused mod list
 *
 * @param {number} level
 * @param {number} mountIdx
 * @param {number} slotIdx
 * @returns {boolean}
 */
export function removeWeaponMod(level, mountIdx, slotIdx) {
	const mounts = normalizeMounts(level, getEffectiveMounts(level));
	const weapon = mounts[mountIdx]?.weapons[slotIdx];
	const modId = weapon?.tags?.mod;
	if (!modId)
		return false;
	roadmap.ll[level].mounts = mounts;

	// remove mod data
	delete weapon.tags.mod;
	const unusedModIds = reconfigureMods(level);
	if (!unusedModIds.includes(modId))
		unusedModIds.push(modId);

	return true;
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
	roadmap.ll[level].mounts = mounts;

	const weapon = mount.weapons[slotIdx];

	if (!id && weapon?.tags?.mod) {
		// remove any mods on this weapon and return to the unused mod list
		reconfigureMods(level).push(weapon.tags.mod);
		delete weapon.tags.mod;
	}

	// insert new weapon data
	weapon.id = id ?? null;
	if (data?.mod)
		weapon.tags.mod = data.mod;

	// dynamic weapon slots for flex mounts
	if (mount.type === 'Flex')
		resizeFlexMount(level, mount);
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

	// talent-issued weapons cannot be attached via selector
	if (candidate.talent_item)
		return false;

	// gms weapons are always eligible
	if (!candidate.license_id)
		return true;

	// allow weapons at or below the level's license rank
	return candidate.license_level <=
		licenses[level].get(candidate.license_id);
}