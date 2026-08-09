// ui/renderModules.js

import {
	srcData
} from '../data/loader.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	STAT_DEFINITIONS,
	MAX_HASE_RANK
} from '../constants.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE
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

function renderHASEButton({
	symbol,
	className,
	action,
	label,
	disabled = false
}) {
	const button = document.createElement('button');
	button.className = `hase-button ${className}`;
	button.textContent = symbol;
	button.title = label;
	button.setAttribute('aria-label', label);
	button.disabled = disabled;

	button.addEventListener('click', action);
	return button;
}

/**
 * Draw a HASE hexagon with +/- knobs and number display
 * 
 * @param {number} level 
 * @returns 
 */
export function renderHexStat(level, id) {
	const value = cumulativeCatalog.hase[level].get(id) ?? 0;
	
	const hex = document.createElement('div');
	hex.id = `hex-${id}-ll-${level}`;
	hex.className = 'hex';
	hex.classList.toggle('error', value > MAX_HASE_RANK);
	hex.dataset.ll = level;

	const increase = renderHASEButton({
		symbol: '+',
		className: 'increase',
		//action: () => modifyStat(level, mechStat.id, 1),
		label: `Add ${id} at LL${level}`,
		disabled: !allowIncreaseHASE(level, id)
	});

	const decrease = renderHASEButton({
		symbol: '\u2212',
		className: 'decrease',
		//action: () => modifyStat(level, mechStat.id, -1),
		label: `Remove ${id} point assigned at LL${level}`,
		disabled: !allowDecreaseHASE(level, id)
	});

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
 * @returns 
 */
export function renderStatBubble(level, statId) {
	const statValue = cumulativeCatalog.stats[level]?.[statId];

	const statBubble = document.createElement('div');
	statBubble.className = 'stat-bubble';

	if (didStatWorsen(cumulativeCatalog, level, statId))
		statBubble.classList.add('hazard');

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