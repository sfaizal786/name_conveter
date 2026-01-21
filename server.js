const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processCSV } = require("./fix"); // ✅ correct file

const app = express();

/* ================= MULTER CONFIG ================= */

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".csv") {
            return cb(new Error("Only CSV files are allowed"));
        }
        cb(null, true);
    }
});

app.use(express.static("public"));

/* ================= ROUTE ================= */

app.post("/fix-csv", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("❌ No file uploaded");
    }

    const inputPath = req.file.path;
    const outputPath = path.join(
        "uploads",
        "fixed_" + Date.now() + "_" + req.file.originalname
    );

    try {
        processCSV(inputPath, outputPath, {
            preserveAccents: false,
            logProgress: false
        });

        res.download(outputPath, path.basename(outputPath), err => {
            // ✅ async-safe cleanup
            fs.unlink(inputPath, () => {});
            fs.unlink(outputPath, () => {});
        });

    } catch (err) {
        console.error("CSV processing error:", err);

        // cleanup on error
        fs.unlink(inputPath, () => {});

        res.status(500).send("❌ Error processing CSV");
    }
});

/* ================= SERVER ================= */

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
