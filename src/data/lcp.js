import { strFromU8, unzipSync } from 'fflate';

const MANIFEST_FILENAME = 'lcp_manifest.json';
const COLLECTION_FILES = Object.freeze({
	'skills.json': 'skills',
	'frames.json': 'frames',
	'systems.json': 'systems',
	'weapons.json': 'weapons',
	'talents.json': 'talents',
	'core_bonuses.json': 'core_bonuses',
	'pilot_gear.json': 'pilot_gear',
	'reserves.json': 'reserves'
});

/**
 * Parse and validate a v3 LCP archive.
 *
 * @param {ArrayBuffer|Uint8Array} archive
 */
export function parseLcpArchive(archive) {
	const bytes = archive instanceof Uint8Array
		? archive
		: new Uint8Array(archive);
	let entries;

	try {
		entries = unzipSync(bytes);
	}
	catch {
		throw new TypeError(
			'This file is not a readable ZIP-based LCP archive.'
		);
	}

	const filesByName = new Map(
		Object.entries(entries).map(([path, contents]) => [
			getFilename(path).toLowerCase(),
			contents
		])
	);
	const manifest = parseJsonFile(
		filesByName,
		MANIFEST_FILENAME,
		{ required: true }
	);

	validateManifest(manifest);

	const collections = {};
	const recordIds = new Set();

	for (const [filename, collectionName] of Object.entries(
		COLLECTION_FILES
	)) {
		const records = parseJsonFile(filesByName, filename) ?? [];

		if (!Array.isArray(records)) {
			throw new TypeError(
				`${filename} must contain a JSON array.`
			);
		}

		for (const record of records) {
			validateRecord(record, filename);

			if (recordIds.has(record.id)) {
				throw new TypeError(
					`Duplicate LCP record ID: ${record.id}`
				);
			}

			recordIds.add(record.id);
		}

		collections[collectionName] = records;
	}

	return {
		id: getPackageId(manifest),
		manifest,
		collections
	};
}

export async function parseLcpFile(file) {
	if (!file || typeof file.arrayBuffer !== 'function')
		throw new TypeError('No LCP file was selected.');

	return parseLcpArchive(await file.arrayBuffer());
}

function parseJsonFile(
	filesByName,
	filename,
	{ required = false } = {}
) {
	const contents = filesByName.get(filename);

	if (!contents) {
		if (required)
			throw new TypeError(`LCP is missing ${filename}.`);

		return null;
	}

	try {
		return JSON.parse(strFromU8(contents));
	}
	catch {
		throw new TypeError(`${filename} contains invalid JSON.`);
	}
}

function validateManifest(manifest) {
	if (!manifest || typeof manifest !== 'object') {
		throw new TypeError('LCP manifest must be a JSON object.');
	}

	if (manifest.v3 !== true) {
		throw new TypeError(
			'Only v3 LCP packages are currently supported.'
		);
	}

	if (
		typeof manifest.name !== 'string' ||
		!manifest.name.trim() ||
		typeof manifest.version !== 'string' ||
		!manifest.version.trim()
	) {
		throw new TypeError(
			'LCP manifest requires a name and version.'
		);
	}
}

function validateRecord(record, filename) {
	if (
		!record ||
		typeof record !== 'object' ||
		typeof record.id !== 'string' ||
		!record.id.trim()
	) {
		throw new TypeError(
			`${filename} contains a record without a valid ID.`
		);
	}
}

function getPackageId(manifest) {
	const prefix = typeof manifest.item_prefix === 'string'
		? manifest.item_prefix.trim()
		: '';

	return prefix || slugify(manifest.name);
}

function getFilename(path) {
	return path.replaceAll('\\', '/').split('/').at(-1);
}

function slugify(value) {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
