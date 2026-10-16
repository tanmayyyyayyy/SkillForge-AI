import React from 'react';
import { Link } from 'react-router-dom';

interface SkillGapCircleProps {
  missingCount: number;
  totalGaps?: number;
}

export const SkillGapCircle: React.FC<SkillGapCircleProps> = ({ missingCount, totalGaps = 10 }) => {
  return (
    <Link to="/analysis" style={{ textDecoration: 'none', color: 'inherit' }} title="View Detailed Gap Analysis">
      <div className="editorial-metric-circle editorial-circle-left">
        <span className="editorial-circle-label">MISSING</span>
        <span className="editorial-circle-number">{missingCount}</span>
        <p className="editorial-circle-desc">
          skills between you and this role
        </p>

        {/* Subtle data indicator dots below */}
        <div className="editorial-circle-dots" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, idx) => (
            <span
              key={idx}
              className={`editorial-circle-dot ${idx < Math.min(missingCount, 6) ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </Link>
  );
};
