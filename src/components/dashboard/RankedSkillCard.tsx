import React from 'react';
import { Link } from 'react-router-dom';
import { SkillGapItem } from '../../types/index.js';

interface RankedSkillCardProps {
  item: SkillGapItem;
  rank: number; // 0, 1, 2
  statusLabel: 'DO NOW' | 'NEXT' | 'LOCKED';
  unlockText: string;
}

export const RankedSkillCard: React.FC<RankedSkillCardProps> = ({
  item,
  rank,
  statusLabel,
  unlockText
}) => {
  const isGold = rank === 0;

  return (
    <Link
      to={`/roadmap?skill=${encodeURIComponent(item.skillId)}`}
      className={`editorial-skill-card-item ${isGold ? 'editorial-skill-card-gold' : 'editorial-skill-card-cream'}`}
      title={`View ${item.name} in Roadmap`}
    >
      <div>
        <div className="editorial-card-top">
          <div className="editorial-card-meta">
            <span className="editorial-card-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19.439 7.85c0-1.57.85-2.22 1.56-2.85.67-.6 1-1.39 1-2.5 0-1.93-1.57-3.5-3.5-3.5-1.11 0-1.9.33-2.5 1-.63.71-1.28 1.56-2.85 1.56s-2.22-.85-2.85-1.56C9.69.33 8.9 0 7.79 0 5.86 0 4.29 1.57 4.29 3.5c0 1.11.33 1.9 1 2.5.71.63 1.56 1.28 1.56 2.85s-.85 2.22-1.56 2.85c-.67.6-1 1.39-1 2.5 0 1.93 1.57 3.5 3.5 3.5 1.11 0 1.9-.33 2.5-1 .63-.71 1.28-1.56 2.85-1.56s2.22.85 2.85 1.56c.6.67 1.39 1 2.5 1 1.93 0 3.5-1.57 3.5-3.5 0-1.11-.33-1.9-1-2.5-.71-.63-1.56-1.28-1.56-2.85Z" />
              </svg>
            </span>
            <span className="editorial-card-tag">
              <span className="editorial-card-score">{item.priorityScore}</span> · {statusLabel}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 500 }}>
            Lvl {item.currentLevel}/{item.requiredLevel}
          </span>
        </div>

        <h3 className="editorial-card-title">{item.name}</h3>
        <p className="editorial-card-desc">{item.reason || `${item.category} core competency`}</p>
      </div>

      <div className="editorial-card-footer">
        <div className="editorial-card-effort">
          <span>{unlockText}</span>
          <span>{item.estimatedLearningHours} hrs</span>
        </div>

        <div className="editorial-card-progress-track">
          <div
            className="editorial-card-progress-fill"
            style={{ width: `${Math.min(100, Math.max(15, item.priorityScore))}%` }}
          />
        </div>
      </div>
    </Link>
  );
};
