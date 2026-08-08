// wires.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	incrementFromLevel,
	decrementFromLevel
} from '../data/cumulativeCatalog.js';

import {
	SELECT_TEMPLATE
} from './renderModules.js';

const roadmapName = document.getElementById('roadmap-name');
const roadmapShell = document.getElementById("roadmap-shell");
const roadmapContainer = document.querySelector(".roadmap-container");
export const tableBody = document.getElementById("roadmap-body");
const tableHead = document.querySelector("#roadmap-table thead");
const levelRail = document.querySelector(".level-rail");
const levelTabs = document.getElementById("level-tabs");
const maxLevelInput = document.getElementById('roadmap-max-level');

/**
 * Connect the roadmap name and max LL fields to table + roadmap data
 */
export function wireHeader() {
	roadmapName.value = roadmap.name;
	maxLevelInput.value = String(roadmap.maxLevel);

	maxLevelInput.addEventListener('change', event => {
		const newMaxLevel = Number.parseInt(
			event.currentTarget.value,
			10
		);

		if (
			!Number.isInteger(newMaxLevel) ||
			newMaxLevel < 0 ||
			newMaxLevel > 12
		) {
			// reset if invalid / out-of-bounds
			event.currentTarget.value =
				String(roadmap.maxLevel);
			return;
		}

		setMaxLevel(roadmap, newMaxLevel);
		resizeViaHide(roadmap, newMaxLevel);
	});
}

function refreshSelectors(level, template) {
	const srcItems = template.getSrcItems();

	for (let i = level; i <= roadmap.maxLevel; i++) {
		const selectGroup = document.getElementById(
			`${template.className}-ll-${i}`);
		if (!selectGroup)
			continue;

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

/**
 * In-class selector refresh and database update
 * Template passes through class-specific functionality and targeting
 * 
 * @param {EventPrototype} event 
 * @param {Object} template 
 */
export function selectionUpdate(event, template) {
	const eventSelect = event.currentTarget;
	const currentLevel = Number(eventSelect.dataset.ll);
	const idx = Number(eventSelect.dataset.idx);

	const oldId = template.roadmapRead({ level: currentLevel, idx });
	const newId = eventSelect.value === '' ? null: eventSelect.value;

	// update this selector
	eventSelect.classList.toggle('occupied', newId);

	// update roadmap and cumulative catalog
	template.roadmapWrite({ level: currentLevel, idx, id: newId });
	incrementFromLevel(template.catalog, newId, currentLevel);
	decrementFromLevel(template.catalog, oldId, currentLevel);

	// update all skill selectors at this and later levels
	refreshSelectors(currentLevel, template);
}