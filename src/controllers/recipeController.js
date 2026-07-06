import {
	generateContent,
	formatMultimodalPayload,
	extractErrorMessage,
} from '../services/geminiService.js';
import { SUPPORTED_DOCUMENT_MIMETYPES } from '../middleware/upload.js';
import { getRecipeBookFromSheet } from '../services/sheetLogService.js';

export const generateText = async (req, res) => {
	const { prompt } = req.body;
	if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

	try {
		const response = await generateContent(prompt);
		res.json({ output: response.text });
	} catch (error) {
		console.error(error);
		res.status(error.status || 500).json({
			error: extractErrorMessage(error, 'An error occurred while generating text.'),
		});
	}
};

export const generateFromImage = async (req, res) => {
	if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
	const { prompt } = req.body;

	try {
		const contents = formatMultimodalPayload(prompt, 'What is in this image?', req.file);
		const response = await generateContent(contents);
		res.json({ output: response.text });
	} catch (error) {
		console.error(error);
		res.status(error.status || 500).json({
			error: extractErrorMessage(error, 'An error occurred while processing the image.'),
		});
	}
};

export const generateFromDocument = async (req, res) => {
	if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });

	// Validasi mimetype lebih awal: Gemini generateContent hanya mendukung
	// PDF dan teks polos sebagai inlineData. .doc/.docx akan ditolak Gemini
	// dengan error yang membingungkan, jadi kita cegat lebih dulu di sini.
	if (!SUPPORTED_DOCUMENT_MIMETYPES.includes(req.file.mimetype)) {
		return res.status(400).json({
			error: `Format dokumen "${req.file.mimetype}" belum didukung. Saat ini hanya file PDF (.pdf) atau teks polos (.txt) yang bisa diproses.`,
		});
	}

	const { prompt } = req.body;

	try {
		const contents = formatMultimodalPayload(
			prompt,
			'Please summarize the content of the document.',
			req.file,
		);
		const response = await generateContent(contents);
		res.json({ output: response.text });
	} catch (error) {
		console.error(error);
		res.status(error.status || 500).json({
			error: extractErrorMessage(error, 'An error occurred while processing the document.'),
		});
	}
};

export const generateFromAudio = async (req, res) => {
	if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
	const { prompt } = req.body;

	try {
		const contents = formatMultimodalPayload(prompt, 'What is in this audio?', req.file);
		const response = await generateContent(contents);
		res.json({ output: response.text });
	} catch (error) {
		console.error(error);
		res.status(error.status || 500).json({
			error: extractErrorMessage(error, 'An error occurred while processing the audio.'),
		});
	}
};


/**
 * Ambil "Buku Resep": riwayat seluruh interaksi AI yang tersimpan
 * di Google Sheet AI-RECIPE, untuk ditampilkan di frontend.
 */
export const getRecipeBook = async (req, res) => {
	try {
		const data = await getRecipeBookFromSheet();
		res.json({ output: data });	
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: extractErrorMessage(error, 'Gagal mengambil buku resep.'),
		});
	}
};