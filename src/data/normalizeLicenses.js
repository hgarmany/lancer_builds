// data/normalizeLicenses.js

const excludeLicenseNamesIds = [
	'GMS'
];

/**
 * Derive existence of licenses from
 * frame, system, and weapon requirements
 *
 * @param {Object} gameData
 * @returns {Array<{id: string, name: string}>}
 */
export function getLicenses(gameData) {
	const licenses = new Map();

	for (const frame of gameData.frames) {
		const id = frame.license_id;
		if (!licenses.get(id) &&
			!excludeLicenseNamesIds.includes(frame.source))
			licenses.set(id, { id, name: frame?.name });
	}

	return licenses;
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
