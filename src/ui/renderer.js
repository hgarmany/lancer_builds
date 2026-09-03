// ui/renderer.js

import {
	roadmap,
	setMaxLevel
} from '../data/roadmap.js';

import {
	resizeCatalog
} from '../data/cumulativeCatalog.js';

import {
	renderLevelLabel,
	renderLevelRow
} from './roadmapTable.js';

import {
	roadmapName,
	maxLevelInput,
	levelRail,
	tableBody
} from './renderModules.js';

function positionLevelLabels() {
	const railTop = levelRail.getBoundingClientRect().top;

	for (const label of levelRail.querySelectorAll('.level-tab')) {
		const row = document.getElementById(`row-ll-${label.dataset.ll}`);
		if (!row)
			continue;

		const rowRect = row.cells[0].getBoundingClientRect();
		label.style.top = `${rowRect.top - railTop}px`;
		label.style.height = `${rowRect.height}px`;
	}
}

const levelRowResizeObserver = new ResizeObserver(positionLevelLabels);

/**
 * Connect the roadmap name and max LL fields to table + roadmap data
 */
export function configureHeader() {
	roadmapName.value = roadmap.name;
	maxLevelInput.value = String(roadmap.maxLevel);

	maxLevelInput.addEventListener('change', event => {
		const currentMaxLevel = roadmap.maxLevel;
		const newMaxLevel = Number(event.currentTarget.value);

		resizeCatalog(newMaxLevel);
		setMaxLevel(roadmap, newMaxLevel);
		
		if (currentMaxLevel > newMaxLevel) {
			// remove extraneous row entirely
			document.getElementById(`row-ll-${currentMaxLevel}`).remove();
			document.getElementById(`label-ll-${currentMaxLevel}`).remove();
		}
		else {
			// build new row at default settings
			tableBody.append(renderLevelRow(newMaxLevel));
			levelRail.append(renderLevelLabel(newMaxLevel));
		}

		positionLevelLabels();
	});
}

export function initializeRenderPipeline() {
	tableBody.append(
		...Array.from(
			{ length: roadmap.maxLevel + 1 },
			(_, index) => renderLevelRow(index)
		)
	);
	levelRail.append(
		...Array.from(
			{ length: roadmap.maxLevel + 1 },
			(_, index) => renderLevelLabel(index)
		)
	);

	positionLevelLabels();
	levelRowResizeObserver.observe(tableBody);
}

/**
 * Totally rebuild the roadmap table
 */
export function rerenderRoadmap() {
	tableBody.replaceChildren();
	levelRail.replaceChildren();
	initializeRenderPipeline();
}