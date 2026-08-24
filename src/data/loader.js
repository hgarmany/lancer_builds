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
	'systems',
	'mods'
]);

export const srcData = {};

/**
 * Build a map out of dataset entries, using the id value as a key
 * 
 * @param {any} dataset
 * @returns {Map}
 */
function normalizeById(dataset) {
	return new Map(dataset.map(({ id, ...item }) => [id, item]));
}

/**
 * Build source data maps out of core Lancer data
 */
export function importCoreData() {
	const mergedData = {
		...lancerData
	};
	
	srcData.skillTriggers = normalizeById(mergedData.skills ?? []);
	srcData.talents = normalizeById(mergedData.talents ?? []);
	srcData.licenses = getLicenses(mergedData);
	srcData.frames = normalizeById(mergedData.frames ?? []);
	srcData.coreBonuses = normalizeById(mergedData.core_bonuses ?? []);
	srcData.weapons = normalizeById(mergedData.weapons ?? []);
	srcData.systems = normalizeById([...mergedData.systems, ...mergedData.mods]);
	srcData.mods = normalizeById(mergedData.mods ?? []);

	console.log(srcData);
}