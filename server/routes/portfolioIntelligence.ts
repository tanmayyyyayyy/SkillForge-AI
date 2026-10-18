import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getPortfolioIntelligence,
  inspectPublicRepository,
  generateEvidenceBackedBullets
} from '../services/portfolioIntelligenceService.js';
import { readTrimmedString } from '../utils/request.js';

export const portfolioIntelligenceRouter = Router();

// GET portfolio intelligence summary
portfolioIntelligenceRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const portfolio = await getPortfolioIntelligence(req.userId!);
    if (!portfolio) {
      res.status(404).json({ error: 'Student profile not found to build portfolio.' });
      return;
    }
    res.json({ portfolio });
  } catch (err) {
    console.error('Failed to load portfolio intelligence:', err);
    res.status(500).json({ error: 'Failed to retrieve portfolio intelligence.' });
  }
});

// POST analyze public repository
portfolioIntelligenceRouter.post('/analyze-repo', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const repoUrl = readTrimmedString(req.body?.repoUrl);
    if (!repoUrl) {
      res.status(400).json({ error: 'Repository URL is required.' });
      return;
    }

    const analysis = await inspectPublicRepository(repoUrl);
    res.json({ analysis });
  } catch (err) {
    console.error('Failed to inspect repository:', err);
    res.status(500).json({ error: 'Failed to inspect repository metadata.' });
  }
});

// POST generate resume bullets strictly from verified facts
portfolioIntelligenceRouter.post('/generate-bullets', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { title, technologies, milestones, assessments } = req.body || {};
    if (!title || !Array.isArray(technologies)) {
      res.status(400).json({ error: 'Project title and technologies array are required.' });
      return;
    }

    const bullets = generateEvidenceBackedBullets(
      title,
      technologies,
      Array.isArray(milestones) ? milestones : [],
      Array.isArray(assessments) ? assessments : []
    );

    res.json({ bullets });
  } catch (err) {
    console.error('Failed to generate evidence-backed bullets:', err);
    res.status(500).json({ error: 'Failed to generate bullets.' });
  }
});
