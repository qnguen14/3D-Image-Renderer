const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Set upload directory to the local `uploads` folder
const uploadDir = path.join(__dirname, 'uploads');

// Create the folder manually before doing any Multer stuff (wrapped in try-catch for Vercel read-only environments)
try {
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (e) {
    console.warn("Could not create uploads directory (expected on Vercel)");
}

// Set up storage for uploading files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static files from the root (our html, css, js)
app.use(express.static(__dirname));
// Explicitly serve static files from the uploads folder
app.use('/uploads', express.static(uploadDir));

// Endpoint 1: Send list of already uploaded images in the directory
app.get('/images', (req, res) => {
    if (!fs.existsSync(uploadDir)){
        return res.json([]);
    }
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory');
        }
        // Filter out non-image files just in case
        const images = files.filter(el => /\.(jpg|jpeg|png|gif|webp)$/i.test(el));
        res.json(images);
    });
});

// Endpoint 2: Handle receiving multiple new image uploads
app.post('/upload', upload.array('images', 20), (req, res) => {
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }
    // Return relative paths of uploaded files back to our frontend
    const filePaths = req.files.map(file => `/uploads/${file.filename}`);
    res.json({ files: filePaths });
});

// Avoid port binding when deploying to Vercel (Vercel manages the HTTP server)
// Check if running on Vercel
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server is running! Please open your browser to: http://localhost:${PORT}`);
    });
}

// Export the server for Vercel
module.exports = app;