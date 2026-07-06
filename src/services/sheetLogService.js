import 'dotenv/config';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

/**
 * Kirim log data ke Google Apps Script Web App (spreadsheet AI-RECIPE).
 * Dibuat non-blocking (fire-and-forget di caller) supaya tidak memperlambat
 * respons ke client kalau Apps Script lambat/gagal.
 */
export const logToSheet = async (payload) => {
	if (!APPS_SCRIPT_URL) {
		console.warn('APPS_SCRIPT_URL belum di-set, log dilewati.');
		return;
	}

	try {
		await fetch(APPS_SCRIPT_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	} catch (err) {
		console.error('Gagal mengirim log ke Google Sheet:', err.message);
	}
};
