import { weapons } from '../../data/loader.js';

const WEAPON_MOUNT_ORDER = Object.freeze({
	Superheavy: 0,
	Heavy: 1,
	Main: 2,
	Auxiliary: 3,
	'Ship-class': 4
});

const AUXILIARY_SLOT = Object.freeze({
	label: 'Aux',
	allowedMounts: Object.freeze(['Auxiliary'])
});

const MAIN_SLOT = Object.freeze({
	label: 'Main / Aux',
	allowedMounts: Object.freeze(['Auxiliary', 'Main'])
});

const HEAVY_SLOT = Object.freeze({
	label: 'Heavy / Main / Aux',
	allowedMounts: Object.freeze([
		'Auxiliary',
		'Main',
		'Heavy',
		'Superheavy'
	])
});

let indexedWeaponCatalog = null;
let weaponsById = new Map();

/**
 * Return normalized slot state for a mount and its saved selections.
 * Composite-mount expansion and compatibility validation happen here.
 */
export function deriveMountSlots(mountType, selectedIds = []) {
	const initialDefinitions = getWeaponSlotDefinitions(mountType);
	const selectedFirstWeapon = getWeaponById(selectedIds[0]);
	const firstWeapon = initialDefinitions[0] && selectedFirstWeapon &&
		weaponFitsSlot(initialDefinitions[0], selectedFirstWeapon)
			? selectedFirstWeapon
			: null;
	const definitions = getWeaponSlotDefinitions(
		mountType,
		firstWeapon?.mount
	);

	return definitions.map((definition, slotIndex) => {
		const selectedWeapon = slotIndex === 0
			? firstWeapon
			: getWeaponById(selectedIds[slotIndex]);
		const validWeapon = selectedWeapon &&
			weaponFitsSlot(definition, selectedWeapon)
				? selectedWeapon
				: null;

		return {
			definition,
			selectedId: validWeapon?.id ?? null,
			selectedWeapon: validWeapon
		};
	});
}

export function getCompatibleWeapons(slotDefinition) {
	return getWeaponCatalog()
		.filter(weapon => weaponFitsSlot(slotDefinition, weapon))
		.sort(compareWeapons);
}

export function getWeaponById(weaponId) {
	ensureWeaponIndex();
	return weaponsById.get(weaponId) ?? null;
}

export function getGrantedIntegratedWeapons(frame, talentRanks = {}) {
	const grants = [];
	const frameWeaponId = frame
		? `mw_${frame.id.replace(/^mf_/, '')}_integrated`
		: null;
	const frameWeapon = getWeaponById(frameWeaponId);

	if (frameWeapon) {
		grants.push({
			mountId: `integrated-frame:${frame.id}`,
			source: frame.id,
			weapon: frameWeapon
		});
	}

	const talentWeapons = new Map();

	for (const weapon of getWeaponCatalog()) {
		if (!weapon.talent_id)
			continue;

		const talentRank = talentRanks[weapon.talent_id] ?? 0;
		const requiredRank = Number(weapon.talent_rank ?? 1);

		if (talentRank < requiredRank)
			continue;

		const current = talentWeapons.get(weapon.talent_id);

		if (!current || requiredRank > current.rank) {
			talentWeapons.set(weapon.talent_id, {
				rank: requiredRank,
				weapon
			});
		}
	}

	for (const [talentId, { weapon }] of [...talentWeapons].sort()) {
		grants.push({
			mountId: `integrated-talent:${talentId}`,
			source: talentId,
			weapon
		});
	}

	return grants;
}

export function weaponIsAccessible(licenseRanks, weapon) {
	if (weapon.talent_item || weapon.talent_id)
		return false;

	if (isGmsLl0Weapon(weapon))
		return true;

	if (!weapon.license_id || weapon.license_level === undefined)
		return false;

	const licenseId = weapon.license_id.replace(/^mf_/, '');
	return (licenseRanks[licenseId] ?? 0) >=
		Number(weapon.license_level);
}

function getWeaponSlotDefinitions(
	mountType,
	firstWeaponMount = null
) {
	switch (mountType) {
		case 'Aux/Aux':
			return [AUXILIARY_SLOT, AUXILIARY_SLOT];
		case 'Main/Aux':
			return [MAIN_SLOT, AUXILIARY_SLOT];
		case 'Flex':
			return firstWeaponMount === 'Auxiliary'
				? [MAIN_SLOT, AUXILIARY_SLOT]
				: [MAIN_SLOT];
		case 'Main':
			return [MAIN_SLOT];
		case 'Heavy':
		case 'Superheavy':
			return [HEAVY_SLOT];
		case 'Integrated':
			return [AUXILIARY_SLOT];
		default:
			return [];
	}
}

function weaponFitsSlot(slotDefinition, weapon) {
	return slotDefinition.allowedMounts.includes(weapon.mount);
}

function compareWeapons(left, right) {
	const mountDifference =
		(WEAPON_MOUNT_ORDER[left.mount] ?? Infinity) -
		(WEAPON_MOUNT_ORDER[right.mount] ?? Infinity);

	if (mountDifference !== 0)
		return mountDifference;

	const gmsDifference =
		Number(!isGmsLl0Weapon(left)) -
		Number(!isGmsLl0Weapon(right));

	if (gmsDifference !== 0)
		return gmsDifference;

	const sourceDifference = (left.source ?? '').localeCompare(
		right.source ?? ''
	);

	if (sourceDifference !== 0)
		return sourceDifference;

	const licenseDifference = (left.license ?? '').localeCompare(
		right.license ?? ''
	);

	if (licenseDifference !== 0)
		return licenseDifference;

	const levelDifference =
		Number(left.license_level ?? 0) -
		Number(right.license_level ?? 0);

	return levelDifference !== 0
		? levelDifference
		: left.name.localeCompare(right.name);
}

function getWeaponCatalog() {
	ensureWeaponIndex();
	return indexedWeaponCatalog;
}

function ensureWeaponIndex() {
	if (indexedWeaponCatalog === weapons)
		return;

	indexedWeaponCatalog = weapons ?? [];
	weaponsById = new Map(
		indexedWeaponCatalog.map(weapon => [weapon.id, weapon])
	);
}

function isGmsLl0Weapon(weapon) {
	const isGmsWeapon =
		weapon.source === 'GMS' || weapon.license === 'GMS';

	return isGmsWeapon && Number(weapon.license_level) === 0;
}
