/** 
 * ui/refreshRenderModules.js
 * 
 * a library of render modules that perform specific visual updates
 * in response to user input
 */

import {
	roadmap,
	getEffectiveSystemLevel
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	MAX_HASE_RANK
} from '../constants.js';

import {
	SELECT_TEMPLATE,
	renderSelector,
	getSelectorValue,
	setSelectorClass,
	setOptionHidden
} from './selectors.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE,
	countUsedHASEPoints
} from '../rules/hase.js';

import {
	calculateMechStats,
	didStatWorsen
} from '../rules/stats.js';

import {
	hasEligibleSystem
} from '../rules/systems.js';

/**
 * Update option visibility within a selector class
 * at all levels starting from the given one
 * 
 * @param {Object} template
 * @param {number} level
 * @param {number} maxLevel
 */
export function refreshSelectors(
	template,
	level,
	maxLevel = roadmap.maxLevel
) {
	for (let i = level; i <= maxLevel; i++) {
		// all selectors of a given type and level belong to the same group
		const selectGroup = document.getElementById(
			`${template.type}-ll-${i}`);

		if (!selectGroup)
			continue;

		// roadmap is source of truth for all selector refreshes
		let roadmapData = template.readLevel(i);
		if (!(roadmapData instanceof Array))
			roadmapData = [roadmapData];
		if (template === SELECT_TEMPLATE.SYSTEM)
			roadmapData = roadmapData.map(item => item?.id ?? null);

		for (let idx = 0; idx < selectGroup.children.length; idx++) {
			let selectionIsInvalid = false;

			// selector adopts roadmap values
			const selector = selectGroup.children[idx];
			const selectedId = roadmapData[idx] ?? null;
			selector.value = selectedId;
			setSelectorClass(selector, 'occupied', selectedId);

			const options = selector.querySelector('.selector-menu').children;
			for (const option of options) {
				// update visibility and, where appropriate, rank #
				const id = option.value;
				if (!id)
					continue;

				const context = { level: i, id, selectedId };
				option.innerHTML = template.getLabel?.(context);

				const disable = !template.getEligibility(context);
				setOptionHidden(option, disable);
				if (disable && id === selectedId)
					selectionIsInvalid = true;
			}

			const label = selector.querySelector('.selector-value');
			if (label)
				label.textContent = selectedId
					? template.getLabel?.({ level: i, id: selectedId })
					: template.placeholderText ?? '';
			setSelectorClass(selector, 'error', selectionIsInvalid);
		}
	}
}

/**
 * Selectively update the numerator of the HASE point tooltip
 * 
 * @param {number} level
 */
export function refreshHASETooltip(level) {
	document.getElementById(`hase-ll-${level}`)
		.querySelector('.hase-spent').textContent = countUsedHASEPoints(level);
}

/**
 * Lightweight UI update for stat hexes
 * +/- buttons and number values update
 * 
 * @param {number} level
 * @param {string} id
 */
export function refreshHexes(level, id) {
	const hexGroup = document.getElementById(`hase-ll-${level}`);

	for (const hex of hexGroup.querySelectorAll('.hex')) {
		const hexId = hex.dataset.skillId;

		if (hexId === id) {
			const value = cumulativeCatalog.hase[level].get(id);
			hex.classList.toggle('error', value > MAX_HASE_RANK);
			hex.children[1].textContent = value ?? 0;
		}

		hex.children[0].disabled = !allowIncreaseHASE(level, hexId);
		hex.children[2].disabled = !allowDecreaseHASE(level, hexId);
	}
}

/**
 * Refresh display stats values
 * 
 * @param {number} level
 */
export function refreshStats(level) {
	const stats = calculateMechStats(cumulativeCatalog, level);
	for (const [id, value] of Object.entries(stats)) {
		const statBubble = document.getElementById(`stat-${id}-ll-${level}`);
		if (statBubble) {
			statBubble.textContent = value;
			statBubble.classList.toggle('hazard',
				didStatWorsen(cumulativeCatalog, level, id));
		}
	}
	console.log(stats);
}

/**
 * Targeted replacement of free and total SP counts
 * 
 * @param {number} level
 */
export function refreshBudgetPill(level) {
	const stats = cumulativeCatalog.stats[level];

	document.getElementById(
		`budget-free-ll-${level}`).textContent = stats.sp_budget;
	document.getElementById(
		`budget-total-ll-${level}`).textContent = stats.sp;
}

export function refreshElectiveSystemList(level) {
	const selectGroup = document.getElementById(`system-ll-${level}`);
	if (!selectGroup)
		return;

	const systems = roadmap.ll[getEffectiveSystemLevel(level)].systems
		.filter(system => system?.id);
	const selectors = Array.from(selectGroup.children);

	// guarantee selector count matches exactly the number of systems installed
	for (let idx = 0; idx < systems.length; idx++) {
		if (idx < selectors.length) {
			selectors[idx].dataset.idx = idx;
		}
		else {
			const selector =
				renderSelector(level, systems[idx].id, SELECT_TEMPLATE.SYSTEM);
			selector.dataset.idx = idx;
			selectGroup.append(selector);
		}
	}

	// remove empty selectors
	for (let i = systems.length; i < selectors.length; i++) {
		selectors[i].remove();
	}

	if (hasEligibleSystem(level)) {
		// generate prototype selector
		const selector =
			renderSelector(level, null, SELECT_TEMPLATE.SYSTEM);
		selector.dataset.idx = systems.length;

		// add empty selector to list
		selectGroup.append(selector);
	}
}