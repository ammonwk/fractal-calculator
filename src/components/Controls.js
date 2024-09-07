import React, { useState, useEffect, useRef } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import './Controls.css'; // Import the CSS file
import { tokenize, parse, translateToGLSL } from './EquationParser';

addMathquillStyles(); // Add MathQuill styles to your project

function Controls({ onEquationChange }) {
    const [latexInput, setLatexInput] = useState('\\text{z}^2 + \\text{c}');
    const [error, setError] = useState(null);
    const timeoutRef = useRef(null);

    const handleInputChange = (mathField) => {
        const inputEquation = mathField.latex();
        setLatexInput(inputEquation);

        // Clear any existing timeout to prevent rapid re-evaluations
        clearTimeout(timeoutRef.current);

        // Set a new timeout to trigger parsing after a short delay
        timeoutRef.current = setTimeout(() => {
            try {
                // Convert LaTeX to JavaScript readable format
                const jsEquation = convertLatexToJS(inputEquation);

                // Attempt to tokenize, parse, and translate the user input
                console.log("inputEquation: ", inputEquation);
                console.log("jsEquation: ", jsEquation);
                const tokens = tokenize(jsEquation);
                console.log("tokens: ", tokens);
                const syntaxTree = parse(tokens);
                console.log("syntaxTree: ", syntaxTree);
                const glslCode = translateToGLSL(syntaxTree);
                console.log("glslCode: ", glslCode);

                // Update the equation and clear any previous errors
                onEquationChange(glslCode);
                setError(null);
            } catch (error) {
                // Catch any parsing errors and set the error message
                setError(error.message);
            }
        }, 300); // Adjust delay (in milliseconds) as needed for responsiveness
    };

    // Convert LaTeX to a JavaScript-friendly equation string
    const latexToFunctionMap = {
        '\\sin': 'sin',
        '\\cos': 'cos',
        '\\tan': 'tan',
        '\\exp': 'exp',
        '\\log': 'log',
        '\\sqrt': 'sqrt'
    };

    function convertLatexToJS(latex) {
        // Replace LaTeX function names with JavaScript/GLSL equivalents
        let jsEquation = latex;

        // Replace all LaTeX functions in the string with corresponding GLSL functions
        for (const [latexFunc, glslFunc] of Object.entries(latexToFunctionMap)) {
            jsEquation = jsEquation.replace(new RegExp(latexFunc, 'g'), glslFunc);
        }

        // Handle fractions by converting "\frac{a}{b}" to "(a / b)"
        jsEquation = jsEquation.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1 / $2)');

        // Convert "\sqrt{z}" to "sqrt(z)"
        jsEquation = jsEquation.replace(/sqrt\{([^}]*)\}/g, 'sqrt($1)');

        // Remove LaTeX-specific formatting characters like \left and \right
        jsEquation = jsEquation.replace(/\\left/g, '');
        jsEquation = jsEquation.replace(/\\right/g, '');

        // Remove \text{} commands and their contents
        jsEquation = jsEquation.replace(/\\text\{([^}]*)\}/g, '$1'); // Keep the content inside \text{} and remove the \text command

        // Replace LaTeX power operator '^' with '**'
        jsEquation = jsEquation.replace(/\^/g, '**');

        // Remove any remaining unsupported LaTeX commands
        jsEquation = jsEquation.replace(/\\/g, ''); // Remove any remaining backslashes

        console.log(latex, '=>', jsEquation);
        return jsEquation;
    }

    // Set initial equation and clear timeout on component unmount
    useEffect(() => {
        handleInputChange({ latex: () => latexInput });
        return () => clearTimeout(timeoutRef.current);
    });

    return (
        <div className="controls">
            <label htmlFor="equation" className="equation-label">
                Fractal Equation:
            </label>
            <MathQuill
                latex={latexInput}
                onChange={handleInputChange}
                className="mathquill-input"
            />

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
        </div>
    );
}

export default Controls;