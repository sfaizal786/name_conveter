const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processCSV } = require('./fix'); // your fixer.js file

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/fix-csv', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');

    const inputPath = req.file.path;
    
    // Get original filename and change extension to .xlsx
    const originalName = req.file.originalname;
    const baseName = originalName.replace(/\.[^/.]+$/, ""); // Remove extension
    const outputPath = path.join('uploads', 'fixed_' + baseName + '.xlsx');

    try {
        // Process CSV and output XLSX
        processCSV(inputPath, outputPath);

        // Set proper headers for XLSX download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="fixed_${baseName}.xlsx"`);
        
        // Read and send the XLSX file
        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);
        
        // Cleanup after sending
        fileStream.on('close', () => {
            fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });

    } catch (err) {
        console.error(err);
        // Cleanup on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        res.status(500).send('Error processing CSV');
    }
});

app.listen(3000, () => console.log('🚀 Server running at http://localhost:3000'));
