import { ResumeExtraction, ResumeExtractedSkill, ResumeExtractedProject, StudentExperience, StudentCertification, ProficiencyLevel } from '../../src/types/index.js';
import { normalizeSkillName } from '../../src/utils/profileValidation.js';
import { CAREER_ROLES } from '../data/careers.js';

/**
 * Deterministic (rule-based) resume extraction.
 *
 * This is NOT equivalent to AI analysis. It is a transparent, reproducible
 * heuristic used as a fallback when Gemini is unavailable and as a baseline
 * that must still be reviewed by the student before saving.
 */

export interface LexiconEntry {
  id: string;
  name: string;
  category: string;
  synonyms: string[];
}

const SUPPLEMENTARY_SKILLS: LexiconEntry[] = [
  { id: 'python', name: 'Python Programming', category: 'Programming Languages', synonyms: ['python', 'py'] },
  { id: 'javascript', name: 'Modern JavaScript (ES6+)', category: 'Frontend Core', synonyms: ['javascript', 'js', 'es6', 'ecmascript'] },
  { id: 'typescript', name: 'TypeScript', category: 'Programming Languages', synonyms: ['typescript', 'ts'] },
  { id: 'java', name: 'Java', category: 'Programming Languages', synonyms: ['java'] },
  { id: 'c_plus_plus', name: 'C++', category: 'Programming Languages', synonyms: ['c++', 'cpp'] },
  { id: 'c_sharp', name: 'C#', category: 'Programming Languages', synonyms: ['c#', 'csharp'] },
  { id: 'go', name: 'Go', category: 'Programming Languages', synonyms: ['golang', 'go lang'] },
  { id: 'rust', name: 'Rust', category: 'Programming Languages', synonyms: ['rust'] },
  { id: 'sql', name: 'SQL & Relational Databases', category: 'Data Management', synonyms: ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'oracle db'] },
  { id: 'html_css', name: 'Semantic HTML5 & Modern CSS', category: 'Frontend Core', synonyms: ['html', 'html5', 'css', 'css3', 'sass', 'scss', 'tailwind'] },
  { id: 'react', name: 'React.js', category: 'UI Libraries', synonyms: ['react', 'react.js', 'reactjs'] },
  { id: 'vue', name: 'Vue.js', category: 'UI Libraries', synonyms: ['vue', 'vue.js', 'vuejs'] },
  { id: 'angular', name: 'Angular', category: 'UI Libraries', synonyms: ['angular', 'angular.js', 'angularjs'] },
  { id: 'nextjs', name: 'Next.js', category: 'UI Libraries', synonyms: ['next.js', 'nextjs'] },
  { id: 'node_backend', name: 'Node.js & Express', category: 'Backend Runtimes', synonyms: ['node.js', 'nodejs', 'node js', 'node', 'express', 'express.js', 'expressjs'] },
  { id: 'rest_apis', name: 'REST API Design', category: 'API Development', synonyms: ['rest', 'rest api', 'restful', 'api design'] },
  { id: 'graphql', name: 'GraphQL', category: 'API Development', synonyms: ['graphql'] },
  { id: 'fastapi', name: 'FastAPI', category: 'API Development', synonyms: ['fastapi'] },
  { id: 'django', name: 'Django', category: 'Backend Frameworks', synonyms: ['django'] },
  { id: 'flask', name: 'Flask', category: 'Backend Frameworks', synonyms: ['flask'] },
  { id: 'spring', name: 'Spring Boot', category: 'Backend Frameworks', synonyms: ['spring', 'spring boot'] },
  { id: 'pytorch', name: 'Deep Learning with PyTorch', category: 'Deep Learning', synonyms: ['pytorch', 'torch'] },
  { id: 'tensorflow', name: 'TensorFlow & Keras', category: 'Deep Learning', synonyms: ['tensorflow', 'tf', 'keras'] },
  { id: 'scikit_learn', name: 'Classical ML (Scikit-Learn)', category: 'Machine Learning', synonyms: ['scikit-learn', 'scikit learn', 'sklearn', 'scikit'] },
  { id: 'data_manipulation', name: 'Data Wrangling (NumPy & Pandas)', category: 'Data Engineering', synonyms: ['pandas', 'numpy', 'data wrangling', 'data cleaning'] },
  { id: 'mlops', name: 'MLOps & Experiment Tracking', category: 'DevOps & Deployment', synonyms: ['mlops', 'mlflow', 'weights & biases', 'wandb'] },
  { id: 'llm_rag', name: 'LLMs, Prompting & RAG Pipelines', category: 'Generative AI', synonyms: ['llm', 'llms', 'rag', 'langchain', 'llamaindex', 'prompt engineering', 'vector database', 'pinecone', 'chromadb'] },
  { id: 'deep_learning', name: 'Neural Networks & Deep Learning', category: 'Deep Learning', synonyms: ['deep learning', 'neural networks', 'cnn', 'rnn', 'transformers', 'computer vision', 'nlp', 'natural language processing'] },
  { id: 'math_stats', name: 'Linear Algebra & Statistics', category: 'Mathematics', synonyms: ['linear algebra', 'statistics', 'probability', 'stats', 'calculus'] },
  { id: 'dsa', name: 'Data Structures & Algorithms', category: 'Computer Science Core', synonyms: ['data structures', 'algorithms', 'dsa', 'algorithm design'] },
  { id: 'core_oop', name: 'Object-Oriented Design', category: 'Software Design', synonyms: ['oop', 'object oriented', 'design patterns', 'solid principles'] },
  { id: 'system_design', name: 'Distributed Systems & System Design', category: 'Architecture', synonyms: ['system design', 'distributed systems', 'microservices', 'scalability', 'load balancing'] },
  { id: 'docker', name: 'Docker & Containerization', category: 'DevOps & Deployment', synonyms: ['docker', 'containerization', 'containers'] },
  { id: 'kubernetes', name: 'Kubernetes', category: 'DevOps & Deployment', synonyms: ['kubernetes', 'k8s'] },
  { id: 'cicd_pipelines', name: 'CI/CD Pipelines', category: 'DevOps & Deployment', synonyms: ['ci/cd', 'ci cd', 'github actions', 'jenkins', 'gitlab ci', 'continuous integration', 'continuous deployment'] },
  { id: 'iac_terraform', name: 'Infrastructure as Code (Terraform)', category: 'DevOps & Deployment', synonyms: ['terraform', 'infrastructure as code', 'iac', 'cloudformation', 'ansible'] },
  { id: 'monitoring_observability', name: 'Monitoring & Observability', category: 'DevOps & Deployment', synonyms: ['prometheus', 'grafana', 'observability', 'monitoring', 'datadog', 'elk'] },
  { id: 'linux_bash', name: 'Linux & Shell Scripting', category: 'DevOps & Deployment', synonyms: ['linux', 'bash', 'shell scripting', 'unix'] },
  { id: 'git_versioning', name: 'Git & Version Control', category: 'Developer Tools', synonyms: ['git', 'github', 'gitlab', 'version control', 'bitbucket'] },
  { id: 'testing_qa', name: 'Automated Testing (Unit & Integration)', category: 'Software Quality', synonyms: ['unit testing', 'integration testing', 'jest', 'pytest', 'testing', 'tdd', 'junit'] },
  { id: 'frontend_testing', name: 'Frontend Testing', category: 'Frontend Quality', synonyms: ['cypress', 'playwright', 'react testing library', 'rtl', 'vitest'] },
  { id: 'web_perf', name: 'Web Performance & Accessibility', category: 'Frontend Quality', synonyms: ['web performance', 'accessibility', 'a11y', 'lighthouse', 'core web vitals'] },
  { id: 'state_management', name: 'State Management', category: 'Frontend Quality', synonyms: ['redux', 'zustand', 'mobx', 'state management', 'react query', 'tanstack query'] },
  { id: 'backend_security', name: 'Backend Security & Auth', category: 'Application Security', synonyms: ['owasp', 'jwt', 'oauth', 'authentication', 'authorization', 'cybersecurity', 'penetration testing'] },
  { id: 'nosql_redis', name: 'Redis & NoSQL', category: 'Data Management', synonyms: ['redis', 'mongodb', 'mongo', 'nosql', 'cassandra', 'dynamodb'] },
  { id: 'cloud_platforms', name: 'Cloud Platforms (AWS/Azure/GCP)', category: 'Infrastructure & Cloud', synonyms: ['aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'ec2', 's3', 'lambda'] },
  { id: 'data_viz', name: 'Data Visualization & BI', category: 'Analytics', synonyms: ['tableau', 'power bi', 'powerbi', 'data visualization', 'matplotlib', 'seaborn', 'looker'] },
  { id: 'spreadsheets', name: 'Spreadsheets & Excel', category: 'Analytics', synonyms: ['excel', 'spreadsheets', 'google sheets'] },
  { id: 'business_metrics', name: 'Business Metrics & Analytics', category: 'Analytics', synonyms: ['kpis', 'business metrics', 'a/b testing', 'product analytics', 'google analytics'] },
  { id: 'spark_hadoop', name: 'Big Data (Spark & Hadoop)', category: 'Data Engineering', synonyms: ['spark', 'pyspark', 'hadoop', 'big data', 'airflow', 'dbt', 'snowflake', 'bigquery'] },
  { id: 'agile_scrum', name: 'Agile & Scrum', category: 'Process', synonyms: ['agile', 'scrum', 'kanban', 'jira'] },
  { id: 'ui_ux', name: 'UI/UX & Design Tools', category: 'Design', synonyms: ['figma', 'ui/ux', 'ui design', 'ux design', 'wireframing', 'prototyping', 'user research', 'adobe xd', 'sketch', 'photoshop', 'illustrator'] },
  { id: 'product_management', name: 'Product Management', category: 'Product', synonyms: ['product management', 'product roadmap', 'prd', 'product strategy', 'stakeholder management'] }
];

let cachedLexicon: LexiconEntry[] | null = null;

export function buildSkillLexicon(): LexiconEntry[] {
  if (cachedLexicon) return cachedLexicon;
  const byId = new Map<string, LexiconEntry>();

  // Seed from career requirement skills so extracted skills map to canonical engine IDs.
  for (const role of CAREER_ROLES) {
    for (const skill of role.requiredSkills) {
      if (!byId.has(skill.skillId)) {
        byId.set(skill.skillId, {
          id: skill.skillId,
          name: skill.name,
          category: skill.category,
          synonyms: [skill.name]
        });
      }
    }
  }

  // Supplement with common skills, only adding synonyms to existing canonical IDs.
  for (const supp of SUPPLEMENTARY_SKILLS) {
    const existing = byId.get(supp.id);
    if (existing) {
      existing.synonyms = Array.from(new Set([...existing.synonyms, ...supp.synonyms]));
    } else {
      byId.set(supp.id, { ...supp, synonyms: [...supp.synonyms] });
    }
  }

  cachedLexicon = Array.from(byId.values());
  return cachedLexicon;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasSkill(text: string, synonym: string): boolean {
  const esc = escapeRegExp(synonym);
  try {
    return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i').test(text);
  } catch {
    return text.toLowerCase().includes(synonym.toLowerCase());
  }
}

function inferProficiency(contextLine: string): ProficiencyLevel {
  const l = contextLine.toLowerCase();
  if (/(expert|mastery|advanced|excellent|5\+?\s*(yrs|years))/.test(l)) return 4;
  if (/(proficient|intermediate|strong|comfortable|3\+?\s*(yrs|years))/.test(l)) return 3;
  if (/(beginner|basic|familiar|novice|learning|exposure)/.test(l)) return 1;
  return 2;
}

const SECTION_KEYS: Record<string, string[]> = {
  skills: ['technical skills', 'skills', 'core competencies', 'technologies', 'tech stack', 'technical proficiency', 'skills & technologies', 'technical expertise'],
  education: ['education', 'academic background', 'academics', 'educational background'],
  experience: ['experience', 'work experience', 'professional experience', 'internship', 'internships', 'employment', 'work history', 'relevant experience'],
  projects: ['projects', 'personal projects', 'academic projects', 'key projects', 'selected projects'],
  certifications: ['certifications', 'certificates', 'licenses', 'courses & certifications', 'training', 'certifications & awards']
};

interface Sections {
  skills: string;
  education: string;
  experience: string;
  projects: string;
  certifications: string;
  all: string;
}

function splitSections(text: string): Sections {
  const lines = text.split('\n').map(l => l.trim());
  const buckets: Record<string, string[]> = { skills: [], education: [], experience: [], projects: [], certifications: [] };
  let current: string | null = null;

  const matchHeading = (line: string): string | null => {
    const clean = line.replace(/[:\-–—]+$/g, '').trim().toLowerCase();
    if (clean.length === 0 || clean.length > 45) return null;
    for (const [key, names] of Object.entries(SECTION_KEYS)) {
      if (names.includes(clean)) return key;
    }
    return null;
  };

  for (const line of lines) {
    const heading = matchHeading(line);
    if (heading) {
      current = heading;
      continue;
    }
    if (current) buckets[current].push(line);
  }

  return {
    skills: buckets.skills.join('\n'),
    education: buckets.education.join('\n'),
    experience: buckets.experience.join('\n'),
    projects: buckets.projects.join('\n'),
    certifications: buckets.certifications.join('\n'),
    all: text
  };
}

function extractSkills(sections: Sections, fullText: string): ResumeExtractedSkill[] {
  const lexicon = buildSkillLexicon();
  const skillsText = sections.skills;
  const result = new Map<string, ResumeExtractedSkill>();

  const skillsLines = skillsText.split(/[\n,;|·•]+/).map(s => s.trim()).filter(Boolean);

  for (const entry of lexicon) {
    let matched = false;
    let context = '';

    for (const syn of entry.synonyms) {
      if (syn.length < 2) continue;
      // High precision: skills section (any length >= 2)
      if (skillsText && hasSkill(skillsText, syn)) {
        matched = true;
        context = skillsLines.find(l => hasSkill(l, syn)) || context;
        break;
      }
      // Lower precision: full document (distinctive synonyms only)
      if (syn.length >= 3 && hasSkill(fullText, syn)) {
        matched = true;
        break;
      }
    }

    if (matched && !result.has(entry.id)) {
      result.set(entry.id, {
        skillId: entry.id,
        name: entry.name,
        category: entry.category,
        proficiency: context ? inferProficiency(context) : 2,
        evidence: 'Detected in resume text (self-reported)'
      });
    }
  }

  return Array.from(result.values());
}

const DEGREE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bb\.?\s?tech\b/i, label: 'B.Tech' },
  { re: /\bb\.?\s?e\.?\b/i, label: 'B.E.' },
  { re: /\bb\.?\s?sc\b/i, label: 'B.Sc' },
  { re: /\bbca\b/i, label: 'BCA' },
  { re: /\bbachelor(?:'s)?\b/i, label: 'Bachelor' },
  { re: /\bm\.?\s?tech\b/i, label: 'M.Tech' },
  { re: /\bm\.?\s?sc\b/i, label: 'M.Sc' },
  { re: /\bmca\b/i, label: 'MCA' },
  { re: /\bmba\b/i, label: 'MBA' },
  { re: /\bmaster(?:'s)?\b/i, label: 'Master' },
  { re: /\bph\.?\s?d\b/i, label: 'Ph.D' }
];

const BRANCH_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /computer science (?:&|and) (?:artificial intelligence|ai)/i, label: 'Computer Science & Artificial Intelligence' },
  { re: /(?:artificial intelligence|machine learning)(?: &| and)? ?(?:engineering)?/i, label: 'Artificial Intelligence & Machine Learning' },
  { re: /data science/i, label: 'Data Science' },
  { re: /information technology\b/i, label: 'Information Technology' },
  { re: /computer (?:science|engineering)/i, label: 'Computer Science & Engineering' },
  { re: /electronics(?: &| and)? communication/i, label: 'Electronics & Communication' },
  { re: /electrical(?: &| and)? electronics/i, label: 'Electrical & Electronics' },
  { re: /mechanical engineering/i, label: 'Mechanical Engineering' },
  { re: /civil engineering/i, label: 'Civil Engineering' }
];

function extractEducation(text: string, fullText: string) {
  const scope = `${text}\n${fullText}`;
  // Degree/branch are education-specific; prefer the education section to avoid
  // false positives from job titles elsewhere (e.g. "Machine Learning Intern").
  const credentialScope = text.trim() ? text : fullText;
  let degree: string | undefined;
  for (const d of DEGREE_PATTERNS) {
    if (d.re.test(credentialScope)) { degree = d.label; break; }
  }
  let branch: string | undefined;
  for (const b of BRANCH_PATTERNS) {
    if (b.re.test(credentialScope)) { branch = b.label; break; }
  }
  let institution: string | undefined;
  const instLine = scope.split('\n').find(l =>
    /(university|institute|college|\biit\b|\bnit\b|\bbits\b|\bvit\b|\bsrm\b|school of|academy)/i.test(l) &&
    l.length <= 120
  );
  if (instLine) institution = normalizeSkillName(instLine);

  let graduationYear: number | undefined;
  const near = /(graduat\w*|expected|class of|passing|batch)\D{0,20}((?:19|20)\d{2})/i.exec(scope);
  if (near) {
    const y = Number(near[2]);
    if (y >= 1985 && y <= 2045) graduationYear = y;
  } else {
    const years = Array.from(scope.matchAll(/\b(19|20)\d{2}\b/g))
      .map(m => Number(m[0]))
      .filter(y => y >= 1985 && y <= 2045);
    if (years.length) graduationYear = Math.max(...years);
  }

  return { degree, branch, institution, graduationYear };
}

function extractFullName(text: string): string | undefined {
  const firstLines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
  for (const line of firstLines) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      line.length <= 40 &&
      /^[A-Za-z][A-Za-z.\s'-]+$/.test(line) &&
      !/(resume|curriculum|vitae|profile|engineer|developer|intern|student)/i.test(line)
    ) {
      return normalizeSkillName(line);
    }
  }
  return undefined;
}

function extractProjects(text: string): ResumeExtractedProject[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const projects: ResumeExtractedProject[] = [];
  let current: ResumeExtractedProject | null = null;

  const isTitle = (line: string): boolean => {
    const cleaned = line.replace(/^[•\-*·\u2022]+\s*/, '');
    if (cleaned.length < 3 || cleaned.length > 90) return false;
    if (/^[a-z]/.test(cleaned) && !/^[•\-*·\u2022]/.test(line)) return false;
    const words = cleaned.split(/\s+/);
    if (words.length > 12) return false;
    // A title is short and has no terminal period
    return !cleaned.endsWith('.');
  };

  for (const line of lines) {
    const cleaned = line.replace(/^[•\-*·\u2022]+\s*/, '');
    const urls = line.match(/https?:\/\/[^\s)]+/g) || [];

    if (isTitle(line)) {
      if (current && (current.description || current.technologies.length)) projects.push(current);
      current = { title: cleaned, description: '', technologies: [] };
      if (urls.length) attachUrls(current, urls);
    } else if (current) {
      if (urls.length) attachUrls(current, urls);
      else if (!current.description) current.description = line;
      else current.description += ' ' + line;
    }
    if (projects.length >= 12) break;
  }
  if (current && (current.description || current.title)) projects.push(current);
  return projects.slice(0, 12);
}

function attachUrls(project: ResumeExtractedProject, urls: string[]): void {
  for (const url of urls) {
    const lower = url.toLowerCase();
    if (!project.repoUrl && /(github|gitlab|bitbucket)/.test(lower)) project.repoUrl = url;
    else if (!project.liveUrl && !project.repoUrl) project.repoUrl = url;
    else if (!project.liveUrl) project.liveUrl = url;
  }
}

const DATE_RANGE = /((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\b(?:19|20)\d{2}\b)\s*(?:-|–|—|to)\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\b(?:19|20)\d{2}\b|present|current|ongoing)/i;
const ORG_HINT = /(ltd|inc|pvt|technologies|solutions|labs|corp|company|university|institute|college|\biit\b|\bnit\b)/i;
const ROLE_HINT = /(intern|engineer|developer|analyst|scientist|manager|consultant|designer|lead|associate|architect|administrator)/i;

function extractExperience(text: string): StudentExperience[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const experiences: StudentExperience[] = [];
  const lexicon = buildSkillLexicon();

  for (let i = 0; i < lines.length && experiences.length < 10; i++) {
    const dateMatch = lines[i].match(DATE_RANGE);
    if (!dateMatch) continue;

    const duration = normalizeSkillName(dateMatch[0]);
    const context = normalizeSkillName(lines[i].replace(dateMatch[0], '').replace(/[|,–—-]\s*$/, ''));
    const prev = i > 0 ? lines[i - 1] : '';

    let organization = '';
    let role = '';

    for (const candidate of [context, prev]) {
      const parts = candidate.split(/\s+(?:@|at)\s+/i);
      if (parts.length === 2) {
        role = role || parts[0].trim();
        organization = organization || parts[1].trim();
      }
    }
    if (!organization) {
      const orgCandidate = [context, prev].find(c => ORG_HINT.test(c) && c.length <= 120);
      if (orgCandidate) organization = orgCandidate.replace(ROLE_HINT, '').replace(/[|,–—-]\s*$/, '').trim();
    }
    if (!role) {
      const roleCandidate = [context, prev].find(c => ROLE_HINT.test(c));
      if (roleCandidate) role = normalizeSkillName(roleCandidate.split(/\s+(?:@|at)\s+/i)[0]);
    }

    if (!organization && !role) continue;

    // Responsibilities: lines following the date line until the next date line
    const responsibilities: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (DATE_RANGE.test(lines[j])) break;
      responsibilities.push(lines[j].replace(/^[•\-*·\u2022]+\s*/, ''));
    }
    const blockText = `${context} ${prev} ${responsibilities.join(' ')}`;
    const skillsDemonstrated = lexicon
      .filter(entry => entry.synonyms.some(s => s.length >= 3 && hasSkill(blockText, s)))
      .map(entry => entry.name)
      .slice(0, 10);

    experiences.push({
      id: `resume_exp_${experiences.length + 1}`,
      organization: organization || 'Unknown organization',
      role: role || 'Role not specified',
      duration,
      responsibilities: responsibilities.join(' ').trim(),
      skillsDemonstrated
    });
  }

  return experiences;
}

function extractCertifications(text: string): StudentCertification[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const certs: StudentCertification[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[•\-*·\u2022]+\s*/, '');
    if (cleaned.length < 3 || cleaned.length > 140) continue;
    const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
    certs.push({
      id: `resume_cert_${certs.length + 1}`,
      name: cleaned,
      year: yearMatch ? Number(yearMatch[0]) : undefined
    });
    if (certs.length >= 20) break;
  }
  return certs;
}

export function extractDeterministic(text: string): { extraction: ResumeExtraction; warnings: string[] } {
  const warnings: string[] = [];
  const sections = splitSections(text);

  const education = extractEducation(sections.education, text);
  const skills = extractSkills(sections, text);
  const projects = extractProjects(sections.projects);
  const experience = extractExperience(sections.experience);
  const certifications = extractCertifications(sections.certifications);
  const technologies = skills.map(s => s.name);

  if (text.length < 200) {
    warnings.push('Very little text was extracted from the PDF. Results may be incomplete.');
  }
  if (skills.length === 0) {
    warnings.push('No known skills were detected. You can add skills manually after reviewing.');
  }

  return {
    extraction: {
      fullName: extractFullName(text),
      degree: education.degree,
      branch: education.branch,
      institution: education.institution,
      graduationYear: education.graduationYear,
      skills,
      projects,
      experience,
      certifications,
      technologies
    },
    warnings
  };
}
