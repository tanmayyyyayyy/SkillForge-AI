import 'dotenv/config';
import { createApp } from './app.js';
import { getGeminiModel, isGeminiConfigured } from './services/geminiClient.js';

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
  console.log(`📡 AI Provider: ${isGeminiConfigured() ? `Gemini ${getGeminiModel()} (API key configured; falls back to Deterministic Advisory Engine if Gemini fails)` : 'Deterministic Advisory Engine (active fallback; no GEMINI_API_KEY set)'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
