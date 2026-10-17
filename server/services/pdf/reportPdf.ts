import {
  PdfDocument,
  PdfFontKey,
  Rgb,
  INK,
  HEADING,
  ACCENT,
  MUTED,
  SUCCESS,
  DANGER,
  SURFACE,
  BORDER,
  WHITE
} from './pdfWriter.js';
import { ReadinessReportPayload, ProficiencyLevel, PROFICIENCY_SCALE } from '../../../src/types/index.js';

/**
 * Subphase 2G: lays the canonical readiness report payload out as a printed,
 * grayscale-safe PDF. This module performs presentation only — every value it
 * prints comes straight from the server-built `ReadinessReportPayload`.
 */

const MARGIN = 54;
const BOTTOM_RESERVE = 58;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function levelTitle(level: ProficiencyLevel): string {
  return PROFICIENCY_SCALE[level]?.title ?? `Level ${level}`;
}

function badgeColor(badge: string): Rgb {
  switch (badge) {
    case 'Critical':
      return DANGER;
    case 'High':
      return ACCENT;
    case 'Low':
    case 'Mastered':
      return SUCCESS;
    default:
      return MUTED;
  }
}

class Layout {
  readonly doc = new PdfDocument({ footerLeft: 'SkillForge AI  |  Career Readiness Report' });
  y = MARGIN;

  get left(): number {
    return MARGIN;
  }

  get right(): number {
    return MARGIN + CONTENT_WIDTH;
  }

  ensure(height: number): void {
    if (this.y + height > PAGE_HEIGHT - BOTTOM_RESERVE) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  gap(height: number): void {
    this.y += height;
  }

  paragraph(text: string, options: { font?: PdfFontKey; size?: number; color?: Rgb; x?: number; width?: number; align?: 'left' | 'right' | 'center'; lineHeight?: number } = {}): void {
    const font = options.font ?? 'regular';
    const size = options.size ?? 10.5;
    const color = options.color ?? INK;
    const x = options.x ?? MARGIN;
    const width = options.width ?? CONTENT_WIDTH;
    const lineHeight = options.lineHeight ?? 1.4;
    const lines = this.doc.wrapText(text, font, size, width);
    const step = size * lineHeight;
    for (const line of lines) {
      this.ensure(step);
      this.doc.drawText(line, x, this.y, { font, size, color, maxWidth: width, align: options.align ?? 'left' });
      this.y += step;
    }
  }

  bullet(text: string, options: { color?: Rgb; size?: number; indent?: number } = {}): void {
    const indent = options.indent ?? 14;
    const size = options.size ?? 10.5;
    const lines = this.doc.wrapText(text, 'regular', size, CONTENT_WIDTH - indent);
    const step = size * 1.4;
    lines.forEach((line, index) => {
      this.ensure(step);
      if (index === 0) this.doc.drawText('-', MARGIN + 2, this.y, { size, color: options.color ?? ACCENT, font: 'bold' });
      this.doc.drawText(line, MARGIN + indent, this.y, { size, color: INK });
      this.y += step;
    });
  }

  sectionTitle(index: number, title: string): void {
    this.ensure(40);
    this.y += 6;
    this.doc.drawRect(MARGIN, this.y - 9, 14, 14, { fill: ACCENT });
    this.doc.drawText(`${index}. ${title}`, MARGIN + 22, this.y, { font: 'bold', size: 13.5, color: HEADING });
    this.y += 16;
    this.doc.drawLine(MARGIN, this.y, this.right, this.y, { color: BORDER, lineWidth: 0.75 });
    this.y += 12;
  }

  subheading(text: string, color: Rgb = HEADING): void {
    this.ensure(20);
    this.doc.drawText(text, MARGIN, this.y, { font: 'bold', size: 10.5, color });
    this.y += 15;
  }
}

export function generateReadinessReportPdf(report: ReadinessReportPayload): Buffer {
  const l = new Layout();
  const { doc } = l;

  // ---- Report header -------------------------------------------------------
  doc.drawRect(MARGIN, l.y - 4, 22, 22, { fill: ACCENT });
  doc.drawText('SF', MARGIN + 4.5, l.y + 12, { font: 'bold', size: 11, color: WHITE });
  doc.drawText('SkillForge AI', MARGIN + 32, l.y + 11, { font: 'bold', size: 17, color: HEADING });
  const generated = new Date(report.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime())
    ? report.generatedAt
    : generated.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const refName = (report.student.fullName || 'Candidate').replace(/\s+/g, '').toUpperCase();
  doc.drawText(
    `Generated: ${generatedLabel}   |   Document ref: SF-AI-${refName}-${generated.getFullYear() || ''}`,
    MARGIN,
    l.y + 11,
    { size: 9, color: MUTED, align: 'right', maxWidth: CONTENT_WIDTH }
  );
  l.y += 30;
  doc.drawLine(MARGIN, l.y, l.right, l.y, { color: HEADING, lineWidth: 1.5 });
  l.y += 24;

  doc.drawText('Career Readiness Report', MARGIN, l.y, { font: 'bold', size: 24, color: HEADING });
  l.y += 26;
  l.paragraph(
    'A point-in-time assessment of demonstrated readiness for the target role, compiled from the '
    + 'SkillForge AI readiness, skill-gap, and learning-roadmap engines.',
    { size: 10, color: MUTED }
  );
  l.gap(8);

  // ---- Candidate & target role --------------------------------------------
  const boxTop = l.y;
  const colWidth = (CONTENT_WIDTH - 24) / 2;
  const leftLines = l.doc.wrapText(
    `${report.student.fullName || 'Candidate'} - ${report.student.degree || 'Degree not provided'} `
    + `(${report.student.educationLevel || 'n/a'})`,
    'regular',
    10.5,
    colWidth
  ).length;
  const rightLines = l.doc.wrapText(
    `${report.targetCareer.title} - ${report.targetCareer.category}`,
    'regular',
    10.5,
    colWidth
  ).length;
  const boxHeight = 64 + Math.max(leftLines, rightLines) * 15;
  l.ensure(boxHeight + 6);
  doc.drawRect(MARGIN, l.y, CONTENT_WIDTH, boxHeight, { fill: SURFACE, stroke: BORDER, lineWidth: 0.75 });
  const innerX = MARGIN + 16;
  const innerRightX = MARGIN + CONTENT_WIDTH / 2 + 8;
  let boxY = l.y + 22;
  doc.drawText('CANDIDATE', innerX, boxY, { font: 'bold', size: 8, color: MUTED });
  doc.drawText('TARGET ROLE', innerRightX, boxY, { font: 'bold', size: 8, color: MUTED });
  boxY += 16;
  let leftY = boxY;
  leftY = doc.drawParagraph(
    `${report.student.fullName || 'Candidate'} - ${report.student.degree || 'Degree not provided'}`,
    innerX,
    leftY,
    { font: 'bold', size: 11, color: HEADING, maxWidth: colWidth, lineHeight: 1.35 }
  );
  leftY = doc.drawParagraph(
    `${report.student.educationLevel || 'n/a'} - Class of ${report.student.graduationYear || 'n/a'} - ${report.student.weeklyHours}h/week available`,
    innerX,
    leftY,
    { size: 9, color: MUTED, maxWidth: colWidth, lineHeight: 1.35 }
  );
  let rightY = boxY;
  rightY = doc.drawParagraph(report.targetCareer.title, innerRightX, rightY, {
    font: 'bold',
    size: 11,
    color: ACCENT,
    maxWidth: colWidth,
    lineHeight: 1.35
  });
  rightY = doc.drawParagraph(
    `${report.targetCareer.category} - Demand: ${report.targetCareer.marketDemand} - Benchmark: ${report.targetCareer.salaryRange || 'n/a'}`,
    innerRightX,
    rightY,
    { size: 9, color: MUTED, maxWidth: colWidth, lineHeight: 1.35 }
  );
  l.y = boxTop + boxHeight + 8;

  // ---- Executive summary ---------------------------------------------------
  l.sectionTitle(1, 'Executive Summary');
  l.ensure(60);
  const score = report.readiness.overallScore;
  doc.drawText(`${score}`, MARGIN, l.y + 22, { font: 'bold', size: 40, color: HEADING });
  const scoreWidth = doc.textWidth(`${score}`, 'bold', 40);
  doc.drawText('/ 100', MARGIN + scoreWidth + 8, l.y + 16, { font: 'bold', size: 13, color: MUTED });
  const deltaText =
    report.readiness.delta > 0
      ? `+${report.readiness.delta} since your last recorded update`
      : report.readiness.delta < 0
        ? `${report.readiness.delta} since your last recorded update`
        : 'No change since your last recorded update';
  doc.drawText(deltaText, MARGIN, l.y + 16, { size: 9.5, color: report.readiness.delta >= 0 ? SUCCESS : DANGER, align: 'right', maxWidth: CONTENT_WIDTH });
  doc.drawText('Demonstrated Career Readiness', MARGIN, l.y + 46, { size: 9.5, color: MUTED });
  l.y += 58;

  l.paragraph(explainScore(report), { size: 10.5 });
  l.gap(6);

  l.subheading('Main strengths', SUCCESS);
  if (report.readiness.positiveFactors.length > 0) {
    report.readiness.positiveFactors.forEach(factor => l.bullet(factor, { color: SUCCESS }));
  } else {
    l.paragraph('No standout strengths recorded yet. Passing an assessment or completing project evidence will surface strengths here.', { size: 10, color: MUTED });
  }
  l.gap(6);

  l.subheading('Most important skill gaps', DANGER);
  if (report.gapSummary.topGaps.length > 0) {
    report.gapSummary.topGaps.forEach(gap => l.bullet(`${gap.name} (needs ${levelTitle(gap.requiredLevel)}, currently ${levelTitle(gap.currentLevel)}) - ${gap.priorityBadge} priority`, { color: DANGER }));
  } else {
    l.paragraph('No unmet priority skill gaps were found for this target role.', { size: 10, color: MUTED });
  }
  l.gap(6);

  l.subheading('Recommended next action');
  l.paragraph(recommendedNextAction(report), { size: 10.5, color: HEADING });
  l.gap(6);

  // ---- Readiness breakdown -------------------------------------------------
  l.sectionTitle(2, 'Readiness Breakdown & Methodology');
  drawBreakdownTable(l, report);
  l.gap(8);
  l.subheading('Formula and scoring');
  l.paragraph(
    'Readiness = (Core Skill Coverage x 50) + (Passed Assessments x 25) + (Project Evidence x 25), rounded to the '
    + 'nearest whole point and clamped to 0-100. Core skill coverage is the role-importance-weighted fraction of each '
    + 'required skill demonstrated (capped at the required level). Each passed server-graded assessment contributes '
    + 'toward the assessment component, and completed practical projects with submitted evidence contribute toward the '
    + 'project component.',
    { size: 10 }
  );
  l.gap(4);
  l.subheading('How missing evidence is handled');
  l.paragraph(
    'Skills with no assessment or project evidence are credited only at the proficiency you self-reported and are '
    + 'labelled self-reported or unverified in this report. Missing evidence lowers the score rather than being assumed, '
    + 'and self-reported skills are never presented as independently verified.',
    { size: 10 }
  );
  l.gap(6);

  // ---- Skill profile -------------------------------------------------------
  l.sectionTitle(3, 'Skill Profile by Evidence Source');
  l.paragraph(
    `Tracked skills: ${report.evidenceBreakdown.assessed} assessed, ${report.evidenceBreakdown.projectVerified} `
    + `project-backed, ${report.evidenceBreakdown.selfReported} self-reported, ${report.evidenceBreakdown.unverified} unverified.`,
    { size: 10 }
  );
  l.gap(4);
  drawSkillGroup(l, 'Assessed (server-graded)', report.skillProfile.assessed, SUCCESS);
  drawSkillGroup(l, 'Project-backed (verified project)', report.skillProfile.projectBacked, ACCENT);
  drawSkillGroup(l, 'Self-reported (not independently verified)', report.skillProfile.selfReported, MUTED);
  drawSkillGroup(l, 'Unverified', report.skillProfile.unverified, MUTED);

  l.subheading('Portfolio projects & submitted evidence');
  if (report.portfolioProjects.length === 0) {
    l.paragraph('No portfolio projects with a submitted evidence link are recorded.', { size: 9.5, color: MUTED, x: MARGIN + 6 });
  } else {
    report.portfolioProjects.forEach(project => {
      const label = project.hasEvidence
        ? 'evidence submitted (self-reported, not independently reviewed)'
        : 'in progress (no evidence submitted)';
      l.bullet(`${project.title} - ${label}`, { color: project.hasEvidence ? ACCENT : MUTED });
    });
  }
  l.gap(6);

  // ---- Prioritized skill gaps ---------------------------------------------
  l.sectionTitle(4, 'Prioritized Skill Gaps');
  const gapsToShow = report.allGaps.slice(0, 10);
  if (gapsToShow.length === 0) {
    l.paragraph('No unmet skill gaps were found for this target role. All required skills are at or above the required level.', { size: 10, color: MUTED });
  } else {
    gapsToShow.forEach((gap, index) => {
      drawGap(l, gap, index + 1);
    });
    if (report.allGaps.length > gapsToShow.length) {
      l.paragraph(`+ ${report.allGaps.length - gapsToShow.length} additional lower-priority gaps not shown.`, { size: 9.5, color: MUTED });
    }
  }
  l.gap(6);

  // ---- Learning roadmap ----------------------------------------------------
  l.sectionTitle(5, 'Learning Roadmap');
  const rm = report.roadmapProgress;
  l.paragraph(
    `Progress: ${rm.completedTasks} of ${rm.totalTasks} tasks completed (${rm.progressPercentage}%). `
    + (rm.totalHours > 0 ? `Estimated hours: ~${rm.completedHours} of ${rm.totalHours} hrs logged.` : 'No estimated hours are recorded for this roadmap.'),
    { size: 10 }
  );
  l.gap(4);
  if (rm.stages.length === 0) {
    l.paragraph('No roadmap stages are available for this target role.', { size: 10, color: MUTED });
  } else {
    rm.stages.forEach(stage => {
      const completed = stage.tasks.filter(t => t.status === 'completed').length;
      l.ensure(30);
      doc.drawRect(MARGIN, l.y - 9, 4, 12, { fill: ACCENT });
      doc.drawText(`Stage ${stage.stageNumber}: ${stage.stageName}`, MARGIN + 12, l.y, { font: 'bold', size: 11, color: HEADING });
      doc.drawText(`${completed}/${stage.tasks.length}`, MARGIN, l.y, { size: 9, color: MUTED, align: 'right', maxWidth: CONTENT_WIDTH });
      l.y += 15;
      if (stage.description) {
        l.paragraph(stage.description, { size: 9.5, color: MUTED, x: MARGIN + 12, width: CONTENT_WIDTH - 12 });
      }
      stage.tasks.forEach(task => {
        const mark = task.status === 'completed' ? '[x]' : task.status === 'in_progress' ? '[~]' : '[ ]';
        const hours = task.estimatedHours > 0 ? ` (${task.estimatedHours}h)` : '';
        l.ensure(28);
        doc.drawText(mark, MARGIN + 14, l.y, { font: 'bold', size: 9.5, color: task.status === 'completed' ? SUCCESS : MUTED });
        const criteria = task.completionCriteria?.[0];
        const line = `${task.skillName}${hours}`;
        const lines = doc.wrapText(line, 'regular', 10, CONTENT_WIDTH - 60);
        lines.forEach((ln, i) => {
          if (i > 0) l.ensure(13);
          doc.drawText(ln, MARGIN + 34, l.y, { size: 10, color: INK });
          l.y += 13;
        });
        if (criteria && task.status !== 'completed') {
          l.paragraph(`Completion criterion: ${criteria}`, { size: 8.5, color: MUTED, x: MARGIN + 34, width: CONTENT_WIDTH - 40, lineHeight: 1.3 });
        }
      });
      l.gap(6);
    });
  }
  l.gap(4);

  // ---- Next seven days -----------------------------------------------------
  l.sectionTitle(6, 'Next Seven Days');
  const plan = report.nextSevenDays;
  l.paragraph(
    `Based on your stated availability of ${plan.availableHours} hour(s) per week and the priorities above.`,
    { size: 10, color: MUTED }
  );
  l.gap(4);
  if (plan.focusItems.length === 0) {
    l.paragraph(plan.note, { size: 10.5, color: HEADING });
  } else {
    plan.focusItems.forEach(item => {
      l.ensure(30);
      doc.drawText(`${item.hours}h`, MARGIN, l.y, { font: 'bold', size: 11, color: ACCENT });
      const lines = doc.wrapText(item.title, 'bold', 10.5, CONTENT_WIDTH - 40);
      let titleY = l.y;
      lines.forEach(line => {
        doc.drawText(line, MARGIN + 40, titleY, { font: 'bold', size: 10.5, color: HEADING });
        titleY += 14;
      });
      l.y = titleY;
      l.paragraph(item.detail, { size: 9.5, color: MUTED, x: MARGIN + 40, width: CONTENT_WIDTH - 40, lineHeight: 1.35 });
      l.gap(4);
    });
    l.paragraph(plan.note, { size: 9.5, color: MUTED });
  }
  l.gap(6);

  // ---- Limitations ---------------------------------------------------------
  l.sectionTitle(7, 'Limitations');
  l.paragraph(
    'What this score measures: the readiness score summarises how well your demonstrated (assessed and project-backed) '
    + 'and self-reported skills currently align with the required skills of the target role. It reflects the evidence '
    + 'SkillForge AI can see in your profile.',
    { size: 10 }
  );
  l.gap(4);
  l.paragraph(
    'What this score does not measure: it does not measure hiring probability, interview performance, communication, '
    + 'teamwork, or market conditions, and it is not a prediction of employment outcomes. Role requirements and market '
    + 'demand are indicative.',
    { size: 10 }
  );
  l.gap(4);
  l.paragraph(
    'Evidence and verification: project evidence (repository and demo links) is self-reported by the student and is not '
    + 'independently reviewed by SkillForge AI. Assessment results are graded by the SkillForge AI server against fixed '
    + 'answer keys and are not externally proctored or certified.',
    { size: 10 }
  );
  l.gap(4);
  l.paragraph(`What your report does not include - ${missingDataNotes(report)}`, { size: 10, color: MUTED });
  l.gap(8);

  l.paragraph(
    report.readiness.disclaimer ||
      'This report is an educational self-assessment generated by SkillForge AI. It is not an official certification or a guarantee of employment.',
    { size: 8.5, color: MUTED, lineHeight: 1.4 }
  );

  return doc.toBuffer();
}

function explainScore(report: ReadinessReportPayload): string {
  const score = report.readiness.overallScore;
  const b = report.readiness.breakdown;
  const base = `Your demonstrated career readiness for ${report.targetCareer.title} is ${score} out of 100. `
    + `Of this, ${b.skillCoverageScore} of 50 points comes from weighted core skill coverage, `
    + `${b.assessmentBonus} of 25 points from passed server-graded assessments, and `
    + `${b.projectEvidenceBonus} of 25 points from practical project evidence.`;
  const remaining = report.gapSummary.criticalGaps;
  const gapSentence = remaining > 0
    ? ` You still have ${remaining} critical skill gap${remaining === 1 ? '' : 's'} to close.`
    : ' No critical skill gaps remain for this role.';
  return base + gapSentence;
}

function recommendedNextAction(report: ReadinessReportPayload): string {
  const suggestion = report.readiness.improvementSuggestions.find(s => s.action);
  if (suggestion) return suggestion.action;
  const topGap = report.gapSummary.topGaps[0];
  if (topGap) return topGap.nextRecommendedAction || `Focus on ${topGap.name}.`;
  return 'You have closed your priority gaps. Keep your portfolio and assessments current to maintain your readiness.';
}

function missingDataNotes(report: ReadinessReportPayload): string {
  const notes: string[] = [];
  if (report.verifiedAssessments.length === 0) notes.push('no passed assessments are recorded');
  if (report.portfolioProjects.length === 0) notes.push('no portfolio projects with evidence are recorded');
  if (report.roadmapProgress.totalHours <= 0) notes.push('no estimated roadmap hours are recorded');
  if (!report.student.weeklyHours || report.student.weeklyHours <= 0) notes.push('weekly study availability is not set');
  if (report.student.targetCompanies.length === 0) notes.push('no target companies are listed');
  if (notes.length === 0) return 'your report is based on a complete profile.';
  return `${notes.join('; ')}.`;
}

function drawBreakdownTable(l: Layout, report: ReadinessReportPayload): void {
  const b = report.readiness.breakdown;
  const rows: Array<[string, string, string]> = [
    ['Core skill coverage', `${b.skillCoverageScore} / 50`, 'Role-importance-weighted demonstrated proficiency'],
    ['Passed assessments', `${b.assessmentBonus} / 25`, 'Passed server-graded technical assessments'],
    ['Project evidence', `${b.projectEvidenceBonus} / 25`, 'Completed projects with submitted evidence'],
    ['Final readiness score', `${report.readiness.overallScore} / 100`, 'Rounded total (clamped 0-100)']
  ];
  const rowHeight = 22;
  l.ensure(rowHeight * rows.length + 6);
  const col1 = CONTENT_WIDTH * 0.36;
  const col2 = CONTENT_WIDTH * 0.16;
  rows.forEach((row, index) => {
    const isTotal = index === rows.length - 1;
    if (index % 2 === 1) {
      l.doc.drawRect(MARGIN, l.y - 4, CONTENT_WIDTH, rowHeight, { fill: SURFACE });
    }
    if (isTotal) {
      l.doc.drawLine(MARGIN, l.y - 2, l.right, l.y - 2, { color: HEADING, lineWidth: 1 });
    }
    l.doc.drawText(row[0], MARGIN + 8, l.y + 11, { font: 'bold', size: 10, color: isTotal ? HEADING : INK });
    l.doc.drawText(row[1], MARGIN + col1 + 8, l.y + 11, { font: 'bold', size: 10, color: isTotal ? ACCENT : INK });
    l.doc.drawText(row[2], MARGIN + col1 + col2, l.y + 11, { size: 8.5, color: MUTED });
    l.y += rowHeight;
  });
  l.gap(4);
}

function drawSkillGroup(l: Layout, title: string, skills: string[], color: Rgb): void {
  l.ensure(24);
  l.subheading(`${title} (${skills.length})`, color);
  if (skills.length === 0) {
    l.paragraph('None recorded.', { size: 9.5, color: MUTED, x: MARGIN + 6 });
  } else {
    const text = skills.join(', ');
    l.paragraph(text, { size: 10, x: MARGIN + 6, width: CONTENT_WIDTH - 6 });
  }
  l.gap(2);
}

function drawGap(l: Layout, gap: ReadinessReportPayload['allGaps'][number], rank: number): void {
  l.ensure(70);
  l.doc.drawText(`${rank}. ${gap.name}`, MARGIN, l.y, { font: 'bold', size: 11, color: HEADING });
  const badge = gap.priorityBadge || 'Medium';
  const badgeWidth = l.doc.textWidth(badge, 'bold', 8) + 12;
  const badgeX = l.right - badgeWidth;
  l.doc.drawRect(badgeX, l.y - 9, badgeWidth, 13, { fill: badgeColor(badge) });
  l.doc.drawText(badge, badgeX + 6, l.y, { font: 'bold', size: 8, color: WHITE });
  l.y += 15;

  l.doc.drawText(
    `Current: ${levelTitle(gap.currentLevel)}   ->   Required: ${levelTitle(gap.requiredLevel)}   |   Category: ${gap.category || 'n/a'}`,
    MARGIN + 12,
    l.y,
    { size: 9.5, color: INK }
  );
  l.y += 13;

  const prereqs = gap.missingPrerequisites && gap.missingPrerequisites.length > 0
    ? gap.missingPrerequisites.join(', ')
    : 'None';
  const effort = gap.estimatedLearningHours > 0 ? `~${gap.estimatedLearningHours} hours` : 'not estimated';
  l.doc.drawText(`Prerequisites: ${prereqs}   |   Estimated effort: ${effort}`, MARGIN + 12, l.y, { size: 9.5, color: MUTED });
  l.y += 13;

  if (gap.reason) {
    l.paragraph(`Why this ranks here: ${gap.reason}`, { size: 9.5, color: MUTED, x: MARGIN + 12, width: CONTENT_WIDTH - 12, lineHeight: 1.35 });
  }
  if (gap.nextRecommendedAction) {
    l.paragraph(`Next action: ${gap.nextRecommendedAction}`, { size: 9.5, color: ACCENT, x: MARGIN + 12, width: CONTENT_WIDTH - 12, lineHeight: 1.35 });
  }
  l.gap(8);
}
