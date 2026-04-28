export const FullScreenLoader = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            color: '#fff',
            fontFamily: 'system-ui'
        }}>
            {/* Animated Spinner */}
            <div className="spinner" style={{
                width: '50px',
                height: '50px',
                border: '5px solid #333',
                borderTop: '5px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px'
            }} />
            <h2 style={{ margin: 0 }}>Uploading Video...</h2>

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};