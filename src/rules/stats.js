// rules/stats.js

import { workingCatalog } from "../data/roadmap-table.js";

const STAT_DEFINITIONS = {
	size: {
		frameProperty: 'size'
	},
	hp: {
		frameProperty: 'hp'
	},
	armor: {
		frameProperty: 'armor'
	},
	heatcap: {
		frameProperty: 'heatcap'
	},
	evasion: {
		frameProperty: 'evasion'
	},
	speed: {
		frameProperty: 'speed'
	},
	edef: {
		frameProperty: 'edef'
	},
	tech_attack: {
		frameProperty: 'tech_attack'
	},
	sensor_range: {
		frameProperty: 'sensor_range',
		allowModifiers: false
	},
	repcap: {
		frameProperty: 'repcap'
	},
	save: {
		frameProperty: 'save'
	},
	sp: {
		frameProperty: 'sp'
	},
	limited_bonus: {
		defaultValue: 0,
		display: false
	},
	ai_cap: {
		defaultValue: 1,
		display: false
	}
};

export const MECH_STAT_IDS = Object.freeze(
	Object.keys(STAT_DEFINITIONS)
);

export const DISPLAYED_MECH_STAT_IDS = Object.freeze(
	Object.entries(STAT_DEFINITIONS)
		.filter(([, definition]) =>
			definition.display !== false
		)
		.map(([statId]) => statId)
);

export function mechStatDecreased(
	statId,
	value,
	previousValue
) {
	return (
		statId !== 'size' &&
		Number.isFinite(value) &&
		Number.isFinite(previousValue) &&
		value < previousValue
	);
}

const modifierProviders = [
	getMechSkillModifiers,
	getCoreBonusModifiers,
	getSystemModifiers
];

export function calculateMechStats({
	frame,
	level,
	catalogSnapshot,
	roadmapLevel
}) {
	const context = {
		frame,
		level,
		catalogSnapshot,
		roadmapLevel
	};
	const stats = createBaseStats(frame);

	if (!frame)
		return stats;

	const modifiers = modifierProviders.flatMap(
		provider => provider(context)
	);

	for (const modifier of modifiers) {
		const definition = STAT_DEFINITIONS[modifier.stat];

		if (!definition)
			throw new Error(`Unknown mech stat: ${modifier.stat}`);

		if (definition.allowModifiers === false) {
			throw new Error(
				`${modifier.stat} does not allow modifiers`
			);
		}

		stats[modifier.stat] = applyModifier(
			stats[modifier.stat],
			modifier
		);
	}

	workingCatalog.stats[level] = { ...stats };
	return stats;
}

function createBaseStats(frame) {
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

function getMechSkillModifiers({ catalogSnapshot }) {
	const hull = catalogSnapshot.mechSkills?.h ?? 0;
	const evasion = catalogSnapshot.mechSkills?.a ?? 0;
	const systems = catalogSnapshot.mechSkills?.s ?? 0;
	const engineering = catalogSnapshot.mechSkills?.e ?? 0;

	return [
		{
			id: 'hull-hp',
			stat: 'hp',
			operation: 'bonus',
			value: 2 * hull
		},
		{
			id: 'hull-repcap',
			stat: 'repcap',
			operation: 'bonus',
			value: Math.floor(hull / 2)
		},
		{
			id: 'agility-evasion',
			stat: 'evasion',
			operation: 'bonus',
			value: evasion
		},
		{
			id: 'agility-speed',
			stat: 'speed',
			operation: 'bonus',
			value: Math.floor(evasion / 2)
		},
		{
			id: 'systems-tattk',
			stat: 'tech_attack',
			operation: 'bonus',
			value: systems
		},
		{
			id: 'systems-edef',
			stat: 'edef',
			operation: 'bonus',
			value: systems
		},
		{
			id: 'systems-sp',
			stat: 'sp',
			operation: 'bonus',
			value: Math.floor(systems / 2)
		},
		{
			id: 'engineering-heatcap',
			stat: 'heatcap',
			operation: 'bonus',
			value: engineering
		},
		{
			id: 'engineering-limited-bonus',
			stat: 'limited_bonus',
			operation: 'bonus',
			value: Math.floor(engineering / 2)
		}
	];
}

function getCoreBonusModifiers({ catalogSnapshot }) {
	const cb = catalogSnapshot.coreBonuses;
	let modifiers = [];

	if (cb.includes('cb_fomorian_frame')) {
		modifiers.push({
			id: 'fomorian-frame',
			stat: 'size',
			operation: 'increaseSize',
			value: 1,
			maximum: 3
		});
	}
	if (cb.includes('cb_reinforced_frame')) {
		modifiers.push({
			id: 'reinforced-frame',
			stat: 'hp',
			operation: 'bonus',
			value: 5
		});
	}
	if (cb.includes('cb_sloped_plating')) {
		modifiers.push({
			id: 'sloped-plating',
			stat: 'armor',
			operation: 'bonus',
			value: 1,
			maximum: 4
		});
	}
	if (cb.includes('cb_full_subjectivity_sync')) {
		modifiers.push({
			id: 'full-subjectivity-sync',
			stat: 'evasion',
			operation: 'bonus',
			value: 2
		});
	}
	if (cb.includes('cb_the_lesson_of_disbelief')) {
		modifiers.push({
			id: 'lesson-of-disbelief',
			stat: 'edef',
			operation: 'bonus',
			value: 2
		});
	}
	if (cb.includes('cb_the_lesson_of_the_open_door')) {
		modifiers.push({
			id: 'lesson-of-the-open-door',
			stat: 'save',
			operation: 'bonus',
			value: 2
		});
	}
	if (cb.includes('cb_the_lesson_of_shaping')) {
		modifiers.push({
			id: 'lesson-of-shaping',
			stat: 'ai_cap',
			operation: 'bonus',
			value: 1
		});
	}
	if (cb.includes('cb_integrated_ammo_feeds')) {
		modifiers.push({
			id: 'integrated-ammo-feeds',
			stat: 'limited_bonus',
			operation: 'bonus',
			value: 2
		});
	}
	if (cb.includes('cb_superior_by_design')) {
		modifiers.push({
			id: 'superior-by-design',
			stat: 'heatcap',
			operation: 'bonus',
			value: 2
		});
	}

	return modifiers;
}

function getSystemModifiers({ catalogSnapshot }) {
	return (catalogSnapshot.systems ?? []).flatMap(
		(system, systemIndex) =>
			(system.bonuses ?? []).flatMap((bonus, bonusIndex) => {
				if (!STAT_DEFINITIONS[bonus.id])
					return [];

				const value = Number(bonus.val);
				if (!Number.isFinite(value))
					return [];

				return [{
					id: `${system.id}-${systemIndex}-${bonusIndex}`,
					stat: bonus.id,
					operation: 'bonus',
					value
				}];
			})
	);
}

const MODIFIER_OPERATIONS = {
	bonus(currentValue, modifier) {
		return currentValue + modifier.value;
	},

	replace(currentValue, modifier) {
		return modifier.value;
	},

	increaseSize(currentValue) {
		return Math.floor(currentValue) + 1;
	}
};

function applyModifier(currentValue, modifier) {
	const operation =
		MODIFIER_OPERATIONS[modifier.operation];

	if (!operation) {
		throw new Error(
			`Unknown modifier operation: ${modifier.operation}`
		);
	}

	let result = operation(currentValue, modifier);

	if (modifier.minimum !== undefined)
		result = Math.max(result, modifier.minimum);

	if (modifier.maximum !== undefined)
		result = Math.min(result, modifier.maximum);

	return result;
}
