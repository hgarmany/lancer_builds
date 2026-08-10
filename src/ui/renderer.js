// ui/renderer.js

import {
	roadmap,
	setMaxLevel
} from '../data/roadmap.js';

import {
	resizeCatalog
} from '../data/cumulativeCatalog.js';

import {
	renderLevelRow
} from './roadmapTable.js';

import {
	roadmapName,
	maxLevelInput,
	tableBody
} from './renderModules.js';

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
		
		if (currentMaxLevel > newMaxLevel)
			// remove extraneous row entirely
			document.getElementById(`row-ll-${currentMaxLevel}`).remove();
		else
			// build new row at default settings
			tableBody.append(renderLevelRow(newMaxLevel));
	});
}

export function initializeRenderPipeline() {
	tableBody.append(
		...Array.from(
			{ length: roadmap.maxLevel + 1 },
			(_, index) => renderLevelRow(index)
		)
	);
}
