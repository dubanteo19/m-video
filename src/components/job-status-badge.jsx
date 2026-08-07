import React from "react";

export function JobStatusBadge({ jobStatus }) {
  if (!jobStatus) return null;

  const { status, queuePosition, time, error } = jobStatus;

  // Configuration map for styles, icons, and labels
  const statusConfig = {
    queued: {
      bg: "#f3f4f6",
      color: "#4b5563",
      border: "#e5e7eb",
      label: `Queued #${queuePosition ?? 1}`,
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    processing: {
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
      label: "Starting...",
      animated: true,
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ),
    },
    progress: {
      bg: "#e0f2fe",
      color: "#0369a1",
      border: "#bae6fd",
      label: time || "Compressing...",
      animated: true,
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    failed: {
      bg: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
      label: "Failed",
      title: error || "Processing failed",
      icon: (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
  };

  const config = statusConfig[status] || statusConfig.queued;

  return (
    <>
      {/* Inline styles for CSS keyframe animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>

      <div
        title={config.title || ""}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          borderRadius: "12px",
          fontSize: "0.72rem",
          fontWeight: 600,
          lineHeight: 1,
          backgroundColor: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums", // Prevents text jitter as time changes
          transition: "all 0.2s ease-in-out",
        }}
      >
        {config.icon}
        <span>{config.label}</span>
      </div>
    </>
  );
}
