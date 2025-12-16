const express = require('express');
const compression = require('compression');
const { MongoClient, ObjectId } = require('mongodb');
const config = require('./dbConfig.json');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const crypto = require('crypto'); // Import crypto for nonce generation
const { body, param, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const path = require('path');
const os = require('os');
const NodeCache = require('node-cache');

const app = express();
app.use(compression({ level: 6 }));

const port = process.argv.length > 2 ? process.argv[2] : 3000;

// Security Middlewares
app.set('trust proxy', 'loopback'); // Trust the Nginx proxy
app.disable('x-powered-by');

app.use((req, res, next) => {
    // Generate a unique nonce for each request
    res.locals.nonce = crypto.randomBytes(16).toString('base64');

    // Configure Helmet with the CSP including the nonce and trusted sources
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    'https://cdn.jsdelivr.net',
                    'https://unpkg.com',
                    `'nonce-${res.locals.nonce}'`
                ],
                styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'https:'],
                fontSrc: ["'self'", 'https:', 'data:'],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
    })(req, res, next);
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true, // Enable trustProxy within rateLimit
});

app.use(limiter);

const corsOptions = {
    origin: 'https://juliascope.com', // Replace with your frontend domain
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Serve index.html with nonce injection
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public/index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('<%= nonce %>', res.locals.nonce);
    res.send(html);
});

let fractalsDb;
let metricsDb;

// Connect to MongoDB
const mongoUri = `mongodb+srv://${config.dbUsername}:${config.dbPassword}@${config.dbHostname}`;
const client = new MongoClient(mongoUri);

// Connect to the database
(async function testConnection() {
    try {
        await client.connect();
        fractalsDb = client.db('fractals');
        metricsDb = client.db('metrics'); // Add metrics database
        await fractalsDb.command({ ping: 1 });
        console.log('Connected to databases:', fractalsDb.databaseName, metricsDb.databaseName);

        // Create indexes for metrics collections
        await metricsDb.collection('pageVisits').createIndex({ date: 1 });
        await metricsDb.collection('uniqueVisitors').createIndex({ ip: 1 }, { unique: true });
        
        // Initialize randomFractals collection if it doesn't exist
        const collections = await fractalsDb.listCollections({ name: 'randomFractals' }).toArray();
        if (collections.length === 0) {
            await fractalsDb.createCollection('randomFractals');
            console.log('Created randomFractals collection');
        }
        
        console.log('Metrics indexes created successfully');

        // Start the server after successful DB connection
        app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        });
    } catch (ex) {
        console.log(
            `Unable to connect to database with ${mongoUri} because [${ex.message}]`
        );
        process.exit(1);
    }
})();

// Add a middleware to track visits
app.use(async (req, res, next) => {
    // Only track actual page visits, not API calls
    if (req.path.startsWith('/api/loadFractal') || !req.path.startsWith('/api/') && req.path !== '/favicon.ico') {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ip = req.ip;

            // Update total visits
            await metricsDb.collection('pageVisits').updateOne(
                { _id: 'total' },
                { $inc: { count: 1 } },
                { upsert: true }
            );

            // Update daily visits
            await metricsDb.collection('pageVisits').updateOne(
                { date: today },
                { $inc: { count: 1 } },
                { upsert: true }
            );

            // Add unique visitor
            await metricsDb.collection('uniqueVisitors').updateOne(
                { ip: ip },
                { $setOnInsert: { ip: ip, firstVisit: new Date() } },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error tracking metrics:', error);
            // Don't block the request if metrics tracking fails
        }
    }
    next();
});

// Add API endpoints to retrieve metrics
app.get('/api/metrics', async (req, res) => {
    try {
        // Get total visits
        const totalVisits = await metricsDb.collection('pageVisits').findOne({ _id: 'total' });

        // Get daily visits
        const dailyVisits = await metricsDb.collection('pageVisits')
            .find({ date: { $exists: true } })
            .sort({ date: -1 })
            .toArray();

        // Get unique visitors count
        const uniqueVisitors = await metricsDb.collection('uniqueVisitors').countDocuments();

        res.json({
            totalVisits: totalVisits?.count || 0,
            dailyVisits: dailyVisits.map(visit => ({
                date: visit.date,
                count: visit.count
            })),
            uniqueVisitors: uniqueVisitors
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// API route to save fractal
app.post(
    '/api/saveFractal',
    body('encodedState').isString().notEmpty().trim().escape(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { encodedState } = req.body;

        try {
            const id = new ObjectId();
            const collection = fractalsDb.collection('fractals');
            await collection.insertOne({
                _id: id,
                encodedState,
                createdAt: new Date(),
            });
            console.log(`[${new Date().toISOString()}] Saving fractal ${id.toString()}...`);
            res.json({ id: id.toString() });
        } catch (error) {
            console.error('Error saving fractal', error);
            res.status(500).json({ error: 'Failed to save fractal' });
        }
    }
);

// API route to load fractal
app.get(
    '/api/loadFractal/:id',
    param('id')
        .custom((value) => ObjectId.isValid(value))
        .withMessage('Invalid fractal ID'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        try {
            const collection = fractalsDb.collection('fractals');
            const fractal = await collection.findOne({ _id: new ObjectId(id) });

            if (!fractal) {
                return res.status(404).json({ error: 'Fractal not found' });
            }

            res.json({ encodedState: fractal.encodedState });
        } catch (error) {
            console.error('Error loading fractal', error);
            res.status(500).json({ error: 'Failed to load fractal' });
        }
    }
);

// API route to get a random fractal
app.get('/api/randomFractal', async (req, res) => {
    try {
        const randomCollection = fractalsDb.collection('randomFractals');
        const count = await randomCollection.countDocuments();
        
        if (count === 0) {
            return res.status(500).json({ error: 'No random fractals available' });
        }
        
        // Get a random document from the collection
        const randomFractal = await randomCollection.aggregate([
            { $sample: { size: 1 } }
        ]).toArray();
        
        if (randomFractal.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve random fractal' });
        }
        
        res.json({ id: randomFractal[0].fractalId });
    } catch (error) {
        console.error('Error getting random fractal', error);
        res.status(500).json({ error: 'Failed to get random fractal' });
    }
});

// Simple authentication middleware for admin routes
const authenticateAdmin = (req, res, next) => {
    const { password } = req.body;
    if (password === 'code82094') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// API route to get all fractals for admin
app.post('/api/admin/getAllFractals', authenticateAdmin, async (req, res) => {
    try {
        const collection = fractalsDb.collection('fractals');
        const randomCollection = fractalsDb.collection('randomFractals');
        
        // Get all fractals
        const fractals = await collection.find({})
            .sort({ createdAt: -1 })
            .project({ _id: 1, createdAt: 1 })
            .toArray();
            
        // Get IDs of fractals in the random pool
        const randomFractalsIds = await randomCollection.find({})
            .project({ fractalId: 1, _id: 0 })
            .toArray();
            
        const randomFractalSet = new Set(randomFractalsIds.map(item => item.fractalId));
        
        // Mark fractals that are in the random pool
        const mappedFractals = fractals.map(fractal => ({
            id: fractal._id.toString(),
            createdAt: fractal.createdAt,
            isInRandomPool: randomFractalSet.has(fractal._id.toString())
        }));
        
        res.json({ fractals: mappedFractals });
    } catch (error) {
        console.error('Error getting all fractals', error);
        res.status(500).json({ error: 'Failed to get fractals' });
    }
});

// API route to add fractal to random pool
app.post('/api/admin/addToRandomPool', authenticateAdmin, 
    body('fractalId').custom((value) => ObjectId.isValid(value)).withMessage('Invalid fractal ID'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { fractalId } = req.body;
        
        try {
            // First check if fractal exists
            const fractalCollection = fractalsDb.collection('fractals');
            const fractal = await fractalCollection.findOne({ _id: new ObjectId(fractalId) });
            
            if (!fractal) {
                return res.status(404).json({ error: 'Fractal not found' });
            }
            
            // Then check if it's already in random pool
            const randomCollection = fractalsDb.collection('randomFractals');
            const existingEntry = await randomCollection.findOne({ fractalId });
            
            if (existingEntry) {
                return res.json({ message: 'Fractal already in random pool' });
            }
            
            // Add to random pool
            await randomCollection.insertOne({ 
                fractalId,
                addedAt: new Date()
            });
            
            res.json({ message: 'Added to random pool successfully' });
        } catch (error) {
            console.error('Error adding to random pool', error);
            res.status(500).json({ error: 'Failed to add to random pool' });
        }
    }
);

// API route to remove fractal from random pool
app.post('/api/admin/removeFromRandomPool', authenticateAdmin,
    body('fractalId').custom((value) => ObjectId.isValid(value)).withMessage('Invalid fractal ID'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { fractalId } = req.body;
        
        try {
            const randomCollection = fractalsDb.collection('randomFractals');
            const result = await randomCollection.deleteOne({ fractalId });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Fractal not in random pool' });
            }
            
            res.json({ message: 'Removed from random pool successfully' });
        } catch (error) {
            console.error('Error removing from random pool', error);
            res.status(500).json({ error: 'Failed to remove from random pool' });
        }
    }
);

const nameRequestCache = new NodeCache();

const fractalNameRateLimiter = (req, res, next) => {
    const ip = req.ip;
    const minute = Math.floor(Date.now() / 60000); // Get current minute
    const key = `${ip}-${minute}`;

    const requestCount = nameRequestCache.get(key) || 0;

    if (requestCount >= 6) {
        return res.json({ name: "Fractal" });
    }

    nameRequestCache.set(key, requestCount + 1, 60); // Expire after 60 seconds
    next();
};

app.post('/api/getFractalName', fractalNameRateLimiter, async (req, res) => {
    let tempFilePath = null;

    try {
        const { imageData } = req.body;

        // Create temp file
        tempFilePath = path.join(os.tmpdir(), `fractal-${Date.now()}.png`);

        // Convert base64 to buffer and save to temp file
        const buffer = Buffer.from(imageData.split(',')[1], 'base64');
        fs.writeFileSync(tempFilePath, buffer);

        const fileManager = new GoogleAIFileManager(config.geminiKey);

        // Upload the temp file
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: "image/png",
            displayName: "fractal_image",
        });

        const genAI = new GoogleGenerativeAI(config.geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            "Give this fractal a one to three word name roughly describing it, probably ending in Fractal or something of the sort. Try to make it creative but memorable and elegant, and avoid the word 'rainbow.' Reply with just that name, nothing else.",
            {
                fileData: {
                    fileUri: uploadResult.file.uri,
                    mimeType: uploadResult.file.mimeType,
                },
            },
        ]);

        const name = result.response.text().trim().replace(/\.$/, '');

        res.json({ name });
    } catch (error) {
        console.error('Error getting fractal name:', error);
        res.json({ name: "Fractal" }); // Return "Fractal" on error
    } finally {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (err) {
                console.error('Error cleaning up temp file:', err);
            }
        }
    }
});

// Return the application's default page if the path is unknown
app.use((_req, res) => {
    console.log(`[${new Date().toISOString()}] Unknown path requested: ${_req.path}. Sending index.html...`);
    const indexPath = path.join(__dirname, 'public/index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('<%= nonce %>', res.locals.nonce);
    res.send(html);
});

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
