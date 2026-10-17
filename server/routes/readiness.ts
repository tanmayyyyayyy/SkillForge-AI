import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { computeReadinessForUser, buildReadinessReport } from '../services/readinessService.js';
import { generateReadinessReportPdf } from '../services/pdf/reportPdf.js';

export const readinessRouter = Router();

// Get current readiness score and breakdown.
// The score is derived on read from the canonical engine and the observed value
// is logged to history (deduped). Reading never inflates the score itself.
readinessRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const snapshot = computeReadinessForUser(req.userId!);
    if (!snapshot) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.json({
      readiness: snapshot.readiness,
      history: snapshot.history
    });
  } catch (err) {
    console.error('Error calculating readiness:', err);
    res.status(500).json({ error: 'Failed to compute career readiness.' });
  }
});

// Comprehensive Readiness Report payload (for the Report page).
// Uses the exact same canonical readiness snapshot as the dashboard so the two
// views can never disagree on score, breakdown, or delta.
readinessRouter.get('/report', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const report = buildReadinessReport(req.userId!);
    if (!report) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    res.json({ report });
  } catch (err) {
    console.error('Error generating readiness report:', err);
    res.status(500).json({ error: 'Failed to generate readiness report.' });
  }
});

// Downloadable PDF of the same report. The PDF is rendered server-side from the
// exact same canonical payload as `/report` — the client never supplies data or
// readiness values, and can only ever download its own authenticated report.
readinessRouter.get('/report/pdf', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const report = buildReadinessReport(req.userId!);
    if (!report) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const pdf = generateReadinessReportPdf(report);

    const nameSlug =
      (report.student.fullName || 'candidate')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'candidate';
    const dateSlug = new Date(report.generatedAt).toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="skillforge-readiness-${nameSlug}-${dateSlug}.pdf"`
    );
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);
  } catch (err) {
    console.error('Error generating readiness report PDF:', err);
    res.status(500).json({ error: 'Failed to generate the readiness report PDF.' });
  }
});
