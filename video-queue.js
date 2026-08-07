import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

class VideoQueue {
    constructor({ ffmpegPath, baseUploadDir, concurrency = 1 }) {
        this.ffmpegPath = ffmpegPath;
        this.baseUploadDir = baseUploadDir;
        this.concurrency = concurrency;
        this.queue = [];
        this.activeWorkers = 0;
        this.clients = new Map(); // Stores SSE active client connections mapped by username
    }

    // --- SSE Connection Manager ---
    addClient(user, res) {
        if (!this.clients.has(user)) {
            this.clients.set(user, []);
        }
        this.clients.get(user).push(res);
    }

    removeClient(user, res) {
        const userClients = this.clients.get(user) || [];
        this.clients.set(
            user,
            userClients.filter((c) => c !== res)
        );
    }

    sendNotification(user, data) {
        const userClients = this.clients.get(user) || [];
        userClients.forEach((res) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        });
    }

    // --- Queue Processor ---
    enqueue(job) {
        this.queue.push(job);
        this.sendNotification(job.user, {
            status: 'queued',
            filename: job.filename,
            queuePosition: this.queue.length
        });
        this.processNext();
    }

    processNext() {
        if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const job = this.queue.shift();
        this.activeWorkers++;

        this.compressVideo(job)
            .then(() => {
                this.sendNotification(job.user, {
                    status: 'completed',
                    filename: job.filename
                });
            })
            .catch((err) => {
                console.error(`[Queue Error] Failed to compress ${job.filename}:`, err);
                this.sendNotification(job.user, {
                    status: 'failed',
                    filename: job.filename,
                    error: err.message
                });
            })
            .finally(() => {
                this.activeWorkers--;
                this.processNext(); // Process next job in queue
            });
    }

    // --- FFmpeg Worker ---
    compressVideo(job) {
        return new Promise((resolve, reject) => {
            const { user, filename, inputPath } = job;
            const tempOutputPath = path.join(
                this.baseUploadDir,
                user,
                `compressed-${randomUUID()}.mp4`
            );

            this.sendNotification(user, { status: 'processing', filename });

            const args = [
                '-init_hw_device', 'qsv=qsv',
                '-filter_hw_device', 'qsv',
                '-i', inputPath,
                '-vcodec', 'h264_qsv',
                '-preset', 'veryfast',
                '-global_quality', '32',
                '-look_ahead', '0',
                '-movflags', '+faststart',
                '-acodec', 'aac',
                '-b:a', '128k',
                '-y',
                tempOutputPath
            ];

            const ffmpegProcess = spawn(this.ffmpegPath, args);

            ffmpegProcess.stderr.on('data', (data) => {
                const log = data.toString();
                if (log.includes('time=')) {
                    const timeMatch = log.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
                    if (timeMatch) {
                        this.sendNotification(user, {
                            status: 'progress',
                            filename,
                            time: timeMatch[1]
                        });
                    }
                }
            });

            ffmpegProcess.on('error', (err) => {
                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                reject(err);
            });

            ffmpegProcess.on('close', (code) => {
                if (code !== 0) {
                    if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                    return reject(new Error(`FFmpeg exited with code ${code}`));
                }

                try {
                    // Replace raw original file with the compressed output
                    fs.moveSync(tempOutputPath, inputPath, { overwrite: true });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }
}

export default VideoQueue;