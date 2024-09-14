const express = require('express');
const compression = require('compression');
const app = express();

app.use(compression({ level: 6 }));

const port = process.argv.length > 2 ? process.argv[2] : 4000;

// Middleware - Static file hosting
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.static('public')); // Serve the public directory as static files

// Return the application's default page if the path is unknown
app.use((_req, res) => {
    console.log('Unknown path.', _req.path, 'Sending index.html...');
    res.sendFile('index.html', { root: 'public' });
});

const httpService = app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});