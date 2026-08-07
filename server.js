import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import VideoQueue from './video-queue.js';
// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const BASE_UPLOAD_DIR = path.join(__dirname, 'temp_shares');

// Ensure the folder exists and is empty on start
fs.ensureDirSync(BASE_UPLOAD_DIR);

app.use(express.json());
app.use(cors());


// 3. Dynamic Streaming
// When browser asks for /stream/john/video.mp4, it looks in shares/john/video.mp4
app.use('/stream/:user', (req, res, next) => {
  const userDir = path.join(BASE_UPLOAD_DIR, req.params.user);
  express.static(userDir)(req, res, next);
});

// Absolute path to your existing executable
const FFMPEG_PATH = 'C:\\Users\\ISV51\\AppData\\Local\\Learnpulse\\Screenpresso\\FFmpeg\\ffmpeg.exe';

const videoQueue = new VideoQueue({
  ffmpegPath: FFMPEG_PATH,
  baseUploadDir: BASE_UPLOAD_DIR,
  concurrency: 1
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

app.get('/events/:user', (req, res) => {
  const { user } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  videoQueue.addClient(user, res);

  res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  req.on('close', () => {
    videoQueue.removeClient(user, res);
  });
});

app.get('/download-video/:user/:filename', (req, res) => {
  const { user, filename } = req.params;
  const { start, end } = req.query;
  const filePath = path.join(BASE_UPLOAD_DIR, user, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  if (start === undefined || end === undefined) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'video/mp4');
    return res.download(filePath, filename);
  }

  const startTime = parseFloat(start);
  const endTime = parseFloat(end);
  const duration = endTime - startTime;
  const downloadName = `trimmed-${filename}`;
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
  res.setHeader('Content-Type', 'video/mp4');
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

  const ffmpegProcess = spawn(FFMPEG_PATH, args);

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

app.post('/upload/:user', (req, res) => {
  upload.array('videos')(req, res, (err) => {
    if (err) {
      if (err.message === 'DUPLICATE_FILE') {
        return res.status(409).json({
          success: false,
          message: 'Conflict: This file already exists.',
          duplicatedFile: err.filename
        });
      }
      return res.status(500).json({ success: false, message: err.message });
    }

    const user = req.params.user || 'public';

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const inputPath = path.join(BASE_UPLOAD_DIR, user, originalName);

        videoQueue.enqueue({
          user,
          filename: originalName,
          inputPath
        });
      });
    }

    res.json({ success: true, message: 'Upload complete. Processing queued.' });
  });
});

app.get('/list/:user', (req, res) => {
  const userDir = path.join(BASE_UPLOAD_DIR, req.params.user);
  if (!fs.existsSync(userDir)) return res.json([]);
  // Get files with their stats
  const files = fs.readdirSync(userDir)
    .filter((name) => !name.startsWith('compressed-') && !name.startsWith('trim-'))
    .map((name) => {
      const stats = fs.statSync(path.join(userDir, name));
      return {
        name,
        size: stats.size,
        time: stats.mtime.getTime()
      };
    })
    .sort((a, b) => b.time - a.time);

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

app.post('/rename-video/:user', (req, res) => {
  const { user } = req.params;
  const { oldFilename, newFilename } = req.body;

  if (!oldFilename || !newFilename) {
    return res.status(400).json({ error: "Missing oldFilename or newFilename" });
  }

  const oldPath = path.join(BASE_UPLOAD_DIR, user, oldFilename);
  const newPath = path.join(BASE_UPLOAD_DIR, user, newFilename);

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ error: "Original file not found" });
  }

  if (fs.existsSync(newPath)) {
    return res.status(409).json({ error: "A file with the new name already exists" });
  }

  try {
    fs.renameSync(oldPath, newPath);
    res.json({ success: true, message: `Renamed to ${newFilename}` });
  } catch (error) {
    console.error("Rename error:", error);
    res.status(500).json({ error: "Failed to rename file on disk" });
  }
});

app.listen(5000, '0.0.0.0', () => {
  console.log('🚀 Backend running on port 5000');
});
