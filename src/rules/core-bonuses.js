import { workingCatalog } from '../data/roadmap-table.js';

import {
	coreBonuses,
	frames
} from '../data/loader.js';

import {
	addLicenseLevelToCatalog
} from '../rules/licenses.js'

export function coreBonusesUpdateCatalog(level, coreBonusId) {
	const bonusIndex = level / 3 - 1;

	for (
		let targetLevel = level;
		targetLevel < workingCatalog.coreBonuses.length;
		targetLevel++
	) {
		const snapshot = [
			...workingCatalog.coreBonuses[targetLevel]
		];

		snapshot[bonusIndex] = coreBonusId;
		workingCatalog.coreBonuses[targetLevel] = snapshot;
	}
}

export function coreBonusIsEligible(level, coreBonusId, roadmap) {
	if (workingCatalog.licenses[level] === undefined)
		addLicenseLevelToCatalog(level);
	if (workingCatalog.coreBonuses[level] === undefined)
		addCoreBonusLevelToCatalog(level);
	const coreBonusCatalog = workingCatalog.coreBonuses[level];
	const coreBonusIdx = coreBonuses.findIndex(m => m.id === coreBonusId);
	const manufacturer = coreBonuses[coreBonusIdx].source;

	const licenses = workingCatalog.licenses[level];

	let total = 0;
	if (licenses) {
		for (const [key, value] of Object.entries(licenses)) {
			const frame = frames.find(frame => frame.license_id == 'mf_' + key);
			if (frame && frame.source == manufacturer)
				total += value;
		}
	}

	if (level > 3) {
		for (const coreBonus of workingCatalog.coreBonuses[level - 1]) {
			if (coreBonus &&
				coreBonuses.find(cb => cb.id == coreBonus).source == manufacturer) {
				total -= 3;
			}
		}
	}

	return total >= 3;
}

export function addCoreBonusLevelToCatalog(level) {
	if (level > 0 &&
		workingCatalog.coreBonuses[level - 1] !== undefined) {
		// Create an independent snapshot of the previous level.
		workingCatalog.coreBonuses[level] = [
			...workingCatalog.coreBonuses[level - 1]
		];
	}
	else {
		workingCatalog.coreBonuses[level] = [];
	}
}