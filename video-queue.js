import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

class VideoQueue {
    constructor({
        ffmpegPath,
        ffprobePath,
        baseUploadDir,
        concurrency = 1
    }) {
        this.ffmpegPath = ffmpegPath;
        this.ffprobePath = ffprobePath;
        this.baseUploadDir = baseUploadDir;
        this.concurrency = concurrency;

        this.queue = [];
        this.activeWorkers = 0;

        // Stores SSE active client connections mapped by username
        this.clients = new Map();
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
        if (
            this.activeWorkers >= this.concurrency ||
            this.queue.length === 0
        ) {
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
                console.error(
                    `[Queue Error] Failed to compress ${job.filename}:`,
                    err
                );

                this.sendNotification(job.user, {
                    status: 'failed',
                    filename: job.filename,
                    error: err.message
                });
            })
            .finally(() => {
                this.activeWorkers--;
                this.processNext();
            });
    }

    _calculateProgress(outTimeUs, duration) {
        if (
            !Number.isFinite(outTimeUs) ||
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    (outTimeUs / 1_000_000 / duration) * 100
                )
            )
        );
    }

    // --- FFmpeg Worker ---
    async compressVideo(job) {
        const { user, filename, inputPath } = job;

        // Get original video duration first
        const duration = await this.getVideoDuration(inputPath);

        if (!Number.isFinite(duration) || duration <= 0) {
            throw new Error('Could not determine video duration');
        }

        const tempOutputPath = path.join(
            this.baseUploadDir,
            user,
            `compressed-${randomUUID()}.mp4`
        );

        this.sendNotification(user, {
            status: 'processing',
            filename
        });

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

            '-progress', 'pipe:2',

            '-y',
            tempOutputPath
        ];

        const ffmpegProcess = spawn(this.ffmpegPath, args);

        let progressBuffer = '';

        ffmpegProcess.stderr.on('data', (data) => {
            progressBuffer += data.toString();

            const lines = progressBuffer.split('\n');

            // Keep incomplete line for next chunk
            progressBuffer = lines.pop() || '';

            let outTimeUs = null;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) {
                    continue;
                }
                const separatorIndex = trimmed.indexOf('=');
                if (separatorIndex === -1) {
                    continue;
                }
                const key = trimmed.slice(0, separatorIndex);
                const value = trimmed.slice(separatorIndex + 1);
                if (key === 'out_time_us') {
                    outTimeUs = Number(value);
                }
                if (key === 'progress' && outTimeUs !== null) {
                    const progress = this._calculateProgress(
                        outTimeUs,
                        duration
                    );

                    this.sendNotification(user, {
                        status: 'progress',
                        filename,
                        progress
                    });

                    outTimeUs = null;
                }
            }
        });

        ffmpegProcess.on('error', (err) => {
            if (fs.existsSync(tempOutputPath)) {
                fs.unlinkSync(tempOutputPath);
            }

            throw err;
        });

        await new Promise((resolve, reject) => {
            ffmpegProcess.on('close', (code) => {
                if (code !== 0) {
                    if (fs.existsSync(tempOutputPath)) {
                        fs.unlinkSync(tempOutputPath);
                    }

                    reject(
                        new Error(
                            `FFmpeg exited with code ${code}`
                        )
                    );

                    return;
                }

                resolve();
            });

            ffmpegProcess.on('error', reject);
        });

        try {
            // Replace original with compressed file
            fs.moveSync(
                tempOutputPath,
                inputPath,
                { overwrite: true }
            );
        } catch (err) {
            if (fs.existsSync(tempOutputPath)) {
                fs.unlinkSync(tempOutputPath);
            }

            throw err;
        }
    }

    // --- FFprobe ---

    getVideoDuration(inputPath) {
        return new Promise((resolve, reject) => {
            const args = [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                inputPath
            ];

            const ffprobeProcess = spawn(
                this.ffprobePath,
                args
            );

            let output = '';

            ffprobeProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobeProcess.on('error', reject);

            ffprobeProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(
                        new Error(
                            `FFprobe exited with code ${code}`
                        )
                    );
                    return;
                }

                const duration = Number.parseFloat(
                    output.trim()
                );

                if (!Number.isFinite(duration)) {
                    reject(
                        new Error(
                            `Invalid video duration: ${output.trim()}`
                        )
                    );
                    return;
                }

                resolve(duration);
            });
        });
    }
}

export default VideoQueue;