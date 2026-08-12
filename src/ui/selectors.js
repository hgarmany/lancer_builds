/**
 * ui/selectors.js
 * 
 * authority on initialization + configuration of selectors
 */

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
	refreshStats,
	refreshBudgetPill
} from './refreshRenderModules.js';

import {
	skillTriggerUpdate,
	talentUpdate,
	licenseUpdate,
	coreBonusUpdate,
	frameUpdate,
	systemUpdate
} from './updates.js';

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
	isSystemEligible,
	hasEligibleSystem
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
		write: ({ level, idx, id, data }) => {
			if (!id)
				roadmap.ll[level].systems.splice(idx, 1);
			else
				roadmap.ll[level].systems[idx] = { id, data };
		}				,
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

export function getSelectorValue(selector) {
	return selector.value === '' ? null : selector.value;
}

export function setSelectorValue(selector, value) {
	selector.value = value;
}

export function setSelectorClass(selector, className, toggle = true) {
	selector.classList.toggle(className, toggle);
}

export function getOptions(selector) {
	return selector.options;
}

export function getOption(selector, optionId) {
	return [...selector.options].find(option => option.value === optionId);
}

export function getOptionValue(option) {
	return option.value === '' ? null : option.value;
}

export function setOptionValue(option, value) {
	option.value = value;
}

export function setOptionHidden(option, hide = true) {
	option.disabled = hide;
	option.hidden = hide;
}

export function renderOptionLabel(option, label) {
	option.innerHTML = label;
}

function getSelectorOptions(template, level, selectedId) {
	return [...template.getSrcItems().keys()].map(id => {
		const context = { level, id, selectedId };

		return {
			id,
			label: template.getLabel?.(context) ?? '',
			description: template.getDescription?.(context) ?? '',
			eligible: template.getEligibility?.(context) ?? false,
			selected: id === selectedId
		};
	});
}


export function applySelection(level, select, id, template) {
	// set class flags / selector value to indicate an active selection
	setSelectorValue(select, id);
	setSelectorClass(select, 'occupied');

	const isEligible = template.getEligibility({ level, id, selectedId: id });
	setSelectorClass(select, 'error', !isEligible);

	if (isEligible) {
		// find the selected option and force it to appear in the dropdown
		const selectedOption = getOption(select, id);
		if (selectedOption) {
			renderOptionLabel(selectedOption,
				template.getLabel({ level, id, selectedId: id }));
			setOptionHidden(selectedOption, false);
		}
	}
}

export function renderSelectorNew(level, template) {
	const selector = document.createElement('div');
	selector.className = `${template.type}-select`;
	selector.dataset.ll = level;

	const control = document.createElement('div');
	control.className = 'selector-control';

	const value = document.createElement('span');
	value.className = 'selector-value';
	value.innerHTML = template.placeholderText;

	const arrow = document.createElement('span');
	arrow.className = 'selector-arrow';

	control.append(value, arrow);


	const menu = document.createElement('div');
	menu.className = 'selector-menu';
	menu.id = `${template.type}-options-ll-${level}`;

	for (const [id, item] of template.getSrcItems()) {
		const context = { level, id, selectedId: null };

		// prepare an option for each item
		const option = document.createElement('div');
		option.value = id;
		option.innerHTML = template.getLabel?.(context) ?? '';
		option.title = template.getDescription?.(context) ?? '';
		if (!template.getEligibility?.(context) ?? false)
			setOptionHidden(option, true);

		menu.append(option);
	}


	selector.append(control, menu);

	return selector;
}

/**
 * Creates an empty selector with default options configured
 * 
 * @param {{
 *	level?: number,
 *	type: string,
 *	srcItems?: Map<string, Object>,
 *	getSrcItems?: function(): Map<string, Object>,
 *	placeholderText: string,
 *	getLabel: function,
 *	getDescription: function,
 *	getEligibility: function
 * }}
 * @returns {Element}
 */
export function renderSelector(level, template) {
	const selectTemplate = document.createElement('select');
	selectTemplate.className = `${template.type}-select`;
	selectTemplate.dataset.ll = level;

	// prepare a default pseudo-option for unfilled selectors
	if (template.placeholderText) {
		const placeholderOption = document.createElement('option');
		placeholderOption.value = '';
		placeholderOption.innerHTML = template.placeholderText;
		selectTemplate.append(placeholderOption);
	}

	for (const id of template.getSrcItems().keys()) {
		const context = { level, id, selectedId: null };

		// prepare an option for each item
		const option = document.createElement('option');
		option.value = id;
		option.innerHTML = template.getLabel?.(context) ?? '';
		option.title = template.getDescription?.(context) ?? '';
		if (!template.getEligibility?.(context) ?? false)
			setOptionHidden(option, true);

		selectTemplate.append(option);
	}
	console.log(getSelectorOptions(template, level, null));
	return selectTemplate;
}