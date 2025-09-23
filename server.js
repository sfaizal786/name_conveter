const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const  {processCSV} = require('./fix'); // your fixer.js
const PORT = process.env.PORT || 3000; // Use Render's port or fallback to 3000 locally

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
            fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing CSV');
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


