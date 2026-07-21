// data/catalog-engine.js

/**
 * ensureObjectSnapshot
 * repairs a missing level in a catalog
 * 
 * @param {Array} catalog
 * @param {number} level
 * @param {any} initial
 * @returns work-ready level snapshot from the target catalog
 */
export function ensureLevelSnapshot(catalog, level, initial = {}) {
	if (catalog[level] === undefined) {
		const previous = level > 0
			? ensureLevelSnapshot(catalog, level - 1, initial)
			: initial;

		catalog[level] = { ...previous };
	}

	return catalog[level];
}

/**
 * invalidateFrom
 * Truncates a catalog, removing all snapshots
 * at or beyond the target level
 * 
 * @param {Array} catalog
 * @param {number} level
 */
export function invalidateFrom(catalog, level) {
	catalog.splice(level);
}

/**
 * increment
 * Ticks up a counter on the target snapshot
 * 
 * @param {any} snapshot
 * @param {any} id
 */
export function increment(snapshot, id) {
	snapshot[id] = (snapshot[id] ?? 0) + 1;
}

/**
 * createRankRule
 * 
 * @param {any} param0
 * @returns
 */
export function createRankRule({
	catalog,
	maxRank,
	getMaxRank = () => maxRank
}) {
	const ensure = level =>
		ensureLevelSnapshot(catalog, level);

	return {
		ensure,

		update(level, id) {
			// consider: getMaxRank param to pass on for limiting increment
			increment(ensure(level), id);
		},

		isEligible(level, id) {
			return (ensure(level)[id] ?? 0) < getMaxRank(level);
		},

		reset(level) {
			invalidateFrom(catalog, level);
		}
	};
}