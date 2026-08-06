// render/renderer.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	srcData
} from '../data/loader.js';

import {
	cumulativeCatalog
} from '../data/cumulativeCatalog.js';

import {
	tableBody
} from './wires.js';

import {
	createCommonSelect
} from './selectControl.js';

import {
	STAT_DEFINITIONS,
	DISPLAYED_MECH_STAT_IDS
} from '../constants.js';

import {
	SELECT_TEMPLATE,
	getFrameImageSrc
} from './renderModules.js';



import {
	getEffectiveFrameId
} from '../rules/frames.js';

import {
	didStatWorsen
} from '../rules/stats.js';





function applySelection(level, select, id, template) {
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
            selectedOption.disabled = false;
            selectedOption.hidden = false;
        }
    }
}

function renderSkillTriggerGroup(level) {
	const skillTriggerIds = roadmap.ll[level].skillTriggerIds;
	
	// generate prototype selector
	const selectTemplate =
		createCommonSelect({ level, ...SELECT_TEMPLATE.SKILL_TRIGGER });

	const selectGroup = document.createElement('div');
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	skillTriggerIds.forEach((skillId, idx) => {
		const select = selectTemplate.cloneNode(true);
		select.dataset.idx = idx;

		if (skillId)
			applySelection(level, select, skillId, SELECT_TEMPLATE.SKILL_TRIGGER);

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
	const selectTemplate =
		createCommonSelect({ level, ...SELECT_TEMPLATE.TALENT });

	const selectGroup = document.createElement('div');
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	talentIds.forEach((talentId, idx) => {
		const select = selectTemplate.cloneNode(true);
		select.dataset.idx = idx;

		if (talentId)
			applySelection(level, select, talentId, SELECT_TEMPLATE.TALENT);

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
	const select =
		createCommonSelect({ level, ...SELECT_TEMPLATE.LICENSE });

	// configure selector for current user-selected value
	if (licenseId) {
		applySelection(level, select, licenseId, SELECT_TEMPLATE.LICENSE);
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
	const select =
		createCommonSelect({ level, ...SELECT_TEMPLATE.CORE_BONUS });

	// configure selector for current user-selected value
	if (coreBonusId)
		applySelection(level, select, coreBonusId, SELECT_TEMPLATE.CORE_BONUS);

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
	icon.src = getFrameImageSrc(activeFrameId) ?? '';

	// generate prototype selector
	const select =
		createCommonSelect({ level, ...SELECT_TEMPLATE.FRAME });

	// configure selector for current user-selected value
	if (activeFrameId)
		applySelection(level, select, activeFrameId, SELECT_TEMPLATE.FRAME);

	// wire selector to perform page updates when selection changes
	select.addEventListener('change', event => {
		frameUpdate(event);
		// full cell replacement for mounts
		// rerender integrated systems, do not change selectors
	});

	return [icon, select];
}

function renderStatBubble(level, statId, value) {
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
	output.value = value;

	if (value !== null) {
		output.textContent =
			statId === 'size' && value < 1
				? '\u00BD'
				: String(value);
	}

	statBubble.append(label, output);
	return statBubble;
}

function renderStats(level) {
	const stats = cumulativeCatalog.stats[level];

	return DISPLAYED_MECH_STAT_IDS.map(statId =>
		renderStatBubble(
			level,
			statId,
			stats?.[statId]
		)
	);
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
