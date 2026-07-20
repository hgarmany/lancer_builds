import { workingCatalog } from '../data/roadmap-table.js';

const MAX_MECH_SKILL_RANK = 6;

/**
 * Evaluate a mech skill that is in the build and
 * update the catalog to reflect selection limits.
 *
 * @param {number} level
 * @param {string} mechSkillId
 */
export function mechSkillsUpdateCatalog(level, mechSkillId) {
    if (workingCatalog.mechSkills[level] === undefined)
        addMechSkillLevelToCatalog(level);
    const catalog = workingCatalog.mechSkills[level];

    if (catalog[mechSkillId] === undefined) {
        catalog[mechSkillId] = 1;
    } else {
        catalog[mechSkillId]++;
    }
}

export function mechSkillIsEligible(level, mechSkillId, roadmap) {
    if (workingCatalog.mechSkills[level] === undefined)
        addMechSkillLevelToCatalog(level);
    const catalog = workingCatalog.mechSkills[level];
    
    return (
        catalog === undefined ||
        catalog[mechSkillId] === undefined ||
        catalog[mechSkillId] < MAX_MECH_SKILL_RANK
    );
}

/**
 * Clears all working data for mech skills
 * at or above the specified level
 * 
 * @param {number} level 
 */
export function mechSkillsResetCatalog(level) {
    workingCatalog.mechSkills.splice(parseInt(level));
}

export function addMechSkillLevelToCatalog(level) {
    if (level > 0 &&
        workingCatalog.mechSkills[level - 1] !== undefined) {
        // Create an independent snapshot of the previous level.
        workingCatalog.mechSkills[level] = {
            ...workingCatalog.mechSkills[level - 1]
        };
    }
    else {
        workingCatalog.mechSkills[level] = {};
    }
}