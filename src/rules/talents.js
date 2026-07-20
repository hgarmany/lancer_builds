import { workingCatalog } from '../data/roadmap-table.js';

const MAX_TALENT_RANK = 3;

/**
 * Evaluate a talent that is in the build and
 * update the catalog to reflect selection limits.
 *
 * @param {number} level
 * @param {string} talentId
 */
export function talentsUpdateCatalog(level, talentId) {
    if (workingCatalog.talents[level] === undefined)
        addTalentLevelToCatalog(level);
    const catalog = workingCatalog.talents[level];

    if (catalog[talentId] === undefined) {
        catalog[talentId] = 1;
    } else {
        catalog[talentId]++;
    }
}

export function talentIsEligible(level, talentId, roadmap) {
    if (workingCatalog.talents[level] === undefined)
        addTalentLevelToCatalog(level);
    const catalog = workingCatalog.talents[level];
    
    const levelRankLimit = level == 0 ? 1 : MAX_TALENT_RANK;

    return (
        catalog === undefined ||
        catalog[talentId] === undefined ||
        catalog[talentId] < levelRankLimit
    );
}

/**
 * Clears all working data for talents
 * at or above the specified level
 * 
 * @param {number} level 
 */
export function talentsResetCatalog(level) {
    workingCatalog.talents.splice(parseInt(level));
}

export function addTalentLevelToCatalog(level) {
    if (level > 0 &&
        workingCatalog.talents[level - 1] !== undefined) {
        // Create an independent snapshot of the previous level.
        workingCatalog.talents[level] = {
            ...workingCatalog.talents[level - 1]
        };
    }
    else {
        workingCatalog.talents[level] = {};
    }
}