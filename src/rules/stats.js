// rules/stats.js

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
		defaultValue: 0
	},
	ai_cap: {
		defaultValue: 1
	}
};

export const MECH_STAT_IDS = Object.freeze(
	Object.keys(STAT_DEFINITIONS)
);

const modifierProviders = [
	getMechSkillModifiers,
	getCoreBonusModifiers
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
console.log(catalogSnapshot);
console.log(context);
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
			value: 2 * hull,
			source: 'Hull'
		},
		{
			id: 'hull-repcap',
			stat: 'repcap',
			operation: 'bonus',
			value: Math.floor(hull / 2),
			source: 'Hull'
		},
		{
			id: 'agility-evasion',
			stat: 'evasion',
			operation: 'bonus',
			value: evasion,
			source: 'Agility'
		},
		{
			id: 'agility-speed',
			stat: 'speed',
			operation: 'bonus',
			value: Math.floor(evasion / 2),
			source: 'Agility'
		},
		{
			id: 'systems-tattk',
			stat: 'tech_attack',
			operation: 'bonus',
			value: systems,
			source: 'Systems'
		},
		{
			id: 'systems-edef',
			stat: 'edef',
			operation: 'bonus',
			value: systems,
			source: 'Systems'
		},
		{
			id: 'systems-sp',
			stat: 'sp',
			operation: 'bonus',
			value: Math.floor(systems / 2),
			source: 'Systems'
		},
		{
			id: 'engineering-heatcap',
			stat: 'heatcap',
			operation: 'bonus',
			value: engineering,
			source: 'Engineering'
		},
		{
			id: 'engineering-limited-bonus',
			stat: 'limited_bonus',
			operation: 'bonus',
			value: Math.floor(engineering / 2),
			source: 'Engineering'
		}
	];
}

function getCoreBonusModifiers({ catalogSnapshot }) {
	const cb = catalogSnapshot.coreBonuses;
	
	return [
		{
			id: 'fomorian-frame',
			stat: 'size',
			operation: 'size-up',
			value: cb.includes('cb_fomorian_frame'),
			source: 'Core Bonus'
		},
		{
			id: 'reinforced-frame',
			stat: 'hp',
			operation: 'bonus',
			value: 5 * cb.includes('cb_reinforced_frame'),
			source: 'Core Bonus'
		},
		{
			id: 'sloped-plating',
			stat: 'armor',
			operation: 'bonus-capped',
			value: 1 * cb.includes('cb_sloped_plating'),
			maxValue: 4,
			source: 'Core Bonus'
		},
		{
			id: 'full-subjectivity-sync',
			stat: 'evasion',
			operation: 'bonus',
			value: 2 * cb.includes('cb_full_subjectivity_sync'),
			source: 'Core Bonus'
		},
		{
			id: 'lesson-of-disbelief',
			stat: 'edef',
			operation: 'bonus',
			value: 2 * cb.includes('cb_the_lesson_of_disbelief'),
			source: 'Core Bonus'
		},
		{
			id: 'lesson-of-the-open-door',
			stat: 'save',
			operation: 'bonus',
			value: 2 * cb.includes('cb_the_lesson_of_the_open_door'),
			source: 'Core Bonus'
		},
		{
			id: 'lesson-of-shaping',
			stat: 'ai_cap',
			operation: 'bonus',
			value: 1 * cb.includes('cb_the_lesson_of_shaping'),
			source: 'Core Bonus'
		},
		{
			id: 'integrated-ammo-feeds',
			stat: 'limited_bonus',
			operation: 'bonus',
			value: 2 * cb.includes('cb_integrated_ammo_feeds'),
			source: 'Core Bonus'
		},
		{
			id: 'superior-by-design',
			stat: 'heatcap',
			operation: 'bonus',
			value: 2 * cb.includes('cb_superior_by_design'),
			source: 'Core Bonus'
		}
	];
}

function applyModifier(currentValue, modifier) {
	switch (modifier.operation) {
		case 'size-up':
			return modifier.value ? Math.floor(currentValue) + 1 : currentValue;
		case 'bonus':
			return currentValue + modifier.value;
		case 'bonus-capped':
			return Math.min(currentValue + modifier.value, modifier.maxValue);

		default:
			throw new Error(
				`Unknown modifier operation: ${modifier.operation}`
			);
	}
}
