import { useState, useRef, useEffect } from "react";
import { ShareIcon } from "./icons/share-icon";
import { JobStatusBadge } from "./job-status-badge";
import { DownloadIcon } from "./icons/donwload-icon";

export const VideoItem = ({
  file,
  isSelected,
  isUploader,
  onSelect,
  onDelete,
  onRename,
  onShareLink,
  isHighlighted,
  jobStatus,
  onDownload,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef(null);
  const filename = file.name;
  const getDisplayName = (name) => {
    if (!name) return "";
    return name.toLowerCase().endsWith(".mp4") ? name.slice(0, -4) : name;
  };

  const displayName = getDisplayName(filename);
  // Focus and select all text inside when user activates editing mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      // Optional: Select text natively across browsers
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    let newName = textRef.current?.innerText.trim();

    if (newName && newName !== displayName) {
      // Ensure the renamed string preserves the extension for the system
      if (!newName.toLowerCase().endsWith(".mp4")) {
        newName += ".mp4";
      }
      if (onRename) {
        onRename(filename, newName);
      }
    } else if (textRef.current) {
      textRef.current.innerText = displayName;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Stop creating newlines
      textRef.current.blur(); // Triggers handleBlur automatically
    }
    if (e.key === "Escape") {
      if (textRef.current) textRef.current.innerText = filename; // Revert
      setIsEditing(false);
    }
  };
  // Styles defined as objects for cleaner JSX
  const containerStyle = {
    position: "relative",
    padding: "10px",
    margin: "5px 0",
    borderRadius: "5px",
    background: isSelected ? "#007bff" : isHovered ? "#e9ecef" : "#eee",
    color: isSelected ? "white" : "black",
    cursor: "pointer",
    wordBreak: "break-all",
    paddingRight: isUploader ? "35px" : "10px",
    transition: "background 0.2s ease",
    border: isHighlighted ? "2px solid #ff4d4d" : "2px solid transparent",
    animation: isHighlighted ? "shake 0.5s" : "none",
  };

  const shareButtonStyle = {
    position: "absolute",
    top: "0px",
    display: "flex",
    alignItems: "center",
    gap: "2px",
    left: "0px",
  };

  const deleteButtonStyle = {
    position: "absolute",
    top: "0px",
    right: "0px",
    zIndex: 1000,
    opacity: isHovered || isSelected ? 1 : 0.5,
    transition: "all 0.2s ease",
  };

  const iconBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    background: "#FFFFFF",
    color: "#4B5563",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
  };
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  return (
    <div
      style={containerStyle}
      tabIndex={0}
      onClick={() => !isEditing && onSelect(filename)}
      onKeyDown={(e) => {
        if (e.key === "F2" && !isEditing) {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "3px",
        }}
      >
        <span
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onDoubleClick={(e) => {
            e.stopPropagation(); // Prevents triggers selection active state
            setIsEditing(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => isEditing && e.stopPropagation()} // Blocks clicks leaking during edit
          style={{
            outline: isEditing ? "1px solid #007bff" : "none",
            background: isEditing ? "#fff" : "transparent",
            color: isEditing ? "#000" : "inherit",
            padding: isEditing ? "2px 4px" : "0",
            borderRadius: "3px",
            display: "inline-block",
            minWidth: "100px",
          }}
        >
          {displayName}
        </span>
        <JobStatusBadge jobStatus={jobStatus} />
        <span
          style={{
            color: isSelected ? "yellow" : "red",
            flex: "0 0 auto",
            fontStyle: "italic",
            fontSize: "11px",
            display: "inline-block",
          }}
        >
          {formatBytes(file.size)}
        </span>
      </div>
      {isHovered && !isEditing && (
        <div style={shareButtonStyle}>
          <button
            title="Download video"
            onClick={(e) => onDownload(filename)}
            style={iconBtnStyle}
          >
            <DownloadIcon />
          </button>

          <button
            title="Share link"
            style={{
              ...iconBtnStyle,
              transition: "all 0.2s ease",
              ...(copied && {
                borderColor: "red",
                borderWidth: "2px",
                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.4)",
              }),
            }}
            onClick={(e) => {
              e.stopPropagation();
              setCopied(true);
              onShareLink(filename);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <ShareIcon />
          </button>
        </div>
      )}

      {isUploader && (
        <button
          title="Delete video"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(filename);
          }}
          style={{
            ...deleteButtonStyle,
            ...iconBtnStyle,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
