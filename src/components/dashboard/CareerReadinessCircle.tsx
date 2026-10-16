import React from 'react';
import { Link } from 'react-router-dom';
import { CareerReadinessScore } from '../../types/index.js';

interface CareerReadinessCircleProps {
  readiness: CareerReadinessScore | null;
}

export const CareerReadinessCircle: React.FC<CareerReadinessCircleProps> = ({ readiness }) => {
  const currentScore = readiness?.overallScore ?? 62;
  const delta = readiness?.delta ?? 9;
  const nextGain = readiness?.improvementSuggestions?.[0]?.potentialGain ?? 9;
  const projectedScore = Math.min(100, currentScore + nextGain);

  const deltaText = delta > 0 ? `+${delta} in 3 weeks` : `${delta} change`;
  const subtitle = `${deltaText} · ${projectedScore} after your next piece`;

  return (
    <Link to="/report" style={{ textDecoration: 'none', color: 'inherit' }} title="View Career Readiness Breakdown">
      <div className="editorial-metric-circle editorial-circle-right">
        <span className="editorial-circle-label">CAREER READINESS</span>
        <span className="editorial-circle-number">{currentScore}</span>
        <p className="editorial-circle-desc">
          {subtitle}
        </p>

        {/* Small subtle breakdown progress line */}
        <div style={{ width: '80px', height: '3px', background: '#D9CCBA', borderRadius: '9999px', marginTop: '0.85rem', overflow: 'hidden' }}>
          <div
            style={{
              width: `${currentScore}%`,
              height: '100%',
              background: '#D38A19',
              borderRadius: '9999px'
            }}
          />
        </div>
      </div>
    </Link>
  );
};
