import React, { useState, useRef, useEffect } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import { tokenize, parse, translateToGLSL } from './EquationParser';

addMathquillStyles();

function Controls({ onEquationChange }) {
    const [latexInput, setLatexInput] = useState('z^2 + c');
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

                console.log("inputEquation: ", inputEquation);
                const jsEquation = convertLatexToJS(inputEquation);
                console.log("jsEquation: ", jsEquation);
                const tokens = tokenize(jsEquation);
                console.log("tokens: ", tokens);
                const syntaxTree = parse(tokens);
                console.log("syntaxTree: ", syntaxTree);
                const glslCode = translateToGLSL(syntaxTree);
                console.log("glslCode: ", glslCode);

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
                </div>
            )}
        </div>
    );
}

export default Controls;
