// render/roadmapTable.js

import {
	renderHexStat,
	getFrameImageSrc,
	renderStats,
	renderBudgetPill
} from './renderModules.js';

import {
	SELECT_TEMPLATE,
	renderSelector
} from './selectors.js';

import {
	getEffectiveFrameId
} from '../rules/frames.js';

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
			selectedOption.innerHTML =
				template.getLabel({ level, id, selectedId: id });
			selectedOption.disabled = false;
			selectedOption.hidden = false;
		}
	}
}

function renderMenu(level, template) {
	const menu = document.createElement('div');
	menu.className = 'menu';

	const menuLabel = document.createElement('div');
	menuLabel.className = 'menu-label';
	menuLabel.textContent = template.title + (level === 0 ? 's' : '');

	const roadmapData = template.readLevel(level);

	// generate prototype selector
	const selectTemplate =
		renderSelector({ level, ...template });

	const selectGroup = document.createElement('div');
	selectGroup.id = `${template.type}-ll-${level}`;
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	if (roadmapData instanceof Array) {
		roadmapData.forEach((id, idx) => {
			const select = selectTemplate.cloneNode(true);
			select.dataset.idx = idx;

			if (id)
				applySelection(level, select, id, template);

			// wire selector to perform page updates when selection changes
			select.addEventListener('change',
				event => template.changeEvent(event, level));

			selectGroup.append(select);
		});
	}
	else {
		// configure selector for current user-selected value
		if (roadmapData)
			applySelection(level, selectTemplate, roadmapData, template);

		// wire selector to perform page updates when selection changes
		selectTemplate.addEventListener('change', event =>
			template.changeEvent(event, level)
		);

		selectGroup.append(selectTemplate);
	}

	menu.append(menuLabel, selectGroup);

	return menu;
}

function renderHASEGroup(level) {
	const menu = document.createElement('div');
	menu.className = 'menu';

	const menuLabel = document.createElement('div');
	menuLabel.className = 'menu-label';
	menuLabel.textContent = 'HASE';

	const haseGroup = document.createElement('div');
	haseGroup.id = `hase-ll-${level}`;
	haseGroup.className = 'hase-group';

	const hullHex = renderHexStat(level, 'hull');
	const agilityHex = renderHexStat(level, 'agility');
	const systemsHex = renderHexStat(level, 'systems');
	const engineeringHex = renderHexStat(level, 'engineering');

	haseGroup.append(
		hullHex,
		agilityHex,
		systemsHex,
		engineeringHex
	);

	menu.append(menuLabel, haseGroup)

	return menu;
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
			renderMenu(level, SELECT_TEMPLATE.SKILL_TRIGGER)
		);
		appendIfPresent(
			rightColumn,
			renderMenu(level, SELECT_TEMPLATE.TALENT),
			renderHASEGroup(level)
		);
	}
	else {
		appendIfPresent(
			leftColumn,
			renderMenu(level, SELECT_TEMPLATE.SKILL_TRIGGER),
			renderMenu(level, SELECT_TEMPLATE.TALENT),
			renderMenu(level, SELECT_TEMPLATE.LICENSE)
		);
		if (level !== 0 && level % 3 === 0) {
			appendIfPresent(
				leftColumn,
				renderMenu(level, SELECT_TEMPLATE.CORE_BONUS)
			);
		}
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
	icon.id = `${SELECT_TEMPLATE.FRAME.type}-ll-${level}-icon`;
	icon.src = getFrameImageSrc(activeFrameId) ?? '';

	// generate prototype selector
	const select =
		renderSelector({ level, ...SELECT_TEMPLATE.FRAME });

	const selectGroup = document.createElement('div');
	selectGroup.id = `${SELECT_TEMPLATE.FRAME.type}-ll-${level}`;
	selectGroup.className = 'select-group';

	// configure selector for current user-selected value
	if (activeFrameId)
		applySelection(level, select, activeFrameId, SELECT_TEMPLATE.FRAME);
	if (!SELECT_TEMPLATE.FRAME.readLevel(level))
		select.classList.add('inherited');

	// wire selector to perform page updates when selection changes
	select.addEventListener('change', event =>
		SELECT_TEMPLATE.FRAME.changeEvent(event, level));

	selectGroup.append(select);

	return [icon, selectGroup];
}

function renderMounts(level) {
	return [];
}

function renderIntegratedSystems(level) {
	const integratedSystems = document.createElement('div');
	integratedSystems.className = 'systems-integrated';

	return integratedSystems;
}

function renderSystems(level) {
	const integratedSystems = renderIntegratedSystems(level);

	const systems = SELECT_TEMPLATE.SYSTEM.readLevel(level);

	const budgetPill = renderBudgetPill(level);

	// generate prototype selector
	const selectTemplate =
		renderSelector({ level, ...SELECT_TEMPLATE.SYSTEM });

	const selectGroup = document.createElement('div');
	selectGroup.id = `${SELECT_TEMPLATE.SYSTEM.type}-ll-${level}`;
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	systems.forEach((system, idx) => {
		const select = selectTemplate.cloneNode(true);
		select.dataset.idx = idx;

		if (system)
			applySelection(level, select, system.id, SELECT_TEMPLATE.SYSTEM);

		// wire selector to perform page updates when selection changes
		select.addEventListener('change', event =>
			SELECT_TEMPLATE.SYSTEM.changeEvent(event, level));

		selectGroup.append(select);
	});

	selectTemplate.dataset.idx = systems.length;
	selectTemplate.addEventListener('change', event =>
		SELECT_TEMPLATE.SYSTEM.changeEvent(event, level));
	selectGroup.append(selectTemplate);

	return [budgetPill, integratedSystems, selectGroup];
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

function renderCellType(cellType, level) {
	const cell = document.createElement('td');
	cell.className = `${cellType.name}-cell`;

	const cellContent = document.createElement('div');
	cellContent.className = cellType.name;
	cellContent.dataset.ll = level;

	cellContent.append(...cellType.render(level));
	cell.append(cellContent);

	return cell;
}

export function renderLevelRow(level) {
	const row = document.createElement('tr');
	row.id = `row-ll-${level}`;

	row.append(
		renderCellType(CELL.LEVELUP, level),
		renderCellType(CELL.FRAME, level),
		renderCellType(CELL.STATS, level),
		renderCellType(CELL.MOUNTS, level),
		renderCellType(CELL.SYSTEMS, level)
	);

	return row;
}