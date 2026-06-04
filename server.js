import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
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

// Absolute path to your existing executable
const ffmpegPath = 'C:\\Users\\ISV51\\AppData\\Local\\Learnpulse\\Screenpresso\\FFmpeg\\ffmpeg.exe';

app.get('/download-video/:user/:filename', (req, res) => {
  const { user, filename } = req.params;
  const { start, end } = req.query;
  const filePath = path.join(BASE_UPLOAD_DIR, user, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (start === undefined || end === undefined) {
    return res.download(filePath, filename);
  }

  const startTime = parseFloat(start);
  const endTime = parseFloat(end);
  const duration = endTime - startTime;

  const tempFilename = `trim-${randomUUID()}.mp4`;
  const tempFilePath = path.join(BASE_UPLOAD_DIR, user, tempFilename);

  const args = [
    '-ss', startTime.toString(),
    '-i', filePath,
    '-t', duration.toString(),
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    tempFilePath
  ];

  const ffmpegProcess = spawn(ffmpegPath, args);

  req.on('close', () => {
    if (ffmpegProcess) ffmpegProcess.kill('SIGKILL');
    if (fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, () => { });
    }
  });

  ffmpegProcess.on('error', (err) => {
    console.error('Failed to start FFmpeg process:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'FFmpeg processing failure.' });
    }
  });

  ffmpegProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`FFmpeg exited with error code ${code}`);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to slice video.' });
      return;
    }

    res.download(tempFilePath, `trimmed-${filename}`, (err) => {
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to clean up temp file:', unlinkErr);
      });
    });
  });
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
  limits: { fileSize: 1024 * 1024 * 500 } // 500MB limit at server level too
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