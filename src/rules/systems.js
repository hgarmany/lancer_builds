// rules/systems.js

import { workingCatalog } from '../data/roadmap-table.js';
import { systems } from '../data/loader.js';

export function systemIsEligible(
	level,
	system,
	{ replacingSystemId = null } = {}
) {
	const replacingSystem = replacingSystemId
		? systems.find(candidate =>
			candidate.id === replacingSystemId
		)
		: null;
	const meetsLicenseRequirements =
		!system.license_id ||
		workingCatalog.licenses[level][system.license_id.substring(3)]
			>= system.license_level;
	const meetsTalentRequirements =
		!system.talent_id ||
		workingCatalog.talents[level][system.talent_id]
			== system.talent_rank;
	const availableSP =
		workingCatalog.stats[level].free_sp +
		(replacingSystem?.sp ?? 0);
	const isWithinBudget =
		availableSP >= system.sp;

	const aiBudget =
		workingCatalog.stats[level].free_ai +
		(replacingSystem?.type === 'AI' ? 1 : 0);
	const honorsAICap =
		system.type !== 'AI' ||
		aiBudget > 0 ||
		aiBudget == 0 &&
			system.bonuses?.findIndex(bonus => bonus.id == 'ai_cap') >= 0;

	const selectedInstances = (
		workingCatalog.systems[level] ?? []
	).filter(systemId => systemId === system.id).length;
	const remainingInstances = selectedInstances -
		(replacingSystemId === system.id ? 1 : 0);
	const duplicatesUnique =
		system.tags?.some(tag => tag.id === 'tg_unique') &&
		remainingInstances > 0;

	return meetsLicenseRequirements
		&& meetsTalentRequirements
		&& isWithinBudget
		&& honorsAICap
		&& !duplicatesUnique;
}

export function hasEligibleSystem(level) {
	return systems.some(system =>
		systemIsEligible(level, system)
	);
}

export function getLimitedSystemUses(
	system,
	limitedBonus = 0
) {
	const limitedTag = system.tags?.find(
		tag => tag.id === 'tg_limited'
	);

	if (!limitedTag)
		return null;

	const baseUses = Number(limitedTag.val);
	const bonusUses = Number(limitedBonus);

	return (
		Number.isFinite(baseUses) ? baseUses : 0
	) + (
		Number.isFinite(bonusUses) ? bonusUses : 0
	);
}

export function getSystemsBudget(level, selectedSystems) {
	let SP = workingCatalog.stats[level]?.sp ?? 0;
	let AI = workingCatalog.stats[level]?.ai_cap ?? 0;
	selectedSystems.forEach(selectedId => {
		SP -= systems.find(system => system.id == selectedId)?.sp ?? 0;
		console.log(systems.find(system => system.id == selectedId));
		if (systems.find(system => system.id == selectedId).type == 'AI')
			AI--;
	});

	return { SP, AI };
}
