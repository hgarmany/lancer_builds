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
	}
};

export const MECH_STAT_IDS = Object.freeze(
	Object.keys(STAT_DEFINITIONS)
);

const modifierProviders = [
	getMechSkillModifiers
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
	const engineering = catalogSnapshot.mechSkills?.e ?? 0;

	return [{
		id: 'engineering-limited-bonus',
		stat: 'limited_bonus',
		operation: 'add',
		value: Math.floor(engineering / 2),
		source: 'Engineering'
	}];
}

function applyModifier(currentValue, modifier) {
	switch (modifier.operation) {
		case 'add':
			return currentValue + modifier.value;

		case 'multiply':
			return currentValue * modifier.value;

		case 'replace':
			return modifier.value;

		case 'minimum':
			return Math.max(currentValue, modifier.value);

		case 'maximum':
			return Math.min(currentValue, modifier.value);

		default:
			throw new Error(
				`Unknown modifier operation: ${modifier.operation}`
			);
	}
}
