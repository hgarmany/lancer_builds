// rules/attachments.js

import {
	roadmap,
	getEffectiveSystems
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

export const ATTACHMENT_ID = Object.freeze({
	AUTO_STABILIZING: 'cb_auto_stabilizing_hardpoints',
	MOUNT_RETROFITTING: 'cb_mount_retrofitting',
	SUPERHEAVY_BRACING: 'superheavy_bracing',
	OVERPOWER_CALIBER: 'cb_overpower_caliber'
});

const CORE_BONUS_ATTACHMENTS = Object.freeze({
	[ATTACHMENT_ID.AUTO_STABILIZING]: 'mount',
	[ATTACHMENT_ID.MOUNT_RETROFITTING]: 'mount',
	[ATTACHMENT_ID.OVERPOWER_CALIBER]: 'weapon'
});

export function getEligibleAttachments(level) {
	const tagList = [];

	// attachments from core bonuses
	for (const [id, type] of Object.entries(CORE_BONUS_ATTACHMENTS)) {
		const srcCB = coreBonuses[level]?.includes(id);
		if (srcCB)
			tagList.push({
				type,
				id,
				label: srcCB.name ?? id
			});
	}

	// superheavy bracing from a mounted superheavy weapon
	for (const mount of getEffectiveMounts(level)) {
		const hasBracing =
			(mount.type === 'Heavy' || mount.type === 'Superheavy') &&
			srcData.weapons.get(mount.weapons[0]?.id)?.mount === 'Superheavy';
		if (hasBracing)
			tagList.push({
				type: 'mount',
				id: ATTACHMENT_ID.SUPERHEAVY_BRACING,
				label: 'Superheavy Bracing'
			});
	}

	// weapon mods from systems
	for (const system of getEffectiveSystems(level)) {
		const srcSystem = srcData.mods.get(system.id);
		if (srcSystem)
			tagList.push({
				type: 'weapon_mod',
				id: system.id,
				label: srcSystem.name ?? system.id
			});
	}

	return tagList;
}

export function getUnusedAttachments(level) {
	const tagList = getEligibleAttachments(level);
	const mounts = getEffectiveMounts(level);

	// consolidate all mount and weapon attachments at this level
	const attachments = mounts.flatMap(mount => [
		...mount.attachments ?? [],
		...(mount.weapons ?? []).flatMap(weapon => weapon.attachments)
	]);

	// remove each attachment from the list
	for (const attachment of attachments) {
		const index = tagList.indexOf(attachment);
		if (index >= 0)
			tagList.splice(index, 1);
	}

	return tagList;
}

/**
 * Target-specific eligibility check for one attachment
 * 
 * @param {Object} target 
 * @param {string} attachmentID 
 * @returns {boolean}
 */
export function targetCanReceiveAttachment(target, attachmentID) {
	/**
	 * common target requirements:
	 * - not null
	 * - doesn't already have this attachment
	 * - not integrated
	 */
	if (!target ||
		target.attachments?.includes(attachmentID) ||
		target.integrated)
		return false;

	if (target.type) {
		/**
		 * mount target:
		 * - Mount Retrofitting will only apply to mounts it changes
		 * - Superheavy Bracing will only apply to empty mounts
		 */
		switch (id) {
			case ATTACHMENT_ID.MOUNT_RETROFITTING:
				return getEffectiveMountType(target) !== 'Main/Aux';
			case ATTACHMENT_ID.SUPERHEAVY_BRACING:
				return !(target.weapons ?? []).some(weapon => weapon.id);
		}

		return true;
	}
	else {
		/**
		 * weapon target:
		 * - mods cannot be placed on a weapon that already has a mod
		 */
		if (srcData.mods.has(attachmentID))
			return !target.attachments.some(attachment =>
				srcData.mods.has(attachment));
		return true;
	}
}

/**
 * Attempts to update the roadmap when attachment assignment changes
 * If there is a source location, the attachment is removed from it
 * If there is a target location, the attachment is added to it
 * 
 * @param {Object} context
 * @param {string} context.id
 * @param {Object} context.source
 * @param {Object} context.target
 * @returns {boolean}
 */
export function moveAttachment({
	id,
	source,
	target
}) {
	if (!id)
		return false;

	if (target) {
		// add attachment to a valid target
		if (targetCanReceiveAttachment(target, id))
			target.attachments.push(id);
		else
			return false;
	}

	if (source) {
		// remove attachment from a valid source
		const i = source.attachments.indexOf(id);
		if (i >= 0)
			source.attachments.splice(i, 1);
		else
			target?.pop();
		return i >= 0;
	}

	return true;
}

/**
 * Checks all attachment points on this level and
 * culls any attachments that are no longer eligible
 * Returns the indices of those mounts that must be re-rendered
 * 
 * @param {number} level 
 * @returns {Array<number>}
 */
export function updateAppliedAttachments(level) {
	const tagList = getEligibleAttachments(level);
	const mounts = [...getEffectiveMounts(level)];
	const affectedMountIndices = [];
	let initializeNewMounts = false;

	for (let i = 0; i < mounts.length; i++) {
		let mountChanged = false;

		mounts[i].attachments?.filter(attachment => {
			if (tagList.includes(attachment))
				return true;
			mountChanged = true;
			return false;
		});
		if (mounts[i].attachments?.length === 0)
			delete mount.attachments;

		for (const weapon of mounts[i].weapons) {
			weapon.attachments?.filter(attachment => {
				if (tagList.includes(attachment))
					return true;
				mountChanged = true;
				return false;
			});
			if (weapon.attachments?.length === 0)
				delete weapon.attachments;
		}

		if (mountChanged) {
			affectedMounts.push(i);
			initializeNewMounts = true;
		}
	}

	if (initializeNewMounts)
		roadmap.ll[level].mounts = mounts;

	return affectedMountIndices;
}