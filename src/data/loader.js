import lancerData from '@massif/lancer-data';
import {
	strFromU8,
	unzipSync
} from 'fflate';

import {
	getLicenses
} from './normalizeLicenses.js';

import {
	cleanRoadmapAfterLcpRemove
} from './roadmap.js';

import {
	initializeCatalog
} from '../data/cumulativeCatalog.js';

import {
	rerenderRoadmap
} from '../ui/renderer.js';

import {
	fileInput,
	lcpStatus,
	renderPackageList
} from '../ui/renderModules.js';

const LCP_STORAGE_KEY = 'lancer-roadmap-lcp-packages';
const MAX_LCP_BYTES = 50 * 1024 * 1024;

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
 * Accept both the usual collection arrays and single-item JSON files.
 * Invalid collection values are ignored.
 *
 * @param {unknown} collection
 * @returns {Array<Object>}
 */
function normalizeCollection(collection) {
	if (Array.isArray(collection))
		return collection.filter(item => item && typeof item === 'object');
	if (collection && typeof collection === 'object')
		return [collection];
	return [];
}

/**
 * Build a map out of dataset entries, using the id value as a key.
 * Later entries intentionally replace earlier entries with the same ID.
 *
 * @param {any} dataset
 * @returns {Map}
 */
function normalizeById(dataset) {
	return new Map(normalizeCollection(dataset)
		.filter(item => typeof item.id === 'string' && item.id)
		.map(({ id, ...item }) => [id, item]));
}

export function getStoredPackages() {
	try {
		const stored = JSON.parse(localStorage.getItem(LCP_STORAGE_KEY) ?? '[]');
		return Array.isArray(stored) ? stored : [];
	}
	catch (error) {
		console.warn('Unable to read installed LCP data.', error);
		return [];
	}
}

export function setStoredPackages(packages) {
	localStorage.setItem(LCP_STORAGE_KEY, JSON.stringify(packages));
}

function getPackageId(manifest, fileName) {
	const identity = manifest.item_prefix ?? manifest.name ?? fileName;
	return String(identity)
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Read the supported source data from an LCP archive
 *
 * @param {Uint8Array} bytes
 * @param {string} fileName
 * @returns {Object}
 */
export function parseLcpArchive(bytes, fileName = 'package.lcp') {
	if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0)
		throw new Error('The selected file is empty.');
	if (bytes.byteLength > MAX_LCP_BYTES)
		throw new Error('The selected LCP is larger than 50 MB.');

	let archive;
	try {
		archive = unzipSync(bytes);
	}
	catch {
		throw new Error('The selected file is not a readable LCP/ZIP archive.');
	}

	const jsonFiles = new Map();
	for (const [path, contents] of Object.entries(archive))
		jsonFiles.set(
			path.replaceAll('\\', '/').split('/').pop().toLowerCase(),
			contents
		);

	const manifestFile = jsonFiles.get('lcp_manifest.json');
	if (!manifestFile)
		throw new Error('This archive does not contain lcp_manifest.json.');

	let manifest;
	try {
		manifest = JSON.parse(strFromU8(manifestFile).replace(/^\uFEFF/, ''));
	}
	catch {
		throw new Error('The LCP manifest is not valid JSON.');
	}

	if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
		throw new Error('The LCP manifest has an invalid format.');

	// import data to collection bins
	const collections = {};
	let itemCount = 0;
	for (const collectionName of LCP_COLLECTIONS) {
		const collectionFile = jsonFiles.get(`${collectionName}.json`);
		if (!collectionFile) {
			collections[collectionName] = [];
			continue;
		}

		try {
			const parsed = JSON.parse(
				strFromU8(collectionFile).replace(/^\uFEFF/, ''));
			collections[collectionName] = normalizeCollection(parsed)
				.filter(item => typeof item.id === 'string' && item.id);
			itemCount += collections[collectionName].length;
		}
		catch {
			throw new Error(`${collectionName}.json is not valid JSON.`);
		}
	}

	if (itemCount === 0)
		throw new Error('The LCP contains no supported roadmap data.');

	return {
		id: getPackageId(manifest, fileName),
		name: manifest.name ?? fileName,
		version: manifest.version ?? '',
		author: manifest.author ?? '',
		description: manifest.description ?? '',
		fileName,
		collections
	};
}

/**
 * Compile data from all available JSON
 * 
 * @returns {Object}
 */
function getMergedData() {
	const mergedData = {};
	for (const collectionName of LCP_COLLECTIONS)
		mergedData[collectionName] = [
			...normalizeCollection(lancerData[collectionName])
		];

	for (const lcp of getStoredPackages()) {
		for (const collectionName of LCP_COLLECTIONS) {
			mergedData[collectionName].push(
				...normalizeCollection(lcp.collections?.[collectionName]));
		}
	}

	return mergedData;
}

/**
 * Build source data maps out of core Lancer data and installed LCPs
 */
export function loadSourceData() {
	const mergedData = getMergedData();

	srcData.skillTriggers = normalizeById(mergedData.skills);
	srcData.talents = normalizeById(mergedData.talents);
	srcData.licenses = getLicenses(mergedData);
	srcData.frames = normalizeById(mergedData.frames);
	srcData.coreBonuses = normalizeById(mergedData.core_bonuses);
	srcData.weapons = normalizeById(mergedData.weapons);
	srcData.systems = normalizeById([
		...mergedData.systems,
		...mergedData.mods
	]);
	srcData.mods = normalizeById(mergedData.mods);

	console.log(srcData);
}

function pushLcpChange(lcp, isImport) {
	const packages = getStoredPackages();
	const idx = packages.findIndex(
		candidate => candidate.id === lcp.id);

	if (isImport) {
		if (idx < 0)
			packages.push(lcp);
		else
			packages.splice(idx, 1, lcp);
	}
	else {
		packages.splice(idx, 1);
	}

	setStoredPackages(packages);
	loadSourceData();
	if (!isImport)
		cleanRoadmapAfterLcpRemove(srcData);
	renderPackageList(packages, isImport, lcp);

	initializeCatalog();
	rerenderRoadmap();
}

/**
 * Process selected LCP file into source data
 *
 * @param {File} file
 * @param {Function} onDataChanged
 */
async function importLCP(file) {
	lcpStatus.textContent = `Installing ${file.name}…`;
	try {
		const lcp = parseLcpArchive(
			new Uint8Array(await file.arrayBuffer()), file.name);
		pushLcpChange(lcp, true);
	}
	catch (error) {
		console.error(error);
		lcpStatus.textContent = error instanceof Error ?
			error.message : 'Unable to install this LCP.';
	}
	finally {
		fileInput.value = '';
	}
}

export function removeLCP(lcp) {
	pushLcpChange(lcp, false);
}

export function configureLcpManager() {
	renderPackageList(getStoredPackages());

	fileInput.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		if (!file)
			return;
		await importLCP(file);
	});
}