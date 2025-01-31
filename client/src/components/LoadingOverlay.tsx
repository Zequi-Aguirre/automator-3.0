import React from 'react';

const LoadingOverlay: React.FC = () => (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(2,21,64,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    }}>
        <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        }} />
        <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    </div>
);

export default LoadingOverlay;