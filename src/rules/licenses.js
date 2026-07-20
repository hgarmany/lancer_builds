import { workingCatalog } from '../data/roadmap-table.js';

const MAX_LICENSE_RANK = 3;

/**
 * Evaluate a license that is in the build and
 * update the catalog to reflect selection limits.
 *
 * @param {number} level
 * @param {string} licenseId
 */
export function licensesUpdateCatalog(level, licenseId) {
    if (workingCatalog.licenses[level] === undefined)
        addLicenseLevelToCatalog(level);
    const catalog = workingCatalog.licenses[level];

    if (catalog[licenseId] === undefined) {
        catalog[licenseId] = 1;
    } else {
        catalog[licenseId]++;
    }
}

export function licenseIsEligible(level, licenseId, roadmap) {
    if (workingCatalog.licenses[level] === undefined)
        addLicenseLevelToCatalog(level);
    const catalog = workingCatalog.licenses[level];
    
    return (
        catalog === undefined ||
        catalog[licenseId] === undefined ||
        catalog[licenseId] < MAX_LICENSE_RANK
    );
}

/**
 * Clears all working data for licenses
 * at or above the specified level
 * 
 * @param {number} level 
 */
export function licensesResetCatalog(level) {
    workingCatalog.licenses.splice(parseInt(level));
}

export function addLicenseLevelToCatalog(level) {
    if (level > 0 &&
        workingCatalog.licenses[level - 1] !== undefined) {
        // Create an independent snapshot of the previous level.
        workingCatalog.licenses[level] = {
            ...workingCatalog.licenses[level - 1]
        };
    }
    else {
        workingCatalog.licenses[level] = {};
    }
}