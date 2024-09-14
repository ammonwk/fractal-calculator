import React, { useRef, useEffect, useState } from 'react';

function DraggableBead({ canvasRef, juliaParam, setJuliaParam }) {
    const beadRef = useRef();
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !canvasRef.current) return;

            const canvasRect = canvasRef.current.getBoundingClientRect();
            // Calculate the new Julia set parameters based on the bead's position
            const x = (e.clientX - canvasRect.left) / canvasRect.width * 2 - 1;
            const y = (e.clientY - canvasRect.top) / canvasRect.height * -2 + 1;

            // Update the Julia set parameter
            setJuliaParam({ x, y });

            // Update bead position
            beadRef.current.style.left = `${e.clientX - canvasRect.left}px`;
            beadRef.current.style.top = `${e.clientY - canvasRect.top}px`;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        // Attach event listeners to the window object
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            // Clean up event listeners
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, canvasRef, setJuliaParam]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
    };

    return (
        <div
            ref={beadRef}
            onMouseDown={handleMouseDown}
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
