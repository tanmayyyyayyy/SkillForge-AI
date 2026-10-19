import type {
  EvidenceClassification,
  ExplainabilityReference,
  RecommendationExplanation
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — Trust & Explainability Layer.
 *
 * One shared builder for the explanation attached to every significant
 * recommendation (Career Autopilot, Live Readiness Experiment, Evidence Graph
 * 2.0, Opportunity Radar). Centralising it guarantees the seven required
 * questions are always answered and that evidence is never overstated: a
 * self-reported claim can never be reported as `test-verified`.
 */

export interface ExplanationInput {
  what: string;
  why: string;
  supportingData?: string[];
  supportingReferences?: ExplainabilityReference[];
  assumptions?: string[];
  uncertainties?: string[];
  ifAccepted: string;
  reversible: boolean;
  /** Strongest evidence actually behind the claim. Defaults to self-reported. */
  evidenceClassification?: EvidenceClassification;
}

export function buildExplanation(input: ExplanationInput): RecommendationExplanation {
  return {
    what: input.what,
    why: input.why,
    supportingData: input.supportingData ?? [],
    supportingReferences: input.supportingReferences ?? [],
    assumptions: input.assumptions ?? [],
    uncertainties: input.uncertainties ?? [],
    ifAccepted: input.ifAccepted,
    reversible: input.reversible,
    evidenceClassification: input.evidenceClassification ?? 'self-reported'
  };
}

/**
 * Describes, in user-facing language, how strong a piece of evidence is. Used
 * to keep the UI honest about the limits of each evidence source.
 */
export function describeEvidenceClassification(classification: EvidenceClassification): string {
  switch (classification) {
    case 'test-verified':
      return 'Verified by automated tests against fixed criteria.';
    case 'human-reviewed':
      return 'Reviewed and confirmed by a human reviewer.';
    case 'rule-checked':
      return 'Checked by deterministic rules; rubric limits apply.';
    case 'ai-reviewed':
      return 'Evaluated by an AI rubric; not an objective human review.';
    default:
      return 'Self-reported by the student; not independently verified.';
  }
}

/**
 * Maps an underlying system-of-record to the honest evidence classification it
 * can support. This is the single place that decision is made, so no caller can
 * accidentally upgrade self-reported data to a verified label.
 */
export function classificationForSource(source: string): EvidenceClassification {
  const s = source.toLowerCase();
  if (s.includes('proof of skill') || s.includes('test')) return 'test-verified';
  if (s.includes('interview')) return 'ai-reviewed';
  if (s.includes('assessment') || s.includes('objective') || s.includes('rule')) return 'rule-checked';
  return 'self-reported';
}

/** Convenience: a reference to a stored record the user can open. */
export function reference(label: string, source: string, url?: string): ExplainabilityReference {
  return { label, source, url };
}
