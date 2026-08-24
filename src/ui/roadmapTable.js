// render/roadmapTable.js

import {
	renderHexStat,
	renderHASETooltip,
	getFrameImageSrc,
	renderStats,
	renderMounts,
	renderIntegratedSystems,
	renderBudgetPill
} from './renderModules.js';

import {
	SELECT_TEMPLATE,
	renderSelector
} from './selectors.js';

import {
	getEffectiveFrameId
} from '../rules/frames.js';

export function renderLevelLabel(level) {
	const label = document.createElement('div');
	label.id = `label-ll-${level}`;
	label.className = 'level-tab';
	label.dataset.ll = level;
	label.textContent = `LL${level}`;

	if (level != 0 && level % 3 == 0)
		label.classList.add('cb-level');

	return label;
}

function renderMenu(level, template) {
	const menu = document.createElement('div');
	menu.className = 'menu';

	if (template.title) {
		const menuLabel = document.createElement('div');
		menuLabel.className = 'menu-label';
		menuLabel.textContent = template.title + (level === 0 ? 's' : '');

		menu.append(menuLabel);
	}

	const roadmapData = template.readLevel(level);

	const selectGroup = document.createElement('div');
	selectGroup.id = `${template.type}-ll-${level}`;
	selectGroup.className = 'select-group';

	// configure selectors for current user-selected value
	if (roadmapData instanceof Array) {
		roadmapData.forEach((id, idx) => {
			const selector = renderSelector(level, id, template);
			selector.dataset.idx = idx;

			selectGroup.append(selector);
		});
	}
	else {
		const selector = renderSelector(level, roadmapData, template);
		selector.dataset.idx = 0;

		selectGroup.append(selector);
	}

	// single manager for all menu selections
	menu.addEventListener('click', event => {
		const select = event.target.closest('.custom-select');

		if (!select)
			return;

		const label = select.querySelector('.selector-value');
		const option = event.target.closest('.selector-option');
		const clear = event.target.closest('.selector-clear');

		if (option) {
			select.value = option.value;
			label.textContent = option.textContent;

			// wire selector to perform page updates when selection changes
			template.changeEvent(select, level);
		}
		else if (clear) {
			// clear through the same write/refresh path as a selection
			select.value = null;
			label.textContent = template.getLabel({}) ?? '';
			select.classList.remove('open');

			template.changeEvent(select, level);
			return;
		}

		select.classList.toggle('open');
	});

	menu.append(selectGroup);

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

	const haseTooltip = renderHASETooltip(level);

	haseGroup.append(
		hullHex,
		agilityHex,
		systemsHex,
		engineeringHex,
		haseTooltip
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

	const menu = renderMenu(level, SELECT_TEMPLATE.FRAME);
	
	return [icon, menu];
}

function renderSystems(level) {
	return [
		renderBudgetPill(level),
		renderIntegratedSystems(level),
		renderMenu(level, SELECT_TEMPLATE.SYSTEM)
	];
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
	cellContent.className = `cell-content ${cellType.name}`;
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
