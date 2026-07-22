import {
	deriveMountSlots,
	getCompatibleWeapons,
	getGrantedIntegratedWeapons,
	getWeaponById,
	weaponIsAccessible
} from './weapons.js';
import {
	SOURCE_LOADOUT_EFFECTS,
	WEAPON_LOADOUT_EFFECTS
} from './loadout-effects.js';

const EFFECT_API = Object.freeze({
	addMountBadge,
	addMountTrait,
	addSlotTrait,
	createLoadoutChoice,
	createMount,
	createMountChoice,
	createMountOptions,
	getModifiableMounts
});

/**
 * Derive the complete, render-ready weapon loadout for one roadmap row.
 */
export function deriveWeaponLoadout({
	frame,
	catalogSnapshot,
	selections = {},
	weaponIds = {}
}) {
	const { context, activeSourceEffects } = deriveMountContext({
		frame,
		catalogSnapshot,
		selections
	});

	context.weaponIds = normalizeWeaponIds(
		context.mounts,
		weaponIds
	);
	context.selectedWeaponSlots = collectSelectedWeaponSlots(
		context.mounts,
		context.weaponIds
	);

	const weaponChoices = applyWeaponLoadoutEffects(context);
	const sourceChoices = activeSourceEffects.flatMap(effect => {
		const choice = effect.createChoice?.(context, EFFECT_API);
		return choice ? [choice] : [];
	});
	const choices = [...sourceChoices, ...weaponChoices];
	const overpowerTarget = choices.find(
		choice => choice.id === 'overpowerWeaponSlot'
	)?.selectedId ?? null;

	return {
		mounts: context.mounts.map(mount => ({
			...mount,
			slots: createRenderedSlots({
				mount,
				weaponIds: context.weaponIds,
				licenseRanks: catalogSnapshot.licenses ?? {},
				overpowerTarget,
				slotTraits: context.slotTraits
			})
		})),
		choices,
		weaponIds: context.weaponIds
	};
}

/**
 * Derive only the active mount structure, before weapon selections apply.
 */
export function deriveWeaponMounts({
	frame,
	catalogSnapshot,
	selections = {}
}) {
	return deriveMountContext({
		frame,
		catalogSnapshot,
		selections
	}).context.mounts;
}

function deriveMountContext({ frame, catalogSnapshot, selections }) {
	const context = {
		frame,
		catalogSnapshot,
		selections,
		mounts: createFrameMounts(frame),
		weaponIds: {},
		selectedWeaponSlots: [],
		slotTraits: new Map()
	};

	for (const grant of getGrantedIntegratedWeapons(
		frame,
		catalogSnapshot.talents ?? {}
	)) {
		context.mounts.push(createMount({
			id: grant.mountId,
			type: 'Integrated',
			source: grant.source,
			traits: ['integrated', 'unmodifiable', 'fixed-weapon'],
			badges: ['INT'],
			fixedWeaponId: grant.weapon.id
		}));
	}

	const activeSourceEffects = SOURCE_LOADOUT_EFFECTS.filter(
		effect => sourceIsActive(effect.source, context)
	);

	for (const effect of activeSourceEffects)
		effect.apply?.(context, EFFECT_API);

	return { context, activeSourceEffects };
}

function applyWeaponLoadoutEffects(context) {
	const matchingEffects = new Map(
		context.selectedWeaponSlots.map(selection => [
			selection.slotId,
			WEAPON_LOADOUT_EFFECTS.filter(effect =>
				effect.matches(selection.weapon, selection.mount)
			)
		])
	);
	const anchorMountIds = new Set(
		context.selectedWeaponSlots.filter(selection =>
			matchingEffects.get(selection.slotId).length > 0
		).map(selection => selection.mount.id)
	);
	const consumedMountIds = new Set();
	const choices = [];

	for (const selection of context.selectedWeaponSlots) {
		for (const effect of matchingEffects.get(selection.slotId)) {
			const choice = effect.apply({
				...context,
				selection,
				anchorMountIds,
				consumedMountIds
			}, EFFECT_API);

			if (choice)
				choices.push(choice);
		}
	}

	return choices;
}

function createFrameMounts(frame) {
	return (frame?.mounts ?? []).map((type, index) =>
		createMount({
			id: `frame-${index}`,
			type,
			source: 'frame'
		})
	);
}

function createMount({
	id,
	type,
	source,
	traits = [],
	badges = [],
	fixedWeaponId = null
}) {
	return {
		id,
		type,
		source,
		traits: [...new Set(traits)],
		badges: [...new Set(badges)],
		fixedWeaponId
	};
}

function addMountTrait(mount, trait) {
	addUnique(mount.traits, trait);
}

function addMountBadge(mount, badge) {
	addUnique(mount.badges, badge);
}

function addSlotTrait(slotTraits, slotId, trait) {
	const traits = slotTraits.get(slotId) ?? [];
	addUnique(traits, trait);
	slotTraits.set(slotId, traits);
}

function addUnique(collection, value) {
	if (!collection.includes(value))
		collection.push(value);
}

function getModifiableMounts(mounts) {
	return mounts.filter(
		mount => !mount.traits.includes('unmodifiable')
	);
}

function createMountChoice({
	id,
	label,
	allMounts,
	candidates,
	selectedId
}) {
	return createLoadoutChoice({
		id,
		label,
		placeholder: 'Choose mount',
		options: createMountOptions(allMounts, candidates),
		selectedId
	});
}

function createMountOptions(allMounts, candidates) {
	return candidates.map(mount => ({
		id: mount.id,
		name: getMountOptionLabel(allMounts, mount)
	}));
}

function getMountOptionLabel(allMounts, mount) {
	const index = allMounts.indexOf(mount);
	return `Mount ${index + 1}: ${mount.originalType ?? mount.type}`;
}

function createLoadoutChoice({
	id,
	label,
	placeholder,
	options,
	selectedId
}) {
	return {
		id,
		label,
		placeholder,
		options,
		selectedId: options.some(option => option.id === selectedId)
			? selectedId
			: null
	};
}

function normalizeWeaponIds(mounts, existingIds) {
	const normalizedIds = Array.isArray(existingIds)
		? {}
		: { ...existingIds };

	for (const [mountIndex, mount] of mounts.entries()) {
		if (mount.fixedWeaponId) {
			normalizedIds[mount.id] = [mount.fixedWeaponId];
			continue;
		}

		const savedMount = Array.isArray(existingIds)
			? existingIds[mountIndex]
			: existingIds[mount.id];
		const selectedIds = Array.isArray(savedMount)
			? savedMount
			: [savedMount ?? null];

		normalizedIds[mount.id] = deriveMountSlots(
			mount.type,
			selectedIds
		).map(slot => slot.selectedId);
	}

	return normalizedIds;
}

function collectSelectedWeaponSlots(mounts, weaponIds) {
	return mounts.flatMap(mount => {
		if (mount.fixedWeaponId) {
			const weapon = getWeaponById(mount.fixedWeaponId);
			return weapon ? [{
				mount,
				slotIndex: 0,
				slotId: `${mount.id}:0`,
				weapon
			}] : [];
		}

		return deriveMountSlots(
			mount.type,
			weaponIds[mount.id] ?? []
		).flatMap((slot, slotIndex) =>
			slot.selectedWeapon
				? [{
					mount,
					slotIndex,
					slotId: `${mount.id}:${slotIndex}`,
					weapon: slot.selectedWeapon
				}]
				: []
		);
	});
}

function createRenderedSlots({
	mount,
	weaponIds,
	licenseRanks,
	overpowerTarget,
	slotTraits
}) {
	if (mount.traits.includes('consumed'))
		return [];

	if (mount.fixedWeaponId) {
		const weapon = getWeaponById(mount.fixedWeaponId);
		if (!weapon)
			return [];

		const id = `${mount.id}:0`;
		return [{
			id,
			label: `Integrated ${weapon.mount}`,
			selectedId: weapon.id,
			options: [weapon],
			eligibleIds: new Set([weapon.id]),
			traits: [...(slotTraits.get(id) ?? [])],
			locked: true
		}];
	}

	return deriveMountSlots(
		mount.type,
		weaponIds[mount.id] ?? []
	).map((slot, slotIndex) => {
		const id = `${mount.id}:${slotIndex}`;
		const options = getCompatibleWeapons(slot.definition);
		const eligibleIds = new Set(
			options.filter(weapon =>
				weaponIsAccessible(licenseRanks, weapon)
			).map(weapon => weapon.id)
		);
		const traits = [
			...(id === overpowerTarget && slot.selectedId
				? ['overpower-caliber']
				: []),
			...(slotTraits.get(id) ?? [])
		];

		return {
			id,
			label: slot.definition.label,
			selectedId: slot.selectedId,
			options,
			eligibleIds,
			traits
		};
	});
}

function sourceIsActive(source, { frame, catalogSnapshot }) {
	switch (source.kind) {
		case 'coreBonus':
			return (catalogSnapshot.coreBonuses ?? [])
				.includes(source.id);
		case 'talent':
			return (catalogSnapshot.talents?.[source.id] ?? 0) >=
				(source.rank ?? 1);
		case 'frame':
			return frame?.id === source.id;
		default:
			throw new Error(
				`Unknown loadout effect source: ${source.kind}`
			);
	}
}
