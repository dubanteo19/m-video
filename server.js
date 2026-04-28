import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const BASE_UPLOAD_DIR = path.join(__dirname, 'temp_shares');

// Ensure the folder exists and is empty on start
fs.ensureDirSync(BASE_UPLOAD_DIR);

app.use(cors());

// 3. Dynamic Streaming
// When browser asks for /stream/john/video.mp4, it looks in shares/john/video.mp4
app.use('/stream/:user', (req, res, next) => {
  const userDir = path.join(BASE_UPLOAD_DIR, req.params.user);
  express.static(userDir)(req, res, next);
});

// Update Multer to use dynamic folders
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = req.params.user || 'public';
    const userDir = path.join(BASE_UPLOAD_DIR, user);

    fs.ensureDirSync(userDir);

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const filePath = path.join(userDir, originalName);

    if (fs.existsSync(filePath)) {
      const error = new Error('DUPLICATE_FILE');
      error.filename = originalName;
      return cb(error);
    }

    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 100 } // 100MB limit at server level too
});

app.post('/upload/:user', (req, res) => {
  upload.array('videos')(req, res, (err) => {
    if (err) {
      if (err.message === 'DUPLICATE_FILE') {
        return res.status(409).json({
          success: false,
          message: "Conflict: This file already exists.",
          duplicatedFile: err.filename
        });
      }
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true });
  });
});
app.get('/list/:user', (req, res) => {
  const userDir = path.join(BASE_UPLOAD_DIR, req.params.user);
  if (!fs.existsSync(userDir)) return res.json([]);

  // Get files with their stats
  const files = fs.readdirSync(userDir)
    .map(name => ({
      name,
      time: fs.statSync(path.join(userDir, name)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time) // Sort: Newest first
    .map(f => f.name);

  res.json(files);
});

// Change this route in server.js
app.delete('/clear/:user', (req, res) => {
  const user = req.params.user || 'public';
  const userDir = path.join(BASE_UPLOAD_DIR, user);

  if (fs.existsSync(userDir)) {
    fs.emptyDirSync(userDir);
    res.json({ message: `Cleared folder for ${user}` });
  } else {
    res.status(404).json({ error: "User folder not found" });
  }
});

// API: Delete a specific video
app.delete('/delete-video/:user/:filename', (req, res) => {
  const { user, filename } = req.params;
  const filePath = path.join(BASE_UPLOAD_DIR, user, filename);

  if (fs.existsSync(filePath)) {
    fs.removeSync(filePath);
    res.json({ success: true, message: `Deleted ${filename}` });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

app.listen(5000, '0.0.0.0', () => {
  console.log('🚀 Backend running on port 5000');
});