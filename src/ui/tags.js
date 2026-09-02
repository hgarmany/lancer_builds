import {
	srcData
} from '../data/loader.js';

import {
	modUpdate,
	mountTagUpdate
} from './updates.js';

import {
	getWeaponNumUses,
	getUnassignedMountTags,
	getMountAttachmentLabel,
	getEffectiveMods,
	assignMountAttachment,
	removeMountAttachment,
	assignWeaponMod,
	removeWeaponMod
} from '../rules/weapons.js';

import {
	getSystemNumUses
} from '../rules/systems.js';

export const MOD_TRANSFER_TYPE = 'application/x-lancer-weapon-mod';
export const MOUNT_TRANSFER_TYPE = 'application/x-lancer-mount-attachment';

function setTagTransferData(event, type, data) {
	const serializedData = JSON.stringify(data);
	event.dataTransfer.effectAllowed = 'move';
	event.dataTransfer.setData(type, serializedData);
	event.dataTransfer.setData('text/plain', serializedData);
}

function getTagTransferData(event, type) {
	const serializedData = event.dataTransfer.getData(type);
	if (!serializedData)
		return null;

	try {
		return JSON.parse(serializedData);
	}
	catch {
		return null;
	}
}

/**
 * Make an unused mod tag draggable onto a weapon at the same level
 *
 * @param {number} level
 * @param {HTMLElement} tag
 * @param {string} modId
 */
function applyUnusedModDragManager(level, tag, modId) {
	tag.draggable = true;
	tag.addEventListener('dragstart', event => {
		setTagTransferData(event, MOD_TRANSFER_TYPE,
			{ level, modId, source: 'unused' });
	});
}

/**
 * Make an applied mod draggable and wire its removal button
 *
 * @param {number} level
 * @param {HTMLElement} tag
 * @param {HTMLButtonElement} removeButton
 * @param {number} mountIdx
 * @param {number} slotIdx
 * @param {string} modId
 */
function applyWeaponTagManager(
	level,
	tag,
	removeButton,
	mountIdx,
	slotIdx,
	modId
) {
	tag.draggable = true;
	tag.addEventListener('dragstart', event => {
		if (event.target === removeButton) {
			event.preventDefault();
			return;
		}

		setTagTransferData(event, MOD_TRANSFER_TYPE,
			{ level, modId, source: 'weapon', mountIdx, slotIdx });
	});

	// remove mod from slot, return to unused list
	removeButton.addEventListener('click', event => {
		event.stopPropagation();
		if (removeWeaponMod(level, mountIdx, slotIdx))
			modUpdate(level, [mountIdx]);
	});
}

export function dropMountTag(event, level, mount) {
	const transfer = getTagTransferData(event, MOUNT_TRANSFER_TYPE);
	mount.blur();
	if (!transfer || level !== Number(transfer.level))
		return;

	event.preventDefault();
	event.stopPropagation();
	const targetMountIdx = Number(mount.dataset.mountIdx);
	const sourceMountIdx = transfer.source === 'mount'
		? Number(transfer.mountIdx)
		: null;

	if (assignMountAttachment(
		level, targetMountIdx, transfer.id, sourceMountIdx)) {
		mountTagUpdate(level, [sourceMountIdx, targetMountIdx]
			.filter(index => index != null));
	}
}

export function dropWeaponTag(event, level, weaponSelector) {
	if (!event.dataTransfer.types.includes(MOD_TRANSFER_TYPE))
		return;
	event.preventDefault();
	event.stopPropagation();

	const mountIdx = Number(weaponSelector.dataset.mountIdx);
	const slotIdx = Number(weaponSelector.dataset.slotIdx);
	const updatedSelector = document.querySelector(
		`#mount-${mountIdx}-ll-${level} ` +
		`.weapon-select[data-slot-idx="${slotIdx}"]`);

	const transfer = getTagTransferData(event, MOD_TRANSFER_TYPE);
	if (!transfer || level !== Number(transfer.level))
		return;

	const source = transfer.source === 'weapon' ? {
		mountIdx: Number(transfer.mountIdx),
		slotIdx: Number(transfer.slotIdx)
	} : null;
	const didAssign = assignWeaponMod(
		level,
		mountIdx,
		slotIdx,
		transfer.modId,
		source
	);

	if (didAssign) {
		const affectedMounts = source ?
			[source.mountIdx, mountIdx] : [mountIdx];
		modUpdate(level, affectedMounts);
	}
}

/**
 * Assigns event listeners to a target so that it can receive
 * drag-and-drop tags
 * 
 * @param {number} level
 * @param {HTMLDivElement} target
 */
export function applyAttachmentManager(
	level,
	target,
	dropFunction,
	transferType
) {
	target.addEventListener('dragover', event => {
		if (!event.dataTransfer.types.includes(transferType))
			return;

		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer.dropEffect = 'move';
		target.classList.add('drag-focus');
	});

	target.addEventListener('dragleave', event => {
		if (!target.contains(event.relatedTarget))
			target.classList.remove('drag-focus');
	});

	target.addEventListener('drop', event => {
		if (!event.dataTransfer.types.includes(transferType))
			return;

		target.classList.remove('drag-focus');
		dropFunction(event, level, target);
	});
}

function renderMountTag(level, id) {
	const tag = document.createElement('div');
	tag.className = 'tag mount-tag';
	tag.textContent = getMountAttachmentLabel(id);
	tag.draggable = true;
	tag.addEventListener('dragstart', event => {
		setTagTransferData(event, MOUNT_TRANSFER_TYPE,
			{ level, id, source: 'unused' });
	});

	return tag;
}

function renderWeaponTag(level, id) {
	const tag = document.createElement('div');
	tag.className = 'tag mod-tag';
	tag.textContent = srcData.mods.get(id)?.name ?? '';

	applyUnusedModDragManager(level, tag, id);

	return tag;
}

function renderTagsMenu(level, type, getTags, renderTag) {
	const menu = document.createElement('div');
	menu.id = `${type}-tags-ll-${level}`;
	menu.className = 'tag-menu';

	const tagList = getTags(level);

	// omit menu when no options are available
	if (!tagList) {
		menu.style.display = 'none';
		return menu;
	}

	menu.style.display = 'flex';
	// populate tag menu
	for (const tag of tagList)
		menu.append(renderTag(level, tag));

	return menu;
}

export function renderMountTagsMenu(level) {
	return renderTagsMenu(level, 'mount', getUnassignedMountTags, renderMountTag);
}

export function renderWeaponTagsMenu(level) {
	return renderTagsMenu(level, 'weapon', getEffectiveMods, renderWeaponTag);
}

export function renderMountTags(level, data, mountIdx) {
	const tags = document.createElement('div');
	tags.className = 'mount-tags';

	for (const id of data.tags?.attachments ?? []) {
		const tag = document.createElement('div');
		tag.className = 'tag mount-tag applied-tag';
		tag.draggable = true;

		const label = document.createElement('span');
		label.textContent = getMountAttachmentLabel(id);

		const remove = document.createElement('button');
		remove.className = 'clear';
		remove.type = 'button';
		remove.title = `Remove ${getMountAttachmentLabel(id)}`;

		tag.addEventListener('dragstart', event => {
			if (event.target === remove) {
				event.preventDefault();
				return;
			}
			setTagTransferData(event, MOUNT_TRANSFER_TYPE,
				{ level, id, source: 'mount', mountIdx });
		});

		remove.addEventListener('click', event => {
			event.stopPropagation();
			if (removeMountAttachment(level, mountIdx, id))
				mountTagUpdate(level, [mountIdx]);
		});

		tag.append(label, remove);
		tags.append(tag);
	}

	tags.style.display = (tags.children.length === 0) ? 'none' : 'flex';

	return tags;
}

export function renderWeaponTags(level, weapon, mountIdx, slotIdx) {
	const tags = document.createElement('div');
	tags.className = 'weapon-tags';

	const modId = weapon?.tags?.mod;

	if (modId) {
		const mod = srcData.mods.get(modId);

		if (mod) {
			const tag = document.createElement('div');
			tag.className = 'tag mod-tag applied-tag';

			const label = document.createElement('span');
			label.textContent = mod.name;

			const remove = document.createElement('button');
			remove.className = 'clear';
			remove.type = 'button';
			remove.title = `Remove ${mod.name}`;

			tag.append(label, remove);
			applyWeaponTagManager(
				level, tag, remove, mountIdx, slotIdx, modId);

			tags.append(tag);
		}
	}
	
	if (weapon?.id) {
		const limited = getWeaponNumUses(level, weapon.id);
		
		if (limited) {
			// limited uses tag
			const tag = document.createElement('div');
			tag.className = 'tag limited';
			tag.textContent = `Limited ${limited}`;

			tags.append(tag);
		}
	}

	if (tags.children.length == 0)
		tags.style.display = 'none';
	else
		tags.style.display = 'flex';

	return tags;
}

export function renderSystemTags(level, systemId) {
	const tags = document.createElement('div');
	tags.className = 'system-tags';

	const limited = getSystemNumUses(level, systemId);
	if (limited != null) {
		const tag = document.createElement('div');
		tag.className = 'tag limited';
		tag.textContent = `Limited ${limited}`;
		tags.append(tag);
	}

	tags.hidden = tags.children.length === 0;
	return tags;
}

export function refreshSystemTags(level, selector, systemId) {
	const currentTags = selector.querySelector('.system-tags');
	const updatedTags = renderSystemTags(level, systemId);

	if (currentTags)
		currentTags.replaceWith(updatedTags);
	else
		selector.append(updatedTags);
}