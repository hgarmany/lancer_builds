// ui/renderModules.js

import {
	roadmap
} from '../data/roadmap.js';

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
	MAX_TALENT_RANK,
	MAX_LICENSE_RANK,
	ROMAN_NUMERALS
} from '../constants.js';

export const SELECT_TEMPLATE = Object.freeze({
	SKILL_TRIGGER: {
		className: 'skill-trigger',
		placeholderText: 'Select a skill trigger',
		getSrcItems: () => srcData.skillTriggers,
		getLabel: ({ item }) => item.name,
		getDescription: ({ item }) => item.description,
		getEligibility: ({ level, id, selectedId }) =>
			isSkillTriggerEligible(level, id, selectedId)
	},
	TALENT: {
		className: 'talent',
		placeholderText: 'Select a talent',
		getSrcItems: () => srcData.talents,
		getLabel: ({ level, id, item }) => {
			const selectedId =
				roadmap.ll[level].talentIds.includes(id) ? id : null;
			const rank = getTalentRank(level, id, selectedId);
			const showRank = rank < MAX_TALENT_RANK;

			return item.name + (showRank ?
				` <span class="rank">${ROMAN_NUMERALS[rank]}</span>` : '');
		},
		getDescription: ({ item }) =>
			item.description?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ level, id, selectedId }) =>
			isTalentEligible(level, id, selectedId)
	},
	LICENSE: {
		className: 'license',
		placeholderText: 'Select a license',
		getSrcItems: () => srcData.licenses,
		getLabel: ({ level, item }) => {
			const licenseId = roadmap.ll[level].licenseId;
			const selectedId =
				item.id === licenseId ? licenseId : null;
			const rank = getLicenseRank(level, item.id, selectedId);
			const showRank = selectedId !== null || rank < MAX_LICENSE_RANK;

			return item.name + (showRank ?
				` <span class="rank">${ROMAN_NUMERALS[rank]}</span>` : '');
		},
		getEligibility: ({ level, id, selectedId }) =>
			isLicenseEligible(level, id, selectedId)
	},
	CORE_BONUS: {
		className: 'core-bonus',
		placeholderText: 'Select a core bonus',
		getSrcItems: () => srcData.coreBonuses,
		getLabel: ({ item }) => item.name,
		getDescription: ({ item }) => item.description,
		getEligibility: ({ level, id, selectedId }) =>
			isCoreBonusEligible(level, id, selectedId)
	},
	FRAME: {
		className: 'frame',
		placeholderText: 'Select a frame',
		getSrcItems: () => srcData.frames,
		getLabel: ({ item }) => item.name,
		getDescription: ({ item }) =>
			item.description?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ level, id }) =>
			isFrameEligible(level, id)
	}
});

export function getFrameImageSrc(frameId) {
	return srcData.frames.get(frameId)?.image_url;
}