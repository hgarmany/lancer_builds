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
    isFrameEligible
} from '../rules/frames.js';

import {
    isSystemEligible
} from '../rules/systems.js';

import {
    MAX_TALENT_RANK,
    MAX_LICENSE_RANK,
    ROMAN_NUMERALS
} from '../constants.js';

export const SELECT_TEMPLATE = Object.freeze({
    SKILL_TRIGGER: {
        type: 'skill-trigger',
        placeholderText: 'Select a skill trigger',
        getSrcItems: () => srcData.skillTriggers,
        read: ({ level, idx }) => roadmap.ll[level].skillTriggerIds[idx],
        write: ({ level, idx, id }) => {
            const oldId = roadmap.ll[level].skillTriggerIds[idx];
            roadmap.ll[level].skillTriggerIds[idx] = id;
            incrementFromLevel(cumulativeCatalog.skillTriggers, id, level);
            decrementFromLevel(cumulativeCatalog.skillTriggers, oldId, level);
        },
        getLabel: ({ id }) => srcData.skillTriggers.get(id)?.name,
        getDescription: ({ id }) => srcData.skillTriggers.get(id)?.description,
        getEligibility: ({ level, id, selectedId }) =>
            isSkillTriggerEligible(level, id, selectedId)
    },
    TALENT: {
        type: 'talent',
        placeholderText: 'Select a talent',
        getSrcItems: () => srcData.talents,
        read: ({ level, idx }) => roadmap.ll[level].talentIds[idx],
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
            isTalentEligible(level, id, selectedId)
    },
    LICENSE: {
        type: 'license',
        placeholderText: 'Select a license',
        getSrcItems: () => srcData.licenses,
        read: ({ level }) => roadmap.ll[level].licenseId,
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
            isLicenseEligible(level, id, selectedId)
    },
    CORE_BONUS: {
        type: 'core-bonus',
        placeholderText: 'Select a core bonus',
        getSrcItems: () => srcData.coreBonuses,
        read: ({ level }) => roadmap.ll[level].coreBonusId,
        write: ({ level, id }) => {
            const oldId = roadmap.ll[level].coreBonusId;
            roadmap.ll[level].coreBonusId = id;
            incrementFromLevel(cumulativeCatalog.coreBonuses, id, level);
            decrementFromLevel(cumulativeCatalog.coreBonuses, oldId, level);
        },
        getLabel: ({ id }) => srcData.coreBonuses.get(id)?.name,
        getDescription: ({ id }) => srcData.coreBonuses.get(id)?.description,
        getEligibility: ({ level, id, selectedId }) =>
            isCoreBonusEligible(level, id, selectedId)
    },
    FRAME: {
        type: 'frame',
        placeholderText: 'Select a frame',
        getSrcItems: () => srcData.frames,
        read: ({ level }) =>
            roadmap.ll[level].frameId,
        write: ({ level, id }) => {
            roadmap.ll[level].frameId = id;
            cumulativeCatalog.activeFrame[level] = id;
        },
        getLabel: ({ id }) => srcData.frames.get(id)?.name,
        getDescription: ({ id }) =>
            srcData.frames.get(id)?.description
                ?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
        getEligibility: ({ level, id }) =>
            isFrameEligible(level, id)
    },
    SYSTEM: {
        type: 'system',
        placeholderText: 'Select a system',
        getSrcItems: () => srcData.systems,
        read: ({ level, idx }) => roadmap.ll[level].systems[idx]?.id,
        write: ({ level, idx, id, data }) =>
            roadmap.ll[level].systems[idx] = { id, data },
        getLabel: ({ id }) => srcData.systems.get(id)?.name,
        getDescription: ({ id }) => {
            const item = srcData.systems.get(id);
            (item?.description ?? item?.effect)
                ?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n')
        },
        getEligibility: ({ level, id, selectedId }) =>
            isSystemEligible(level, id, selectedId)
    }
});

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
 * @param {EventPrototype} event 
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