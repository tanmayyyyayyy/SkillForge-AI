import React from 'react';
import { Link } from 'react-router-dom';
import { SkillGapAnalysisResult } from '../../types/index.js';
import { RankedSkillCard } from './RankedSkillCard.js';

interface SkillGapSectionProps {
  analysis: SkillGapAnalysisResult | null;
}

export const SkillGapSection: React.FC<SkillGapSectionProps> = ({ analysis }) => {
  // Sort items by priorityScore descending, filtering for items where currentLevel < requiredLevel
  const gapItems = (analysis?.items || [])
    .filter(i => i.currentLevel < i.requiredLevel)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const topThree = gapItems.slice(0, 3);

  // Helper to determine status and unlock label
  const getCardDetails = (item: any, index: number) => {
    let statusLabel: 'DO NOW' | 'NEXT' | 'LOCKED' = 'DO NOW';
    let unlockText = 'High leverage skill';

    if (index === 0) {
      statusLabel = 'DO NOW';
      unlockText = item.missingPrerequisites?.length
        ? `Resolves key prereq`
        : `Unlocks 3 skills`;
    } else if (index === 1) {
      statusLabel = 'NEXT';
      unlockText = 'Core requirement';
    } else {
      const hasMissingPrereqs = item.missingPrerequisites && item.missingPrerequisites.length > 0;
      statusLabel = hasMissingPrereqs ? 'LOCKED' : 'NEXT';
      unlockText = hasMissingPrereqs
        ? `Opens after ${item.missingPrerequisites[0]}`
        : 'Recommended sequence';
    }

    return { statusLabel, unlockText };
  };

  return (
    <section className="editorial-section" aria-labelledby="skill-gaps-heading">
      <div className="editorial-section-header">
        <h2 id="skill-gaps-heading" className="editorial-section-heading">
          Your gaps, ranked by impact
        </h2>
        <Link
          to="/analysis"
          className="editorial-section-aside"
          style={{ textDecoration: 'none', color: 'var(--color-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span>VIEW ALL {gapItems.length} GAPS →</span>
        </Link>
      </div>

      <div className="editorial-skills-row">
        {topThree.length > 0 ? (
          topThree.map((item, idx) => {
            const { statusLabel, unlockText } = getCardDetails(item, idx);
            return (
              <RankedSkillCard
                key={item.skillId}
                item={item}
                rank={idx}
                statusLabel={statusLabel}
                unlockText={unlockText}
              />
            );
          })
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              background: 'var(--color-paper)',
              padding: '2.5rem',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              textAlign: 'center'
            }}
          >
            <p style={{ color: 'var(--color-muted)', fontSize: '1rem', margin: 0 }}>
              All core skills assessed for this role are currently on track!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
