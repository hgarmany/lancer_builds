// data/roadmap.js

const MAX_LICENSE_LEVEL = 12;

export let roadmap = {};

/**
 * Return the number of advancement choices
 * granted at a LL
 *
 * @param {number} level
 * @returns {{
 *		skillTriggers: number,
 *		talents: number,
 *		licenses: number,
 *		coreBonuses: number
 * }}
 */
function getChoiceLimits(level) {
	if (level === 0) {
		return {
			skillTriggers: 4,
			talents: 3,
			mechSkills: 2
		};
	}

	return {
		skillTriggers: 1,
		talents: 1,
		mechSkills: 1
	};
}

/**
 * Makes empty arrays of the specified length
 * 
 * @param {number} length
 * @returns {Array<null>}
 */
function createEmptySlots(length) {
	return Array.from({ length }, () => null);
}

/**
 * Create a blank level for the roadmap
 * LL0 starts with the Everest loaded in
 * 
 * @param {any} level
 * @returns
 */
function createDefaultRoadmapLevel(level) {
	const limits = getChoiceLimits(level);

	return {
		skillTriggerIds: createEmptySlots(limits.skillTriggers),
		talentIds: createEmptySlots(limits.talents),
		haseIds: createEmptySlots(limits.mechSkills),
		licenseId: null,
		coreBonusId: null,
		// null means "inherit the previous level's mounts"
		mounts: null,
		systems: [],
		// null means "inherit the previous level's unused mod list"
		unusedModIds: null,

		// null means "continue using the previously active frame"
		frameId: level == 0 ? 'mf_standard_pattern_i_everest' : null
	};
}

/**
 * Configure roadmap to default blank
 */
export function createDefaultRoadmap() {
	roadmap = {
		name: 'New Roadmap',
		maxLevel: MAX_LICENSE_LEVEL,
		allowExotics: true,
		ll: Array.from(
			{ length: MAX_LICENSE_LEVEL + 1 },
			(_, level) => createDefaultRoadmapLevel(level)
		)
	};

	roadmap.ll[0].mounts = [
		{ type: 'Main', weapons: [{ id: null, tags: {} }], tags: {} },
		{ type: 'Flex', weapons: [{ id: null, tags: {} }], tags: {} },
		{ type: 'Heavy', weapons: [{ id: null, tags: {} }], tags: {} }
	];

	roadmap.ll[0].skillTriggerIds[0] = 'sk_assault';
	roadmap.ll[0].skillTriggerIds[1] = 'sk_spot';
	roadmap.ll[1].skillTriggerIds[0] = 'sk_spot';
	roadmap.ll[1].licenseId = 'mf_hydra';
	roadmap.ll[2].licenseId = 'mf_hydra';
	roadmap.ll[3].licenseId = 'mf_hydra';
	roadmap.ll[4].licenseId = 'mf_balor';
	roadmap.ll[3].coreBonusId = 'cb_the_lesson_of_the_held_image';
	roadmap.ll[0].talentIds[1] = 't_ace';
	roadmap.ll[1].talentIds[0] = 't_ace';
	roadmap.ll[0].haseIds[0] = 'hull';
	roadmap.ll[0].haseIds[1] = 'hull';
	roadmap.ll[1].haseIds[0] = 'agility';
	console.log(roadmap);
}

export function getEffectiveSystems(level) {
	for (let i = level; i >= 0; i--) {
		if (roadmap.ll[i].systems?.length > 0)
			return roadmap.ll[i].systems;
	}

	return [];
}

/**
 * Resize roadmap to match new maximum level
 * 
 * @param {Roadmap} roadmap
 * @param {number} maxLevel
 */
export function setMaxLevel(roadmap, maxLevel) {
	if (maxLevel > roadmap.maxLevel) {
		for (let i = roadmap.maxLevel + 1; i <= maxLevel; i++)
			roadmap.ll.push(createDefaultRoadmapLevel(i));
	}
	else if (maxLevel < roadmap.maxLevel) {
		roadmap.ll.length = maxLevel + 1;
	}

	roadmap.maxLevel = maxLevel;
}

function nullInvalidId(id, collection) {
	return id && collection.has(id) ? id : null;
}

function sourceIsAvailable(id, sourceData) {
	return !id ||
		sourceData.frames.has(id) ||
		sourceData.talents.has(id) ||
		sourceData.coreBonuses.has(id);
}

function getPreviousUnusedMods(level) {
	for (let i = level - 1; i >= 0; i--) {
		if (roadmap.ll[i].unusedModIds != null)
			return roadmap.ll[i].unusedModIds;
	}

	return [];
}

/**
 * Clear/remove all roadmap references to selections
 * from unloaded LCPs
 *
 * @param {Object} sourceData
 */
export function cleanRoadmapAfterLcpRemove(sourceData) {
	for (let level = 0; level < roadmap.ll.length; level++) {
		const data = roadmap.ll[level];
		data.skillTriggerIds = data.skillTriggerIds.map(id =>
			nullInvalidId(id, sourceData.skillTriggers));
		data.talentIds = data.talentIds.map(id =>
			nullInvalidId(id, sourceData.talents));
		data.licenseId = nullInvalidId(
			data.licenseId, sourceData.licenses);
		data.coreBonusId = nullInvalidId(
			data.coreBonusId, sourceData.coreBonuses);
		data.frameId = nullInvalidId(
			data.frameId, sourceData.frames);

		// system and mod lists size adaptively
		data.systems = data.systems.filter(system =>
			nullInvalidId(system.id, sourceData.systems));
		if (data.unusedModIds != null) {
			data.unusedModIds = data.unusedModIds
				.filter(id => sourceData.mods.has(id));
		}

		if (!Array.isArray(data.mounts))
			continue;

		const detachedMods = [];
		let retainedMountCount = 0;
		
		// weapons from invalid sources must pop off any valid mods
		for (const mount of data.mounts) {
			const mountAvailable = sourceIsAvailable(
				mount.tags?.source, sourceData);

			for (const weapon of mount.weapons ?? []) {
				weapon.tags ??= {};
				weapon.id = nullInvalidId(weapon.id, sourceData.weapons);

				const modId = weapon.tags.mod;
				if (modId && (!mountAvailable || !weapon.id ||
					!sourceData.mods.has(modId))) {
					if ((!mountAvailable || !weapon.id) &&
						sourceData.mods.has(modId))
						detachedMods.push(modId);

					delete weapon.tags.mod;
				}
			}

			if (mountAvailable)
				data.mounts[retainedMountCount++] = mount;
		}
		data.mounts.length = retainedMountCount;

		// valid mounts may still have invalid attachments
		const hasSuperheavy = data.mounts.some(mount =>
			(mount.weapons ?? []).some(weapon =>
				sourceData.weapons.get(weapon.id)?.mount === 'Superheavy'));

		for (const mount of data.mounts) {
			if (mount.tags?.attachments) {
				mount.tags.attachments = mount.tags.attachments.filter(id =>
					id === 'superheavy_bracing' ? hasSuperheavy :
						sourceIsAvailable(id, sourceData));
			}
		}

		// detached mods handling: invalid -> discarded, valid -> unused list
		if (detachedMods.length) {
			const unusedMods = data.unusedModIds ??
				[...getPreviousUnusedMods(level)];
			for (const id of detachedMods) {
				if (!unusedMods.includes(id))
					unusedMods.push(id);
			}
			data.unusedModIds = unusedMods;
		}
	}
}