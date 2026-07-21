import { workingCatalog } from '../data/roadmap-table.js';
import { createRankRule } from '../data/catalog-engine.js';

const MAX_LICENSE_RANK = 3;

const rules = createRankRule({
    catalog: workingCatalog.licenses,
    maxRank: MAX_LICENSE_RANK
});

export const ensureLicenseSnapshot = rules.ensure;
export const licensesUpdateCatalog = rules.update;
export const licenseIsEligible = rules.isEligible;
export const licensesResetCatalog = rules.reset;

export function getLicenseRankIfSelected(level, licenseId) {
    const snapshot = rules.ensure(level);
    return (snapshot[licenseId] ?? 0) + 1;
}