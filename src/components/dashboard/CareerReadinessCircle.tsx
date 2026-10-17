import React from 'react';
import { Link } from 'react-router-dom';
import { CareerReadinessScore } from '../../types/index.js';

interface CareerReadinessCircleProps {
  readiness: CareerReadinessScore | null;
}

export const CareerReadinessCircle: React.FC<CareerReadinessCircleProps> = ({ readiness }) => {
  const hasData = readiness != null;
  const currentScore = readiness?.overallScore;
  const delta = readiness?.delta;

  // Honest change label: no invented forecast horizon, no predicted future score.
  const deltaText = delta == null
    ? 'No readiness data yet'
    : delta > 0
      ? `+${delta} since your last update`
      : delta < 0
        ? `${delta} since your last update`
        : 'No change since your last update';
  const subtitle = !hasData
    ? 'Complete an assessment to see your score'
    : deltaText;

  return (
    <Link to="/report" style={{ textDecoration: 'none', color: 'inherit' }} title="View Career Readiness Breakdown">
      <div className="editorial-metric-circle editorial-circle-right">
        <span className="editorial-circle-label">CAREER READINESS</span>
        <span className="editorial-circle-number">{currentScore ?? '—'}</span>
        <p className="editorial-circle-desc">
          {subtitle}
        </p>

        {/* Small subtle breakdown progress line */}
        <div style={{ width: '80px', height: '3px', background: '#D9CCBA', borderRadius: '9999px', marginTop: '0.85rem', overflow: 'hidden' }}>
          <div
            style={{
              width: `${currentScore ?? 0}%`,
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
