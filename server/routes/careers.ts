import { Router, Request, Response } from 'express';
import { CAREER_ROLES } from '../data/careers.js';

export const careersRouter = Router();

// Get list of all career paths
careersRouter.get('/', (_req: Request, res: Response): void => {
  const summaries = CAREER_ROLES.map(role => ({
    id: role.id,
    title: role.title,
    category: role.category,
    shortDescription: role.shortDescription,
    averageStartingSalary: role.averageStartingSalary,
    marketDemand: role.marketDemand,
    totalSkillsCount: role.requiredSkills.length,
    stagesCount: role.stages.length
  }));

  res.json({ careers: summaries });
});

// Get single career role details
careersRouter.get('/:id', (req: Request, res: Response): void => {
  const role = CAREER_ROLES.find(r => r.id === req.params.id);
  if (!role) {
    res.status(404).json({ error: `Career role '${req.params.id}' not found.` });
    return;
  }
  res.json({ career: role });
});
