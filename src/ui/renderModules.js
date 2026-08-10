// ui/renderModules.js

import {
	srcData
} from '../data/loader.js';

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	STAT_DEFINITIONS,
	DISPLAYED_MECH_STAT_IDS,
	MAX_HASE_RANK
} from '../constants.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE,
	updateHASELog
} from '../rules/hase.js';

import {
	didStatWorsen
} from '../rules/stats.js';

export const roadmapName = document.getElementById('roadmap-name');
export const maxLevelInput = document.getElementById('roadmap-max-level');
const levelRail = document.querySelector(".level-rail");
const levelTabs = document.getElementById("level-tabs");

const roadmapShell = document.getElementById("roadmap-shell");
const roadmapContainer = document.querySelector(".roadmap-container");
export const tableBody = document.getElementById("roadmap-body");
const tableHead = document.querySelector("#roadmap-table thead");

/**
 * 
 * 
 * @param {{
 *	symbol: string,
 *	className: string,
 *	tooltip: string,
 *	action: function,
 *	disabled: boolean
 * }} param0
 * @returns {HTMLButtonElement}
 */
function renderHASEButton({
	symbol,
	className,
	action,
	tooltip,
	disabled = false
}) {
	const button = document.createElement('button');
	button.className = `hase-button ${className}`;
	button.textContent = symbol;
	button.title = tooltip;
	button.disabled = disabled;

	button.addEventListener('click', action);
	return button;
}

/**
 * Lightweight UI update for stat hexes
 * +/- buttons and number values update
 * 
 * @param {number} level
 * @param {string} id
 */
function updateHASEWaterfall(level, id) {
	for (let i = level; i <= roadmap.maxLevel; i++) {
		const hexGroup = document.getElementById(`hase-ll-${i}`);

		for (const hex of hexGroup.children) {
			const hexId = hex.dataset.skillId;

			if (hexId === id) {
				const value = cumulativeCatalog.hase[i].get(id);
				hex.classList.toggle('error', value > MAX_HASE_RANK);
				hex.children[1].textContent = value ?? 0;
			}

			hex.children[0].disabled = !allowIncreaseHASE(i, hexId);
			hex.children[2].disabled = !allowDecreaseHASE(i, hexId);
		}
	}
}

/**
 * Draw a HASE hexagon with +/- knobs and number display
 * 
 * @param {number} level 
 * @returns {HTMLDivElement}
 */
export function renderHexStat(level, id) {
	const value = cumulativeCatalog.hase[level].get(id) ?? 0;

	// surrounding hex layout
	const hex = document.createElement('div');
	hex.className = 'hex';
	hex.classList.toggle('error', value > MAX_HASE_RANK);
	hex.dataset.skillId = id;

	// user increment/decrement controls
	const increase = renderHASEButton({
		symbol: '+',
		className: 'increase',
		label: `Add ${id} at LL${level}`,
		action: () => {
			updateHASELog(level, id, true);
			updateHASEWaterfall(level, id);
		},
		disabled: !allowIncreaseHASE(level, id)
	});

	const decrease = renderHASEButton({
		symbol: '\u2212',
		className: 'decrease',
		label: `Remove ${id} point assigned at LL${level}`,
		action: () => {
			updateHASELog(level, id, false);
			updateHASEWaterfall(level, id);
		},
		disabled: !allowDecreaseHASE(level, id)
	});

	// display stat
	const stat = document.createElement('div');
	stat.className = 'stat';
	stat.textContent = value ?? '0';

	hex.append(increase, stat, decrease);

	return hex;
}

/**
 * Get URL to a given frame's art
 * 
 * @param {string} frameId 
 * @returns {string}
 */
export function getFrameImageSrc(frameId) {
	return srcData.frames.get(frameId)?.image_url;
}

/**
 * Draw a label-value bubble for a given stat
 * 
 * @param {number} level 
 * @param {string} statId 
 * @param {number} value 
 * @returns {HTMLDivElement}
 */
function renderStatBubble(level, statId) {
	const statValue = cumulativeCatalog.stats[level]?.[statId];

	const statBubble = document.createElement('div');
	statBubble.className = 'stat-bubble';

	// mark for user attention any stats that have gotten worse this level
	// typically, the result of changing active frames
	if (didStatWorsen(cumulativeCatalog, level, statId))
		statBubble.classList.add('hazard');

	// label-value pair
	const label = document.createElement('span');
	label.className = 'stat-label';
	label.textContent = STAT_DEFINITIONS[statId].label ?? statId;

	const output = document.createElement('span');
	output.id = `stat-${statId}-ll-${level}`;
	output.className = 'stat-value';
	output.value = statValue;

	if (statValue !== null) {
		output.textContent =
			statId === 'size' && statValue < 1
				? '\u00BD'
				: String(statValue);
	}

	statBubble.append(label, output);
	return statBubble;
}

/**
 * Draw stats sub-table
 * 
 * @param {number} level
 * @returns {Array<HTMLDivElement>}
 */
export function renderStats(level) {
	return DISPLAYED_MECH_STAT_IDS.map(statId =>
		renderStatBubble(level, statId)
	);
}

/**
 * Draw fractional SP budget for the systems column
 * 
 * @param {number} level
 * @returns {HTMLDivElement}
 */
export function renderBudgetPill(level) {
	const stats = cumulativeCatalog.stats[level];

	const budgetPill = document.createElement('div');
	budgetPill.className = 'budget-pill';
	budgetPill.innerHTML = `
		<span class="budget-free">${stats.sp}</span> /
		<span class="budget-total">${stats.sp_budget}</span> SP`;

	return budgetPill;
}