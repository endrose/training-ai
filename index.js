import express from 'express';
import multer from 'multer';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';

const app = express();
app.use(cors());

// 1. Perbaikan Multer: Gunakan memoryStorage agar req.file.buffer tersedia
// Tambahkan limits untuk mencegah file raksasa menghabiskan kuota/memori
const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: { fileSize: 4 * 1024 * 1024 }, // Batasi maksimal file 10MB
});

const GEMINI_MODEL = process.env.MODEL || 'gemini-2.5-flash-lite';

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});

// Catatan: Panggilan API global dihapus agar tidak memakan limit saat server restart

app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
	res.send('Hello, World!');
});

// Helper function untuk standarisasi format payload multimodal Gemini
const formatMultimodalPayload = (prompt, defaultPrompt, file) => {
	return [
		{
			text: prompt ?? defaultPrompt,
		},
		{
			inlineData: {
				data: file.buffer.toString('base64'),
				mimeType: file.mimetype,
			},
		},
	];
};

// Helper function untuk mengekstrak pesan error yang rapi dari Gemini API
const extractErrorMessage = (error, defaultMsg) => {
	// Tangani khusus error 503 (Overloaded/High Demand)
	if (error.status === 503) {
		return 'Maaf, layanan AI saat ini sedang sibuk (tingginya permintaan). Silakan coba beberapa saat lagi.';
	}

	let msg = error.message || defaultMsg;
	try {
		// Jika pesan error diawali dengan teks seperti "ApiError: ", cari posisi awal JSON
		const jsonStart = msg.indexOf('{');
		if (jsonStart !== -1) {
			const jsonStr = msg.substring(jsonStart);
			const parsed = JSON.parse(jsonStr);
			if (parsed.error && parsed.error.message) {
				msg = parsed.error.message;
			}
		}
	} catch (e) {
		// Abaikan jika bukan JSON
	}
	return msg;
};

// --- ENDPOINTS ---
const router = express.Router();

// Generate dari Teks
router.post('/generate-text', async (req, res) => {
	const { prompt } = req.body;
	if (!prompt)
		return res.status(400).json({ error: 'Prompt is required' });

	try {
		// Konsisten menggunakan ai.models.generateContent sesuai SDK terbaru
		const response = await ai.models.generateContent({
			model: GEMINI_MODEL,
			contents: prompt,
		});
		res.json({ output: response.text });
	} catch (error) {
		console.error(error);
		const errMsg = extractErrorMessage(error, 'An error occurred while generating text.');
		res.status(error.status || 500).json({ error: errMsg });
	}
});

// Generate dari Image
router.post(
	'/generate-from-image',
	upload.single('image'),
	async (req, res) => {
		if (!req.file)
			return res
				.status(400)
				.json({ error: 'No image file uploaded' });
		const { prompt } = req.body;

		try {
			const contents = formatMultimodalPayload(
				prompt,
				'What is in this image?',
				req.file,
			);
			const response = await ai.models.generateContent({
				model: GEMINI_MODEL,
				contents: contents,
			});
			res.json({ output: response.text });
		} catch (error) {
			console.error(error);
			const errMsg = extractErrorMessage(error, 'An error occurred while processing the image.');
			res.status(error.status || 500).json({ error: errMsg });
		}
	},
);

// Generate dari Document
router.post(
	'/generate-from-document',
	upload.single('document'),
	async (req, res) => {
		if (!req.file)
			return res
				.status(400)
				.json({ error: 'No document file uploaded' });
		const { prompt } = req.body;

		try {
			const contents = formatMultimodalPayload(
				prompt,
				'Please summarize the content of the document.',
				req.file,
			);
			const response = await ai.models.generateContent({
				model: GEMINI_MODEL,
				contents: contents,
			});
			res.json({ output: response.text });
		} catch (error) {
			console.error(error);
			const errMsg = extractErrorMessage(error, 'An error occurred while processing the document.');
			res.status(error.status || 500).json({ error: errMsg });
		}
	},
);

// Generate dari Audio
router.post(
	'/generate-from-audio',
	upload.single('audio'),
	async (req, res) => {
		if (!req.file)
			return res
				.status(400)
				.json({ error: 'No audio file uploaded' });
		const { prompt } = req.body;

		try {
			const contents = formatMultimodalPayload(
				prompt,
				'What is in this audio?',
				req.file,
			);
			const response = await ai.models.generateContent({
				model: GEMINI_MODEL,
				contents: contents,
			});
			res.json({ output: response.text });
		} catch (error) {
			console.error(error);
			const errMsg = extractErrorMessage(error, 'An error occurred while processing the audio.');
			res.status(error.status || 500).json({ error: errMsg });
		}
	},
);

app.use('/api', router);
app.use('/.netlify/functions/api', router);

if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
	app.listen(port, () => {
		console.log(`Server is running on port http://localhost:${port}`);
	});
}

export default app;
