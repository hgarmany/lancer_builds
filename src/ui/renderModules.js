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
	calculateMechStats,
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
function refreshHexes(level, id) {
	const hexGroup = document.getElementById(`hase-ll-${level}`);

	for (const hex of hexGroup.children) {
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
		if (statBubble)
			statBubble.textContent = value;
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

function updateHASEWaterfall(level, id, doIncrement) {
	// update roadmap and cumulative catalog
	updateHASELog(level, id, doIncrement);

	// update each level's hex displays, stat table, and SP budget pill
	for (let i = 0; i <= roadmap.maxLevel; i++) {
		refreshHexes(level, id);
		refreshStats(i);
		refreshBudgetPill(i);
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
		action: () => updateHASEWaterfall(level, id, true),
		disabled: !allowIncreaseHASE(level, id)
	});

	const decrease = renderHASEButton({
		symbol: '\u2212',
		className: 'decrease',
		label: `Remove ${id} point assigned at LL${level}`,
		action: () => updateHASEWaterfall(level, id, false),
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
		<span id="budget-free-ll-${level}">${stats.sp_budget}</span> /
		<span id="budget-total-ll-${level}">${stats.sp}</span> SP`;

	return budgetPill;
}