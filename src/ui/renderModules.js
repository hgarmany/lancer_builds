/**
 * ui/renderModules.js
 * 
 * assorted rendering rules for non-selector UI elements common to level rows
 */

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
	renderSelector,
	renderWeaponSelector
} from './selectors.js';

import {
	updateHASEWaterfall
} from './updates.js';

import {
	allowIncreaseHASE,
	allowDecreaseHASE,
	countUsedHASEPoints
} from '../rules/hase.js';

import {
	didStatWorsen
} from '../rules/stats.js';

import {
	getMountSlots,
	getEffectiveMounting
} from '../rules/weapons.js';

import {
	getIntegratedSystemIds
} from '../rules/systems.js';


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

	// label-value pair
	const label = document.createElement('span');
	label.className = 'stat-label';
	label.textContent = STAT_DEFINITIONS[statId].label ?? statId;

	const output = document.createElement('span');
	output.id = `stat-${statId}-ll-${level}`;
	output.className = 'stat-value';
	output.value = statValue;
	// mark for user attention any stats that have gotten worse this level
	// typically, the result of changing active frames
	output.classList.toggle('hazard',
		didStatWorsen(cumulativeCatalog, level, statId));

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

export function renderMount(level, idx, data) {
	const mount = document.createElement('div');
	mount.className = 'mount menu';
	mount.dataset.mountType = data.type;

	if (data.tags?.integrated)
		mount.classList.add('error');

	const label = document.createElement('div');
	label.className = 'menu-label';
	label.textContent = data.type;

	const weapons = data.weapons;
	const slotDefinitions = getMountSlots(data);

	const slots = document.createElement('div');
	slots.id = `mount-${idx}-ll-${level}`;
	slots.className = 'select-group';

	for (let i = 0; i < slotDefinitions.length; i++) {
		slots.append(renderWeaponSelector(
			level, idx, i, slotDefinitions[i], weapons[i]?.id));
	}

	// single manager for all menu selections
	mount.addEventListener('click', event => {
		const select = event.target.closest('.custom-select');

		if (!select)
			return;

		const label = select.querySelector('.selector-value');
		const option = event.target.closest('.selector-option');
		const clear = event.target.closest('.selector-clear');

		if (option) {
			select.value = option.value;
			label.textContent = option.textContent;

			// wire selector to perform page updates when selection changes
			SELECT_TEMPLATE.WEAPON.changeEvent(select, level);
		}
		else if (clear) {
			// clear through the same write/refresh path as a selection
			select.value = null;
			select.classList.remove('open');

			SELECT_TEMPLATE.WEAPON.changeEvent(select, level);
			return;
		}

		select.classList.toggle('open');
	});

	mount.append(label, slots);

	return mount;
}

export function renderMounts(level) {
	return getEffectiveMounting(level).map((mount, index) =>
		renderMount(level, index, mount)
	);
}

export function renderIntegratedSystems(level) {
	const integratedSystems = document.createElement('div');
	integratedSystems.className = 'systems-integrated';
	integratedSystems.hidden = true;

	// get integrated systems from frame, if any
	const systemIds = getIntegratedSystemIds(level);

	for (const systemId of systemIds) {
		const system = srcData.systems.get(systemId);
		if (system) {
			integratedSystems.hidden = false;
			const systemLabel = document.createElement('span');
			systemLabel.textContent = system.name ?? '';
			systemLabel.title =	SELECT_TEMPLATE.SYSTEM
				.getDescription({ id: integratedId }) ?? '';

			integratedSystems.append(systemLabel);
		}
	}

	return integratedSystems;
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