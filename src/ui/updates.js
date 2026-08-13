/**
 * ui/updates.js
 * 
 * a library of update coordinators for various user inputs
 * drives back-end data writes and front end refreshes
 */

import {
	roadmap,
	getEffectiveSystemLevel
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	getSelectorValue,
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
 * Write to the roadmap and cumulative catalog a user selection
 * 
 * @param {Event} event 
 * @param {Object} template 
 */
export function selectionUpdate(selector, template) {
	const currentLevel = Number(selector.dataset.ll);
	const idx = Number(selector.dataset.idx);

	const newId = selector.value;

	// update roadmap and cumulative catalog
	template.write({ level: currentLevel, idx, id: newId });
}

export function skillTriggerUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.SKILL_TRIGGER);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SKILL_TRIGGER, level);
}

export function talentUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.TALENT);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.TALENT, level);

	// update integrated mounts and systems
	for (let i = 0; i <= roadmap.maxLevel; i++)
		refreshElectiveSystemList(i);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function licenseUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.LICENSE);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.LICENSE, level);
	refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, level);
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function coreBonusUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.CORE_BONUS);

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
export function activeFrameWaterfall(selectValue, level) {
	for (let i = level; i <= roadmap.maxLevel; i++) {
		if (roadmap.ll[i].frameId === getEffectiveFrameId(i - 1))
			roadmap.ll[i].frameId = null;

		if (i !== level && roadmap.ll[i].frameId)
			break;

		cumulativeCatalog.activeFrame[i] = selectValue;

		// update frame image
		const icon = document.getElementById(
			`${SELECT_TEMPLATE.FRAME.type}-ll-${i}-icon`);
		icon.src = getFrameImageSrc(selectValue) ?? '';

		const selector = document.getElementById(
			`${SELECT_TEMPLATE.FRAME.type}-ll-${i}`)
			.querySelector('.custom-select');
		selector.value = selectValue;

		const label = selector.querySelector('.selector-value');
		if (label) {
			label.textContent =
				SELECT_TEMPLATE.FRAME
					.getLabel?.({ level, id: selectValue }) ?? '';
		}

		setSelectorClass(selector, 'inherited', i !== level);
	}
}

export function frameUpdate(selector, level) {
	selectionUpdate(selector, SELECT_TEMPLATE.FRAME);
	activeFrameWaterfall(selector.value, level);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);

	// update stats and budget pill in waterfall
	for (let i = level; i <= roadmap.maxLevel; i++) {
		refreshStats(i);
		refreshBudgetPill(i);
		refreshElectiveSystemList(i);
	}

	// full cell replacement for mounts
	// update integrated systems

	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

export function systemUpdate(selector, level) {
	/**
	 * systems menus quietly inherit configurations from previous levels
	 * 
	 * when the user manually selects a system in a level that is actually
	 * empty in the roadmap, first copy system configuration into this level
	 */
	const listSrcLevel = getEffectiveSystemLevel(level);
	if (listSrcLevel !== level)
		roadmap.ll[level].systems = [...roadmap.ll[listSrcLevel].systems];

	selectionUpdate(selector, SELECT_TEMPLATE.SYSTEM);

	// update stats and budget pill
	for (let i = level; i <= roadmap.maxLevel; i++) {
		refreshStats(i);
		refreshBudgetPill(i);
		refreshElectiveSystemList(i);
	}

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}