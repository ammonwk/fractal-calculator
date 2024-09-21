const express = require('express');
const compression = require('compression');
const { MongoClient, ObjectId } = require('mongodb'); // Import ObjectId
const config = require('./dbConfig.json');

const app = express();
app.use(compression({ level: 6 }));

const port = process.argv.length > 2 ? process.argv[2] : 3000;

// Connect to MongoDB
const mongoUri = `mongodb+srv://${config.userName}:${config.password}@${config.hostname}`;
const client = new MongoClient(mongoUri);


console.error("(Connecting to Fractals...)");
db = client.db('fractals');
console.error("(Done)");

// Connect to the database
(async function testConnection() {
    await client.connect();
    await db.command({ ping: 1 });
    console.log('Connected to database', db.databaseName);

    // Create indexes
    await db.collection('fractals').createIndex({ id: 1, encodedState: 1 });
    console.log('Indexes created successfully');
})().catch((ex) => {
    console.log(`Unable to connect to database with ${mongoUri} because ${ex.message}`);
    process.exit(1);
});

// let db;
// client.connect()
//     .then(() => {
//         db = client.db('fractals'); // Database name
//         console.log('Connected to MongoDB');
//     })
//     .catch((err) => {
//         console.error('Failed to connect to MongoDB', err);
//     });

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// API route to save fractal
app.post('/api/saveFractal', async (req, res) => {
    const { encodedState } = req.body;
    if (!encodedState) {
        return res.status(400).json({ error: 'Fractal state is required' });
    }

    const id = new ObjectId(); // Generate a new ObjectID

    try {
        const collection = db.collection('fractals');
        await collection.insertOne({ _id: id, encodedState, createdAt: new Date() }); // Save using ObjectID
        res.json({ id: id.toString() }); // Convert ObjectID to string for response
    } catch (error) {
        console.error('Error saving fractal', error);
        res.status(500).json({ error: 'Failed to save fractal' });
    }
});

// API route to load fractal
app.get('/api/loadFractal/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const collection = db.collection('fractals');
        const fractal = await collection.findOne({ _id: new ObjectId(id) }); // Query using ObjectID

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

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
