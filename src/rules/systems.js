// rules/systems.js

import { workingCatalog } from '../data/roadmap-table.js';
import { systems } from '../data/loader.js';

export function systemIsEligible(level, system) {
	const meetsLicenseRequirements =
		!system.license_id ||
		workingCatalog.licenses[level][system.license_id.substring(3)]
			>= system.license_level;
	const meetsTalentRequirements =
		!system.talent_id ||
		workingCatalog.talents[level][system.talent_id]
		== system.talent_rank;
	const isWithinBudget = 
		workingCatalog.stats[level].free_sp >= system.sp;
	const duplicatesUnique =
		system.tags?.findIndex(tag => tag.id == 'tg_unique') >= 0 &&
		workingCatalog.systems[level]?.findIndex(systemId => systemId === system.id) >= 0;

	return meetsLicenseRequirements
		&& meetsTalentRequirements
		&& isWithinBudget
		&& !duplicatesUnique;
}

export function getSPBudget(level, selectedSystems) {
	let budget = workingCatalog.stats[level]?.sp ?? 0;
	selectedSystems.forEach(selectedId => {
		budget -= systems.find(system => system.id == selectedId)?.sp ?? 0;
	});

	return budget;
}