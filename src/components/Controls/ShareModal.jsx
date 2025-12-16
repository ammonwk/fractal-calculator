import React, { useState, useEffect } from 'react';

function ShareModal({ shareUrl, onClose, initialPosition }) {
  const [position, setPosition] = useState(initialPosition);
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
      })
      .catch(() => {
        setCopyButtonText('Failed to Copy');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
      });
  };

  return (
    <>
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-999" onClick={onClose}></div>

      {/* Modal Content */}
      <div
        className="fixed transition-all transform modal-enter bg-gray-900 border border-gray-600 shadow-lg p-5 rounded-lg text-center max-w-xs z-1000"
        style={{
          top: position.y,
          left: position.x,
          borderColor: '#1e3a8a',
          zIndex: 1000,
        }}
      >
        {/* Close Button in the Top Right Corner */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white hover:text-gray-400 transition"
          style={{
            fontSize: '1.2rem', // Make the 'x' larger
            lineHeight: '1', // Prevent button height from collapsing
            padding: '4px', // Add padding to make the button clickable
            cursor: 'pointer', // Change cursor to pointer for interactivity
          }}
        >
          &times;
        </button>

        <h3 className="text-sm font-medium mb-4 text-white">Share Your Fractal</h3>
        <div className="flex items-center mb-3">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="border border-gray-600 rounded-lg p-2 flex-grow mr-2 text-xs bg-gray-700 text-white"
            style={{ borderColor: '#1e3a8a' }}
          />
          <button
            onClick={handleCopyLink}
            className="bg-[#3b82f6] text-white rounded-lg px-3 py-1 text-xs hover:bg-[#2563eb] flex items-center transition button-hover"
          >
            <i className="fas fa-copy mr-1"></i> {copyButtonText}
          </button>
        </div>
      </div>
    </>
  );
}

export default ShareModal;
