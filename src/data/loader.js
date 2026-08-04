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

function normalizeById(dataset) {
	const normalizedSet = new Object();

	for (const item of dataset) {
		const id = item.id;
		delete item.id;
		normalizedSet[id] = item;
	}

	return normalizedSet;
}

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
	srcData.systems = normalizeById(mergedData.systems ?? []);
	srcData.mods = normalizeById(mergedData.mods ?? []);

	console.log(srcData);
}