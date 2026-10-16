import { describe, it, expect } from 'vitest';
import { CAREER_ROLES } from '../data/careers.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { DEFAULT_PROJECTS } from '../data/defaultProjects.js';
import type { CareerRole } from '../../src/types/index.js';

/**
 * Subphase 2C: Career Data Integrity.
 *
 * The roadmap engine filters role.requiredSkills by the skillIds referenced in
 * role.stages. Any stage skillId without a matching requiredSkills entry is
 * silently dropped from the generated roadmap. These invariants guarantee the
 * career dataset is internally consistent so no role can silently lose tasks.
 */

const VALID_RESOURCE_TYPES = ['doc', 'course', 'tutorial'] as const;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildRegistry(): Set<string> {
  const registry = new Set<string>();
  for (const role of CAREER_ROLES) {
    for (const skill of role.requiredSkills) {
      registry.add(skill.skillId);
    }
  }
  return registry;
}

function findPrerequisiteCycle(role: CareerRole): string[] | null {
  const graph = new Map<string, string[]>();
  for (const skill of role.requiredSkills) {
    graph.set(skill.skillId, skill.prerequisites);
  }

  const VISITING = 1;
  const VISITED = 2;
  const state = new Map<string, number>();
  const stack: string[] = [];

  const visit = (node: string): string[] | null => {
    state.set(node, VISITING);
    stack.push(node);

    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue;
      const nextState = state.get(next);
      if (nextState === VISITING) {
        const start = stack.indexOf(next);
        return [...stack.slice(start), next];
      }
      if (nextState !== VISITED) {
        const cycle = visit(next);
        if (cycle) return cycle;
      }
    }

    stack.pop();
    state.set(node, VISITED);
    return null;
  };

  for (const node of graph.keys()) {
    if (!state.has(node)) {
      const cycle = visit(node);
      if (cycle) return cycle;
    }
  }
  return null;
}

describe('Subphase 2C: Career Data Integrity', () => {
  describe('Stage ↔ requiredSkills consistency', () => {
    it('resolves every roadmap stage skillId to a requiredSkills entry', () => {
      for (const role of CAREER_ROLES) {
        const requiredIds = new Set(role.requiredSkills.map(s => s.skillId));
        const stageIds = role.stages.flatMap(stage => stage.skillIds);
        const unresolved = stageIds.filter(id => !requiredIds.has(id));
        expect(unresolved, `role "${role.id}" has stage skills missing from requiredSkills: ${unresolved.join(', ')}`).toEqual([]);
      }
    });

    it('references every requiredSkill from at least one roadmap stage', () => {
      for (const role of CAREER_ROLES) {
        const stageIds = new Set(role.stages.flatMap(stage => stage.skillIds));
        const unreferenced = role.requiredSkills.filter(s => !stageIds.has(s.skillId)).map(s => s.skillId);
        expect(unreferenced, `role "${role.id}" has requiredSkills not present in any stage: ${unreferenced.join(', ')}`).toEqual([]);
      }
    });

    it('assigns sequential, unique stage numbers starting at 1', () => {
      for (const role of CAREER_ROLES) {
        const numbers = role.stages.map(s => s.stageNumber);
        expect(new Set(numbers).size, `role "${role.id}" has duplicate stage numbers`).toBe(numbers.length);
        expect([...numbers].sort((a, b) => a - b)).toEqual(numbers.map((_, i) => i + 1));
      }
    });

    it('gives each stage at least one skill', () => {
      for (const role of CAREER_ROLES) {
        for (const stage of role.stages) {
          expect(stage.skillIds.length, `role "${role.id}" stage "${stage.name}" is empty`).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Skill requirement integrity', () => {
    it('declares unique skillIds within each role', () => {
      for (const role of CAREER_ROLES) {
        const ids = role.requiredSkills.map(s => s.skillId);
        expect(new Set(ids).size, `role "${role.id}" has duplicate skillIds`).toBe(ids.length);
      }
    });

    it('uses lowercase snake_case skillIds', () => {
      for (const role of CAREER_ROLES) {
        for (const skill of role.requiredSkills) {
          expect(skill.skillId, `role "${role.id}" has a non-canonical skillId`).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
        }
      }
    });

    it('only references prerequisites defined within the same role', () => {
      for (const role of CAREER_ROLES) {
        const ids = new Set(role.requiredSkills.map(s => s.skillId));
        for (const skill of role.requiredSkills) {
          for (const prereq of skill.prerequisites) {
            expect(ids.has(prereq), `role "${role.id}" skill "${skill.skillId}" has unknown prerequisite "${prereq}"`).toBe(true);
          }
        }
      }
    });

    it('never lists a skill as its own prerequisite', () => {
      for (const role of CAREER_ROLES) {
        for (const skill of role.requiredSkills) {
          expect(skill.prerequisites).not.toContain(skill.skillId);
        }
      }
    });

    it('has no cyclic prerequisite graph within a role', () => {
      for (const role of CAREER_ROLES) {
        const cycle = findPrerequisiteCycle(role);
        expect(cycle, `role "${role.id}" has a prerequisite cycle: ${cycle?.join(' -> ')}`).toBeNull();
      }
    });

    it('provides valid metadata for every skill requirement', () => {
      for (const role of CAREER_ROLES) {
        for (const skill of role.requiredSkills) {
          const label = `${role.id}/${skill.skillId}`;
          expect(skill.name.trim().length, `${label} has an empty name`).toBeGreaterThan(0);
          expect(skill.category.trim().length, `${label} has an empty category`).toBeGreaterThan(0);
          expect(Number.isInteger(skill.requiredLevel), `${label} requiredLevel must be an integer`).toBe(true);
          expect(skill.requiredLevel, `${label} requiredLevel out of range`).toBeGreaterThanOrEqual(0);
          expect(skill.requiredLevel, `${label} requiredLevel out of range`).toBeLessThanOrEqual(5);
          expect(skill.importance, `${label} importance must be > 0`).toBeGreaterThan(0);
          expect(skill.importance, `${label} importance must be <= 1`).toBeLessThanOrEqual(1);
          expect(skill.estimatedHours, `${label} estimatedHours must be > 0`).toBeGreaterThan(0);
          expect(skill.assessmentCriteria.length, `${label} needs assessment criteria`).toBeGreaterThan(0);
          expect(skill.practiceActivity.trim().length, `${label} needs a practice activity`).toBeGreaterThan(0);
          expect(skill.projectApplication.trim().length, `${label} needs a project application`).toBeGreaterThan(0);

          expect(skill.learningResources.length, `${label} needs at least one learning resource`).toBeGreaterThan(0);
          for (const resource of skill.learningResources) {
            expect(resource.title.trim().length, `${label} resource is missing a title`).toBeGreaterThan(0);
            expect(VALID_RESOURCE_TYPES, `${label} resource "${resource.title}" has an invalid type`).toContain(resource.type);
            expect(isHttpUrl(resource.url), `${label} resource "${resource.title}" has an invalid URL: ${resource.url}`).toBe(true);
          }
        }
      }
    });
  });

  describe('Cross-dataset references', () => {
    it('maps every assessment to a skill defined in the career registry', () => {
      const registry = buildRegistry();
      const orphaned = ASSESSMENTS.filter(a => !registry.has(a.skillId)).map(a => a.skillId);
      expect(orphaned, `assessments reference unknown skills: ${orphaned.join(', ')}`).toEqual([]);
    });

    it('maps every project skill to a skill defined in the career registry', () => {
      const registry = buildRegistry();
      const orphaned = new Set<string>();
      for (const project of DEFAULT_PROJECTS) {
        for (const skillId of project.skillsDemonstrated) {
          if (!registry.has(skillId)) orphaned.add(skillId);
        }
      }
      expect([...orphaned], `projects reference unknown skills: ${[...orphaned].join(', ')}`).toEqual([]);
    });
  });
});
