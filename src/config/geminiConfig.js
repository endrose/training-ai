import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = process.env.MODEL || 'gemini-2.5-flash-lite';

export const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});
