// ui/selectors.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	cumulativeCatalog,
	incrementFromLevel,
	decrementFromLevel
} from '../data/cumulativeCatalog.js';

import {
	srcData
} from '../data/loader.js';

import {
	MAX_TALENT_RANK,
	MAX_LICENSE_RANK,
	ROMAN_NUMERALS
} from '../constants.js';

import {
	getFrameImageSrc,
	refreshStats,
	refreshBudgetPill
} from './renderModules.js';


import {
	isSkillTriggerEligible
} from '../rules/skillTriggers.js';

import {
	getTalentRank,
	isTalentEligible
} from '../rules/talents.js';

import {
	getLicenseRank,
	isLicenseEligible
} from '../rules/licenses.js';

import {
	isCoreBonusEligible
} from '../rules/coreBonuses.js';

import {
	getEffectiveFrameId,
	isFrameEligible
} from '../rules/frames.js';

import {
	isSystemEligible
} from '../rules/systems.js';

/**
 * Each type of selector requires several specific configurations
 * Separate read/write/render profiles are written here for each type
 */
export const SELECT_TEMPLATE = Object.freeze({
	SKILL_TRIGGER: {
		type: 'skill-trigger',
		title: 'Skill Trigger',
		placeholderText: 'Select a skill trigger',
		getSrcItems: () => srcData.skillTriggers,
		readLevel: (level) => roadmap.ll[level].skillTriggerIds,
		write: ({ level, idx, id }) => {
			const oldId = roadmap.ll[level].skillTriggerIds[idx];
			roadmap.ll[level].skillTriggerIds[idx] = id;
			incrementFromLevel(cumulativeCatalog.skillTriggers, id, level);
			decrementFromLevel(cumulativeCatalog.skillTriggers, oldId, level);
		},
		getLabel: ({ id }) => srcData.skillTriggers.get(id)?.name,
		getDescription: ({ id }) => srcData.skillTriggers.get(id)?.description,
		getEligibility: ({ level, id, selectedId }) =>
			isSkillTriggerEligible(level, id, selectedId),
		changeEvent: (event, level) => skillTriggerUpdate(event, level)
	},
	TALENT: {
		type: 'talent',
		title: 'Talent',
		placeholderText: 'Select a talent',
		getSrcItems: () => srcData.talents,
		readLevel: (level) => roadmap.ll[level].talentIds,
		write: ({ level, idx, id }) => {
			const oldId = roadmap.ll[level].talentIds[idx];
			roadmap.ll[level].talentIds[idx] = id;
			incrementFromLevel(cumulativeCatalog.talents, id, level);
			decrementFromLevel(cumulativeCatalog.talents, oldId, level);
		},
		getLabel: ({ level, id }) => {
			const selectedId =
				roadmap.ll[level].talentIds.includes(id) ? id : null;
			const rank = getTalentRank(level, id, selectedId);
			const showRank = rank < MAX_TALENT_RANK;

			return srcData.talents.get(id)?.name +
				(showRank ? ` ${ROMAN_NUMERALS[rank]}` : '');
		},
		getDescription: ({ id }) =>
			srcData.talents.get(id)?.description
				?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ level, id, selectedId }) =>
			isTalentEligible(level, id, selectedId),
		changeEvent: (event, level) => talentUpdate(event, level)
	},
	LICENSE: {
		type: 'license',
		title: 'License',
		placeholderText: 'Select a license',
		getSrcItems: () => srcData.licenses,
		readLevel: (level) => roadmap.ll[level].licenseId,
		write: ({ level, id }) => {
			const oldId = roadmap.ll[level].licenseId;
			roadmap.ll[level].licenseId = id;
			incrementFromLevel(cumulativeCatalog.licenses, id, level);
			decrementFromLevel(cumulativeCatalog.licenses, oldId, level);
		},
		getLabel: ({ level, id }) => {
			const licenseId = roadmap.ll[level].licenseId;
			const selectedId =
				id === licenseId ? licenseId : null;
			const rank = getLicenseRank(level, id, selectedId);
			const showRank = rank < MAX_LICENSE_RANK;

			return srcData.licenses.get(id)?.name +
				(showRank ? ` ${ROMAN_NUMERALS[rank]}` : '');
		},
		getEligibility: ({ level, id, selectedId }) =>
			isLicenseEligible(level, id, selectedId),
		changeEvent: (event, level) => licenseUpdate(event, level)
	},
	CORE_BONUS: {
		type: 'core-bonus',
		title: 'Core Bonus',
		placeholderText: 'Select a core bonus',
		getSrcItems: () => srcData.coreBonuses,
		readLevel: (level) => roadmap.ll[level].coreBonusId,
		write: ({ level, id }) => {
			const oldId = roadmap.ll[level].coreBonusId;
			roadmap.ll[level].coreBonusId = id;
			incrementFromLevel(cumulativeCatalog.coreBonuses, id, level);
			decrementFromLevel(cumulativeCatalog.coreBonuses, oldId, level);
		},
		getLabel: ({ id }) => srcData.coreBonuses.get(id)?.name,
		getDescription: ({ id }) => srcData.coreBonuses.get(id)?.description,
		getEligibility: ({ level, id, selectedId }) =>
			isCoreBonusEligible(level, id, selectedId),
		changeEvent: (event, level) => coreBonusUpdate(event, level)
	},
	FRAME: {
		type: 'frame',
		placeholderText: 'Select a frame',
		getSrcItems: () => srcData.frames,
		readLevel: (level) => roadmap.ll[level].frameId,
		write: ({ level, id }) => {
			roadmap.ll[level].frameId =
				(getEffectiveFrameId(level - 1) !== id) ? id : null;
			cumulativeCatalog.activeFrame[level] = id;
		},
		getLabel: ({ id }) => srcData.frames.get(id)?.name,
		getDescription: ({ id }) =>
			srcData.frames.get(id)?.description
				?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ level, id }) =>
			isFrameEligible(level, id),
		changeEvent: (event, level) => frameUpdate(event, level)
	},
	SYSTEM: {
		type: 'system',
		placeholderText: 'Select a system',
		getSrcItems: () => srcData.systems,
		readLevel: (level) => roadmap.ll[level].systems,
		write: ({ level, idx, id, data }) =>
			roadmap.ll[level].systems[idx] = { id, data },
		getLabel: ({ id }) => srcData.systems.get(id)?.name,
		getDescription: ({ id }) => {
			const item = srcData.systems.get(id);
			(item?.description ?? item?.effect)
				?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n')
		},
		getEligibility: ({ level, id, selectedId }) =>
			isSystemEligible(level, id, selectedId),
		changeEvent: (event, level) => systemUpdate(event, level)
	}
});

export function applySelection(level, select, id, template) {
	// set class flags / selector value to indicate an active selection
	select.value = id;
	select.classList.add('occupied');

	const isEligible = template.getEligibility({ level, id, selectedId: id });
	select.classList.toggle('error', !isEligible);

	if (isEligible) {
		// find the selected option and force it to appear in the dropdown
		const selectedOption =
			[...select.options].find(option => option.value === id);
		if (selectedOption) {
			selectedOption.innerHTML =
				template.getLabel({ level, id, selectedId: id });
			selectedOption.disabled = false;
			selectedOption.hidden = false;
		}
	}
}

/**
 * Creates an empty selector with default options configured
 * 
 * @param {{
 *	level?: number,
 *	className: string,
 *	srcItems?: Map<string, Object>,
 *	getSrcItems?: function(): Map<string, Object>,
 *	placeholderText: string,
 *	getLabel: function,
 *	getDescription: function,
 *	getEligibility: function
 * }}
 * @returns {Element}
 */
export function renderSelector({
	level,
	type,
	placeholderText,
	getSrcItems,
	getLabel,
	getDescription,
	getEligibility
}) {
	const selectTemplate = document.createElement('select');
	selectTemplate.className = `${type}-select`;
	selectTemplate.dataset.ll = level;

	// prepare a default pseudo-option for unfilled selectors
	const placeholderOption = document.createElement('option');
	placeholderOption.value = '';
	placeholderOption.innerHTML = placeholderText;
	selectTemplate.append(placeholderOption);

	for (const [id, item] of getSrcItems()) {
		const context = { level, id, selectedId: null };

		// prepare an option for each item
		const option = document.createElement('option');
		option.value = id;
		if (getLabel)
			option.innerHTML = getLabel?.(context) ?? '';

		if (getDescription)
			option.title = getDescription?.(context) ?? '';

		if (getEligibility && !getEligibility(context)) {
			option.disabled = true;
			option.hidden = true;
		}

		selectTemplate.append(option);
	}

	return selectTemplate;
}

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

	const newId = eventSelect.value === '' ? null: eventSelect.value;

	// update this selector
	eventSelect.classList.toggle('occupied', newId);

	// update roadmap and cumulative catalog
	template.write({ level: currentLevel, idx, id: newId });
}

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

function skillTriggerUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.SKILL_TRIGGER);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SKILL_TRIGGER, level);
}

function talentUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.TALENT);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.TALENT, level);

	// update integrated mounts and systems
}

function licenseUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.LICENSE);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.LICENSE, level);
	refreshSelectors(SELECT_TEMPLATE.FRAME, level);
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level);
}

function coreBonusUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.CORE_BONUS);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.CORE_BONUS, level);

	// update stats and all mounts
	updateStatsWaterfall(level);
}

/**
 * Frame cells default to mimic the last cell where the user
 * specified a particular frame
 * 
 * @param {Event} event 
 * @param {number} level 
 */
function activeFrameWaterfall(event, level) {
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
		select.value = value;
		select.classList.toggle('inherited', i !== level);
	}
}

function frameUpdate(event, level) {
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
}

function refreshElectiveSystemList(event, level) {
	const emptySelect = document.getElementById(`system-add-ll-${level}`);
	const idx = Number(event.currentTarget.dataset.idx);
	const systemId = event.currentTarget.value;

	if (event.currentTarget !== emptySelect) {
		if (systemId === '')
			event.currentTarget.remove();
		return;
	}
	console.log('test');

	emptySelect.id = '';

	// generate prototype selector
	const selectTemplate =
		renderSelector({ level, ...SELECT_TEMPLATE.SYSTEM });

	const selectGroup =
		document.getElementById(`${SELECT_TEMPLATE.SYSTEM.type}-ll-${level}`);

	// add selector to list
	const select = selectTemplate.cloneNode(true);
	select.id = `system-add-ll-${level}`;
	select.dataset.idx = idx + 1;
	applySelection(level, select, systemId, SELECT_TEMPLATE.SYSTEM);

	// wire selector to perform page updates when selection changes
	select.addEventListener('change', event =>
		SELECT_TEMPLATE.SYSTEM.changeEvent(event, level));

	selectGroup.append(select);
}

function systemUpdate(event, level) {
	selectionUpdate(event, SELECT_TEMPLATE.SYSTEM);
	console.log(roadmap.ll[level].systems);

	// update stats and budget pill
	refreshStats(level);
	refreshBudgetPill(level);
	refreshElectiveSystemList(event, level);

	// update all attached selectors at this and later levels
	refreshSelectors(SELECT_TEMPLATE.SYSTEM, level, level);
}