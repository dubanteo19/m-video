export const ToggleSwitch = ({ isOn, onToggle }) => {
  return (
    <label
      style={{
        display: "inline-flex",
        bottom: "5px",
        left: "5px",
        position: "absolute",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 500,
        color: "#E2E8F0",
        userSelect: "none",
      }}
    >
      {/* Modern Toggle Switch */}
      <div
        onClick={onToggle}
        style={{
          position: "relative",
          width: "40px",
          height: "22px",
          borderRadius: "12px",
          backgroundColor: isOn ? "#00C853" : "#334155",
          transition: "background-color 0.2s ease",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: isOn ? "21px" : "3px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transition: "left 0.2s ease",
          }}
        />
      </div>

      <span>Enable trim video</span>
    </label>
  );
};
