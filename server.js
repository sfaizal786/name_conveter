const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();   // ✅ must be called
const { processCSV } = require('./fix'); // your fix.js

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/fix-csv', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');

    const inputPath = req.file.path;
    const outputPath = path.join('uploads', 'fixed_' + req.file.originalname);

    try {
        processCSV(inputPath, outputPath);

        res.download(outputPath, 'fixed_' + req.file.originalname, (err) => {
            // cleanup after download
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            if (err) {
                console.error('Download error:', err);
            }
        });
    } catch (err) {
        console.error('Processing error:', err);
        res.status(500).send('Error processing CSV');
    }
});

// ✅ fallback port (e.g. if not in .env)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
