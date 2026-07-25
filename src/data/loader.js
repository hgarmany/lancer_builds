import lancerData from '@massif/lancer-data';

import {
	getLicenses
} from './normalizeLicenses.js';

const LCP_COLLECTIONS = Object.freeze([
	'skills',
	'talents',
	'core_bonuses',
	'frames',
	'weapons',
	'systems'
]);

export const srcData = {};

export function importCoreData() {
	const mergedData = {
		...lancerData
	};

	srcData.skillTriggers = mergedData.skills ?? [];
	srcData.talents = mergedData.talents ?? [];
	srcData.licenses = getLicenses(mergedData);
	srcData.frames = mergedData.frames ?? [];
	srcData.coreBonuses = mergedData.core_bonuses ?? [];
	srcData.weapons = mergedData.weapons ?? [];
	srcData.systems = mergedData.systems ?? [];
}