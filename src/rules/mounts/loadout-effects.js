/**
 * Effects that change mounts before selected weapons are interpreted.
 */
export const SOURCE_LOADOUT_EFFECTS = Object.freeze([
	{
		id: 'improved-armament',
		source: coreBonus('cb_improved_armament'),
		apply({ mounts }, api) {
			const nonIntegratedMounts = mounts.filter(
				mount => !mount.traits.includes('integrated')
			);

			if (nonIntegratedMounts.length < 3) {
				mounts.push(api.createMount({
					id: 'improved-armament',
					type: 'Flex',
					source: 'improved-armament',
					badges: ['IA']
				}));
			}
		}
	},
	{
		id: 'integrated-weapon',
		source: coreBonus('cb_integrated_weapon'),
		apply({ mounts }, api) {
			mounts.push(api.createMount({
				id: 'integrated-weapon',
				type: 'Integrated',
				source: 'integrated-weapon',
				traits: ['integrated', 'unmodifiable'],
				badges: ['IW']
			}));
		}
	},
	{
		id: 'mount-retrofitting',
		source: coreBonus('cb_mount_retrofitting'),
		apply({ mounts, selections }, api) {
			const target = api.getModifiableMounts(mounts).find(
				mount => mount.id === selections.retrofitMountId
			);

			if (!target)
				return;

			target.originalType = target.type;
			target.type = 'Main/Aux';
			api.addMountTrait(target, 'retrofitted');
			api.addMountBadge(target, 'MR');
		},
		createChoice({ mounts, selections }, api) {
			return api.createMountChoice({
				id: 'retrofitMountId',
				label: 'Mount Retrofitting',
				allMounts: mounts,
				candidates: api.getModifiableMounts(mounts),
				selectedId: selections.retrofitMountId
			});
		}
	},
	{
		id: 'auto-stabilizing-hardpoints',
		source: coreBonus('cb_auto_stabilizing_hardpoints'),
		apply({ mounts, selections }, api) {
			const target = api.getModifiableMounts(mounts).find(
				mount => mount.id === selections.autoStabilizedMountId
			);

			if (!target)
				return;

			api.addMountTrait(target, 'auto-stabilized');
			api.addMountBadge(target, 'ASH');
		},
		createChoice({ mounts, selections }, api) {
			return api.createMountChoice({
				id: 'autoStabilizedMountId',
				label: 'Auto-Stabilizing Hardpoints',
				allMounts: mounts,
				candidates: api.getModifiableMounts(mounts),
				selectedId: selections.autoStabilizedMountId
			});
		}
	},
	{
		id: 'overpower-caliber',
		source: coreBonus('cb_overpower_caliber'),
		createChoice({ selectedWeaponSlots, selections }, api) {
			const options = selectedWeaponSlots
				.filter(({ mount }) =>
					!mount.traits.includes('unmodifiable') &&
					!mount.traits.includes('consumed')
				)
				.map(({ mount, slotId, weapon }) => ({
					id: slotId,
					name: `${mount.type}: ${weapon.name}`
				}));

			return api.createLoadoutChoice({
				id: 'overpowerWeaponSlot',
				label: 'Overpower Caliber',
				placeholder: 'Choose weapon',
				options,
				selectedId: selections.overpowerWeaponSlot
			});
		}
	}
]);

/**
 * Effects produced by selected weapons after mount structure is known.
 */
export const WEAPON_LOADOUT_EFFECTS = Object.freeze([
	{
		id: 'superheavy-mount-consumption',
		matches: weapon => weapon.mount === 'Superheavy',
		apply: applySuperheavyMountConsumption
	}
]);

function applySuperheavyMountConsumption({
	mounts,
	selections,
	selection,
	anchorMountIds,
	consumedMountIds,
	slotTraits
}, api) {
	const { mount: primaryMount, slotId, weapon } = selection;
	const choiceId = `superheavySupport:${slotId}`;
	const candidates = getSuperheavySupportCandidates({
		mounts,
		primaryMount,
		anchorMountIds,
		consumedMountIds
	}, api);
	const choice = api.createLoadoutChoice({
		id: choiceId,
		label: `Superheavy: ${weapon.name}`,
		placeholder: 'Choose mount',
		options: api.createMountOptions(mounts, candidates),
		selectedId: selections[choiceId]
	});
	const supportMount = candidates.find(
		mount => mount.id === choice.selectedId
	);

	if (supportMount) {
		api.addMountTrait(supportMount, 'consumed');
		api.addMountBadge(supportMount, 'SH');
		consumedMountIds.add(supportMount.id);
	}
	else {
		api.addSlotTrait(slotTraits, slotId, 'error');
	}

	return choice;
}

function getSuperheavySupportCandidates({
	mounts,
	primaryMount,
	anchorMountIds,
	consumedMountIds
}, api) {
	const availableMounts = api.getModifiableMounts(mounts).filter(
		mount =>
			mount.id !== primaryMount.id &&
			!anchorMountIds.has(mount.id) &&
			!consumedMountIds.has(mount.id)
	);
	const requiredType = getRequiredSupportMountType(
		mounts,
		primaryMount
	);

	return requiredType
		? availableMounts.filter(mount => mount.type === requiredType)
		: availableMounts;
}

function getRequiredSupportMountType(mounts, primaryMount) {
	if (
		primaryMount.type !== 'Superheavy' &&
		mounts.some(mount => mount.type === 'Superheavy')
	)
		return 'Superheavy';

	if (
		primaryMount.type !== 'Heavy' &&
		mounts.some(mount => mount.type === 'Heavy')
	)
		return 'Heavy';

	return null;
}

function coreBonus(id) {
	return { kind: 'coreBonus', id };
}
