import { logToSheet } from '../services/sheetLogService.js';

/**
 * Middleware yang membungkus res.json() untuk menangkap hasil response
 * (output/error) lalu mengirimkannya ke Google Sheet secara async,
 * tanpa menunda respons yang dikirim ke client.
 */
export const sheetLogger = (req, res, next) => {
	const originalJson = res.json.bind(res);

	res.json = (body) => {
		logToSheet({
			timestamp: new Date().toISOString(),
			endpoint: req.originalUrl,
			prompt: req.body?.prompt || '',
			output: body?.output || '',
			fileName: req.file?.originalname || '',
			error: body?.error || '',
		});
		return originalJson(body);
	};

	next();
};
