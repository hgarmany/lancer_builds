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
	getEffectiveFrameId,
	isFrameEligible
} from '../rules/frames.js';





function applySelection(level, select, id, getEligibility) {
	select.value = id;
	select.classList.add('occupied');
	select.classList.toggle('error', !getEligibility(level, id, true));
}

function renderLevelUp(level) {
	return [];
}

function renderFrame(level) {
	const activeFrameId = getEffectiveFrameId(level);

	// load icon image from third party database
	const icon = document.createElement('img');
	icon.src = srcData.frames[activeFrameId]?.image_url ?? '';

	// generate prototype selector
	const select = createCommonSelect({
		className: CELL.FRAME.name,
		srcItems: srcData.frames,
		placeholderText: 'Select a frame',
		getLabel: frame => frame.name,
		getDescription: frame =>
			frame.description?.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
		getEligibility: id => isFrameEligible(level, id)
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