import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// In production, warn if using the fallback JWT secret so operators know to set a strong key
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'skillforge-dev-secret-key-saarthix-mvp-2026') {
    console.warn('⚠️  [SECURITY WARNING] JWT_SECRET is not set or is using the development fallback. Set a secure, unique secret in production.');
  }
}

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`🚀 SkillForge AI Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📡 AI Provider: ${process.env.GEMINI_API_KEY ? 'Gemini 1.5 Flash (Configured)' : 'Deterministic Advisory Engine (Active Fallback)'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
