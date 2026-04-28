import React, { useState } from 'react';
import { UploadIcon } from './icons/upload-icon';
export const FileUploader = ({ onUploadFiles }) => {
    const [dragOver, setDragOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUploadFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
        }
    };

    return (
        <div
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ width: '100%', marginTop: '10px', height: '100%' }}
        >
            <label htmlFor="file-upload" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                width: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: dragOver ? '#ffffff' : '#007bff',
                background: dragOver ? '#007bff' : 'transparent',
                border: dragOver ? '2px solid #0056b3' : '2px dashed #007bff',
                boxShadow: dragOver ? '0 0 15px rgba(0,123,255,0.4)' : 'none',
                transform: dragOver ? 'scale(1.02)' : 'scale(1)',
                animation: dragOver ? 'pulse 1.5s infinite' : 'none',
                borderRadius: '8px'
            }}>
                <span style={{ textAlign: 'center', marginBottom: '10px' }}>
                    {dragOver ? 'Release to upload' : 'Drop videos or click'}
                </span>
                <UploadIcon width="32px" height="32px" />
            </label>
            <input
                accept="video/*"
                type="file"
                multiple
                onChange={handleChange}
                style={{ display: 'none' }}
                id="file-upload"
            />
        </div>
    );
};
