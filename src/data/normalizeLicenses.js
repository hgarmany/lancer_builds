// data/normalizeLicenses.js

const excludeLicenseNamesIds = [
	'GMS'
];

/**
 * Derive existence of licenses from
 * frame, system, and weapon requirements.
 *
 * @param {Object} gameData
 * @returns {Array<{id: string, name: string}>}
 */
export function getLicenses(gameData) {
	const licenseNames = new Set();

	const collections = [
		gameData.frames,
		gameData.systems,
		gameData.weapons
	];

	for (const collection of collections) {
		if (!Array.isArray(collection)) {
			continue;
		}

		for (const item of collection) {
			const licenseName = getLicenseName(item);

			if (licenseName && !excludeLicenseNamesIds.includes(licenseName))
				licenseNames.add(licenseName);
		}
	}

	return [...licenseNames]
		.sort((a, b) => a.localeCompare(b))
		.map(name => ({
			id: slugify(name),
			name
		}));
}

/**
 * Generalized getter for obtaining
 * license information from any single feature
 * 
 * @param {Object} item
 * @returns {String}
 */
function getLicenseName(item) {
	if (typeof item?.license === "string")
		return item.license.trim();
	if (typeof item?.license?.name === "string")
		return item.license.name.trim();

	return null;
}

/**
 * Normalize character set
 * 
 * @param {String} value
 * @returns {String}
 */
function slugify(value) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/['’‘]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}
