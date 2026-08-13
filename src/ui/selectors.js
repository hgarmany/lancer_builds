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
		changeEvent: (selector, level) => skillTriggerUpdate(selector, level)
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
		changeEvent: (selector, level) => talentUpdate(selector, level)
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
		changeEvent: (selector, level) => licenseUpdate(selector, level)
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
		changeEvent: (selector, level) => coreBonusUpdate(selector, level)
	},
	FRAME: {
		type: 'frame',
		getSrcItems: () => srcData.frames,
		readLevel: (level) => getEffectiveFrameId(level),
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
		changeEvent: (selector, level) => frameUpdate(selector, level)
	},
	SYSTEM: {
		type: 'system',
		placeholderText: 'Select a system',
		getSrcItems: () => srcData.systems,
		readLevel: (level) => {
			for (let i = level; i >= 0; i--) {
				if (roadmap.ll[i].systems[0])
					return roadmap.ll[i].systems;
			}

			return null;
		},
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
		changeEvent: (selector, level) => systemUpdate(selector, level)
	}
});

export function getSelectorValue(selector) {
	return selector.value === '' ? null : selector.value;
}

export function setSelectorClass(selector, className, toggle = true) {
	selector.querySelector('.selector-control')
		.classList.toggle(className, toggle);
}

export function setOptionHidden(option, hide = true) {
	option.disabled = hide;
	option.hidden = hide;
}

/**
 * Creates a selector with default options configured
 * 
 * @param {number} level
 * @param {string} selectedId
 * @param {Object} template
 * @returns {HTMLElement}
 */
export function renderSelector(level, selectedId, template) {
	const selector = document.createElement('div');
	selector.className = `custom-select ${template.type}-select`;
	selector.dataset.ll = level;
	selector.value = selectedId;

	const control = document.createElement('button');
	control.className = 'selector-control';
	control.classList.toggle('occupied', selectedId);
	control.type = 'button';

	const value = document.createElement('span');
	value.className = 'selector-value';
	value.textContent = selectedId ?
		(template.getLabel?.({ level, id: selectedId }) ?? '') :
		(template.placeholderText ?? '');

	const arrow = document.createElement('span');
	arrow.className = 'selector-arrow';

	control.append(value, arrow);

	const menu = document.createElement('div');
	menu.className = 'selector-menu';
	menu.id = `${template.type}-options-ll-${level}`;

	// suppress default-close behavior when menu option is clicked
	menu.addEventListener('mousedown', event => event.preventDefault());

	for (const [id, item] of template.getSrcItems()) {
		const context = { level, id, selectedId };

		// prepare an option for each item
		const option = document.createElement('div');
		option.className = 'selector-option';
		option.value = id;

		option.textContent = template.getLabel?.(context) ?? '';
		option.title = template.getDescription?.(context) ?? '';
		if (!template.getEligibility?.(context) ?? false)
			setOptionHidden(option, true);

		menu.append(option);
	}

	control.addEventListener('keydown', event => {
		switch (event.key) {
			case 'Escape':
				selector.classList.remove('open');
				break;
			default:
				break;
		}
	});

	// loss of focus simply closes the menu
	control.addEventListener('blur', event => {
		if (!selector.contains(event.relatedTarget))
			selector.classList.remove('open');
	});

	selector.append(control);

	if (template.placeholderText) {
		control.classList.add('clearable');
		const clear = document.createElement('button');
		clear.className = 'selector-clear';
		clear.title = 'Clear selection';
		selector.append(clear);
	}

	selector.append(menu);

	return selector;
}