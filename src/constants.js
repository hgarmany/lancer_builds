// constants.js

export const MAX_FRAME_SIZE = 3;

export const STAT_DEFINITIONS = {
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