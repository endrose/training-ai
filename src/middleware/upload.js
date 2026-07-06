import multer from 'multer';

const storage = multer.memoryStorage();

// 2.5MB: sengaja dibuat lebih kecil dari limit request Netlify Functions
// (~6MB raw, ~4.5MB efektif setelah overhead base64 encoding), supaya ada
// ruang untuk overhead multipart form-data sebelum mentok limit platform.
export const upload = multer({
	storage,
	limits: { fileSize: 2.5 * 1024 * 1024 },
});

// Mimetype dokumen yang benar-benar didukung Gemini sebagai inlineData.
// .doc/.docx TIDAK didukung oleh Gemini generateContent
// (akan ditolak dengan error "Unsupported MIME type").
export const SUPPORTED_DOCUMENT_MIMETYPES = ['application/pdf', 'text/plain'];
