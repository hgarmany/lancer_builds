import { frames } from '../data/loader.js';
import { workingCatalog } from '../data/roadmap-table.js';
import { getActiveFrameId } from '../rules/frames.js';
import {
	deriveWeaponLoadout,
	deriveWeaponMounts
} from '../rules/mounts/loadout.js';

export function deriveRoadmapWeaponLoadout(roadmap, level) {
	const frameId = getActiveFrameId(roadmap, level);
	const frame = frames.find(candidate => candidate.id === frameId);
	const catalogSnapshot = getCatalogSnapshot(level);
	const selections = getEffectiveLoadoutSelections(roadmap, level);
	const mounts = deriveWeaponMounts({
		frame,
		catalogSnapshot,
		selections
	});

	return deriveWeaponLoadout({
		frame,
		catalogSnapshot,
		selections,
		weaponIds: getEffectiveWeaponSelections(
			roadmap,
			level,
			mounts
		)
	});
}

export function reconcileWeaponSlots(
	roadmap,
	startingLevel,
	stoppingLevel = Infinity
) {
	for (
		let level = startingLevel;
		level < roadmap.levels.length && level < stoppingLevel;
		level++
	) {
		const loadout = deriveRoadmapWeaponLoadout(roadmap, level);
		roadmap.levels[level].weaponIds = compactExplicitWeaponIds(
			roadmap.levels[level].weaponIds,
			loadout.mounts
		);
	}
}

export function setWeaponSelection({
	roadmap,
	level,
	mountId,
	slotIndex,
	weaponId
}) {
	const loadout = deriveRoadmapWeaponLoadout(roadmap, level);
	const mountExists = loadout.mounts.some(
		mount => mount.id === mountId
	);

	if (!mountExists)
		throw new Error(`Unknown mount: ${mountId}`);

	const weaponIds = compactExplicitWeaponIds(
		roadmap.levels[level].weaponIds,
		loadout.mounts
	);

	if (isNonEmptySelection(weaponId)) {
		const mountSelections = weaponIds[mountId] ??= [];
		mountSelections[slotIndex] = weaponId;
	}
	else {
		deleteWeaponOverride(weaponIds, mountId, slotIndex);
	}

	roadmap.levels[level].weaponIds = weaponIds;
}

export function setLoadoutChoice({
	roadmap,
	level,
	choiceId,
	value
}) {
	const selections =
		roadmap.levels[level].loadoutSelections ??= {};

	if (isNonEmptySelection(value))
		selections[choiceId] = value;
	else
		delete selections[choiceId];

	reconcileWeaponSlots(roadmap, level);
}

function getCatalogSnapshot(level) {
	return {
		coreBonuses: workingCatalog.coreBonuses[level] ?? [],
		talents: workingCatalog.talents[level] ?? {},
		licenses: workingCatalog.licenses[level] ?? {}
	};
}

function getEffectiveLoadoutSelections(roadmap, level) {
	const selections = {};

	for (let targetLevel = 0; targetLevel <= level; targetLevel++) {
		// Support roadmaps created before loadoutSelections was introduced.
		mergeNonEmptySelections(
			selections,
			roadmap.levels[targetLevel]?.mountBonusSelections ?? {},
			roadmap.levels[targetLevel]?.loadoutSelections ?? {}
		);
	}

	return selections;
}

function getEffectiveWeaponSelections(roadmap, level, mounts) {
	const selections = {};

	for (let targetLevel = 0; targetLevel <= level; targetLevel++) {
		mergeWeaponSelections(
			selections,
			roadmap.levels[targetLevel]?.weaponIds ?? {},
			mounts
		);
	}

	return selections;
}

function mergeWeaponSelections(target, source, mounts) {
	if (Array.isArray(source)) {
		source.forEach((slotIds, mountIndex) => {
			const mountId = mounts[mountIndex]?.id;

			if (mountId)
				mergeMountSlots(target, mountId, slotIds);
		});
		return;
	}

	for (const [mountId, slotIds] of Object.entries(source))
		mergeMountSlots(target, mountId, slotIds);
}

function mergeMountSlots(target, mountId, slotIds) {
	const values = Array.isArray(slotIds) ? slotIds : [slotIds];

	values.forEach((weaponId, slotIndex) => {
		if (!isNonEmptySelection(weaponId))
			return;

		const mountSelections = target[mountId] ??= [];
		mountSelections[slotIndex] = weaponId;
	});
}

function mergeNonEmptySelections(target, ...sources) {
	for (const source of sources) {
		for (const [selectionId, value] of Object.entries(source)) {
			if (isNonEmptySelection(value))
				target[selectionId] = value;
		}
	}
}

function compactExplicitWeaponIds(weaponIds = {}, mounts = []) {
	const compacted = {};

	if (Array.isArray(weaponIds)) {
		weaponIds.forEach((slotIds, mountIndex) => {
			const mountId = mounts[mountIndex]?.id;

			if (mountId)
				mergeMountSlots(compacted, mountId, slotIds);
		});
	}
	else {
		for (const [mountId, slotIds] of Object.entries(weaponIds))
			mergeMountSlots(compacted, mountId, slotIds);
	}

	return compacted;
}

function deleteWeaponOverride(weaponIds, mountId, slotIndex) {
	const mountSelections = weaponIds[mountId];

	if (!mountSelections)
		return;

	delete mountSelections[slotIndex];

	while (
		mountSelections.length > 0 &&
		!isNonEmptySelection(mountSelections.at(-1))
	) {
		mountSelections.pop();
	}

	if (!mountSelections.some(isNonEmptySelection))
		delete weaponIds[mountId];
}

function isNonEmptySelection(value) {
	return value !== null && value !== undefined && value !== '';
}
