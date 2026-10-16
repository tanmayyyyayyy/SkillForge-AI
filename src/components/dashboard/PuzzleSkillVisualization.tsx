import React from 'react';
import { Link } from 'react-router-dom';

interface PuzzleSkillVisualizationProps {
  featuredSkillName: string;
  category?: string;
}

export const PuzzleSkillVisualization: React.FC<PuzzleSkillVisualizationProps> = ({
  featuredSkillName,
  category
}) => {
  return (
    <div className="editorial-puzzle-center">
      <Link
        to="/roadmap"
        style={{ textDecoration: 'none', color: 'inherit' }}
        title={`Focus on earning: ${featuredSkillName}`}
      >
        <div className="editorial-puzzle-stage">
          <svg width="220" height="130" viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="puzzleGold" x1="120" y1="20" x2="190" y2="90" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F5A623" />
                <stop offset="1" stopColor="#D38A19" />
              </linearGradient>
              <filter id="pieceShadow" x="110" y="20" width="80" height="80" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#302319" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Radiant decorative rays above the golden piece */}
            <g opacity="0.85">
              <line x1="148" y1="12" x2="148" y2="4" stroke="#D38A19" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="135" y1="16" x2="130" y2="9" stroke="#D38A19" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="161" y1="16" x2="166" y2="9" stroke="#D38A19" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="124" y1="23" x2="117" y2="20" stroke="#D38A19" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="172" y1="23" x2="179" y2="20" stroke="#D38A19" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Dynamic dotted connecting arc from empty slot to golden piece */}
            <path
              d="M75 55 C90 28, 120 28, 132 45"
              stroke="#D38A19"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              fill="none"
              opacity="0.7"
            />
            {/* Arrowhead */}
            <polygon points="135,46 130,41 127,47" fill="#D38A19" opacity="0.8" />

            {/* Left: Outlined Empty Puzzle Shape (The slot waiting to be filled) */}
            <g transform="translate(25, 30)">
              <rect
                x="0"
                y="0"
                width="50"
                height="50"
                rx="6"
                fill="none"
                stroke="#C0AF9A"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Inner subtle indented circle indicating socket */}
              <circle cx="25" cy="0" r="7" fill="#D5C9B9" stroke="#C0AF9A" strokeWidth="1.2" strokeDasharray="3 2" />
              <circle cx="50" cy="25" r="7" fill="#D5C9B9" stroke="#C0AF9A" strokeWidth="1.2" strokeDasharray="3 2" />
              <text x="25" y="30" textAnchor="middle" fill="#8F7E6D" fontSize="11" fontFamily="var(--font-sans)" fontWeight="500">
                Slot
              </text>
            </g>

            {/* Right: Filled Golden Puzzle Piece (The piece to earn) */}
            <g transform="translate(122, 28)" filter="url(#pieceShadow)">
              {/* Custom Classic Puzzle Piece Path */}
              <path
                d="M10 10 
                   H22 C22 6.5 24 5 26 5 C28 5 30 6.5 30 10 
                   H42 C44.2 10 46 11.8 46 14 
                   V24 C49.5 24 51 26 51 28 C51 30 49.5 32 46 32 
                   V42 C46 44.2 44.2 46 42 46 
                   H30 C30 43 28 41 26 41 C24 41 22 43 22 46 
                   H10 C7.8 46 6 44.2 6 42 
                   V32 C9 32 11 30 11 28 C11 26 9 24 6 24 
                   V14 C6 11.8 7.8 10 10 10 Z"
                fill="url(#puzzleGold)"
                stroke="#B87612"
                strokeWidth="1"
              />
              {/* Subtle inner highlight */}
              <path
                d="M12 12 H20 M8 16 V22"
                stroke="#FFE5B4"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.8"
              />
            </g>
          </svg>
        </div>

        <div className="editorial-puzzle-label">NEXT PIECE TO EARN</div>
        <h2 className="editorial-puzzle-skill-name">
          {featuredSkillName || 'Core Foundations'}
        </h2>
      </Link>
    </div>
  );
};
