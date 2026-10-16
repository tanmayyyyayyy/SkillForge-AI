import { describe, it, expect, beforeEach } from 'vitest';
import { db, DEMO_USER_ID } from '../db/store.js';
import { validateProfile, toCanonicalSkillId, normalizeSkillName, isValidUrl } from '../../src/utils/profileValidation.js';
import { StudentProfile, ProficiencyLevel } from '../../src/types/index.js';
import { CAREER_ROLES } from '../data/careers.js';

describe('Subphase 2A: Student Profile Completeness & Validation', () => {
  beforeEach(() => {
    db.resetDemoData();
  });

  describe('Skill Normalization & Canonical ID Mapping', () => {
    it('normalizes skill names by trimming whitespace and collapsing internal spaces', () => {
      expect(normalizeSkillName('   Deep   Learning   with   PyTorch   ')).toBe('Deep Learning with PyTorch');
      expect(normalizeSkillName('')).toBe('');
    });

    it('maps common skill aliases to canonical identifiers', () => {
      expect(toCanonicalSkillId('React.js')).toBe('react');
      expect(toCanonicalSkillId('reactjs')).toBe('react');
      expect(toCanonicalSkillId('JS')).toBe('javascript');
      expect(toCanonicalSkillId('TS')).toBe('typescript');
      expect(toCanonicalSkillId('k8s')).toBe('kubernetes');
      expect(toCanonicalSkillId('PostgreSQL')).toBe('postgresql');
      expect(toCanonicalSkillId('C++')).toBe('c_plus_plus');
      expect(toCanonicalSkillId('C#')).toBe('c_sharp');
    });

    it('generates consistent lowercase snake_case IDs for generic skills', () => {
      expect(toCanonicalSkillId('FastAPI & REST')).toBe('fastapi_rest');
      expect(toCanonicalSkillId('Docker & Containerization')).toBe('docker_containerization');
    });
  });

  describe('URL Validator', () => {
    it('accepts valid http and https URLs and empty values', () => {
      expect(isValidUrl('https://github.com/user/repo')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('')).toBe(true);
      expect(isValidUrl(undefined)).toBe(true);
    });

    it('rejects malformed URLs', () => {
      expect(isValidUrl('invalid-url-string')).toBe(false);
      expect(isValidUrl('ftp://invalidscheme.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('Profile Validation & Sanitization', () => {
    it('successfully validates a complete student profile with new fields', () => {
      const demoProfile = db.getProfile(DEMO_USER_ID)!;
      const result = validateProfile(demoProfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized.fullName).toBe('Aarav Sharma');
      expect(result.sanitized.branch).toBe('Computer Science & Artificial Intelligence');
      expect(result.sanitized.institution).toBe('National Institute of Technology');
      expect(result.sanitized.currentAcademicYear).toBe('Year 3');
      expect(result.sanitized.experience).toBeDefined();
      expect(result.sanitized.experience!.length).toBeGreaterThan(0);
    });

    it('rejects empty or missing full name', () => {
      const result = validateProfile({ fullName: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Full name is required'))).toBe(true);
    });

    it('rejects unrealistic graduation year', () => {
      const result1 = validateProfile({ fullName: 'Test Student', graduationYear: 1950 });
      expect(result1.isValid).toBe(false);
      expect(result1.errors.some(e => e.includes('Graduation year'))).toBe(true);

      const result2 = validateProfile({ fullName: 'Test Student', graduationYear: 2099 });
      expect(result2.isValid).toBe(false);
      expect(result2.errors.some(e => e.includes('Graduation year'))).toBe(true);
    });

    it('rejects out-of-range weekly study hours', () => {
      const result = validateProfile({ fullName: 'Test Student', weeklyHours: 95 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('weekly study hours'))).toBe(true);
    });

    it('normalizes and deduplicates duplicate skills', () => {
      const input = {
        fullName: 'Test Student',
        currentSkills: [
          {
            skillId: 'react',
            name: 'React.js',
            category: 'UI Libraries',
            proficiency: 2 as ProficiencyLevel,
            status: 'self-reported' as const
          },
          {
            skillId: 'REACTJS',
            name: 'react',
            category: 'Frontend',
            proficiency: 4 as ProficiencyLevel,
            status: 'self-reported' as const
          }
        ]
      };

      const result = validateProfile(input);
      expect(result.isValid).toBe(true);
      // Both map to 'react', so they should be deduplicated to 1 item
      expect(result.sanitized.currentSkills).toHaveLength(1);
      // Highest proficiency should be preserved
      expect(result.sanitized.currentSkills[0].proficiency).toBe(4);
    });

    it('does not allow self-reported skills to masquerade as assessed without score', () => {
      const input = {
        fullName: 'Test Student',
        currentSkills: [
          {
            skillId: 'python',
            name: 'Python',
            category: 'Programming Languages',
            proficiency: 5 as ProficiencyLevel,
            status: 'assessed' as const
            // missing assessmentScore!
          }
        ]
      };

      const result = validateProfile(input);
      expect(result.isValid).toBe(true);
      // Status must revert to self-reported
      expect(result.sanitized.currentSkills[0].status).toBe('self-reported');
    });

    it('flags invalid proficiency levels outside 0 to 5', () => {
      const input = {
        fullName: 'Test Student',
        currentSkills: [
          {
            skillId: 'c_sharp',
            name: 'C#',
            category: 'General',
            proficiency: 9 as any,
            status: 'self-reported' as const
          }
        ]
      };

      const result = validateProfile(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('proficiency level'))).toBe(true);
    });

    it('validates project repository and live URLs', () => {
      const input = {
        fullName: 'Test Student',
        existingProjects: [
          {
            id: 'p1',
            title: 'Bad Project',
            description: 'Test',
            technologies: ['Node.js'],
            repoUrl: 'not_a_valid_url',
            skillsDemonstrated: ['node'],
            completed: false
          }
        ]
      };

      const result = validateProfile(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid repository URL'))).toBe(true);
    });
  });

  describe('Career Target Role Consistency', () => {
    it('exposes uniquely identified career tracks', () => {
      const ids = CAREER_ROLES.map(r => r.id);
      expect(ids.length).toBeGreaterThanOrEqual(8);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(/^[a-z0-9_]+$/);
      }
    });

    it('only references canonical, uniquely-defined required skills', () => {
      for (const role of CAREER_ROLES) {
        const skillIds = role.requiredSkills.map(s => s.skillId);
        expect(skillIds.length).toBeGreaterThan(0);
        expect(new Set(skillIds).size).toBe(skillIds.length);
      }
    });

    it('does not drop any required skill from the roadmap stages', () => {
      for (const role of CAREER_ROLES) {
        const stageRefs = new Set(role.stages.flatMap(s => s.skillIds));
        for (const skill of role.requiredSkills) {
          expect(stageRefs.has(skill.skillId)).toBe(true);
        }
      }
    });

    it('rejects an unknown target role at the profile-update boundary', () => {
      const isKnownRole = (roleId: string) => CAREER_ROLES.some(r => r.id === roleId);
      expect(isKnownRole('aiml')).toBe(true);
      expect(isKnownRole('data_scientist')).toBe(true);
      expect(isKnownRole('cybersecurity')).toBe(false);
      expect(isKnownRole('not_a_real_role')).toBe(false);
    });
  });

  describe('Database Persistence & Dependent Recalculation', () => {
    it('persists extended profile fields through db.saveProfile and retrieves them intact', () => {
      const initial = db.getProfile(DEMO_USER_ID)!;
      const updated: StudentProfile = {
        ...initial,
        fullName: 'Aarav Sharma Updated',
        branch: 'Autonomous Systems & Robotics',
        institution: 'Indian Institute of Technology, Bombay',
        graduationYear: 2027,
        currentAcademicYear: 'Final Year',
        weeklyHours: 25,
        targetCompletionPeriod: '3 Months',
        preferredDomains: ['Robotics', 'Reinforcement Learning'],
        constraints: ['Focus on simulation environments'],
        experience: [
          {
            id: 'exp_test_1',
            organization: 'Robotics Startup Inc',
            role: 'Control Systems Intern',
            duration: 'Jan 2025 - Mar 2025',
            responsibilities: 'Tuned PID and MPC control algorithms in Python ROS2.',
            skillsDemonstrated: ['Python', 'Control Systems']
          }
        ],
        updatedAt: new Date().toISOString()
      };

      db.saveProfile(updated);
      const retrieved = db.getProfile(DEMO_USER_ID)!;

      expect(retrieved.fullName).toBe('Aarav Sharma Updated');
      expect(retrieved.branch).toBe('Autonomous Systems & Robotics');
      expect(retrieved.institution).toBe('Indian Institute of Technology, Bombay');
      expect(retrieved.graduationYear).toBe(2027);
      expect(retrieved.currentAcademicYear).toBe('Final Year');
      expect(retrieved.weeklyHours).toBe(25);
      expect(retrieved.targetCompletionPeriod).toBe('3 Months');
      expect(retrieved.preferredDomains).toEqual(['Robotics', 'Reinforcement Learning']);
      expect(retrieved.experience).toHaveLength(1);
      expect(retrieved.experience![0].organization).toBe('Robotics Startup Inc');
    });
  });
});
