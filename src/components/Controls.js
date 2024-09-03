import React, { useState, useEffect, useRef } from 'react';
import { tokenize, parse, translateToGLSL } from './EquationParser';

function Controls({ onEquationChange }) {
    const [userInput, setUserInput] = useState('z * z + c');
    const [error, setError] = useState(null);
    const timeoutRef = useRef(null);

    const handleInputChange = (inputEquation) => {
        setUserInput(inputEquation);

        // Clear any existing timeout to prevent rapid re-evaluations
        clearTimeout(timeoutRef.current);

        // Set a new timeout to trigger parsing after a short delay
        timeoutRef.current = setTimeout(() => {
            try {
                // Attempt to tokenize, parse, and translate the user input
                const tokens = tokenize(inputEquation);
                const syntaxTree = parse(tokens);
                const glslCode = translateToGLSL(syntaxTree);

                // Update the equation and clear any previous errors
                onEquationChange(glslCode);
                setError(null);
            } catch (error) {
                // Catch any parsing errors and set the error message
                setError(error.message);
            }
        }, 300); // Adjust delay (in milliseconds) as needed for responsiveness
    };

    // Set initial equation and clear timeout on component unmount
    useEffect(() => {
        handleInputChange('z * z + c');
        return () => clearTimeout(timeoutRef.current);
    }, []);

    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly darker background
            padding: '20px', // Increased padding
            borderRadius: '5px'
        }}>
            <label htmlFor="equation" style={{ color: 'white', display: 'block', marginBottom: '5px' }}>
                Fractal Equation:
            </label>
            <input
                id="equation"
                type="text"
                value={userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                style={{
                    width: '300px', // Increased width
                    padding: '8px', // Increased padding
                    borderRadius: '3px',
                    border: 'none',
                    fontSize: '16px' // Increased font size
                }}
            />

            {/* Display error message with improved styling */}
            {error && (
                <div style={{
                    color: '#ff4d4d', // Lighter red color
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)', // Subtle red background
                    border: '1px solid #ffcccc', // Light red border
                    borderRadius: '3px'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
}

export default Controls;