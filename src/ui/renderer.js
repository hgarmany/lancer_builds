// render/renderer.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	srcData
} from '../data/loader.js';

import {
	tableBody
} from './wires.js';

import {
	createCommonSelect
} from './selectControl.js';

import {
    MAX_TALENT_RANK,
	MAX_LICENSE_RANK,
	ROMAN_NUMERALS
} from '../constants.js';



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





function applySelection(level, select, id, getEligibility) {
    // set class flags / selector value to indicate an active selection
	select.value = id;
	select.classList.add('occupied');

    const isEligible = getEligibility(level, id, id);
	select.classList.toggle('error', !isEligible);

    if (isEligible) {
        // find the selected option and force it to appear in the dropdown
        const selectedOption =
            [...select.options].find(option => option.value === id);
        if (selectedOption) {
            selectedOption.disabled = false;
            selectedOption.hidden = false;
        }
    }
}

function renderSkillTriggerGroup(level) {
	const skillTriggerIds = roadmap.ll[level].skillTriggerIds;
	
	// generate prototype selector
	const selectTemplate = createCommonSelect({
		className: CELL.LEVELUP.name,
		srcItems: srcData.skillTriggers,
		placeholderText: 'Select a skill trigger',
		getLabel: ({ item }) => item.name,
		getDescription: ({ item }) => item.description,
		getEligibility: ({ id }) => isSkillTriggerEligible(level, id)
	});

	const selectGroup = document.createElement('div');
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	skillTriggerIds.forEach((skillId, idx) => {
		const select = selectTemplate.cloneNode(true);
		select.dataset.idx = idx;

		if (skillId)
			applySelection(level, select, skillId, isSkillTriggerEligible);

		// wire selector to perform page updates when selection changes
		select.addEventListener('change', event => {
			skillTriggersUpdate(event);
		});

		selectGroup.append(select);
	});

	return selectGroup;
}

function renderTalentGroup(level) {
	const talentIds = roadmap.ll[level].talentIds;

	// generate prototype selector
	const selectTemplate = createCommonSelect({
		className: CELL.LEVELUP.name,
		srcItems: srcData.talents,
		placeholderText: 'Select a talent',
		getLabel: ({ id, item }) => {
			const selectedId =
				talentIds.includes(id) ? id : null;
			const rank = getTalentRank(level, id, selectedId);
			const showRank = rank < MAX_TALENT_RANK;

			return item.name + (showRank ?
				` <span class="rank">${ROMAN_NUMERALS[rank]}</span>` : '');
		},
		getDescription: ({ item }) => item.description,
		getEligibility: ({ id }) => isTalentEligible(level, id)
	});

	const selectGroup = document.createElement('div');
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	talentIds.forEach((talentId, idx) => {
		const select = selectTemplate.cloneNode(true);
		select.dataset.idx = idx;

		if (talentId)
			applySelection(level, select, talentId, isTalentEligible);

		// wire selector to perform page updates when selection changes
		select.addEventListener('change', event => {
			talentsUpdate(event);
		});

		selectGroup.append(select);
	});

	return selectGroup;
}

function renderLicense(level) {
	const licenseId = roadmap.ll[level].licenseId;

	// generate prototype selector
	const select = createCommonSelect({
		className: CELL.LEVELUP.name,
		srcItems: srcData.licenses,
		placeholderText: 'Select a license',
		getLabel: ({ item }) => {
			const selectedId =
				item.id === licenseId ? licenseId : null;
			const rank = getLicenseRank(level, item.id, selectedId);
			const showRank = selectedId !== null || rank < MAX_LICENSE_RANK;

			return item.name + (showRank ?
				` <span class="rank">${ROMAN_NUMERALS[rank]}</span>` : '');
		},
		getEligibility: ({ id }) => isLicenseEligible(level, id)
	});

	// configure selector for current user-selected value
	if (licenseId) {
		applySelection(level, select, licenseId, isLicenseEligible);
	}

	// wire selector to perform page updates when selection changes
	select.addEventListener('change', event => {
		licenseUpdate(event);
	});

	return select;
}

function renderCoreBonus(level) {
	const coreBonusId = roadmap.ll[level].coreBonusId;

	if (level === 0 || level % 3 !== 0)
		return null;

	// generate prototype selector
	const select = createCommonSelect({
		className: CELL.LEVELUP.name,
		srcItems: srcData.coreBonuses,
		placeholderText: 'Select a core bonus',
		getLabel: ({ item }) => item.name,
		getDescription: ({ item }) => item.description,
		getEligibility: ({ id }) => isCoreBonusEligible(level, id)
	});

	// configure selector for current user-selected value
	if (coreBonusId)
		applySelection(level, select, coreBonusId, isCoreBonusEligible);

	// wire selector to perform page updates when selection changes
	select.addEventListener('change', event => {
		coreBonusUpdate(event);
	});

	return select;
}

function renderHASEGroup(level) {
	return null;
}

function appendIfPresent(parent, ...children) {
	parent.append(...children.filter(child => child != null));
}

function renderLevelUp(level) {
	const leftColumn = document.createElement('div');
	leftColumn.className = 'level-up-col';

	const rightColumn = document.createElement('div');
	rightColumn.className = 'level-up-col';

	if (level === 0) {
		appendIfPresent(
			leftColumn,
			renderSkillTriggerGroup(level)
		);
		appendIfPresent(
			rightColumn,
			renderTalentGroup(level),
			renderHASEGroup(level)
		);
	}
	else {
		appendIfPresent(
			leftColumn,
			renderSkillTriggerGroup(level),
			renderTalentGroup(level),
			renderLicense(level),
			renderCoreBonus(level)
		);
		appendIfPresent(
			rightColumn,
			renderHASEGroup(level)
		);
	}

	return [leftColumn, rightColumn];
}

function renderFrame(level) {
	const activeFrameId = getEffectiveFrameId(level);

	// load icon image from third party database
	const icon = document.createElement('img');
	icon.src = srcData.frames.get(activeFrameId)?.image_url ?? '';

	// generate prototype selector
	const select = createCommonSelect({
		className: CELL.FRAME.name,
		srcItems: srcData.frames,
		placeholderText: 'Select a frame',
		getLabel: ({ item }) => item.name,
		getDescription: ({ item }) =>
			item.description?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: ({ id }) => isFrameEligible(level, id)
	});

	// configure selector for current user-selected value
	if (activeFrameId)
		applySelection(level, select, activeFrameId, isFrameEligible);

	// wire selector to perform page updates when selection changes
	select.addEventListener('change', event => {
		frameUpdate(event);
		// full cell replacement for mounts
		// rerender integrated systems, do not change selectors
	});

	return [icon, select];
}

function renderStats(level) {
	return [];
}

function renderMounts(level) {
	return [];
}

function renderSystems(level) {
	return [];
}

const CELL = {
	LEVELUP: {
		name: 'level-up',
		render: renderLevelUp
	},
	FRAME: {
		name: 'frame',
		render: renderFrame
	},
	STATS: {
		name: 'stats',
		render: renderStats
	},
	MOUNTS: {
		name: 'mounts',
		render: renderMounts
	},
	SYSTEMS: {
		name: 'systems',
		render: renderSystems
	}
}

function renderCellType(type, level) {
	const cell = document.createElement('td');
	cell.className = `${type.name}-cell`;

	const cellContent = document.createElement('div');
	cellContent.className = type.name;
	cellContent.dataset.ll = level;

	cellContent.append(...type.render(level));
	cell.append(cellContent);

	return cell;
}

function renderLevelRow(level) {
	const row = document.createElement('tr');

	row.append(
		renderCellType(CELL.LEVELUP, level),
		renderCellType(CELL.FRAME, level),
		renderCellType(CELL.STATS, level),
		renderCellType(CELL.MOUNTS, level),
		renderCellType(CELL.SYSTEMS, level)
	);

	return row;
}

export function initializeRenderPipeline() {
	tableBody.append(
		...Array.from(
			{ length: roadmap.maxLevel },
			(_, index) => renderLevelRow(index)
		)
	);
}