// src/data/normalizer.js

/**
 * Normalize the imported lancer-data package into the shape expected by
 * the planner.
 *
 * @param {Object} rawData
 * @returns {Object}
 */
export function normalizeGameData(rawData) {
	return {
		...rawData,
		licenses: deriveLicenses(rawData)
	};
}

/**
 * Derive licenses from frames, systems, and weapons.
 *
 * @param {Object} gameData
 * @returns {Array<{id: string, name: string}>}
 */
function deriveLicenses(gameData) {
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

			if (licenseName) {
				licenseNames.add(licenseName);
			}
		}
	}

	return [...licenseNames]
		.sort((a, b) => a.localeCompare(b))
		.map(name => ({
			id: slugify(name),
			name
		}));
}

function getLicenseName(item) {
	if (typeof item?.license === "string") {
		return item.license.trim();
	}

	if (typeof item?.license?.name === "string") {
		return item.license.name.trim();
	}

	return null;
}

function slugify(value) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}