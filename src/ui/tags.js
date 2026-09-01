import {
    srcData
} from '../data/loader.js';

import {
    setSelectorFocus
} from './selectors.js';

import {
    modUpdate
} from './updates.js';

import {
	getWeaponNumUses,
	getUnassignedMountTags,
	getEffectiveMods,
    assignWeaponMod,
    removeWeaponMod
} from '../rules/weapons.js';

const MOD_TRANSFER_TYPE = 'application/x-lancer-weapon-mod';

function setModTransferData(event, data) {
    const serializedData = JSON.stringify(data);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(MOD_TRANSFER_TYPE, serializedData);
    event.dataTransfer.setData('text/plain', serializedData);
}

function getModTransferData(event) {
    const serializedData = event.dataTransfer.getData(MOD_TRANSFER_TYPE) ||
        event.dataTransfer.getData('text/plain');
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
        setModTransferData(event, {
            level,
            modId,
            source: 'unused'
        });
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

        setModTransferData(event, {
            level,
            modId,
            source: 'weapon',
            mountIdx,
            slotIdx
        });
    });

    // remove mod from slot, return to unused list
    removeButton.addEventListener('click', event => {
        event.stopPropagation();
        if (removeWeaponMod(level, mountIdx, slotIdx))
            modUpdate(level, [mountIdx]);
    });
}

export function applyMountAttachmentManager(level, mount) {
	// TODO
}

/**
 * Assigns event listeners to a selector so that it can receive
 * drag-and-drop mods
 * 
 * @param {number} level
 * @param {HTMLDivElement} selector
 */
export function applyWeaponAttachmentManager(level, selector) {
    // drag-drop mods onto this weapon
    selector.addEventListener('dragover', event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        selector.querySelector('.selector-control').focus();
    });
    selector.addEventListener('dragleave', event => {
        if (!selector.contains(event.relatedTarget))
            selector.querySelector('.selector-control').blur();
    });
    selector.addEventListener('drop', event => {
        event.preventDefault();
        event.stopPropagation();

        const mountIdx = Number(selector.dataset.mountIdx);
        const slotIdx = Number(selector.dataset.slotIdx);
        const updatedSelector = document.querySelector(
            `#mount-${mountIdx}-ll-${level} ` +
            `.weapon-select[data-slot-idx="${slotIdx}"]`);
        setSelectorFocus(updatedSelector, false);

        const transfer = getModTransferData(event);
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
            const affectedMounts = source ? [source.mountIdx, mountIdx] : [mountIdx];
            modUpdate(level, affectedMounts);
        }
    });
}

function renderMountTag(level, id) {
	const tag = document.createElement('div');
	tag.className = 'tag mount-tag';

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

export function renderMountTags(level, data) {
	const tags = document.createElement('div');
	tags.className = 'mount-tags';

	for (const id of data.tags?.mods ?? []) {
		const tag = document.createElement('div');
		tags.className = 'tag mount-tag applied-tag';

		tags.append(tag);
	}

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
		
		if (limited >= 0) {
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