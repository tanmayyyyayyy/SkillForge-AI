import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 SkillForge AI Server running on http://localhost:${PORT}`);
  console.log(`📡 AI Provider: ${process.env.GEMINI_API_KEY ? 'Gemini 1.5 Flash (Configured)' : 'Deterministic Advisory Engine (Active Fallback)'}`);
});
