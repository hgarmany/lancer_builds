// src/ui/roadmap-view.js

import { setMaxLevel } from '../model/roadmap.js';
import {
	skillTriggers,
	talents,
	mechSkillIds,
	mechSkills,
	licenses,
	frames,
	coreBonuses,
	systems
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
	frameIsEligible,
	getActiveFrameId,
	getNextExplicitFrameLevel
} from '../rules/frames.js';
import {
	coreBonusIsEligible,
	coreBonusesUpdateCatalog
} from '../rules/core-bonuses.js';
import {
	calculateMechStats,
	DISPLAYED_MECH_STAT_IDS,
	mechStatDecreased
} from '../rules/stats.js';
import {
	deriveRoadmapWeaponLoadout,
	getWeaponMountSPCost,
	getRoadmapWeaponSPCost,
	reconcileWeaponSlots,
	setLoadoutChoice,
	setWeaponSelection
} from '../model/loadout-state.js';
import {
	getEffectiveSystemIds,
	getNextExplicitSystemLevel,
	setSystemSelection
} from '../model/system-state.js';
import {
	systemIsEligible,
	hasEligibleSystem,
	getLimitedSystemUses,
	getSystemsBudget
} from '../rules/systems.js';
import {
	workingCatalog,
	coreBonusesResetCatalog
} from '../data/roadmap-table.js';

const MAX_LICENSE_LEVELS = 12;

// major elements for reference + modification
const roadmapName = document.getElementById('roadmap-name');
const roadmapShell = document.querySelector(".roadmap-shell");
const roadmapContainer = document.querySelector(".roadmap-container");
const tableBody = document.getElementById("roadmap-body");
const tableHead = document.querySelector("#roadmap-table thead");
const levelRail = document.querySelector(".level-rail");
const levelTabs = document.getElementById("level-tabs");
const maxLevelInput = document.getElementById('roadmap-max-level');
const rowSizeObserver = typeof ResizeObserver === 'undefined'
	? null
	: new ResizeObserver(entries => {
		for (const { target } of entries) {
			if (target === tableHead)
				syncLevelRailOffset();
			else
				syncLevelRailItem(target);
		}
		syncLevelRailSpacing();
	});
let updateCatalogFromRenderedSelections = true;

const mechSkillOptions = mechSkillIds.map((id, index) => ({
	id,
	name: mechSkills[index]
}));
const haseLayout = ['h', 's', 'a', 'e'];
const haseShortLabels = {
	h: 'Hull',
	a: 'Agi',
	s: 'Sys',
	e: 'Eng'
};
const frameImageModules = import.meta.glob(
	'../assets/frame_images/*.png',
	{
		eager: true,
		import: 'default',
		query: '?url'
	}
);
const frameImageUrls = new Map(
	Object.entries(frameImageModules).map(([path, url]) => {
		const filename = path.split('/').at(-1);
		return [filename.replace(/\.png$/i, ''), url];
	})
);
const romanNumerals = ['I', 'II', 'III', 'IV'];
const mechStatLabels = {
	size: 'Size',
	hp: 'HP',
	armor: 'Armor',
	heatcap: 'Heat Cap',
	evasion: 'Evasion',
	speed: 'Speed',
	edef: 'E-Defense',
	tech_attack: 'Tech Attack',
	sensor_range: 'Sensors',
	repcap: 'Repair Cap',
	save: 'Save',
	sp: 'SP'
};

const spacer = document.createElement('td');
spacer.className = 'non-cell';

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
 * @param {Object} [options]
 * @param {boolean} [options.catalogIsInitialized=false]
 */
export function initializeRoadmapView(
	roadmap,
	{ catalogIsInitialized = false } = {}
) {
	console.log(roadmap);

	wireRoadmapScrollIndicator();
	tableBody.replaceChildren();
	levelTabs.replaceChildren();
	reconcileWeaponSlots(roadmap, 0);

	const previousCatalogUpdateMode =
		updateCatalogFromRenderedSelections;
	updateCatalogFromRenderedSelections = !catalogIsInitialized;

	try {
		for (
			let rowLevel = 0;
			rowLevel <= MAX_LICENSE_LEVELS;
			rowLevel++
		) {
			if (roadmap.levels[rowLevel]?.level !== rowLevel) {
				/*
				 * Missing levels above maxLevel may be expected,
				 * depending on how setMaxLevel initializes the model.
				 */
				if (rowLevel <= roadmap.maxLevel)
					throw new Error('Roadmap data is corrupted.');
			}

			const levelTab = renderLevelTab(rowLevel);
			const newRow = renderRoadmapRow(roadmap, rowLevel);
			newRow.hidden = rowLevel > roadmap.maxLevel;
			levelTab.hidden = newRow.hidden;
			levelTabs.append(levelTab);
			tableBody.append(newRow);
		}
	}
	finally {
		updateCatalogFromRenderedSelections =
			previousCatalogUpdateMode;
	}

	refreshLevelRailSizing();
};

function wireRoadmapScrollIndicator() {
	if (roadmapContainer.dataset.scrollIndicatorWired)
		return;

	const updateIndicator = () => {
		roadmapShell.classList.toggle(
			'is-scrolled-right',
			roadmapContainer.scrollLeft > 1
		);
	};

	roadmapContainer.dataset.scrollIndicatorWired = 'true';
	roadmapContainer.addEventListener(
		'scroll',
		updateIndicator,
		{ passive: true }
	);
	window.addEventListener('resize', updateIndicator);
	updateIndicator();
}

function renderRoadmapRow(roadmap, level) {
	const newRow = document.createElement('tr');
	newRow.dataset.level = level;
	newRow.setAttribute('aria-labelledby', `level-tab-${level}`);

	newRow.append(renderLevelUpCell(roadmap, level));
	renderStats(roadmap, level, newRow);
	newRow.append(renderWeaponMountCell(roadmap, level));
	newRow.append(spacer.cloneNode());
	newRow.append(renderSystemsCell(roadmap, level));

	return newRow;
}

function renderLevelTab(level) {
	const tab = document.createElement('div');
	tab.id = `level-tab-${level}`;
	tab.className = 'level-tab';
	tab.dataset.level = level;
	tab.setAttribute('role', 'rowheader');
	tab.textContent = `LL${level}`;

	if (level % 3 == 0 && level != 0)
		tab.classList.add('cb-level');

	return tab;
}

function syncLevelRailItem(tableSection) {
	const railItem = levelTabs.querySelector(
		`.level-tab[data-level="${tableSection.dataset.level}"]`);
	if (!railItem) return;

	if (tableSection !== tableHead)
		railItem.hidden = tableSection.hidden;
	if (!tableSection.hidden) {
		const trailingGap = getRoadmapRowTrailingGap(
			tableSection
		);
		railItem.style.height =
			`${Math.max(
				0,
				tableSection.getBoundingClientRect().height -
					trailingGap
			)}px`;
	}
}

function syncLevelRailOffset() {
	const firstRow = tableBody.rows[0];
	if (!firstRow) return;

	const offset =
		firstRow.getBoundingClientRect().top -
		levelRail.getBoundingClientRect().top;

	levelRail.style.paddingTop = `${offset}px`;
}

function syncLevelRailSpacing() {
	const visibleRows = [...tableBody.children].filter(
		row => !row.hidden
	);

	for (let index = 0; index < visibleRows.length; index++) {
		const row = visibleRows[index];
		const railItem = levelTabs.querySelector(
			`.level-tab[data-level="${row.dataset.level}"]`
		);
		if (!railItem) continue;

		const nextRow = visibleRows[index + 1];
		const geometricGap = nextRow
			? nextRow.getBoundingClientRect().top -
				row.getBoundingClientRect().bottom
			: 0;
		const trailingGap = nextRow
			? getRoadmapRowTrailingGap(row)
			: 0;

		railItem.style.marginBottom = `${Math.max(
			0,
			geometricGap + trailingGap
		)}px`;
	}
}

function getRoadmapRowTrailingGap(row) {
	const firstCell = row.firstElementChild;
	if (!firstCell) return 0;

	return Number.parseFloat(
		getComputedStyle(firstCell).borderBottomWidth
	) || 0;
}

function refreshLevelRailSizing() {
	rowSizeObserver?.disconnect();
	syncLevelRailOffset();
	rowSizeObserver?.observe(tableHead);

	for (const row of tableBody.rows) {
		syncLevelRailItem(row);
		rowSizeObserver?.observe(row);
	}

	syncLevelRailSpacing();
}

function renderLevelUpCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'level-up';
	cell.classList.toggle('initial-build', level === 0);

	const grid = document.createElement('div');
	grid.className = 'level-up-grid';
	grid.append(
		renderSkillTriggerCell(roadmap, level),
		renderTalentCell(roadmap, level),
		renderMechSkillCell(roadmap, level)
	);

	if (level > 0)
		grid.append(renderLicenseCell(roadmap, level));

	if (level > 0 && level % 3 === 0)
		grid.append(renderCoreBonusCell(roadmap, level));

	cell.append(grid);
	return cell;
}

function createLevelUpGroup(className, labelText) {
	const group = document.createElement('div');
	group.className = `level-up-group ${className}`;

	const label = document.createElement('span');
	label.className = 'level-up-label';
	label.textContent = labelText;

	const controls = document.createElement('div');
	controls.className = 'select-group';

	group.append(label, controls);
	return { group, controls };
}

function renderSkillTriggerCell(roadmap, level) {
	const { group, controls } = createLevelUpGroup(
		'skill-trigger',
		level === 0 ? 'Skill Triggers' : 'Skill Trigger'
	);
	
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
			onSelected: skillTrigger => {
				if (updateCatalogFromRenderedSelections) {
					skillTriggersUpdateCatalog(
						level,
						skillTrigger.id
					);
				}
			},
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

		controls.append(select);
	});
	
	return group;
}

function renderTalentCell(roadmap, level) {
	const { group, controls } = createLevelUpGroup(
		'talent',
		level === 0 ? 'Talents' : 'Talent'
	);
	
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
			onSelected: talent => {
				if (updateCatalogFromRenderedSelections)
					talentsUpdateCatalog(level, talent.id);
			},
			onChange: event => {
				const newTalentId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(event.currentTarget.closest('tr').dataset.level);
				roadmap.levels[referenceLevel].talentIds[newIdx] = newTalentId;

				talentsResetCatalog(referenceLevel);

				rerenderFrom(roadmap, referenceLevel,
					[['.talent', renderTalentCell]]);
				rerenderFrom(
					roadmap,
					referenceLevel,
					[['.weapon-mounts', renderWeaponMountCell]]
				);
				rerenderFrom(roadmap, referenceLevel,
					[['.systems', renderSystemsCell]]);
			}
		});

		controls.append(select);
	});
	
	return group;
}

function renderMechSkillCell(roadmap, level) {
	const { group, controls } = createLevelUpGroup(
		'mech-skill',
		'HASE'
	);
	const selectedIds =
		roadmap.levels[level]?.mechSkillIds ?? [];

	for (const selectedId of selectedIds) {
		if (selectedId && updateCatalogFromRenderedSelections)
			mechSkillsUpdateCatalog(level, selectedId);
	}

	const assignedPoints =
		selectedIds.filter(Boolean).length;
	const pointLimit = selectedIds.length;
	const remainingPoints = pointLimit - assignedPoints;
	const widget = document.createElement('div');
	widget.className = 'hase-control';

	for (const haseId of haseLayout) {
		const mechSkill = mechSkillOptions.find(
			option => option.id === haseId
		);
		if (!mechSkill) continue;

		const assignedHere = selectedIds.filter(
			selectedId => selectedId === haseId
		).length;
		const canIncreaseRank =
			mechSkillIsEligible(level, haseId);
		const value =
			workingCatalog.mechSkills[level]?.[haseId] ?? 0;
		const stat = document.createElement('div');
		stat.className = 'hase-control-stat';
		stat.dataset.hase = haseId;

		const name = document.createElement('span');
		name.className = 'hase-control-name';
		name.textContent = haseShortLabels[haseId];

		const hex = document.createElement('div');
		hex.className = 'hase-hex';
		hex.classList.toggle(
			'error',
			value > MAX_MECH_SKILL_RANK
		);

		const increase = createHASEButton({
			symbol: '+',
			action: 'increase',
			label: `Add ${mechSkill.name} at LL${level}`,
			disabled:
				remainingPoints <= 0 ||
				!canIncreaseRank,
			onClick: () =>
				adjustMechSkill(roadmap, level, haseId, 1)
		});
		const rank = document.createElement('strong');
		rank.className = 'hase-rank';
		rank.textContent = String(value);
		const decrease = createHASEButton({
			symbol: '\u2212',
			action: 'decrease',
			label:
				`Remove ${mechSkill.name} point assigned at LL${level}`,
			disabled: assignedHere === 0,
			onClick: () =>
				adjustMechSkill(roadmap, level, haseId, -1)
		});

		hex.append(increase, rank, decrease);
		stat.append(name, hex);
		widget.append(stat);
	}

	const pointCounter = document.createElement('span');
	pointCounter.className = 'hase-point-counter';
	pointCounter.textContent =
		`${assignedPoints}/${pointLimit} assigned`;
	widget.append(pointCounter);
	controls.append(widget);

	return group;
}

function createHASEButton({
	symbol,
	action,
	label,
	disabled,
	onClick
}) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `hase-adjust ${action}`;
	button.textContent = symbol;
	button.disabled = disabled;
	button.setAttribute('aria-label', label);
	button.title = label;
	button.addEventListener('click', onClick);
	return button;
}

function adjustMechSkill(
	roadmap,
	level,
	haseId,
	direction
) {
	const selectedIds = roadmap.levels[level]?.mechSkillIds;
	if (!selectedIds) return;

	if (direction > 0) {
		const emptyIndex = selectedIds.findIndex(
			selectedId => !selectedId
		);
		if (
			emptyIndex < 0 ||
			!mechSkillIsEligible(level, haseId)
		) {
			return;
		}

		selectedIds[emptyIndex] = haseId;
	}
	else {
		let assignedIndex = -1;
		for (let index = selectedIds.length - 1; index >= 0; index--) {
			if (selectedIds[index] === haseId) {
				assignedIndex = index;
				break;
			}
		}

		if (assignedIndex < 0)
			return;

		selectedIds[assignedIndex] = null;
	}

	mechSkillsResetCatalog(level);
	rerenderFrom(roadmap, level,
		[['.mech-skill', renderMechSkillCell]]);
	rerenderMechStats(roadmap, level);
	rerenderFrom(roadmap, level,
		[['.systems', renderSystemsCell]]);
}

function renderLicenseCell(roadmap, level) {
	const { group, controls } = createLevelUpGroup(
		'license',
		'License'
	);
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
		onSelected: license => {
			if (updateCatalogFromRenderedSelections)
				licensesUpdateCatalog(level, license.id);
		},
		onChange: event => {
			const newLicenseId = event.currentTarget.value || null;
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
			rerenderFrom(roadmap, referenceLevel,
				[['.weapon-mounts', renderWeaponMountCell]]);
			rerenderFrom(roadmap, referenceLevel,
				[['.systems', renderSystemsCell]]);
		}
	});

	controls.append(select);
	return group;
}

function renderFrameCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'frame before-non-cell';

	const selectedId = roadmap.levels[level]?.frameId ?? null;
	const activeFrameId = getActiveFrameId(roadmap, level);
	const activeFrame = frames.find(
		frame => frame.id === activeFrameId
	);
	const content = document.createElement('div');
	content.className = 'frame-cell-content';
	const imageUrl = frameImageUrls.get(activeFrameId);

	if (imageUrl) {
		const image = document.createElement('img');
		image.className = 'frame-image';
		image.src = imageUrl;
		image.alt = `${activeFrame?.name ?? 'Active'} frame`;
		image.loading = 'lazy';
		image.decoding = 'async';
		image.draggable = false;
		content.append(image);
	}

	const select = createChoiceSelect({
		items: frames,
		selectedId: selectedId,
		placeholderText: activeFrame
			? activeFrame.name
			: "Select a frame",
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
			const stoppingLevel =
				getNextExplicitFrameLevel(roadmap, referenceLevel);

			reconcileWeaponSlots(
				roadmap,
				referenceLevel,
				stoppingLevel
			);

			rerenderFrom(roadmap, referenceLevel,
				[['.frame', renderFrameCell]]);

			rerenderMechStats(
				roadmap,
				referenceLevel,
				stoppingLevel
			);
			rerenderFrom(
				roadmap,
				referenceLevel,
				[['.systems', renderSystemsCell]],
				stoppingLevel
			);
			rerenderFrom(
				roadmap,
				referenceLevel,
				[['.weapon-mounts', renderWeaponMountCell]],
				stoppingLevel
			);
		}
	});

	const control = document.createElement('div');
	control.className = 'frame-select-control';
	const isInherited = !selectedId && activeFrame;
	select.classList.toggle('inherited', Boolean(isInherited));
	select.setAttribute(
		'aria-label',
		isInherited
			? `Active frame inherited as ${activeFrame.name}. Select a frame at LL${level} to override it.`
			: `Select active frame at LL${level}`
	);
	control.append(select);

	if (isInherited) {
		const note = document.createElement('span');
		note.className = 'frame-inheritance-note';
		note.textContent = 'Select to override';
		control.append(note);
	}

	content.append(control);
	cell.append(content);
	return cell;
}

function renderCoreBonusCell(roadmap, level) {
	const { group, controls } = createLevelUpGroup(
		'core-bonus',
		'Core Bonus'
	);

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
		onSelected: coreBonus => {
			if (updateCatalogFromRenderedSelections)
				coreBonusesUpdateCatalog(level, coreBonus.id);
		},
		onChange: event => {
			const newCoreBonusId = event.currentTarget.value || null;
			const referenceLevel =
				Number(event.currentTarget.closest('tr').dataset.level);
			roadmap.levels[referenceLevel].coreBonusId = newCoreBonusId;
			coreBonusesResetCatalog(referenceLevel);

			rerenderFrom(roadmap, referenceLevel,
				[['.core-bonus', renderCoreBonusCell]]);
			reconcileWeaponSlots(roadmap, referenceLevel);
			rerenderFrom(roadmap, referenceLevel,
				[['.weapon-mounts', renderWeaponMountCell]]);

			rerenderMechStats(roadmap, referenceLevel);
			rerenderFrom(roadmap, referenceLevel,
				[['.systems', renderSystemsCell]]);
		}
	});

	const wrapper = document.createElement('div');
	wrapper.className = 'cb-select-control';
	const label = document.createElement('span');
	label.className = 'cb-select-label';
	const selectedCoreBonus = coreBonuses.find(
		coreBonus => coreBonus.id === selectedId
	);

	label.textContent = selectedCoreBonus?.name ?? 'Select a core bonus';
	label.classList.toggle('placeholder', !selectedCoreBonus);

	if (select) {
		label.setAttribute('aria-hidden', 'true');
		wrapper.append(select);
	}

	wrapper.append(label);
	controls.append(wrapper);
	return group;
}

function renderStats(roadmap, level, row) {
	const frameCell = renderFrameCell(roadmap, level);

	row.append(
		spacer.cloneNode(),
		frameCell,
		renderMechStatsCell(roadmap, level),
		spacer.cloneNode()
	);
}

function renderMechStatsCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'stats';

	const table = document.createElement('table');
	table.className = 'mech-stats-table';
	table.setAttribute('aria-label', `Mech stats at LL${level}`);

	const body = document.createElement('tbody');
	const statCells = renderMechStatCells(roadmap, level);

	for (let index = 0; index < statCells.length; index += 6) {
		const row = document.createElement('tr');
		row.append(...statCells.slice(index, index + 6));
		body.append(row);
	}

	table.append(body);
	cell.append(table);
	return cell;
}

function renderMechStatCells(roadmap, level) {
	const stats = calculateRoadmapMechStats(roadmap, level);
	const previousStats = level > 0
		? calculateRoadmapMechStats(roadmap, level - 1)
		: null;

	return DISPLAYED_MECH_STAT_IDS.map(statId =>
		renderMechStatCell(
			statId,
			stats[statId],
			previousStats?.[statId] ?? null
		)
	);
}

function renderWeaponMountCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'weapon-mounts';
	const loadout = deriveRoadmapWeaponLoadout(roadmap, level);

	if (loadout.mounts.length === 0)
		return cell;

	const mountGrid = document.createElement('div');
	mountGrid.className = 'weapon-mount-grid';
	const controls = renderLoadoutChoices(
		roadmap,
		level,
		loadout.choices
	);

	loadout.mounts.forEach(mount => {
		const mountGroup = document.createElement('section');
		mountGroup.className = 'weapon-mount';
		mountGroup.classList.add(...mount.traits);

		const mountHeader = document.createElement('header');
		mountHeader.className = 'weapon-mount-header';

		const mountName = document.createElement('strong');
		mountName.textContent = mount.type;

		const badges = renderMountBadges(mount);
		mountHeader.append(mountName, badges);

		const slotWrapper = document.createElement('div');
		slotWrapper.className = 'weapon-mount-slots';

		mount.slots.forEach((slot, slotIndex) => {
			if (slot.locked) {
				slotWrapper.append(createWeaponDisplay(null, slot));
				return;
			}

			const select = createChoiceSelect({
				items: slot.options,
				selectedId: slot.selectedId,
				index: slotIndex,
				placeholderText: slot.label,
				getLabel: weapon => weapon.name,
				getDescription: weapon =>
					(weapon.description ?? weapon.effect ?? '')
						.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
				isEligible: weapon =>
					slot.eligibleIds.has(weapon.id),
				onChange: event => {
					const referenceLevel = Number(
						event.currentTarget.closest('tr').dataset.level
					);
					setWeaponSelection({
						roadmap,
						level: referenceLevel,
						mountId: mount.id,
						slotIndex,
						weaponId: event.currentTarget.value || null
					});

					rerenderFrom(roadmap, referenceLevel,
						[['.weapon-mounts', renderWeaponMountCell]]);
					rerenderFrom(roadmap, referenceLevel,
						[['.systems', renderSystemsCell]]);
				}
			});
			select.classList.add(...slot.traits);
			select.setAttribute(
				'aria-label',
				`${mount.type} weapon ${slotIndex + 1}`
			);

			slotWrapper.append(createWeaponDisplay(
				select,
				slot
			));
		});

		mountGroup.append(mountHeader, slotWrapper);
		mountGrid.append(mountGroup);
	});

	if (controls.childElementCount > 0)
		cell.append(controls);

	cell.append(mountGrid);
	return cell;
}

function createWeaponDisplay(select, slot) {
	const wrapper = document.createElement('div');
	wrapper.className = 'weapon-select-control';
	wrapper.classList.toggle('locked', slot.locked === true);
	const label = document.createElement('span');
	label.className = 'weapon-select-label';
	const selectedWeapon = slot.options.find(
		weapon => weapon.id === slot.selectedId
	);

	label.textContent = selectedWeapon?.name ?? slot.label;
	label.classList.toggle('placeholder', !selectedWeapon);

	if (select) {
		label.setAttribute('aria-hidden', 'true');
		wrapper.append(select);
	}

	wrapper.append(label);

	return wrapper;
}

function renderMountBadges(mount) {
	const badges = document.createElement('span');
	badges.className = 'weapon-mount-badges';

	for (const label of mount.badges)
		badges.append(createMountBadge(label));

	const spCost = getWeaponMountSPCost(mount);
	if (spCost > 0)
		badges.append(createMountBadge(`${spCost} SP`, 'sp-cost'));

	return badges;
}

function createMountBadge(text, className = null) {
	const badge = document.createElement('span');
	badge.className = 'weapon-mount-badge';
	if (className)
		badge.classList.add(className);
	badge.textContent = text;
	return badge;
}

function renderLoadoutChoices(
	roadmap,
	level,
	choices
) {
	const controls = document.createElement('div');
	controls.className = 'loadout-choice-controls';

	for (const choice of choices) {
		controls.append(
			createLoadoutChoiceControl(
				choice,
				value => {
					setLoadoutChoice({
						roadmap,
						level,
						choiceId: choice.id,
						value
					});
					rerenderFrom(roadmap, level,
						[['.weapon-mounts', renderWeaponMountCell]]);
					rerenderFrom(roadmap, level,
						[['.systems', renderSystemsCell]]);
				}
			)
		);
	}

	return controls;
}

function createLoadoutChoiceControl(choice, onChange) {
	const control = document.createElement('label');
	control.className = 'loadout-choice-control';
	const caption = document.createElement('span');
	caption.textContent = choice.label;
	const select = createChoiceSelect({
		items: choice.options,
		selectedId: choice.selectedId,
		placeholderText: choice.placeholder,
		getLabel: option => option.name,
		isEligible: () => true,
		onChange: event => onChange(event.currentTarget.value || null)
	});

	control.append(caption, select);
	return control;
}

function renderSystemsCell(roadmap, level) {
	const cell = document.createElement('td');
	cell.className = 'systems';

	const selectedIds = getEffectiveSystemIds(roadmap, level);
	workingCatalog.systems[level] = [...selectedIds];
	const stats = workingCatalog.stats[level];
	const budget = getSystemsBudget(level, selectedIds, {
		additionalSPCost:
			getRoadmapWeaponSPCost(roadmap, level)
	});
	stats.free_sp = budget.SP;
	stats.free_ai = budget.AI;
	const limitedBonus = stats.limited_bonus ?? 0;

	if (budget.SP) {
		const counter = document.createElement('div');
		counter.className = 'sp-counter';
		counter.textContent = `${budget.SP} SP`;
		counter.classList.toggle('error', budget.SP < 0);
		counter.setAttribute(
			'aria-label',
			budget.SP < 0
				? `System point budget exceeded by ${Math.abs(budget.SP)}`
				: `${budget.SP} system points remaining`
		);
		cell.append(counter);
	}

	const wrapper = document.createElement('div');
	wrapper.className = 'system-select-grid';
	const activeFrameId = getActiveFrameId(roadmap, level);

	// add an empty selector only if another system can be added
	const selectorIds = hasEligibleSystem(level, {
		activeFrameId
	})
		? [...selectedIds, null]
		: selectedIds;

	selectorIds.forEach((selectedId, idx) => {
		const select = createChoiceSelect({
			items: systems,
			selectedId: selectedId,
			index: idx,
			placeholderText: "Select a system",
			getLabel: system => system.name,
			getDescription: system =>
				(system.description ?? system.effect ?? '')
					.replace(/<\s*\/?br\s*[\/]?>/gi, '\n\n'),
			isEligible: system =>
				systemIsEligible(level, system, {
					replacingSystemId: selectedId,
					activeFrameId
				}),
			onChange: event => {
				const thisRow = event.currentTarget.closest('tr');

				const newSystemId = event.currentTarget.value || null;
				const newIdx = Number(event.currentTarget.dataset.idx);
				const referenceLevel =
					Number(thisRow.dataset.level);
				setSystemSelection({
					roadmap,
					level: referenceLevel,
					index: newIdx,
					systemId: newSystemId
				});
				const stoppingLevel =
					getNextExplicitSystemLevel(
						roadmap,
						referenceLevel
					);

				rerenderMechStats(
					roadmap,
					referenceLevel,
					stoppingLevel
				);
				rerenderFrom(
					roadmap,
					referenceLevel,
					[['.systems', renderSystemsCell]],
					stoppingLevel
				);
			}
		});

		const systemControl = document.createElement('div');
		systemControl.className = 'system-select-control';
		systemControl.append(select);

		const selectedSystem = systems.find(
			system => system.id === selectedId
		);
		const limitedUses = selectedSystem
			? getLimitedSystemUses(selectedSystem, limitedBonus)
			: null;

		if (limitedUses !== null) {
			const limitedTag = document.createElement('span');
			limitedTag.className = 'system-tag limited';
			limitedTag.textContent = `Limited ${limitedUses}`;
			limitedTag.title = `${limitedUses} uses`;
			systemControl.append(limitedTag);
		}

		wrapper.append(systemControl);
	});

	cell.append(wrapper);
	return cell;
}

function calculateRoadmapMechStats(roadmap, level) {
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
				workingCatalog.coreBonuses[level] ?? [],
			systems: getEffectiveSystemIds(
				roadmap,
				level
			).flatMap(systemId => {
				const system = systems.find(
					candidate => candidate.id === systemId
				);
				return system ? [system] : [];
			})
		},
		roadmapLevel: roadmap.levels[level]
	});

	return stats;
}

function rerenderMechStats(
	roadmap,
	startingLevel,
	stoppingLevel = Infinity
) {
	// Include one unaffected row because its hazard state depends on
	// the preceding, potentially changed row.
	const hazardLookaheadEnd = Number.isFinite(stoppingLevel)
		? stoppingLevel + 1
		: Infinity;

	for (const row of tableBody.children) {
		const level = Number(row.dataset.level);
		if (
			level < startingLevel ||
			level >= hazardLookaheadEnd
		) {
			continue;
		}

		row.querySelector(':scope > .stats')?.replaceWith(
			renderMechStatsCell(roadmap, level)
		);
	}
}

function renderMechStatCell(statId, value, previousValue) {
	const cell = document.createElement('td');
	cell.className = 'stat mech-stat';
	cell.dataset.stat = statId;

	if (mechStatDecreased(statId, value, previousValue))
		cell.classList.add('hazard');

	const label = document.createElement('span');
	label.className = 'mech-stat-label';
	label.textContent = mechStatLabels[statId] ?? statId;

	const output = document.createElement('strong');
	output.className = 'mech-stat-value';
	if (value !== null) {
		output.textContent =
			statId === 'size' && value < 1
			? '\u00BD'
			: String(value);
	}

	cell.append(label, output);
	return cell;
}

function rerenderFrom(
	roadmap,
	referenceLevel,
	renderers,
	stoppingLevel = Infinity
) {
	for (const [selector, renderer] of renderers) {
		document.querySelectorAll(selector).forEach(cell => {
			const level = Number(cell.closest('tr').dataset.level);

			if (
				level >= referenceLevel &&
				level < stoppingLevel
			) {
				cell.replaceWith(renderer(roadmap, level));
			}
		});
	}
	console.log('roadmap');
	console.log(roadmap);
	console.log('workingCatalog');
	console.log(workingCatalog);
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

	refreshLevelRailSizing();
}
