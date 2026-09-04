// ui/renderer.js

import {
	roadmap,
	setMaxLevel,
	saveRoadmapFile,
	loadRoadmapFile
} from '../data/roadmap.js';

import {
	resizeCatalog,
	initializeCatalog
} from '../data/cumulativeCatalog.js';

import {
	renderLevelLabel,
	renderLevelRow
} from './roadmapTable.js';

import {
	roadmapName,
	maxLevelInput,
	themeToggle,
	loadBtn,
	saveBtn,
	roadmapFileInput,
	levelRail,
	tableBody
} from './renderModules.js';

import {
	THEME
} from '../constants.js';

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

function resizeRoadmapName() {
	roadmapName.style.width = '0';
	roadmapName.style.width = `${roadmapName.scrollWidth}px`;
}

function refreshRoadmapHeader() {
	roadmapName.value = roadmap.name;
	resizeRoadmapName();
	maxLevelInput.value = String(roadmap.maxLevel);
}

/**
 * Connect the roadmap name and max LL fields to table + roadmap data
 */
export function configureHeader() {
	refreshRoadmapHeader();
	themeToggle.checked =
		document.documentElement.dataset.theme === THEME.DARK;

	themeToggle.addEventListener('change', event => {
		const theme = event.currentTarget.checked ? THEME.DARK : THEME.LIGHT;
		document.documentElement.dataset.theme = theme;
		localStorage.setItem('lancer-roadmap-theme', theme);
	});

	// load/save roadmap file
	loadBtn.addEventListener('click', () => roadmapFileInput.click());
	roadmapFileInput.addEventListener('change', async () => {
		const file = roadmapFileInput.files?.[0];
		if (!file)
			return;

		try {
			await loadRoadmapFile(file);
			initializeCatalog();
			refreshRoadmapHeader();
			rerenderRoadmap();
		}
		catch (error) {
			console.error(error);
		}
		finally {
			roadmapFileInput.value = '';
		}
	});
	saveBtn.addEventListener('click', saveRoadmapFile);

	roadmapName.addEventListener('input', resizeRoadmapName);
	document.fonts?.ready.then(resizeRoadmapName);

	maxLevelInput.addEventListener('change', event => {
		const currentMaxLevel = roadmap.maxLevel;
		const newMaxLevel = Number(event.currentTarget.value);

		if (newMaxLevel === currentMaxLevel)
			return;

		setMaxLevel(roadmap, newMaxLevel);
		resizeCatalog(newMaxLevel);
		
		if (currentMaxLevel > newMaxLevel) {
			// remove every row above the new maximum
			for (let level = currentMaxLevel; level > newMaxLevel; level--) {
				document.getElementById(`row-ll-${level}`).remove();
				document.getElementById(`label-ll-${level}`).remove();
			}
		}
		else {
			// build every new row
			for (let level = currentMaxLevel + 1; level <= newMaxLevel; level++) {
				tableBody.append(renderLevelRow(level));
				levelRail.append(renderLevelLabel(level));
			}
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