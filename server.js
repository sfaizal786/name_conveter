// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processCSV, NameFixer } = require('./fix.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Check if file is CSV
        if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Serve HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Process CSV endpoint
app.post('/process-csv', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const inputFile = req.file.path;
        const outputFile = path.join('./uploads', 'processed-' + req.file.filename);
        
        const options = {
            preserveAccents: req.body.preserveAccents === 'true',
            removeSpecialChars: req.body.removeSpecialChars !== 'false',
            caseSensitive: req.body.caseSensitive === 'true',
            capitalizeFirst: req.body.capitalizeFirst !== 'false',
            logProgress: true
        };

        console.log('Processing CSV with options:', options);

        // Process the CSV
        const recordCount = processCSV(inputFile, outputFile, options);

        // Send the processed file as download
        res.download(outputFile, 'processed-names.csv', (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Error downloading file' });
            }
            
            // Clean up files after download
            setTimeout(() => {
                try {
                    fs.unlinkSync(inputFile);
                    fs.unlinkSync(outputFile);
                } catch (cleanupError) {
                    console.error('Cleanup error:', cleanupError);
                }
            }, 5000);
        });

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ 
            error: 'Error processing CSV file',
            details: error.message 
        });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    const testNames = [
        { input: "morten Ã˜revik", expected: "Morten Orevik" },
        { input: "BJÖRN nilsson", expected: "Bjorn Nilsson" },
        { input: "pål johansen", expected: "Pal Johansen" }
    ];
    
    const results = testNames.map(test => {
        const [first, last] = test.input.split(' ');
        const firstFixed = NameFixer.fixMojibake(first);
        const lastFixed = NameFixer.fixMojibake(last);
        
        const firstNormalized = NameFixer.normalizeToASCII(firstFixed, { capitalizeFirst: true });
        const lastNormalized = NameFixer.normalizeToASCII(lastFixed, { capitalizeFirst: true });
        
        return {
            input: test.input,
            output: `${firstNormalized} ${lastNormalized}`,
            expected: test.expected,
            match: `${firstNormalized} ${lastNormalized}` === test.expected
        };
    });
    
    res.json({
        message: 'Name Converter API is working!',
        timestamp: new Date().toISOString(),
        testResults: results
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Name Converter API',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});;

