// src/ui/roadmap-view.js

import { setMaxLevel } from '../model/roadmap.js';
import {
	skillTriggers,
	talents,
	mechSkillIds,
	mechSkills,
	licenses,
	frames,
	coreBonuses
} from '../data/loader.js';
import {
	skillTriggerIsEligible,
	skillTriggersUpdateCatalog,
	skillTriggersResetCatalog
} from '../rules/skill-triggers.js';
import {
	talentIsEligible,
	talentsUpdateCatalog,
	talentsResetCatalog
} from '../rules/talents.js';
import {
	mechSkillIsEligible,
	mechSkillsUpdateCatalog,
	mechSkillsResetCatalog
} from '../rules/mech-skills.js';
import {
	addLicenseLevelToCatalog,
	licenseIsEligible,
	licensesUpdateCatalog,
	licensesResetCatalog
} from '../rules/licenses.js';
import {
	frameIsEligible
} from '../rules/frames.js';
import {
	coreBonusIsEligible,
	coreBonusesUpdateCatalog
} from '../rules/core-bonuses.js';
import {
	workingCatalog,
	coreBonusesResetCatalog
} from '../data/roadmap-table.js';

const MAX_LICENSE_LEVELS = 12;

// major elements for reference + modification
const roadmapName = document.getElementById('roadmap-name');
const tableBody = document.getElementById("roadmap-body");
const maxLevelInput = document.getElementById('roadmap-max-level');

const romanNumerals = ['I', 'II', 'III', 'IV'];

/**
 * Connect the roadmap name and max LL fields to table + roadmap data
 * 
 * @param {import('../model/roadmap.js').Roadmap} roadmap 
 */
export function wireRoadmapHeader(roadmap) {
	roadmapName.value = roadmap.name;
	maxLevelInput.value = String(roadmap.maxLevel);

	maxLevelInput.addEventListener('change', event => {
		const newMaxLevel = Number.parseInt(
			event.currentTarget.value,
			10
		);

		if (
			!Number.isInteger(newMaxLevel) ||
			newMaxLevel < 0 ||
			newMaxLevel > 12
		) {
			// reset if invalid / out-of-bounds
			event.currentTarget.value =
				String(roadmap.maxLevel);
			return;
		}

		setMaxLevel(roadmap, newMaxLevel);
		resizeViaHide(roadmap, newMaxLevel);
	});
}

/**
 * Render the complete roadmap table.
 *
 * @param {import('../model/roadmap.js').Roadmap} roadmap
 */
export function initializeRoadmapView(roadmap) {
	tableBody.replaceChildren();
	
	for (let rowLevel = 0; rowLevel <= MAX_LICENSE_LEVELS; rowLevel++) {
		if (roadmap.levels[rowLevel]?.level !== rowLevel) {
			/*
			 * Missing levels above maxLevel may be expected, depending
			 * on how setMaxLevel initializes the model.
			 */
			if (rowLevel <= roadmap.maxLevel)
				throw new Error('Roadmap data is corrupted.');
		}
		
		const newRow = renderRoadmapRow(roadmap, rowLevel);
		newRow.hidden = rowLevel > roadmap.maxLevel;
		tableBody.append(newRow);
	}
	console.log(roadmap);
	console.log(workingCatalog);
};

function renderRoadmapRow(roadmap, level) {
	const newRow = document.createElement('tr');
	newRow.dataset.level = level;

	const levelCell = document.createElement('th');
	levelCell.scope = 'row';
	if (level % 3 == 0 && level != 0)
		levelCell.className = 'cb-level';
	levelCell.textContent = `LL${level}`;

	newRow.append(levelCell);

	renderCharacterSelectCells(roadmap, level, newRow);
	renderStats(level, newRow);

	return newRow;
}

function renderCharacterSelectCells(roadmap, level, row) {
	const skillTriggerCell = renderSkillTriggerCell(roadmap, level);
	const talentCell = renderTalentCell(roadmap, level);
	const mechSkillCell = renderMechSkillCell(roadmap, level)
	const licenseCell = renderLicenseCell(roadmap, level);
	const frameCell = renderFrameCell(roadmap, level);
	const coreBonusCell = renderCoreBonusCell(roadmap, level);

	row.append(
		skillTriggerCell,
		talentCell,
		mechSkillCell,
		licenseCell,
		frameCell,
		coreBonusCell
	);
}

function renderSkillTriggerCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'skill-trigger';

	const choiceWrapper = document.createElement('div');
	choiceWrapper.className = 'select-group';
	
	// isolate roadmap's current skill triggers
	const selectedIds = roadmap.levels[level]?.skillTriggerIds;
	if (level != 0 && selectedIds)
		selectedIds.length = 1;
	
	selectedIds?.forEach((selectedId, idx) => {
		const select = document.createElement('select');
		select.dataset.idx = idx;

		// default dialog
		const placeholder = document.createElement("option");
		placeholder.textContent = "Select a skill trigger";
		select.append(placeholder);

		for (const skillTrigger of skillTriggers) {
			const option = document.createElement('option');
			option.value = skillTrigger.id;
			option.title = skillTrigger.description
				.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
			option.selected = selectedIds[idx] == skillTrigger.id;
			
			option.textContent = skillTrigger.name;
			
			// disable invalid skills
			option.disabled = !skillTriggerIsEligible(
				level, skillTrigger.id, roadmap);
			
			if (option.selected === true) {
				skillTriggersUpdateCatalog(level, skillTrigger.id);
				select.classList.add('occupied');
			}

			// mark out skills that have been improperly obtained
			if (option.disabled && option.selected)
				select.classList.add('error');
			select.append(option);
		}
		
		// any change to a skill trigger selection requires
		// a recheck on all later skill triggers
		select.addEventListener("change", event => {
			const newSkillTriggerId = event.currentTarget.value || null;
			const newIdx = parseInt(event.currentTarget.dataset.idx);
			const referenceLevel =
				parseInt(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].skillTriggerIds[newIdx] = newSkillTriggerId;
			skillTriggersResetCatalog(referenceLevel);

			document.querySelectorAll('.skill-trigger').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderSkillTriggerCell(roadmap, targetLevel));
				}
			});
		});
		choiceWrapper.append(select);
	});
	
	cell.append(choiceWrapper);

	return cell;
}

function renderTalentCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'talent';

	const choiceWrapper = document.createElement('div');
	choiceWrapper.className = 'select-group';
	
	// isolate roadmap's current talents
	const selectedIds = roadmap.levels[level]?.talentIds;
	if (level != 0 && selectedIds)
		selectedIds.length = 1;
	
	selectedIds?.forEach((selectedId, idx) => {
		const select = document.createElement('select');
		select.dataset.idx = idx;

		// default dialog
		const placeholder = document.createElement("option");
		placeholder.textContent = "Select a talent";
		select.append(placeholder);

		for (const talent of talents) {
			const option = document.createElement('option');
			option.value = talent.id;
			option.title = talent.description
				.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
			option.selected = selectedIds[idx] == talent.id;
			
			// disable invalid skills
			option.disabled = !talentIsEligible(
				level, talent.id, roadmap);
			
			const catalogLevel = workingCatalog.talents[level];
			if (catalogLevel) {
				const rank = catalogLevel[talent.id] ?? 0;
				option.textContent = rank >= 3 ?
					talent.name : `${talent.name} ${romanNumerals[rank]}`;
			}
			else {
				option.textContent = `${talent.name} I`;
			}

			if (option.selected === true) {
				talentsUpdateCatalog(level, talent.id);
				select.classList.add('occupied');
			}

			// mark out skills that have been improperly obtained
			if (option.disabled && option.selected)
				select.classList.add('error');
			select.append(option);
		}
		
		// any change to a skill trigger selection requires
		// a recheck on all later skill triggers
		select.addEventListener("change", event => {
			const newTalentId = event.currentTarget.value || null;
			const newIdx = parseInt(event.currentTarget.dataset.idx);
			const referenceLevel =
				parseInt(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].talentIds[newIdx] = newTalentId;
			talentsResetCatalog(referenceLevel);

			document.querySelectorAll('.talent').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderTalentCell(roadmap, targetLevel));
				}
			});
		});
		choiceWrapper.append(select);
	});
	
	cell.append(choiceWrapper);

	return cell;
}

function renderMechSkillCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = level == 0 ? 'mech-skill before-non-cell' : 'mech-skill';

	const choiceWrapper = document.createElement('div');
	choiceWrapper.className = 'select-group';
	
	// isolate roadmap's current mech skills
	const selectedIds = roadmap.levels[level]?.mechSkillIds;
	if (level != 0 && selectedIds)
		selectedIds.length = 1;
	
	selectedIds?.forEach((selectedId, idx) => {
		const select = document.createElement('select');
		select.dataset.idx = idx;

		// default dialog
		const placeholder = document.createElement("option");
		placeholder.textContent = "HASE";
		select.append(placeholder);

		mechSkillIds.forEach((mechSkillId, idx) => {
			const option = document.createElement('option');
			option.value = mechSkillId;
			option.selected = selectedId == mechSkillId;
			
			// disable invalid skills
			option.disabled = !mechSkillIsEligible(
				level, mechSkillId, roadmap);
			
			option.textContent = mechSkills[idx];

			if (option.selected === true) {
				mechSkillsUpdateCatalog(level, mechSkillId);
				select.classList.add('occupied');
			}

			// mark out skills that have been improperly obtained
			if (option.disabled && option.selected)
				select.classList.add('error');
			select.append(option);
		});
		
		// any change to a mech skill selection requires
		// a recheck on all later mech skills
		select.addEventListener("change", event => {
			const newMechSkillId = event.currentTarget.value || null;
			const newIdx = parseInt(event.currentTarget.dataset.idx);
			const referenceLevel =
				parseInt(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].mechSkillIds[newIdx] = newMechSkillId;
			mechSkillsResetCatalog(referenceLevel);

			document.querySelectorAll('.mech-skill').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderMechSkillCell(roadmap, targetLevel));
				}
			});
			document.querySelectorAll('.hase').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					if (element.dataset.h) {
						element.replaceWith(
							renderHullCell(targetLevel));
					}
					if (element.dataset.a) {
						element.replaceWith(
							renderAgilityCell(targetLevel));
					}
					if (element.dataset.s) {
						element.replaceWith(
							renderSystemsCell(targetLevel));
					}
					if (element.dataset.e) {
						element.replaceWith(
							renderEngineeringCell(targetLevel));
					}
				}
			});
		});
		choiceWrapper.append(select);
	});
	
	cell.append(choiceWrapper);

	return cell;
}

function renderLicenseCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = level == 0 ? 'non-cell' : 'license';

	//addLicenseLevelToCatalog(level);

	if (level != 0) {
		// isolate roadmap's current license
		const selectedId = roadmap.levels[level]?.licenseId;

		const select = document.createElement('select');

		// default dialog
		const placeholder = document.createElement("option");
		placeholder.textContent = "Select a license";
		select.append(placeholder);

		for (const license of licenses) {
			const option = document.createElement('option');
			option.value = license.id;
			option.selected = selectedId == license.id;
			
			// disable invalid licenses
			option.disabled = !licenseIsEligible(
				level, license.id, roadmap);
			
			const catalogLevel = workingCatalog.licenses[level];
			if (catalogLevel) {
				const rank = catalogLevel[license.id] ?? 0;
				option.textContent = rank >= 3 ?
					license.name : `${license.name} ${romanNumerals[rank]}`;
			}
			else {
				option.textContent = `${talent.name} I`;
			}

			if (option.selected === true) {
				licensesUpdateCatalog(level, license.id);
				select.classList.add('occupied');
			}

			// mark out licenses that have been improperly obtained
			if (option.disabled && option.selected)
				select.classList.add('error');
			select.append(option);
		}
		
		// any change to a license selection requires
		// a recheck on all later licenses and frames
		select.addEventListener("change", event => {
			const newLicenseId = event.currentTarget.value || null;
			const newIdx = parseInt(event.currentTarget.dataset.idx);
			const referenceLevel =
				parseInt(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].licenseId = newLicenseId;
			licensesResetCatalog(referenceLevel);

			document.querySelectorAll('.license').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderLicenseCell(roadmap, targetLevel));
				}
			});
			document.querySelectorAll('.frame').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderFrameCell(roadmap, targetLevel));
				}
			});
			document.querySelectorAll('.core-bonus').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderCoreBonusCell(roadmap, targetLevel));
				}
			});
		});
		
		cell.append(select);
	}

	return cell;
}

function renderFrameCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'frame';
	if (level == 0)
		cell.classList.add('before-non-cell', 'after-non-cell');
	if (level % 3 != 0)
		cell.classList.add('before-non-cell');

	// isolate roadmap's current frame
	const selectedId = roadmap.levels[level]?.frameId;

	const select = document.createElement('select');

	// default dialog
	const placeholder = document.createElement("option");
	placeholder.textContent = "Select a frame";
	select.append(placeholder);

	for (const frame of frames) {
		const option = document.createElement('option');
		option.value = frame.id;
		option.selected = selectedId == frame.id;
		
		// disable invalid frames
		option.disabled = !frameIsEligible(
			level, frame.id, roadmap);
		
		option.textContent = frame.name;

		if (option.selected === true) {
			select.classList.add('occupied');
		}

		// mark out frames that have been improperly obtained
		if (option.disabled && option.selected)
			select.classList.add('error');
		select.append(option);
	}

	// any change to a frame selection requires
	// a recheck on all later frames
	select.addEventListener("change", event => {
		const newFrameId = event.currentTarget.value || null;
		const newIdx = parseInt(event.currentTarget.dataset.idx);
		const referenceLevel =
			parseInt(event.currentTarget.closest('tr').dataset.level);
		roadmap.levels[referenceLevel].frameId = newFrameId;

		document.querySelectorAll('.frame').forEach(element => {
			const targetLevel = parseInt(element.closest('tr').dataset.level);
			if (targetLevel >= referenceLevel) {
				element.replaceWith(
					renderFrameCell(roadmap, targetLevel));
			}
		});
	});
	
	cell.append(select);

	return cell;
}

function renderCoreBonusCell(roadmap, level) {
	const cell = document.createElement('td');
	if (level == 0 || level % 3 != 0)
		cell.className = 'non-cell';

	else {
		cell.className = 'core-bonus';

		// isolate roadmap's current core bonus
		const selectedId = roadmap.levels[level]?.coreBonusId;

		const select = document.createElement('select');

		// default dialog
		const placeholder = document.createElement("option");
		placeholder.textContent = "Select a core bonus";
		select.append(placeholder);

		for (const coreBonus of coreBonuses) {
			const option = document.createElement('option');
			option.value = coreBonus.id;
			option.selected = selectedId == coreBonus.id;
			
			// disable invalid frames
			option.disabled = !coreBonusIsEligible(
				level, coreBonus.id, roadmap);
			
			option.textContent = coreBonus.name;

			if (option.selected === true) {
				coreBonusesUpdateCatalog(level, coreBonus.id);
				select.classList.add('occupied');
			}

			// mark out frames that have been improperly obtained
			if (option.disabled && option.selected)
				select.classList.add('error');
			select.append(option);
		}

		// any change to a frame selection requires
		// a recheck on all later frames
		select.addEventListener("change", event => {
			const newCoreBonusId = event.currentTarget.value || null;
			const newIdx = parseInt(event.currentTarget.dataset.idx);
			const referenceLevel =
				parseInt(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].coreBonusId = newCoreBonusId;
			coreBonusesResetCatalog(referenceLevel);

			document.querySelectorAll('.core-bonus').forEach(element => {
				const targetLevel = parseInt(element.closest('tr').dataset.level);
				if (targetLevel >= referenceLevel) {
					element.replaceWith(
						renderCoreBonusCell(roadmap, targetLevel));
				}
			});
		});
		
		cell.append(select);
	}

	return cell;
}

function renderStats(level, row) {
	// HASE
	const blankCell = document.createElement('td');
	blankCell.className = 'non-cell';
	const hullCell = renderHullCell(level);
	const agilityCell = renderAgilityCell(level);
	const systemCell = renderSystemsCell(level);
	const engineeringCell = renderEngineeringCell(level);

	row.append(
		blankCell,
		hullCell,
		agilityCell,
		systemCell,
		engineeringCell
	);
}

function renderHullCell(level) {
	const cell = document.createElement('td');
	cell.className = 'hase';
	const val = workingCatalog.mechSkills[level].h ?? 0;
	cell.dataset.h = val;
	cell.textContent = val;

	return cell;
}

function renderAgilityCell(level) {
	const cell = document.createElement('td');
	cell.className = 'hase';
	const val = workingCatalog.mechSkills[level].a ?? 0;
	cell.dataset.a = val;
	cell.textContent = val;

	return cell;
}

function renderSystemsCell(level) {
	const cell = document.createElement('td');
	cell.className = 'hase';
	const val = workingCatalog.mechSkills[level].s ?? 0;
	cell.dataset.s = val;
	cell.textContent = val;

	return cell;
}

function renderEngineeringCell(level) {
	const cell = document.createElement('td');
	cell.className = 'hase';
	const val = workingCatalog.mechSkills[level].e ?? 0;
	cell.dataset.e = val;
	cell.textContent = val;

	return cell;
}

function resizeViaHide(roadmap, maxLevel) {
	const rows = [...tableBody.children];

	skillTriggersResetCatalog(maxLevel + 1);
	talentsResetCatalog(maxLevel + 1);
	mechSkillsResetCatalog(maxLevel + 1);
	licensesResetCatalog(maxLevel + 1);
	coreBonusesResetCatalog(maxLevel + 1);

	for (const row of rows) {
		const rowLevel = Number.parseInt(row.dataset.level, 10);

		if (rowLevel > maxLevel) {
			row.hidden = true;
			continue;
		}

		if (row.hidden) {
			/*
			 * renderRoadmapRow() causes each catalog level to be created
			 * from the preceding level, then adds this level's selections.
			 */
			row.replaceWith(renderRoadmapRow(roadmap, rowLevel));
		}
	}
}