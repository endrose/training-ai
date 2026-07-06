/**
 * Error-handling middleware terakhir di pipeline Express.
 * Menangkap error yang tidak sengaja lolos dari route handler
 * (termasuk MulterError seperti "File too large"), supaya respons
 * yang balik ke client tetap JSON rapi, bukan HTML default Express/Lambda.
 */
export const errorHandler = (err, req, res, next) => {
	console.error('Unhandled error:', err);

	if (err.name === 'MulterError') {
		const message =
			err.code === 'LIMIT_FILE_SIZE'
				? 'Ukuran file terlalu besar. Maksimal 2.5MB per file.'
				: `Upload error: ${err.message}`;
		return res.status(400).json({ error: message });
	}

	res.status(500).json({ error: err.message || 'Internal server error' });
};
