import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';

import { authRouter } from './routes/auth.js';
import { careersRouter } from './routes/careers.js';
import { profileRouter } from './routes/profile.js';
import { analysisRouter } from './routes/analysis.js';
import { roadmapRouter } from './routes/roadmap.js';
import { projectsRouter } from './routes/projects.js';
import { assessmentsRouter } from './routes/assessments.js';
import { readinessRouter } from './routes/readiness.js';
import { aiCoachRouter } from './routes/aiCoach.js';
import { activitiesRouter } from './routes/activities.js';
import { resumeRouter } from './routes/resume.js';
import { jobDescriptionRouter } from './routes/jd.js';
import { weeklyPlanRouter } from './routes/weeklyPlan.js';
import { careerTwinRouter } from './routes/careerTwin.js';
import { warRoomRouter } from './routes/warRoom.js';
import { evidenceGraphRouter } from './routes/evidenceGraph.js';
import { trajectoryRouter } from './routes/trajectory.js';
import { proofOfSkillRouter } from './routes/proofOfSkill.js';
import { skillRadarRouter } from './routes/skillRadar.js';
import { interviewArenaRouter } from './routes/interviewArena.js';
import { projectForgeRouter } from './routes/projectForge.js';
import { opportunityMatchRouter } from './routes/opportunityMatch.js';
import { portfolioIntelligenceRouter } from './routes/portfolioIntelligence.js';
import { missionControlRouter } from './routes/missionControl.js';
import { aiProviderRouter } from './routes/aiProvider.js';
import { autopilotRouter } from './routes/autopilot.js';
import { experimentRouter } from './routes/experiment.js';

/**
 * Builds the Express application without binding to a port.
 * Exported separately so integration tests can mount it on an ephemeral port.
 */
export function createApp(): express.Express {
  const app = express();

  // CORS configuration
  const rawOrigins = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin server requests)
      if (!origin) return callback(null, true);
      // In development or when no strict origins configured, allow all
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'SkillForge AI API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      aiProviderConfigured: !!process.env.GEMINI_API_KEY
    });
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/careers', careersRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/roadmap', roadmapRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/assessments', assessmentsRouter);
  app.use('/api/readiness', readinessRouter);
  app.use('/api/ai', aiCoachRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/resume', resumeRouter);
  app.use('/api/jd', jobDescriptionRouter);
  app.use('/api/weekly-plan', weeklyPlanRouter);
  app.use('/api/career-twin', careerTwinRouter);
  app.use('/api/war-room', warRoomRouter);
  app.use('/api/evidence-graph', evidenceGraphRouter);
  app.use('/api/trajectory', trajectoryRouter);
  app.use('/api/proof-of-skill', proofOfSkillRouter);
  app.use('/api/skill-radar', skillRadarRouter);
  app.use('/api/interview-arena', interviewArenaRouter);
  app.use('/api/project-forge', projectForgeRouter);
  app.use('/api/opportunity-match', opportunityMatchRouter);
  app.use('/api/portfolio-intelligence', portfolioIntelligenceRouter);
  app.use('/api/mission-control', missionControlRouter);
  app.use('/api/ai-provider', aiProviderRouter);
  app.use('/api/autopilot', autopilotRouter);
  app.use('/api/experiment', experimentRouter);

  // JSON 404 for unknown API endpoints (never fall through to HTML)
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Serve static frontend files if production build exists
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('{*path}', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handling middleware
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({ error: 'Internal server error occurred.' });
  });

  return app;
}
