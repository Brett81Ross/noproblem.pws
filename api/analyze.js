import { GoogleGenAI } from '@google/genai';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

const MODEL = 'gemini-2.5-flash';
const MAX_IMAGES = 12;

/*
 * MATRIX RATE CARD
 *
 * These are application defaults—not AI-generated prices.
 * We will eventually move these into an owner settings screen.
 */
const RATE_CARD = {
    minimumJob: 199,

    services: {
        house_wash: {
            label: 'House Soft Wash',
            unit: 'sq_ft',
            rate: 0.22
        },
        driveway_cleaning: {
            label: 'Driveway Surface Cleaning',
            unit: 'sq_ft',
            rate: 0.18
