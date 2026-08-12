/** 
 * ui/refreshRenderModules.js
 * 
 * a library of render modules that perform specific visual updates
 * in response to user input
 */

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	MAX_HASE_RANK
} from '../constants.js';

import {
	SELECT_TEMPLATE,
	renderSelector
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
 * @param {number} level 
 * @param {Object} template 
 */
export function refreshSelectors(
	template,
	level,
	maxLevel = roadmap.maxLevel
) {
	const srcItems = template.getSrcItems();

	for (let i = level; i <= maxLevel; i++) {
		const selectGroup = document.getElementById(
			`${template.type}-ll-${i}`);

		if (!selectGroup)
			continue;

		for (const select of selectGroup.children) {
			let selectionIsInvalid = false;

			for (const option of select) {
				if (option.value === '')
					continue;

				const context = {
					level: i,
					id: option.value,
					selectedId: select.value,
					item: srcItems.get(option.value)
				};

				const disable = !template.getEligibility(context);

				option.innerHTML = template.getLabel?.(context);
				option.hidden = disable;
				option.disabled = disable;

				if (option.selected && disable)
					selectionIsInvalid = true;
			}

			select.classList.toggle('error', selectionIsInvalid);
		}
	}
}

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

	let newIdx = 0;

	for (const select of Array.from(selectGroup.children)) {
		// remove any vacant system slots, adjust indices
		if (select.value === '')
			select.remove();
		else
			select.dataset.idx = newIdx++;
	}

	if (hasEligibleSystem(level)) {
		// generate prototype selector
		const selectTemplate =
			renderSelector({ level, ...SELECT_TEMPLATE.SYSTEM });
		selectTemplate.dataset.idx = newIdx;
		selectTemplate.value = '';

		// wire selector to perform page updates when selection changes
		selectTemplate.addEventListener('change', event =>
			SELECT_TEMPLATE.SYSTEM.changeEvent(event, level));

		// add empty selector to list
		selectGroup.append(selectTemplate);
	}
}