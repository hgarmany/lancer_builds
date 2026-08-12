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

export function renderSelecterNew() {

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
	if (placeholderText) {
		const placeholderOption = document.createElement('option');
		placeholderOption.value = '';
		placeholderOption.innerHTML = placeholderText;
		selectTemplate.append(placeholderOption);
	}

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