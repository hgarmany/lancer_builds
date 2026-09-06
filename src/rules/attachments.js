// rules/attachments.js

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
	getEffectiveMounts,
	getEffectiveMountType,
	normalizeMounts,
	getMountSlots
} from './weapons.js';

const coreBonuses = cumulativeCatalog.coreBonuses;

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

export function getMountAttachmentLabel(id) {
	return srcData.coreBonuses.get(id)?.name ??
		MOUNT_ATTACHMENT_LABELS[id] ?? id;
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

	return [];
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