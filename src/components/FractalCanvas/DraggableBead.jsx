import React, { useRef, useEffect, useState } from 'react';

function DraggableBead({ canvasRef, juliaParam, setJuliaParam }) {
    const beadRef = useRef();
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!isDragging) return; // Only attach listeners when dragging

        const handleMove = (clientX, clientY) => {
            if (!canvasRef.current) return;

            const canvasRect = canvasRef.current.getBoundingClientRect();
            // Calculate the new Julia set parameters based on the bead's position
            const x = (clientX - canvasRect.left) / canvasRect.width * 2 - 1;
            const y = (clientY - canvasRect.top) / canvasRect.height * -2 + 1;

            // Update the Julia set parameter
            setJuliaParam({ x, y });

            // Update bead position
            beadRef.current.style.left = `${clientX - canvasRect.left}px`;
            beadRef.current.style.top = `${clientY - canvasRect.top}px`;
        };

        const handleMouseMove = (e) => {
            e.preventDefault(); // Prevent text selection
            handleMove(e.clientX, e.clientY);
        };

        const handleTouchMove = (e) => {
            e.preventDefault(); // Prevent scrolling
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        // Attach event listeners to the document object only while dragging
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            // Clean up event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, canvasRef, setJuliaParam]);

    const handleMouseDown = (e) => {
        e.preventDefault(); // Prevent default actions like text selection
        setIsDragging(true);
    };

    const handleTouchStart = (e) => {
        e.preventDefault(); // Prevent scrolling on touch devices
        setIsDragging(true);
    };

    return (
        <div
            ref={beadRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
                position: 'absolute',
                width: '15px',
                height: '15px',
                backgroundColor: 'white',
                borderRadius: '50%',
                border: '3px solid black',
                cursor: 'pointer',
                left: `${(juliaParam.x + 1) * 50}%`, // Initial position
                top: `${(-juliaParam.y + 1) * 50}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
            }}
        />
    );
}

export default DraggableBead;
