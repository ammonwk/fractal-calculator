const express = require('express');
const compression = require('compression');
const { MongoClient, ObjectId } = require('mongodb');
const config = require('./dbConfig.json');

const app = express();
app.use(compression({ level: 6 }));

const port = process.argv.length > 2 ? process.argv[2] : 3000;

// Declare db variable
let db;

// Connect to MongoDB
const mongoUri = `mongodb+srv://${config.userName}:${config.password}@${config.hostname}`;
const client = new MongoClient(mongoUri);

// Connect to the database
(async function testConnection() {
    try {
        await client.connect();
        db = client.db('fractals');
        await db.command({ ping: 1 });
        console.log('Connected to database', db.databaseName);

        // Create index on encodedState
        await db.collection('fractals').createIndex({ encodedState: 1 });
        console.log('Indexes created successfully');

        // Start the server after successful DB connection
        app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    } catch (ex) {
        console.log(`Unable to connect to database with ${mongoUri} because ${ex.message}`);
        process.exit(1);
    }
})();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// API route to save fractal
app.post('/api/saveFractal', async (req, res) => {
    const { encodedState } = req.body;
    if (!encodedState) {
        return res.status(400).json({ error: 'Fractal state is required' });
    }

    try {
        const id = new ObjectId();
        const collection = db.collection('fractals');
        await collection.insertOne({ _id: id, encodedState, createdAt: new Date() });
        res.json({ id: id.toString() });
    } catch (error) {
        console.error('Error saving fractal', error);
        res.status(500).json({ error: 'Failed to save fractal' });
    }
});

// API route to load fractal
app.get('/api/loadFractal/:id', async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid fractal ID' });
    }

    try {
        const collection = db.collection('fractals');
        const fractal = await collection.findOne({ _id: new ObjectId(id) });

        if (!fractal) {
            return res.status(404).json({ error: 'Fractal not found' });
        }

        res.json({ encodedState: fractal.encodedState });
    } catch (error) {
        console.error('Error loading fractal', error);
        res.status(500).json({ error: 'Failed to load fractal' });
    }
});

// Return the application's default page if the path is unknown
app.use((_req, res) => {
    res.sendFile('index.html', { root: 'public' });
});
