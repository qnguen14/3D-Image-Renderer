const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel read-only filesystem check
const isVercel = process.env.VERCEL === '1';

// We have the persistent local uploads
const localUploadDir = path.join(__dirname, 'uploads');
// And a temporary uploads folder for vercel read-only env
const tmpUploadDir = path.join(os.tmpdir(), 'uploads');

// The actual directory to write new uploads to
const writeDir = isVercel ? tmpUploadDir : localUploadDir;

// Create the folder manually before doing any Multer stuff
try {
    if (!fs.existsSync(writeDir)){
        fs.mkdirSync(writeDir, { recursive: true });
    }
} catch (e) {
    console.warn("Could not create uploads directory", e);
}

// Set up storage for uploading files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, writeDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static files from the root (our html, css, js)
app.use(express.static(__dirname));

// Explicitly serve static files from local uploads, and temp uploads if on vercel
app.use('/uploads', express.static(localUploadDir));
if (isVercel) {
    app.use('/uploads', express.static(tmpUploadDir));
}

// Endpoint 1: Send list of already uploaded images in the directory
app.get('/images', (req, res) => {
    let allImages = [];
    
    // Read local tracked files 
    if (fs.existsSync(localUploadDir)) {
        try {
            allImages = allImages.concat(fs.readdirSync(localUploadDir));
        } catch(e) {}
    }
    
    // Read newly uploaded temp files on Vercel
    if (isVercel && fs.existsSync(tmpUploadDir)) {
        try {
            allImages = allImages.concat(fs.readdirSync(tmpUploadDir));
        } catch(e) {}
    }

    // Filter out non-image files just in case and remove duplicates
    const finalImages = [...new Set(allImages)].filter(el => /\.(jpg|jpeg|png|gif|webp)$/i.test(el));
    res.json(finalImages);
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