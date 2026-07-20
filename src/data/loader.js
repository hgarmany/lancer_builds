import lancerData from "@massif/lancer-data";
import { normalizeGameData } from '../data/normalizer.js';

export let skillTriggers = null;
export let talents = null;
export const mechSkillIds = ['h', 'a', 's', 'e'];
export const mechSkills = ['Hull', 'Agility', 'Systems', 'Engineering'];
export let licenses = null;
export let frames = null;
export let coreBonuses = null;

/**
 * expandability w.r.t. expansions and 3rd party LCPs
 * 
 * @returns core data for Lancer
 */
export function importCoreData() {
	const gameData = normalizeGameData(lancerData);
	console.log(gameData);
	skillTriggers = gameData.skills;
	talents = gameData.talents;

	licenses = gameData.licenses;
	const index = licenses.findIndex(m => m.id === "gms");
	if (index !== -1)
		licenses.splice(index, 1);
	
	frames = gameData.frames;
	coreBonuses = gameData.core_bonuses;
}