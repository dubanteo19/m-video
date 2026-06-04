import { useState } from 'react';
import { ShareIcon } from './icons/share-icon';

export const VideoItem = ({
    filename,
    isSelected,
    isUploader,
    onSelect,
    onDelete,
    onShareLink,
    isHighlighted
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    // Styles defined as objects for cleaner JSX
    const containerStyle = {
        position: 'relative',
        padding: '10px',
        margin: '5px 0',
        borderRadius: '5px',
        background: isSelected ? '#007bff' : isHovered ? '#e9ecef' : '#eee',
        color: isSelected ? 'white' : 'black',
        cursor: 'pointer',
        wordBreak: 'break-all',
        paddingRight: isUploader ? '35px' : '10px',
        transition: 'background 0.2s ease',
        border: isHighlighted ? '2px solid #ff4d4d' : '2px solid transparent',
        animation: isHighlighted ? 'shake 0.5s' : 'none'
    };

    const shareButtonStyle = {
        position: 'absolute',
        top: '0px',
        right: isUploader ? '30px' : '0px',
        padding: '3px',
        background: copied ? 'rgba(0, 255, 0, 0.15)' : 'rgba(0, 0, 0, 0.15)',
        borderRadius: '50%',
        transition: 'all 0.2s ease',
        border: 'none',
    };
    const deleteButtonStyle = {
        position: 'absolute',
        top: '0px',
        right: '0px',
        background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
        border: 'none',
        color: isSelected ? 'white' : '#ff4d4d',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: 1000,
        opacity: isHovered || isSelected ? 1 : 0.5,
        transition: 'all 0.2s ease',
    };


    return (
        <div
            style={containerStyle}
            onClick={() => onSelect(filename)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {filename}


            <button
                title="Share link"
                onClick={(e) => {
                    e.stopPropagation();
                    setCopied(true);
                    onShareLink(filename);
                    setTimeout(() => setCopied(false), 2000);
                }}
                style={shareButtonStyle}
            >
                <ShareIcon />
            </button>
            {isUploader && (
                <button
                    title="Delete video"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(filename);
                    }}
                    style={deleteButtonStyle}
                >
                    ✕
                </button>
            )}
        </div>
    );
};