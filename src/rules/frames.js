import { workingCatalog } from '../data/roadmap-table.js';

import {
	licenses,
	frames
} from '../data/loader.js';

import {
	ensureLicenseSnapshot
} from '../rules/licenses.js'

export function frameIsEligible(level, frameId, roadmap) {
	if (workingCatalog.licenses[level] === undefined)
		ensureLicenseSnapshot(level);
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

export function getActiveFrameId(roadmap, level) {
	for (let targetLevel = level; targetLevel >= 0; targetLevel--) {
		const frameId = roadmap.levels[targetLevel]?.frameId;

		if (frameId)
			return frameId;
	}

	return null;
}

export function getNextExplicitFrameLevel(roadmap, level) {
	for (
		let targetLevel = level + 1;
		targetLevel < roadmap.levels.length;
		targetLevel++
	) {
		if (roadmap.levels[targetLevel]?.frameId)
			return targetLevel;
	}

	return Infinity;
}