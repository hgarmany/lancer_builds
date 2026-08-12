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
	MAX_HASE_RANK,
	HASE_MAP
} from '../constants.js';

import {
	SELECT_TEMPLATE,
	refreshSelectors,
	refreshElectiveSystemList
} from './selectors.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE,
	countUsedHASEPoints,
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

function refreshHASETooltip(level) {
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
function refreshHexes(level, id) {
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
 * Draw a HASE hexagon with +/- knobs and number display
 * 
 * @param {number} level 
 * @returns {HTMLDivElement}
 */
export function renderHexStat(level, id) {
	const value = cumulativeCatalog.hase[level].get(id) ?? 0;

	// container for label and hex
	const haseOption = document.createElement('div');
	haseOption.className = 'hase-option';

	const haseLabel = document.createElement('span');
	haseLabel.className = 'hase-label';
	haseLabel.textContent = HASE_MAP[id].label;

	// surrounding hex layout
	const hexBorder = document.createElement('div');
	hexBorder.className = 'hex-border';

	const hex = document.createElement('div');
	hex.className = 'hex';
	hex.classList.toggle('error', value > MAX_HASE_RANK);
	hex.dataset.skillId = id;

	// user increment/decrement controls
	const increase = renderHASEButton({
		symbol: '+',
		className: 'increase',
		tooltip: `Add ${id} at LL${level}`,
		action: () => updateHASEWaterfall(level, id, true),
		disabled: !allowIncreaseHASE(level, id)
	});

	const decrease = renderHASEButton({
		symbol: '\u2212',
		className: 'decrease',
		tooltip: `Remove ${id} point assigned at LL${level}`,
		action: () => updateHASEWaterfall(level, id, false),
		disabled: !allowDecreaseHASE(level, id)
	});

	// display stat
	const stat = document.createElement('div');
	stat.className = 'hase-value';
	stat.textContent = value ?? '0';

	hex.append(increase, stat, decrease);
	hexBorder.append(hex);
	haseOption.append(haseLabel, hexBorder);

	return haseOption;
}

export function renderHASETooltip(level) {
	const countPoints = level === 0 ? 2 : 1;
	const usedPoints = countUsedHASEPoints(level);

	const tooltip = document.createElement('div');
	tooltip.className = 'hase-tooltip';
	tooltip.innerHTML =
		`<span class='hase-spent'>${usedPoints}</span>/${countPoints} ASSIGNED`;

	return tooltip;
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

	const budgetFree = document.createElement('span');
	budgetFree.id = `budget-free-ll-${level}`;
	budgetFree.textContent = stats.sp_budget;

	const budgetTotal = document.createElement('span');
	budgetTotal.id = `budget-total-ll-${level}`;
	budgetTotal.textContent = stats.sp;

	budgetPill.append(budgetFree, '/', budgetTotal, ' SP');
	budgetPill.classList.toggle('error', stats.sp_budget < 0);
	budgetPill.hidden = stats.sp_budget === 0;

	return budgetPill;
}