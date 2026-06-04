import React, { useRef } from 'react';

export function VideoTrimBar({ duration, startTime, endTime, currentTime = 0, onChangeStart, onChangeEnd, onPlayheadSeek }) {
    const barRef = useRef(null);

    // Helper to convert mouse position to seconds
    const getSecondsFromMouse = (clientX) => {
        if (!barRef.current || duration === 0) return 0;
        const rect = barRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
        return percentage * duration;
    };

    const handleHandleMouseDown = (type) => (e) => {
        e.preventDefault();

        const handleMouseMove = (moveEvent) => {
            const newTime = getSecondsFromMouse(moveEvent.clientX);
            if (type === 'start') {
                onChangeStart(Math.min(newTime, endTime - 0.5));
            } else {
                onChangeEnd(Math.max(newTime, startTime + 0.5));
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Convert seconds to MM:SS.S format
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
    };
    // Click handler for jumping directly to position
    const handleTrackZoneClick = (e) => {
        if (!onPlayheadSeek) return;
        const targetTime = getSecondsFromMouse(e.clientX);

        // Ensure the clicked time falls safely within our trimmed window boundaries
        const boundedTime = Math.max(startTime, Math.min(endTime, targetTime));
        onPlayheadSeek(boundedTime);
    };

    // Calculate percentages for positioning elements
    const startPercent = duration ? (startTime / duration) * 100 : 0;
    const endPercent = duration ? (endTime / duration) * 100 : 100;
    const currentPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div style={{ width: '98%', padding: '5px 10px 5px 10px', userSelect: 'none' }}>
            {/* Container timeline track */}
            <div
                ref={barRef}
                style={{
                    position: 'relative',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.15)', // Dimmed track outside bounds
                    borderRadius: '4px',
                    overflow: 'visible'
                }}
            >
                {/* Selected highlighted track zone */}
                <div
                    onClick={handleTrackZoneClick}
                    style={{
                        position: 'absolute',
                        left: `${startPercent}%`,
                        cursor: 'grab',
                        width: `${endPercent - startPercent}%`,
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.3)', // Active window area
                        borderTop: '2px solid #00E5FF',
                        borderBottom: '2px solid #00E5FF',
                    }}
                />

                {/* CURRENT PLAYBACK POSITION INDICATOR LINE & BUBBLE */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${currentPercent}%`,
                        width: '2px',
                        height: '40px',
                        background: '#fff',
                        zIndex: 3,
                        pointerEvents: 'none',
                        willChange: 'left'
                    }}
                >
                    {/* Floating Speech Bubble Tooltip aligned to Playhead */}
                    <div style={{
                        position: 'absolute',
                        top: '-34px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#fff',
                        color: '#000',
                        padding: '3px 8px',
                        borderRadius: '16px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        {formatTime(currentTime)}
                        {/* Little downward pointer tail anchor */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-5px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '5px solid #fff'
                        }} />
                    </div>
                </div>

                {/* LEFT / START HANDLE */}
                <div
                    onMouseDown={handleHandleMouseDown('start')}
                    style={{
                        position: 'absolute',
                        left: `${startPercent}%`,
                        transform: 'translateX(-50%)',
                        width: '14px',
                        height: '44px',
                        top: '-2px',
                        background: '#00E5FF',
                        borderRadius: '4px 0 0 4px',
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 4,
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {[1, 2, 3].map((i) => <div key={i} style={{ width: '2px', height: '2px', background: '#fff', borderRadius: '50%' }} />)}
                    </div>

                    {/* Start Time Timestamp */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '50%',
                        color: '#00E5FF',
                        transform: 'translateX(-50%)',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                    }}>
                        {formatTime(startTime)}
                    </div>
                </div>

                {/* RIGHT / END HANDLE */}
                <div
                    onMouseDown={handleHandleMouseDown('end')}
                    style={{
                        position: 'absolute',
                        left: `${endPercent}%`,
                        transform: 'translateX(-50%)',
                        width: '14px',
                        height: '44px',
                        top: '-2px',
                        background: '#00E5FF',
                        borderRadius: '0 4px 4px 0',
                        cursor: 'ew-resize',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 4,
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {[1, 2, 3].map((i) => <div key={i} style={{ width: '2px', height: '2px', background: '#fff', borderRadius: '50%' }} />)}
                    </div>

                    {/* End Time Timestamp */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '50%',
                        color: '#00E5FF',
                        transform: 'translateX(-50%)',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                    }}>
                        {formatTime(endTime)}
                    </div>
                </div>
            </div>

            {/* Underneath Bottom Timestamps */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', fontSize: '0.85rem', color: '#00E5FF', fontWeight: '500' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {formatTime(endTime - startTime)}
                </span>
            </div>
        </div>
    );
}