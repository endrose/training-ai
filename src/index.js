import express from 'express';
import cors from 'cors';
import recipeRoutes from './routes/recipeRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
	res.send('Hello, World!');
});

app.use('/api', recipeRoutes);
app.use('/.netlify/functions/api', recipeRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
	app.listen(port, () => {
		console.log(`Server is running on port http://localhost:${port}`);
	});
}

export default app;
