import { ai, GEMINI_MODEL } from '../config/geminiConfig.js';

/**
 * Standarisasi format payload multimodal Gemini (image/document/audio)
 * dari file yang di-upload via multer (memoryStorage).
 */
export const formatMultimodalPayload = (
	prompt,
	defaultPrompt,
	file,
) => {
	return [
		{ text: prompt ?? defaultPrompt },
		{
			inlineData: {
				data: file.buffer.toString('base64'),
				mimeType: file.mimetype,
			},
		},
	];
};

/**
 * Ubah durasi retry dari pesan error Gemini (misal "46.90173115s")
 * menjadi teks yang mudah dibaca manusia, misal "47 detik" atau "1 menit 5 detik".
 */
const formatRetryDuration = (seconds) => {
	const rounded = Math.ceil(seconds);
	if (rounded < 60) {
		return `${rounded} detik`;
	}
	const minutes = Math.floor(rounded / 60);
	const remainingSeconds = rounded % 60;
	return remainingSeconds > 0
		? `${minutes} menit ${remainingSeconds} detik`
		: `${minutes} menit`;
};

/**
 * Ekstrak pesan error yang rapi dari respons Gemini API,
 * termasuk penanganan khusus untuk error 503 (overloaded) dan
 * 429 (kuota habis, dengan estimasi waktu retry yang human-readable).
 */
export const extractErrorMessage = (error, defaultMsg) => {
	if (error.status === 503) {
		return 'Maaf, layanan AI saat ini sedang sibuk (tingginya permintaan). Silakan coba beberapa saat lagi.';
	}

	let msg = error.message || defaultMsg;
	try {
		const jsonStart = msg.indexOf('{');
		if (jsonStart !== -1) {
			const parsed = JSON.parse(msg.substring(jsonStart));
			if (parsed.error && parsed.error.message) {
				msg = parsed.error.message;
			}
		}
	} catch (e) {
		// Abaikan jika bukan JSON
	}

	// Deteksi pesan kuota habis dari Gemini yang menyertakan estimasi retry,
	// contoh: "Please retry in 46.90173115s."
	const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
	if (retryMatch) {
		const retrySeconds = parseFloat(retryMatch[1]);
		const readableDuration = formatRetryDuration(retrySeconds);
		return `Maaf, kuota AI sedang penuh. Silakan coba lagi dalam ${readableDuration}.`;
	}

	return msg;
};

/**
 * Wrapper tipis untuk pemanggilan Gemini generateContent,
 * supaya controller tidak perlu tahu detail SDK/model secara langsung.
 */
export const generateContent = (contents) => {
	return ai.models.generateContent({
		model: GEMINI_MODEL,
		contents,
	});
};
