// wires.js

import {
	roadmap
} from '../data/roadmap.js';

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