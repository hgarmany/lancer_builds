/**
 * ui/updates.js
 * 
 * a library of update coordinators for various user inputs
 * drives back-end data writes and front end refreshes
 */

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	getSelectorValue,
	setSelectorValue,
	setSelectorClass,
	SELECT_TEMPLATE
} from './selectors.js';

import {
	getFrameImageSrc
} from './renderModules.js';

import {
	refreshSelectors,
	refreshHexes,
	refreshHASETooltip,
	refreshStats,
	refreshBudgetPill,
	refreshElectiveSystemList
} from './refreshRenderModules.js';

import {
	updateHASELog
} from '../rules/hase.js';

import {
	getEffectiveFrameId
} from '../rules/frames.js';

/**
 * Update this particular selector's occupied status and
 * write database changes to record user selection
 * 
 * @param {Event} event 
 * @param {Object} template 
 */
export function selectionUpdate(event, template) {
	const eventSelect = event.currentTarget;
	const currentLevel = Number(eventSelect.dataset.ll);
	const idx = Number(eventSelect.dataset.idx);

	const newId = getSelectorValue(eventSelect);

	// update this selector
	setSelectorClass(eventSelect, 'occupied', newId);

	// update roadmap and cumulative catalog
	template.write({ level: currentLevel, idx, id: newId });
}

export function skillTriggerUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.SKILL_TRIGGER);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SKILL_TRIGGER, level);
}

export function talentUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.TALENT);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.TALENT, level);

	// update integrated mounts and systems
	for (let i = 0; i <= roadmap.maxLevel; i++)
		refreshElectiveSystemList(i);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function licenseUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.LICENSE);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.LICENSE, level);
	refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, level);
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function coreBonusUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.CORE_BONUS);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, level);

	// update stats and all mounts
	refreshStats(level);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function updateHASEWaterfall(level, id, doIncrement) {
	// update roadmap and cumulative catalog
	updateHASELog(level, id, doIncrement);
	refreshHASETooltip(level);

	// update each level's hex displays, stat table, and systems menu
	for (let i = 0; i <= roadmap.maxLevel; i++) {
		refreshHexes(i, id);
		refreshStats(i);
		refreshBudgetPill(i);
		refreshElectiveSystemList(i);
	}

	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

/**
 * Frame cells default to mimic the last cell where the user
 * specified a particular frame
 * 
 * @param {Event} event 
 * @param {number} level 
 */
export function activeFrameWaterfall(event, level) {
	const value = event.currentTarget.value;

	for (let i = level; i <= roadmap.maxLevel; i++) {
		if (roadmap.ll[i].frameId === getEffectiveFrameId(i - 1))
			roadmap.ll[i].frameId = null;

		if (i !== level && roadmap.ll[i].frameId)
			break;

		cumulativeCatalog.activeFrame[i] = value;

		// update frame image
		const icon = document.getElementById(
			`${SELECT_TEMPLATE.FRAME.type}-ll-${i}-icon`);
		icon.src = getFrameImageSrc(value) ?? '';

		const select = document.getElementById(
			`${SELECT_TEMPLATE.FRAME.type}-ll-${i}`)
			.querySelector('select');
		setSelectorValue(select, value);
		setSelectorClass(select, 'inherited', i !== level);
	}
}

export function frameUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.FRAME);
	activeFrameWaterfall(event, level);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);

	// update stats and budget pill in waterfall
	for (let i = level; i <= roadmap.maxLevel; i++) {
		refreshStats(i);
		refreshBudgetPill(i);
	}

	// full cell replacement for mounts
	// update integrated systems

	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function systemUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.SYSTEM);

	// update stats and budget pill
	refreshStats(level);
	refreshBudgetPill(level);
	refreshElectiveSystemList(level);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level, level);
	console.log(cumulativeCatalog.stats[level]);
}