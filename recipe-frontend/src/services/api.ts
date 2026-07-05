import axios from 'axios';

// baseURL relatif: otomatis resolve ke domain yang lagi diakses.
// - Saat `quasar dev` (biasanya http://localhost:9000), pastikan proxy dev-server
//   diarahkan ke backend Express lokal (lihat catatan proxy di bawah), ATAU
//   jalankan `netlify dev` supaya redirect rule netlify.toml ikut aktif.
// - Saat production (Netlify), redirect rule `/api/* -> /.netlify/functions/api/:splat`
//   di netlify.toml yang menangani sisanya.
const api = axios.create({
    baseURL: '/api',
});

export default api;