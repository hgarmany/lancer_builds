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
	weaponUpdate,
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
	isWeaponEligible,
	setWeaponSelection
} from '../rules/weapons.js';

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
		allowClear: true,
		getSrcItems: () => srcData.skillTriggers,
		readLevel: (level) => roadmap.ll[level].skillTriggerIds,
		write: ({ level, idx, id }) => {
			const oldId = roadmap.ll[level].skillTriggerIds[idx];
			roadmap.ll[level].skillTriggerIds[idx] = id;
			incrementFromLevel(cumulativeCatalog.skillTriggers, id, level);
			decrementFromLevel(cumulativeCatalog.skillTriggers, oldId, level);
		},
		getLabel: ({ id }) => {
			return id ? (srcData.skillTriggers.get(id)?.name ?? '') :
				'Select a skill trigger';
		},
		getDescription: ({ id }) => srcData.skillTriggers.get(id)?.description,
		getEligibility: ({ level, id, selectedId }) =>
			isSkillTriggerEligible(level, id, selectedId),
		changeEvent: (selector, level) => skillTriggerUpdate(selector, level)
	},
	TALENT: {
		type: 'talent',
		title: 'Talent',
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => srcData.talents,
		readLevel: (level) => roadmap.ll[level].talentIds,
		write: ({ level, idx, id }) => {
			const oldId = roadmap.ll[level].talentIds[idx];
			roadmap.ll[level].talentIds[idx] = id;
			incrementFromLevel(cumulativeCatalog.talents, id, level);
			decrementFromLevel(cumulativeCatalog.talents, oldId, level);
		},
		getLabel: ({ level, id, selectedId }) => {
			if (!id)
				return 'Select a talent';

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
		allowClear: true,
		redrawLabels: true,
		getSrcItems: () => srcData.licenses,
		readLevel: (level) => roadmap.ll[level].licenseId,
		write: ({ level, id }) => {
			const oldId = roadmap.ll[level].licenseId;
			roadmap.ll[level].licenseId = id;
			incrementFromLevel(cumulativeCatalog.licenses, id, level);
			decrementFromLevel(cumulativeCatalog.licenses, oldId, level);
		},
		getLabel: ({ level, id, selectedId }) => {
			if (!id)
				return 'Select a license';

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
		allowClear: true,
		getSrcItems: () => srcData.coreBonuses,
		readLevel: (level) => roadmap.ll[level].coreBonusId,
		write: ({ level, id }) => {
			const oldId = roadmap.ll[level].coreBonusId;
			roadmap.ll[level].coreBonusId = id;
			incrementFromLevel(cumulativeCatalog.coreBonuses, id, level);
			decrementFromLevel(cumulativeCatalog.coreBonuses, oldId, level);
		},
		getLabel: ({ id }) => {
			return id ? (srcData.coreBonuses.get(id)?.name ?? '') :
				'Select a core bonus';
		},
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
		getLabel: ({ id }) => {
			return id ? srcData.frames.get(id)?.name : null;
		}				,
		getDescription: ({ id }) =>
			srcData.frames.get(id)?.description
				?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ level, id }) =>
			isFrameEligible(level, id),
		changeEvent: (selector, level) => frameUpdate(selector, level)
	},
	WEAPON: {
		type: 'weapon',
		allowClear: true,
		getSrcItems: () => srcData.weapons,
		write: ({ level, mountIdx, slotIdx, id }) =>
			setWeaponSelection(level, mountIdx, slotIdx, id),
		getLabel: ({ id, slot }) => {
			return id ? (srcData.weapons.get(id)?.name ?? '') :
				slot.label;
		},
		getDescription: ({ id }) =>
			srcData.weapons.get(id)?.description
				?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ level, id, selectedId, slot }) =>
			isWeaponEligible(level, id, selectedId, slot),
		changeEvent: (selector, level) => weaponUpdate(selector, level)
	},
	SYSTEM: {
		type: 'system',
		allowClear: true,
		redrawLabels: true,
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
		},
		getLabel: ({ id }) => {
			return id ? (srcData.systems.get(id)?.name ?? '') :
				'Select a system';
		},
		getDescription: ({ id }) => {
			const item = srcData.systems.get(id);
			return (item?.description ?? item?.effect)
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

export function setSelectorValue(selector, id, template, extraContext = {}) {
	const context = {
		...extraContext,
		level: Number(selector.dataset.ll),
		id,
		selectedId: id
	};
	const label = selector.querySelector('.selector-value');
	const control = selector.querySelector('.selector-control');

	selector.value = id;

	if (label && template.redrawLabels)
		label.textContent = template.getLabel?.(context) ?? '';
	if (control)
		control.title = template.getDescription?.(context) ?? '';
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
export function renderSelector(
	level,
	selectedId,
	template,
	extraContext = {}
) {
	if (!template)
		return;

	const context = { ...extraContext, level, id: selectedId, selectedId };

	const selector = document.createElement('div');
	selector.className = `custom-select ${template.type}-select`;
	selector.dataset.ll = level;
	selector.value = selectedId;

	const control = document.createElement('button');
	control.className = 'selector-control';
	control.classList.toggle('occupied', selectedId);
	control.type = 'button';
	control.title = template.getDescription?.(context) ?? '';

	const value = document.createElement('span');
	value.className = 'selector-value';
	value.textContent = template.getLabel?.(context) ?? '';

	const arrow = document.createElement('span');
	arrow.className = 'selector-arrow';

	control.append(value, arrow);

	const menu = document.createElement('div');
	menu.className = 'selector-menu';

	// suppress default-close behavior when menu option is clicked
	menu.addEventListener('mousedown', event => event.preventDefault());

	for (const [id, item] of template.getSrcItems()) {
		const context = { ...extraContext, level, id, selectedId };

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

	if (!template.getEligibility?.(context) ?? false)
		control.classList.add('error');

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

	// remove/clear selector button
	if (template.allowClear) {
		control.classList.add('clearable');
		const clear = document.createElement('button');
		clear.className = 'selector-clear';
		clear.type = 'button';
		clear.title = 'Clear selection';
		clear.setAttribute('aria-label', 'Clear selection');
		selector.append(clear);
	}

	selector.append(menu);

	return selector;
}

/**
 * Creates a weapon selector with default options configured
 * 
 * @param {number} level
 * @param {string} selectedId
 * @param {Object} template
 * @returns {HTMLElement}
 */
export function renderWeaponSelector(
	level,
	mountIdx,
	slotIdx,
	slot,
	selectedId
) {
	const selector = renderSelector(
		level,
		selectedId,
		SELECT_TEMPLATE.WEAPON,
		{ slot }
	);
	selector.dataset.mountIdx = mountIdx;
	selector.dataset.slotIdx = slotIdx;

	return selector;
}