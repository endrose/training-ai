import express from 'express';
import { upload } from '../middleware/upload.js';
import { sheetLogger } from '../middleware/sheetLogger.js';
import {
	generateText,
	generateFromImage,
	generateFromDocument,
	generateFromAudio,
	getRecipeBook,
} from '../controllers/recipeController.js';

const router = express.Router();

router.post('/generate-text', sheetLogger, generateText);
router.post(
	'/generate-from-image',
	upload.single('image'),
	sheetLogger,
	generateFromImage,
);
router.post(
	'/generate-from-document',
	upload.single('document'),
	sheetLogger,
	generateFromDocument,
);
router.post(
	'/generate-from-audio',
	upload.single('audio'),
	sheetLogger,
	generateFromAudio,
);

router.get('/recipe-book', getRecipeBook);


export default router;
