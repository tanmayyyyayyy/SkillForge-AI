#!/bin/bash
# SkillForge AI 2.0 — Autonomous Live Product Demo Driver
# Synchronizes Google Chrome window navigation with macOS natural voice narration.

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUDIO_DIR="$BASE_DIR/docs/audio"

echo "=========================================================="
echo "🎬 STARTING AUTONOMOUS SKILLFORGE AI PRODUCT DEMONSTRATION"
echo "=========================================================="

# 1. Bring Google Chrome to the front and open landing page
osascript -e 'tell application "Google Chrome" to activate'
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/"'
sleep 2

# Scene 1: Introduction & Landing Page
echo "▶ Scene 1: Introduction & Landing Page..."
afplay "$AUDIO_DIR/01_intro.m4a"
sleep 1.5

# Scene 2: Mission Control & Career Readiness
echo "▶ Scene 2: Mission Control & Career Readiness Dashboard..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/dashboard"'
sleep 2
afplay "$AUDIO_DIR/02_dashboard.m4a"
sleep 1.5

# Scene 3: Opportunity Match & Skill Gap Detection
echo "▶ Scene 3: Opportunity Match & Job Description Analysis..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/opportunity-match"'
sleep 2
afplay "$AUDIO_DIR/03_opportunity_match.m4a"
sleep 1.5

# Scene 4: Career Autopilot & Human-in-the-Loop Approval
echo "▶ Scene 4: Career Autopilot & Governance Board..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/autopilot"'
sleep 2
afplay "$AUDIO_DIR/04_autopilot_approval.m4a"
sleep 1.5

# Scene 5: Skill Proof Lab & Practical Challenge Evaluation
echo "▶ Scene 5: Skill Proof Lab Practical Challenge..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/proof-of-skill"'
sleep 2
afplay "$AUDIO_DIR/05_skill_proof.m4a"
sleep 1.5

# Scene 6: Evidence Graph & Recommendation Provenance
echo "▶ Scene 6: Interactive Evidence Graph & Provenance..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/evidence-graph"'
sleep 2
afplay "$AUDIO_DIR/06_evidence_graph.m4a"
sleep 1.5

# Scene 7: Career Twin What-If Simulation
echo "▶ Scene 7: Career Twin What-If Lab..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/career-twin"'
sleep 2
afplay "$AUDIO_DIR/07_career_twin.m4a"
sleep 1.5

# Scene 8: Professional Hackathon Closing
echo "▶ Scene 8: Final Closing & Summary..."
osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "http://localhost:3000/mission-control"'
sleep 2
afplay "$AUDIO_DIR/08_conclusion.m4a"
sleep 1

echo "=========================================================="
echo "✅ AUTONOMOUS DEMONSTRATION COMPLETE!"
echo "=========================================================="
