import React, { useState, useEffect, useRef } from 'react';
import { VideoTrimBar } from './video-trim-bar';

export function VideoCutterPlayer({ selectedVideo, userName, apiBaseUrl, onDownload }) {
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef(null);

    // Reset trimming ranges completely when switching videos
    useEffect(() => {
        setStartTime(0);
        setEndTime(0);
        setDuration(0);
        setCurrentTime(0);
    }, [selectedVideo]);

    // Sync the video playhead back to start whenever the user adjusts the left trim boundary
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = startTime;
        }
    }, [startTime]);

    // Smooth playhead tracking & active timeline loop boundary enforcement
    useEffect(() => {
        let animationFrameId;

        const updateSmoothTime = () => {
            if (videoRef.current && !videoRef.current.paused) {
                const time = videoRef.current.currentTime;
                setCurrentTime(time);

                // Keep the playback bounded within our trimmed range markers safely
                if (time >= endTime) {
                    videoRef.current.currentTime = startTime;
                }
                if (time < startTime) {
                    videoRef.current.currentTime = startTime;
                }
            }
            animationFrameId = requestAnimationFrame(updateSmoothTime);
        };

        animationFrameId = requestAnimationFrame(updateSmoothTime);
        return () => cancelAnimationFrame(animationFrameId);
    }, [startTime, endTime]);

    // Global spacebar keydown hotkey handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (
                document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                document.activeElement.isContentEditable
            ) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();

                if (videoRef.current) {
                    if (videoRef.current.paused) {
                        videoRef.current.play().catch(err => console.log("Playback interrupted:", err));
                    } else {
                        videoRef.current.pause();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handlePlayheadSeek = (newTime) => {
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    return (
        <div
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
        >
            <video
                ref={videoRef}
                muted
                autoPlay
                key={selectedVideo}
                controls
                style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain' }}
                onLoadedMetadata={(e) => {
                    const dur = e.target.duration;
                    setDuration(dur);
                    setEndTime(dur);
                }}
            >
                <source
                    src={`${apiBaseUrl}/stream/${userName}/${encodeURIComponent(selectedVideo)}`}
                    type="video/mp4"
                />
            </video>

            <VideoTrimBar
                duration={duration}
                currentTime={currentTime}
                startTime={startTime}
                endTime={endTime}
                onChangeStart={setStartTime}
                onChangeEnd={setEndTime}
                onPlayheadSeek={handlePlayheadSeek}
            />

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <button
                    style={{
                        background: '#007bff',
                        border: 'none',
                        color: '#fff',
                        padding: '5px 20px',
                        borderRadius: '20px',
                        cursor: 'pointer'
                    }}
                    onClick={() => onDownload(startTime, endTime)}
                >
                    Download
                </button>
            </div>
        </div>
    );
}