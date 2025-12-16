// Tooltip.js
import React from 'react';
import ReactDOM from 'react-dom';

const Tooltip = ({ content, position, visible }) => {
    const tooltipStyles = {
        position: 'fixed',
        backgroundColor: 'black',
        color: '#fff',
        padding: '5px',
        borderRadius: '6px',
        maxWidth: '200px',
        textAlign: 'center',
        // whiteSpace: 'nowrap',
        zIndex: 1000,
        top: position.top,
        left: position.left,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none' // Prevents the tooltip from blocking mouse events
    };

    // Render the tooltip to the body using a portal
    return ReactDOM.createPortal(
        <div style={tooltipStyles}>
            {content}
        </div>,
        document.body
    );
};

export default Tooltip;
