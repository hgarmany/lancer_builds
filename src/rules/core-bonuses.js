import { workingCatalog } from '../data/roadmap-table.js';

import {
	coreBonuses,
	frames
} from '../data/loader.js';

import {
	addLicenseLevelToCatalog
} from '../rules/licenses.js'

export function coreBonusIsEligible(level, coreBonusId, roadmap) {
	// console.log(roadmap);
	if (workingCatalog.coreBonuses[level] === undefined)
		addLicenseLevelToCatalog(level);
	const coreBonusCatalog = workingCatalog.coreBonuses[level];
	// console.log(coreBonusCatalog);
	// console.log(coreBonusId);
	const coreBonusIdx = coreBonuses.findIndex(m => m.id === coreBonusId);
	const manufacturer = coreBonuses[coreBonusIdx].source;
	// console.log(coreBonusIdx);
	// console.log(manufacturer);

	const licenses = workingCatalog.licenses[level];
	console.log(licenses);
	

	let total = 0;
	if (licenses) {
		for (const [key, value] of Object.entries(licenses)) {
			const frame = frames.find(frame => frame.license_id == 'mf_' + key);
			if (frame && frame.source == manufacturer)
				total += value;
		}
	}

	console.log('total: ' + total + ' ' + (total >= 3) + " " + level);
	return total >= 3;
}