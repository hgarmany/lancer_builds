// rules/stats.js

import {
	roadmap
} from '../data/roadmap.js';

import {
	srcData
} from '../data/loader.js';

import {
	STAT_DEFINITIONS,
	MECH_STAT_IDS,
	DISPLAYED_MECH_STAT_IDS,
	MAX_FRAME_SIZE
} from '../constants.js';

export function didStatWorsen(catalog, level, id) {
	if (level == 0)
		return false;
	
	const value = Number(catalog.stats[level][id]) ?? 0;
	const previousValue = Number(catalog.stats[level - 1][id]) ?? 0;

	return id !== 'size' &&	value < previousValue;
}

/**
 * Get full base stats for a given frame
 * 
 * @param {Number} frameId 
 * @returns stats Object
 */
function createBaseStats(frameId) {
	const frame = srcData.frames[frameId];

	return Object.fromEntries(
		Object.entries(STAT_DEFINITIONS).map(
			([statId, definition]) => {
				if (!frame)
					return [statId, null];

				const value = definition.frameProperty
					? frame.stats?.[definition.frameProperty]
					: definition.defaultValue;

				return [statId, value ?? null];
			}
		)
	);
}

/**
 * Get level based stat modifiers for applying grit
 * 
 * @param {{number}} {level} 
 * @returns stat modifier Array
 */
function getLevelModifiers({ level }) {
	const grit = Math.ceil(level / 2);

	return [
		{
			stat: 'hp',
			value: grit
		},
		{
			stat: 'save',
			value: grit
		},
		{
			stat: 'sp',
			value: grit
		}
	];
}

/**
 * Get HASE based stat modifiers
 * 
 * @param {{Object, number}} {catalog, level}
 * @returns stat modifier Array
 */
function getMechSkillModifiers({ catalog, level }) {
	const hull = catalog.hase[level]?.h ?? 0;
	const evasion = catalog.hase[level]?.a ?? 0;
	const systems = catalog.hase[level]?.s ?? 0;
	const engineering = catalog.hase[level]?.e ?? 0;

	return [
		{
			stat: 'hp',
			value: 2 * hull
		},
		{
			stat: 'repcap',
			value: Math.floor(hull / 2)
		},
		{
			stat: 'evasion',
			value: evasion
		},
		{
			stat: 'speed',
			value: Math.floor(evasion / 2)
		},
		{
			stat: 'tech_attack',
			value: systems
		},
		{
			stat: 'edef',
			value: systems
		},
		{
			stat: 'sp',
			value: Math.floor(systems / 2)
		},
		{
			stat: 'heatcap',
			value: engineering
		},
		{
			stat: 'limited_bonus',
			value: Math.floor(engineering / 2)
		}
	];
}

/**
 * Get special stat modifiers from core bonuses
 * Only collects stat bonuses
 * 
 * @param {{Object, number}} {catalog, level}
 * @returns stat modifier Array
 */
function getCoreBonusModifiers({ catalog, level }) {
	const activeCBs = catalog.coreBonuses[level];
	let modifiers = [];

	for (const id of activeCBs) {
		const cbSrc = srcData.coreBonuses[id];
		if (!cbSrc || !cbSrc.bonuses)
			continue;

		cbSrc.bonuses.forEach(bonus => {
			if (bonus.val && MECH_STAT_IDS.includes(bonus.id)) {
				modifiers.push({
					stat: bonus.id,
					value: bonus.val
				});
			}
		});
	}

	return modifiers;
}

/**
 * Get special stat modifiers from systems
 * Only collects stat bonuses
 * 
 * @param {{Object, number}} {catalog, level}
 * @returns stat modifier Array
 */
function getSystemModifiers({ catalog, level }) {
	const systems = roadmap.ll[level].systems;
	let modifiers = [];

	for (const system of systems) {
		const sysSrc = srcData.systems[system.id];
		if (!sysSrc || !sysSrc.bonuses)
			continue;

		sysSrc.bonuses.forEach(bonus => {
			if (bonus.val && MECH_STAT_IDS.includes(bonus.id)) {
				modifiers.push({
					stat: bonus.id,
					value: bonus.val
				});
			}
		});
	}

	return modifiers;
}

const modifierSets = [
	getLevelModifiers,
	getMechSkillModifiers,
	getCoreBonusModifiers,
	getSystemModifiers
];

/**
 * Full configuration of cumulativeCatalog stats for a level
 * 
 * @param {Object} catalog 
 * @param {number} level 
 * @returns stats Object
 */
export function calculateMechStats(catalog, level) {
	const frameId = catalog.activeFrame[level] ?? null;
	if (!frameId)
		return null;

	// initialize stats from frame data
	const stats = createBaseStats(frameId);

	// build a list of bonuses on top of base stats
	const modifiers = modifierSets.flatMap(
		setFunc => setFunc({ catalog, level }));

	for (const modifier of modifiers) {
		const definition = STAT_DEFINITIONS[modifier.stat];

		if (!definition)
			throw new Error(`Unknown mech stat: ${modifier.stat}`);

		if (definition.allowModifiers === false)
			throw new Error(`${modifier.stat} does not allow modifiers`);

		stats[modifier.stat] =
			Math.floor(stats[modifier.stat]) + modifier.value;
	}

	stats.size = Math.min(MAX_FRAME_SIZE, stats.size);
	stats.sp_budget = stats.sp;
	stats.ai_budget = stats.ai_cap;

	catalog.stats[level] = stats;

	return stats;
}