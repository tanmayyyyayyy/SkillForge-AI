import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, DEMO_USER_ID } from '../db/store.js';
import { signToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { StudentProfile } from '../../src/types/index.js';

export const authRouter = Router();

// Register new user
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid full name (minimum 2 characters).' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create the account and its initial profile as one atomic unit, so a
    // storage failure cannot leave a user without a profile.
    const { newUser, initialProfile } = db.transaction(() => {
      const createdUser = db.createUser({
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        createdAt: new Date().toISOString(),
        isDemo: false
      });

      // Create empty initial student profile template
      const profile: StudentProfile = {
        userId: createdUser.id,
        fullName: createdUser.name,
        educationLevel: 'Undergraduate',
        degree: 'Computer Science',
        graduationYear: new Date().getFullYear() + 2,
        experienceLevel: 'Beginner',
        weeklyHours: 10,
        preferredLearningStyle: 'Project-based',
        targetCompanies: [],
        targetRole: 'sde',
        currentSkills: [],
        existingProjects: [],
        interests: [],
        updatedAt: new Date().toISOString()
      };
      db.saveProfile(profile);

      return { newUser: createdUser, initialProfile: profile };
    });

    const token = signToken(newUser.id, false);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isDemo: false
      },
      profile: initialProfile
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login existing user
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.findUserByEmail(email);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken(user.id, !!user.isDemo);
    const profile = db.getProfile(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isDemo: !!user.isDemo
      },
      profile
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Instant Demo Login for Hackathon Judges
authRouter.post('/demo', (_req: Request, res: Response): void => {
  try {
    const demoUser = db.findUserById(DEMO_USER_ID);
    if (!demoUser) {
      db.resetDemoData();
    }
    const token = 'demo_token_aarav';
    const profile = db.getProfile(DEMO_USER_ID);

    res.json({
      token,
      user: {
        id: DEMO_USER_ID,
        name: 'Aarav Sharma',
        email: 'demo.evaluator@skillforge.ai',
        isDemo: true
      },
      profile
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Failed to initialize demo session.' });
  }
});

// Reset Demo Data
authRouter.post('/demo/reset', (_req: Request, res: Response): void => {
  try {
    db.resetDemoData();
    res.json({ message: 'Demo data successfully reset to clean evaluation baseline.' });
  } catch (err) {
    console.error('Demo data reset error:', err);
    res.status(500).json({ error: 'Failed to reset demo data.' });
  }
});

// Get current session user
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const user = db.findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const profile = db.getProfile(user.id);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isDemo: !!user.isDemo
    },
    profile
  });
});
