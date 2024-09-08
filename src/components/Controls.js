import React, { useState, useRef, useEffect } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import { tokenize, parse, translateToGLSL } from './EquationParser';

addMathquillStyles();

function Controls({ onEquationChange, onIterationsChange, onCutoffChange, onResetView }) {
    const [latexInput, setLatexInput] = useState('z^2 + c');
    const [iterations, setIterations] = useState(1000);
    const [cutoff, setCutoff] = useState(4.0);
    const [error, setError] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const timeoutRef = useRef(null);

    // Inject custom styles dynamically to override MathQuill styles
    useEffect(() => {
        const style = document.createElement("style");
        style.innerHTML = `
      .mq-editable-field,
      .mq-editable-field * {
        color: white !important;
        caret-color: white !important;
      }

      .mq-cursor {
        border-color: white !important;
      }
    `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style); // Clean up the style when the component unmounts
        };
    }, []);

    const handleInputChange = (mathField) => {
        const inputEquation = mathField.latex();
        setLatexInput(inputEquation);

        clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            try {
                const jsEquation = convertLatexToJS(inputEquation);
                const tokens = tokenize(jsEquation);
                const syntaxTree = parse(tokens);
                const glslCode = translateToGLSL(syntaxTree);

                onEquationChange(glslCode);
                setError(null);
            } catch (error) {
                setError(error.message);
            }
        }, 300);
    };

    function convertLatexToJS(latex) {
        let jsEquation = latex;
        const latexToFunctionMap = {
            'cdot': '*',
            '\\sin': 'sin',
            '\\cos': 'cos',
            '\\tan': 'tan',
            '\\exp': 'exp',
            '\\log': 'log',
            '\\sqrt': 'sqrt'
        };

        // Replace LaTeX functions with JavaScript equivalents
        for (const [latexFunc, glslFunc] of Object.entries(latexToFunctionMap)) {
            jsEquation = jsEquation.replace(new RegExp(latexFunc, 'g'), glslFunc);
        }

        // Convert fractions
        jsEquation = jsEquation.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1 / $2)');

        // Remove \left and \right
        jsEquation = jsEquation.replace(/\\left/g, '');
        jsEquation = jsEquation.replace(/\\right/g, '');

        // Remove \text
        jsEquation = jsEquation.replace(/\\text\{([^}]*)\}/g, '$1');

        // Replace exponentiation and handle grouping
        jsEquation = jsEquation.replace(/\{([^}]*)\}/g, '($1)'); // Replace all curly braces with parentheses
        jsEquation = jsEquation.replace(/\^/g, '**'); // Replace ^ with ** for exponentiation

        // Remove backslashes
        jsEquation = jsEquation.replace(/\\/g, '');

        // Convert curly braces to parentheses
        jsEquation = jsEquation.replace(/\{/g, '(');
        jsEquation = jsEquation.replace(/\}/g, ')');

        return jsEquation;
    }

    useEffect(() => {
        handleInputChange({ latex: () => latexInput });
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const handleIterationsChange = (event) => {
        const newIterations = parseInt(event.target.value, 10);
        setIterations(newIterations);
        onIterationsChange(newIterations);
    };

    const handleCutoffChange = (event) => {
        const newCutoff = parseFloat(event.target.value);
        setCutoff(newCutoff);
        onCutoffChange(newCutoff);
    };

    return (
        <div className={`absolute top-16 left-0 z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'} bg-gray-800 text-white shadow-md h-full flex flex-col`}>
            <button
                className="p-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-tr-md rounded-br-md transition"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? '>' : '< < <'}
            </button>
            {!isCollapsed && (
                <div className="p-4 space-y-4">
                    <label htmlFor="equation" className="block text-sm font-semibold">
                        Fractal Equation:
                    </label>
                    <MathQuill
                        latex={latexInput}
                        onChange={handleInputChange}
                        className="mathquill-input p-2 w-full bg-gray-700 rounded text-white"
                    />
                    {error && <div className="text-red-400 mt-2">{error}</div>}

                    <div className="mt-4">
                        <label htmlFor="iterations" className="text-sm font-semibold flex items-center">
                            Iterations
                            <span className="tooltip">
                                <span className="tooltip-icon">i</span>
                                <span className="tooltip-text">Controls the number of iterations for the fractal calculation. Higher values produce more detail but can be slower to compute.</span>
                            </span>
                        </label>
                        <input
                            id="iterations"
                            type="number"
                            min="1"
                            value={iterations}
                            onChange={handleIterationsChange}
                            className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
                        />
                    </div>

                    <div className="mt-4">
                        <label htmlFor="cutoff" className="text-sm font-semibold flex items-center">
                            Cut-off Value
                            <span className="tooltip">
                                <span className="tooltip-icon">i</span>
                                <span className="tooltip-text">Sets the escape radius or threshold for the fractal calculation. Points beyond this value are considered outside the set.</span>
                            </span>
                        </label>
                        <input
                            id="cutoff"
                            type="number"
                            min="0"
                            step="0.1"
                            value={cutoff}
                            onChange={handleCutoffChange}
                            className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
                        />
                    </div>

                    <button
                        onClick={onResetView}
                        className="mt-4 p-2 bg-blue-500 rounded text-white hover:bg-blue-400"
                    >
                        Return to Default View
                    </button>
                </div>
            )}
        </div>
    );
}

export default Controls;