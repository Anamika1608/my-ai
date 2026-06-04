// Loads .env for local live-smoke tests (gated tests skip when keys absent).
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local' });
