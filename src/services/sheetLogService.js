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
/**
 * Ambil seluruh riwayat log (buku resep) dari Google Apps Script Web App.
 * Dipakai untuk menampilkan daftar hasil AI yang pernah tersimpan.
 */
export const getRecipeBookFromSheet = async () => {
	if (!APPS_SCRIPT_URL) {
		throw new Error('APPS_SCRIPT_URL belum di-set di environment variable.');
	}

	const response = await fetch(APPS_SCRIPT_URL, { method: 'GET' });

	if (!response.ok) {
		throw new Error(`Gagal mengambil data dari Apps Script (status ${response.status})`);
	}

	const result = await response.json();

	if (!result.success) {
		throw new Error(result.error || 'Apps Script mengembalikan error.');
	}

	return result.data;
};
