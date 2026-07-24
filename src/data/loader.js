import lancerData from '@massif/lancer-data';
import { normalizeGameData } from './normalizer.js';

const LCP_COLLECTIONS = Object.freeze([
	'skills',
	'frames',
	'systems',
	'weapons',
	'talents',
	'core_bonuses',
	'pilot_gear',
	'reserves'
]);

const installedLcpPackages = new Map();

export let skillTriggers = [];
export let talents = [];
export const mechSkillIds = ['h', 'a', 's', 'e'];
export const mechSkills = ['Hull', 'Agility', 'Systems', 'Engineering'];
export let licenses = [];
export let frames = [];
export let coreBonuses = [];
export let weapons = [];
export let systems = [];
export let pilotGear = [];
export let reserves = [];

/**
 * Initialize the published catalog from official Massif Press core data.
 */
export function importCoreData() {
	rebuildPublishedCatalog();
}

/**
 * Add one parsed LCP to the active catalog.
 *
 * Duplicate package IDs and record IDs are rejected rather than silently
 * replacing data that an existing roadmap may already reference.
 */
export function installLcpPackage(
	lcpPackage,
	{ replace = false } = {}
) {
	validatePackageShape(lcpPackage);

	if (installedLcpPackages.has(lcpPackage.id) && !replace) {
		throw new Error(
			`${lcpPackage.manifest.name} ${lcpPackage.manifest.version} ` +
			'is already installed.'
		);
	}

	const collisions = findRecordCollisions(
		lcpPackage,
		replace ? lcpPackage.id : null
	);
	if (collisions.length > 0) {
		throw new Error(
			`LCP record ID collision: ${collisions.join(', ')}`
		);
	}

	installedLcpPackages.set(lcpPackage.id, lcpPackage);
	rebuildPublishedCatalog();
	return getInstalledLcpPackages();
}

export function removeLcpPackage(packageId) {
	const removed = installedLcpPackages.delete(packageId);

	if (removed)
		rebuildPublishedCatalog();

	return removed;
}

export function getInstalledLcpPackages() {
	return [...installedLcpPackages.values()].map(lcpPackage => ({
		id: lcpPackage.id,
		name: lcpPackage.manifest.name,
		version: lcpPackage.manifest.version,
		author: lcpPackage.manifest.author ?? ''
	}));
}

function rebuildPublishedCatalog() {
	const mergedData = {
		...lancerData
	};

	for (const collectionName of LCP_COLLECTIONS) {
		mergedData[collectionName] = [
			...(lancerData[collectionName] ?? []),
			...getSupplementalRecords(collectionName)
		];
	}

	const gameData = normalizeGameData(mergedData);

	skillTriggers = gameData.skills ?? [];
	talents = gameData.talents ?? [];
	licenses = (gameData.licenses ?? []).filter(
		license => license.id !== 'gms'
	);
	frames = gameData.frames ?? [];
	coreBonuses = gameData.core_bonuses ?? [];
	weapons = gameData.weapons ?? [];
	systems = gameData.systems ?? [];
	pilotGear = gameData.pilot_gear ?? [];
	reserves = gameData.reserves ?? [];
}

function getSupplementalRecords(collectionName) {
	return [...installedLcpPackages.values()].flatMap(
		lcpPackage => lcpPackage.collections[collectionName] ?? []
	);
}

function findRecordCollisions(candidatePackage, ignoredPackageId) {
	const knownIds = new Set();
	const collisions = new Set();

	for (const collectionName of LCP_COLLECTIONS) {
		for (const record of lancerData[collectionName] ?? [])
			knownIds.add(record.id);

		for (const lcpPackage of installedLcpPackages.values()) {
			if (lcpPackage.id === ignoredPackageId)
				continue;

			for (
				const record of
				lcpPackage.collections[collectionName] ?? []
			) {
				knownIds.add(record.id);
			}
		}
	}

	for (const collectionName of LCP_COLLECTIONS) {
		for (
			const record of
				candidatePackage.collections[collectionName] ?? []
		) {
			if (knownIds.has(record.id))
				collisions.add(record.id);
		}
	}

	return [...collisions].sort();
}

function validatePackageShape(lcpPackage) {
	if (
		!lcpPackage ||
		typeof lcpPackage.id !== 'string' ||
		!lcpPackage.id ||
		typeof lcpPackage.manifest?.name !== 'string' ||
		typeof lcpPackage.collections !== 'object'
	) {
		throw new TypeError('Invalid parsed LCP package.');
	}
}
