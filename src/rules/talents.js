import { workingCatalog } from '../data/roadmap-table.js';
import { createRankRule } from '../data/catalog-engine.js';

const MAX_TALENT_RANK = 3;

const rules = createRankRule({
    catalog: workingCatalog.talents,
    maxRank: MAX_TALENT_RANK,
    getMaxRank: level => level === 0 ? 1 : MAX_TALENT_RANK
});

export const talentsUpdateCatalog = rules.update;
export const talentIsEligible = rules.isEligible;
export const talentsResetCatalog = rules.reset;

export function getTalentRankIfSelected(level, talentId) {
    const snapshot = rules.ensure(level);
    return (snapshot[talentId] ?? 0) + 1;
}