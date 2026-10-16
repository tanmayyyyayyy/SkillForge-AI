import { describe, it, expect } from 'vitest';
import { extractPdfText, isPdfBuffer, PdfExtractionError } from '../services/pdfText.js';
import { extractDeterministic, buildSkillLexicon } from '../services/resumeExtractor.js';
import { validateResumeExtraction, emptyExtraction } from '../../src/utils/resumeSchema.js';
import { validateProfile } from '../../src/utils/profileValidation.js';
import { StudentCertification } from '../../src/types/index.js';

const SAMPLE_RESUME = `Aarav Sharma
aarav@example.com

Skills
Python, React.js, Docker, PostgreSQL, Git

Education
B.Tech in Computer Science
National Institute of Technology
Graduation Year: 2026

Projects
Smart Attendance System
Built a face recognition attendance tool with Python and OpenCV.
https://github.com/aarav/attendance

Experience
Machine Learning Intern at SaarthiX Labs
May 2024 - Jul 2024
Built recommendation models in Python.

Certifications
Deep Learning Specialization, Coursera, 2024`;

const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Hello Resume Text) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

describe('Subphase 2B: Resume Upload & Skill Extraction', () => {
  describe('PDF text extraction (dependency-free)', () => {
    it('detects the PDF magic header', () => {
      expect(isPdfBuffer(Buffer.from('%PDF-1.7\nrest', 'latin1'))).toBe(true);
      expect(isPdfBuffer(Buffer.from('not a pdf at all', 'latin1'))).toBe(false);
      expect(isPdfBuffer(Buffer.alloc(2))).toBe(false);
    });

    it('throws an honest PdfExtractionError for non-PDF input', () => {
      expect(() => extractPdfText(Buffer.from('just some text', 'latin1'))).toThrow(PdfExtractionError);
    });

    it('extracts text and page count from a minimal valid PDF', () => {
      const result = extractPdfText(Buffer.from(MINIMAL_PDF, 'latin1'));
      expect(result.text).toContain('Hello Resume Text');
      expect(result.pageCount).toBe(1);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Deterministic (rule-based) extraction', () => {
    it('builds a skill lexicon that includes canonical career skills', () => {
      const lexicon = buildSkillLexicon();
      const ids = lexicon.map(e => e.id);
      expect(ids).toContain('python');
      expect(ids).toContain('react');
      expect(ids).toContain('docker');
      // No duplicate canonical IDs
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('extracts known skills mapped to canonical IDs', () => {
      const { extraction } = extractDeterministic(SAMPLE_RESUME);
      const ids = extraction.skills.map(s => s.skillId);
      expect(ids).toContain('python');
      expect(ids).toContain('react');
      expect(ids).toContain('docker');
      expect(ids).toContain('sql'); // PostgreSQL maps to the canonical sql skill
      // Self-reported proficiency stays in the valid 0-5 range
      for (const s of extraction.skills) {
        expect(s.proficiency).toBeGreaterThanOrEqual(0);
        expect(s.proficiency).toBeLessThanOrEqual(5);
      }
    });

    it('extracts education details', () => {
      const { extraction } = extractDeterministic(SAMPLE_RESUME);
      expect(extraction.fullName).toBe('Aarav Sharma');
      expect(extraction.degree).toBe('B.Tech');
      expect(extraction.branch).toContain('Computer Science');
      expect(extraction.institution).toContain('National Institute of Technology');
      expect(extraction.graduationYear).toBe(2026);
    });

    it('extracts projects with repository URLs', () => {
      const { extraction } = extractDeterministic(SAMPLE_RESUME);
      expect(extraction.projects.length).toBeGreaterThanOrEqual(1);
      const project = extraction.projects.find(p => /attendance/i.test(p.title));
      expect(project).toBeDefined();
      expect(project!.repoUrl).toBe('https://github.com/aarav/attendance');
    });

    it('extracts work experience with role and organization', () => {
      const { extraction } = extractDeterministic(SAMPLE_RESUME);
      expect(extraction.experience.length).toBeGreaterThanOrEqual(1);
      const exp = extraction.experience[0];
      expect(exp.role).toContain('Intern');
      expect(exp.organization).toContain('SaarthiX Labs');
      expect(exp.skillsDemonstrated.length).toBeGreaterThan(0);
    });

    it('extracts certifications with years', () => {
      const { extraction } = extractDeterministic(SAMPLE_RESUME);
      expect(extraction.certifications.length).toBeGreaterThanOrEqual(1);
      expect(extraction.certifications[0].name).toContain('Deep Learning');
      expect(extraction.certifications[0].year).toBe(2024);
    });

    it('warns honestly when very little text is available', () => {
      const { warnings } = extractDeterministic('Skills\nPython');
      expect(warnings.some(w => /Very little text/i.test(w))).toBe(true);
    });
  });

  describe('Untrusted extraction schema validation', () => {
    it('rejects non-object input', () => {
      const result = validateResumeExtraction(null);
      expect(result.isValid).toBe(false);
      expect(result.extraction).toEqual(emptyExtraction());
    });

    it('flags an extraction with no usable content', () => {
      const result = validateResumeExtraction({});
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => /No usable profile information/i.test(e))).toBe(true);
    });

    it('preserves an explicit canonical skillId instead of re-deriving from the display name', () => {
      const result = validateResumeExtraction({
        skills: [{ skillId: 'python', name: 'Python Programming', category: 'Programming Languages', proficiency: 3 }]
      });
      expect(result.isValid).toBe(true);
      expect(result.extraction.skills[0].skillId).toBe('python');
    });

    it('keeps deterministic career-mapped skill IDs aligned with the engine after validation', () => {
      const { extraction } = extractDeterministic(SAMPLE_RESUME);
      const validated = validateResumeExtraction(extraction);
      const ids = validated.extraction.skills.map(s => s.skillId);
      expect(ids).toContain('python');
      expect(ids).toContain('react');
      expect(ids).toContain('docker');
      expect(ids).toContain('sql');
    });

    it('canonicalizes and deduplicates skills, keeping the highest proficiency', () => {      const result = validateResumeExtraction({
        skills: [
          { name: 'React.js', category: 'UI', proficiency: 2 },
          { name: 'react', category: 'Frontend', proficiency: 4 }
        ]
      });
      expect(result.isValid).toBe(true);
      expect(result.extraction.skills).toHaveLength(1);
      expect(result.extraction.skills[0].skillId).toBe('react');
      expect(result.extraction.skills[0].proficiency).toBe(4);
    });

    it('clamps out-of-range proficiency values', () => {
      const result = validateResumeExtraction({
        skills: [
          { name: 'Python', proficiency: 99 },
          { name: 'Docker', proficiency: -5 }
        ]
      });
      const python = result.extraction.skills.find(s => s.skillId === 'python');
      const docker = result.extraction.skills.find(s => s.skillId === 'docker');
      expect(python?.proficiency).toBe(5);
      expect(docker?.proficiency).toBe(0);
    });

    it('drops invalid project URLs and records a warning', () => {
      const result = validateResumeExtraction({
        projects: [{ title: 'Bad URL Project', description: 'x', repoUrl: 'not_a_url', liveUrl: 'ftp://nope' }]
      });
      expect(result.extraction.projects).toHaveLength(1);
      expect(result.extraction.projects[0].repoUrl).toBeUndefined();
      expect(result.extraction.projects[0].liveUrl).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    });

    it('skips projects with no title', () => {
      const result = validateResumeExtraction({ projects: [{ description: 'no title' }] });
      expect(result.extraction.projects).toHaveLength(0);
    });

    it('sanitizes certification years into a valid range', () => {
      const result = validateResumeExtraction({
        certifications: [{ name: 'AWS Certified', issuer: 'Amazon', year: 2023 }]
      });
      expect(result.extraction.certifications).toHaveLength(1);
      expect(result.extraction.certifications[0].year).toBe(2023);
    });
  });

  describe('Certification persistence through profile validation', () => {
    it('sanitizes and preserves certifications with a valid year', () => {
      const cert: StudentCertification = { id: 'c1', name: 'Deep Learning Specialization', issuer: 'Coursera', year: 2024 };
      const result = validateProfile({ fullName: 'Test Student', certifications: [cert] });
      expect(result.isValid).toBe(true);
      expect(result.sanitized.certifications).toHaveLength(1);
      expect(result.sanitized.certifications![0].name).toBe('Deep Learning Specialization');
      expect(result.sanitized.certifications![0].year).toBe(2024);
    });

    it('rejects an out-of-range certification year', () => {
      const cert: StudentCertification = { id: 'c1', name: 'Legacy Cert', year: 1500 };
      const result = validateProfile({ fullName: 'Test Student', certifications: [cert] });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => /Certification 'Legacy Cert' has an invalid year/.test(e))).toBe(true);
    });
  });
});
