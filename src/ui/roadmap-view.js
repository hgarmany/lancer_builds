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
	createChoiceSelect
} from '../ui/select-control.js';
import {
	skillTriggerIsEligible,
	skillTriggersUpdateCatalog,
	skillTriggersResetCatalog
} from '../rules/skill-triggers.js';
import {
	talentIsEligible,
	talentsUpdateCatalog,
	talentsResetCatalog,
	getTalentRankIfSelected
} from '../rules/talents.js';
import {
	MAX_MECH_SKILL_RANK,
	mechSkillIsEligible,
	mechSkillsUpdateCatalog,
	mechSkillsResetCatalog
} from '../rules/mech-skills.js';
import {
	licenseIsEligible,
	licensesUpdateCatalog,
	licensesResetCatalog,
	getLicenseRankIfSelected
} from '../rules/licenses.js';
import {
	frameIsEligible
} from '../rules/frames.js';
import {
	coreBonusIsEligible,
	coreBonusesUpdateCatalog
} from '../rules/core-bonuses.js';
import {
	calculateMechStats,
	MECH_STAT_IDS
} from '../rules/stats.js';
import {
	workingCatalog,
	coreBonusesResetCatalog
} from '../data/roadmap-table.js';

const MAX_LICENSE_LEVELS = 12;

// major elements for reference + modification
const roadmapName = document.getElementById('roadmap-name');
const tableBody = document.getElementById("roadmap-body");
const maxLevelInput = document.getElementById('roadmap-max-level');

const mechSkillOptions = mechSkillIds.map((id, index) => ({
	id,
	name: mechSkills[index]
}));
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
	renderStats(roadmap, level, newRow);

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
		const select = createChoiceSelect({
			items: skillTriggers,
			selectedId: selectedId,
			index: idx,
			placeholderText: "Select a skill trigger",
			getLabel: skillTrigger => skillTrigger.name,
			getDescription: skillTrigger => skillTrigger.description,
			isEligible: skillTrigger =>
				skillTriggerIsEligible(level, skillTrigger.id),
			onSelected: skillTrigger =>
				skillTriggersUpdateCatalog(level, skillTrigger.id),
			onChange: event => {
				const newSkillTriggerId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(event.currentTarget.closest('tr').dataset.level);
				roadmap.levels[referenceLevel].skillTriggerIds[newIdx] = newSkillTriggerId;
				skillTriggersResetCatalog(referenceLevel);

				rerenderFrom(roadmap, referenceLevel,
					[['.skill-trigger', renderSkillTriggerCell]]);
			}
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
		const select = createChoiceSelect({
			items: talents,
			selectedId: selectedId,
			index: idx,
			placeholderText: "Select a talent",
			getLabel: talent => {
				const rank = getTalentRankIfSelected(
					level, talent.id);

				return rank > 3
					? talent.name
					: `${talent.name} ${romanNumerals[rank - 1]}`;
			},
			getDescription: talent => {
				return talent.description
					.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
			},
			isEligible: talent =>
				talentIsEligible(level, talent.id),
			onSelected: talent =>
				talentsUpdateCatalog(level, talent.id),
			onChange: event => {
				const newTalentId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(event.currentTarget.closest('tr').dataset.level);
				roadmap.levels[referenceLevel].talentIds[newIdx] = newTalentId;
				talentsResetCatalog(referenceLevel);

				rerenderFrom(roadmap, referenceLevel,
					[['.talent', renderTalentCell]]);
			}
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
		const select = createChoiceSelect({
			items: mechSkillOptions,
			selectedId: selectedId,
			index: idx,
			placeholderText: "HASE",
			getLabel: mechSkill => mechSkill.name,
			isEligible: mechSkill =>
				mechSkillIsEligible(level, mechSkill.id),
			onSelected: mechSkill =>
				mechSkillsUpdateCatalog(level, mechSkill.id),
			onChange: event => {
				const thisRow = event.currentTarget.closest('tr');

				const newMechSkillId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(thisRow.dataset.level);
				roadmap.levels[referenceLevel].mechSkillIds[newIdx] = newMechSkillId;
				mechSkillsResetCatalog(referenceLevel);

				rerenderFrom(roadmap, referenceLevel, [
					['.mech-skill', renderMechSkillCell],

					...mechSkillOptions.map(({ id }) => [
						`.hase[data-stat="${id}"]`,
						(_, targetLevel) =>
							renderHASECell(targetLevel, id)
					])
				]);

				rerenderMechStats(roadmap, referenceLevel);
			}
		});

		choiceWrapper.append(select);
	});
	
	cell.append(choiceWrapper);

	return cell;
}

function renderLicenseCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = level == 0 ? 'non-cell' : 'license';

	if (level != 0) {
		// isolate roadmap's current license
		const selectedId = roadmap.levels[level]?.licenseId;

		const select = createChoiceSelect({
			items: licenses,
			selectedId: selectedId,
			placeholderText: "Select a license",
			getLabel: license => {
				const rank = getLicenseRankIfSelected(
					level, license.id);

				return rank > 3
					? license.name
					: `${license.name} ${romanNumerals[rank - 1]}`;
			},
			isEligible: license =>
				licenseIsEligible(level, license.id),
			onSelected: license =>
				licensesUpdateCatalog(level, license.id),
			onChange: event => {
				const newLicenseId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(event.currentTarget.closest('tr').dataset.level);
				roadmap.levels[referenceLevel].licenseId = newLicenseId;
				licensesResetCatalog(referenceLevel);

				rerenderFrom(roadmap, referenceLevel,
					[['.license', renderLicenseCell]]);
				rerenderFrom(roadmap, referenceLevel,
					[['.frame', renderFrameCell]]);
				rerenderFrom(roadmap, referenceLevel,
					[['.core-bonus', renderCoreBonusCell]]);
			}
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

	const select = createChoiceSelect({
		items: frames,
		selectedId: selectedId,
		placeholderText: "Select a frame",
		getLabel: frame => frame.name,
		getDescription: frame => {
			return frame.description
				.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
		},
		isEligible: frame =>
			frameIsEligible(level, frame.id),
		onChange: event => {
			const newFrameId = event.currentTarget.value || null;
			const referenceLevel =
				Number(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].frameId = newFrameId;

			rerenderFrom(roadmap, referenceLevel,
				[['.frame', renderFrameCell]]);

			rerenderMechStats(
				roadmap,
				referenceLevel,
				getNextExplicitFrameLevel(roadmap, referenceLevel)
			);
		}
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

		const select = createChoiceSelect({
			items: coreBonuses,
			selectedId: selectedId,
			placeholderText: "Select a core bonus",
			getLabel: coreBonus => coreBonus.name,
			getDescription: coreBonus => {
				return coreBonus.description
					.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n');
			},
			isEligible: coreBonus =>
				coreBonusIsEligible(level, coreBonus.id),
			onSelected: coreBonus =>
				coreBonusesUpdateCatalog(level, coreBonus.id),
			onChange: event => {
				const newCoreBonusId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(event.currentTarget.closest('tr').dataset.level);
				roadmap.levels[referenceLevel].coreBonusId = newCoreBonusId;
				coreBonusesResetCatalog(referenceLevel);

				rerenderFrom(roadmap, referenceLevel,
					[['.core-bonus', renderCoreBonusCell]]);
					
				rerenderMechStats(roadmap, referenceLevel);
			}
		});

		cell.append(select);
	}

	return cell;
}

function renderStats(roadmap, level, row) {
	const spacer = document.createElement('td');
	spacer.className = 'non-cell';

	const haseCells = mechSkillOptions.map(({ id }) =>
		renderHASECell(level, id)
	);

	const mechStatCells = renderMechStatCells(roadmap, level);

	row.append(
		spacer,
		...haseCells,
		spacer.cloneNode(),
		...mechStatCells
	);
}

function renderHASECell(level, haseId) {
	const cell = document.createElement('td');
	cell.className = 'stat hase';
	cell.dataset.stat = haseId;

	const value = workingCatalog.mechSkills[level]?.[haseId] ?? 0;

	cell.textContent = String(value);

	if (value > MAX_MECH_SKILL_RANK)
		cell.classList.add('error');

	return cell;
}

function renderMechStatCells(roadmap, level) {
	const activeFrameId = getActiveFrameId(roadmap, level);
	const frame = frames.find(
		candidate => candidate.id === activeFrameId
	);

	const stats = calculateMechStats({
		frame,
		level,
		catalogSnapshot: {
			talents:
				workingCatalog.talents[level] ?? {},
			mechSkills:
				workingCatalog.mechSkills[level] ?? {},
			licenses:
				workingCatalog.licenses[level] ?? {},
			coreBonuses:
				workingCatalog.coreBonuses[level] ?? []
		},
		roadmapLevel: roadmap.levels[level]
	});

	return MECH_STAT_IDS.map(statId =>
		renderMechStatCell(statId, stats[statId])
	);
}

function rerenderMechStats(
	roadmap,
	startingLevel,
	stoppingLevel = Infinity
) {
	for (const row of tableBody.querySelectorAll('tr')) {
		const level = Number(row.dataset.level);
		if (
			level < startingLevel ||
			level >= stoppingLevel
		) {
			continue;
		}

		const replacementCells = renderMechStatCells(roadmap, level);

		MECH_STAT_IDS.forEach((statId, index) => {
			row.querySelector(
				`.mech-stat[data-stat="${statId}"]`
			)
				?.replaceWith(replacementCells[index]);
		});
	}
}

function renderMechStatCell(statId, value) {
	const cell = document.createElement('td');
	cell.className = 'stat mech-stat';
	cell.dataset.stat = statId;

	if (statId === 'limited_bonus')
		cell.classList.add('limited-bonus');

	if (value !== null) {
		cell.textContent =
			statId === 'size' && value < 1
			? '\u00BD'
			: String(value);
	}

	return cell;
}

function rerenderFrom(roadmap, referenceLevel, renderers) {
	for (const [selector, renderer] of renderers) {
		document.querySelectorAll(selector).forEach(cell => {
			const level = Number(cell.closest('tr').dataset.level);

			if (level >= referenceLevel) {
				cell.replaceWith(renderer(roadmap, level));
			}
		});
	}
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

function getActiveFrameId(roadmap, level) {
	for (let targetLevel = level; targetLevel >= 0; targetLevel--) {
		const frameId = roadmap.levels[targetLevel]?.frameId;

		if (frameId)
			return frameId;
	}

	return null;
}

function getNextExplicitFrameLevel(roadmap, level) {
	for (
		let targetLevel = level + 1;
		targetLevel < roadmap.levels.length;
		targetLevel++
	) {
		if (roadmap.levels[targetLevel]?.frameId)
			return targetLevel;
	}

	return Infinity;
}
