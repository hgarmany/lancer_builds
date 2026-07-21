import { workingCatalog } from '../data/roadmap-table.js';
import { createRankRule } from '../data/catalog-engine.js';

export const MAX_MECH_SKILL_RANK = 6;

const rules = createRankRule({
    catalog: workingCatalog.mechSkills,
    maxRank: MAX_MECH_SKILL_RANK
});

export const mechSkillsUpdateCatalog = rules.update;
export const mechSkillIsEligible = rules.isEligible;
export const mechSkillsResetCatalog = rules.reset;