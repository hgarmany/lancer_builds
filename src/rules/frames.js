import { workingCatalog } from '../data/roadmap-table.js';

import {
	licenses,
	frames
} from '../data/loader.js';

import {
	addLicenseLevelToCatalog
} from '../rules/licenses.js'

export function frameIsEligible(level, frameId, roadmap) {
	if (workingCatalog.licenses[level] === undefined)
		addLicenseLevelToCatalog(level);
	const licenseCatalog = workingCatalog.licenses[level];
	
	const frameIdx = frames.findIndex(m => m.id === frameId);
	if (frameIdx >= 0) {
		const authorizingLicense = frames[frameIdx].license_id.substring(3);
		const levelRequirement = parseInt(frames[frameIdx].license_level);

		return (
			levelRequirement == 0 ||
			licenseCatalog[authorizingLicense] !== undefined &&
			licenseCatalog[authorizingLicense] >= levelRequirement
		);
	}
	return false;
}