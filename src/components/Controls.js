import React, { useState, useRef, useEffect } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import { tokenize, parse, translateToGLSL } from './EquationParser';
import VariableControl from './VariableControl';

addMathquillStyles();

function Controls({ onEquationChange, iterations, onIterationsChange, cutoff, onCutoffChange, onColorSchemeChange, onResetView, variables, onVariableChange, onVariableDelete, onNewVariable, fxaaIntensity, setFxaaIntensity }) {
    const [latexInput, setLatexInput] = useState('z^2 + c');
    const [error, setError] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [colorScheme, setColorScheme] = useState('Smooth Gradient');
    const timeoutRef = useRef(null);

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
            document.head.removeChild(style);
        };
    }, []);

    const handleInputChange = (mathField) => {
        const inputEquation = mathField.latex();
        setLatexInput(inputEquation);

        clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            try {
                const jsEquation = convertLatexToJS(inputEquation);
                const tokens = tokenize(jsEquation, Object.keys(variables));

                const replacedTokens = tokens.map(token => {
                    if (variables.hasOwnProperty(token)) {
                        return variables[token].value;
                    }
                    return token;
                });

                const syntaxTree = parse(replacedTokens);
                const glslCode = translateToGLSL(syntaxTree);

                onEquationChange(glslCode);
                setError(null);
            } catch (error) {
                if (error.message.includes("Invalid variable")) {
                    const variableName = error.message.match(/'([^']+)'/)[1];
                    setError({
                        message: `No variable "${variableName}" has been declared.`,
                        variableName
                    });
                } else {
                    setError({ message: error.message });
                }
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

        for (const [latexFunc, glslFunc] of Object.entries(latexToFunctionMap)) {
            jsEquation = jsEquation.replace(new RegExp(latexFunc, 'g'), glslFunc);
        }

        jsEquation = jsEquation.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1 / $2)');
        jsEquation = jsEquation.replace(/\\left/g, '');
        jsEquation = jsEquation.replace(/\\right/g, '');
        jsEquation = jsEquation.replace(/\\text\{([^}]*)\}/g, '$1');
        jsEquation = jsEquation.replace(/\{([^}]*)\}/g, '($1)');
        jsEquation = jsEquation.replace(/\^/g, '**');
        jsEquation = jsEquation.replace(/\\/g, '');
        jsEquation = jsEquation.replace(/\{/g, '(');
        jsEquation = jsEquation.replace(/\}/g, ')');

        return jsEquation;
    }

    useEffect(() => {
        handleInputChange({ latex: () => latexInput });
        return () => clearTimeout(timeoutRef.current);
    }, [variables]);

    const handleIterationsChange = (event) => {
        const newIterations = parseInt(event.target.value, 10);
        onIterationsChange(newIterations);
    };

    const handleCutoffChange = (event) => {
        const newCutoff = parseFloat(event.target.value);
        onCutoffChange(newCutoff);
    };

    const handleColorSchemeChange = (event) => {
        const newColorScheme = event.target.value;
        setColorScheme(newColorScheme);
        onColorSchemeChange(newColorScheme);
    };

    const handleCreateVariable = (variableName) => {
        onNewVariable(variableName);
        setError(null);
    };

    // Handle sharpness change
    const handleSharpnessChange = (event) => {
        const newFxaaIntensity = parseFloat(event.target.value);
        setFxaaIntensity(newFxaaIntensity);
    };

    return (
        <div className={`canvas-container ${isCollapsed ? 'w-16 delay-300' : 'w-64 delay-0'} transition-width duration-300`}>
            <div
                className={`absolute w-64 flex-none transition-all duration-300 ease-in-out ${isCollapsed ? '-translate-x-48' : 'translate-x-0'} bg-gray-800 text-white shadow-md h-full flex flex-col overflow-hidden`}
            >
                <button
                    className={`p-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-tr-md rounded-br-md transition pt-16 ${isCollapsed ? 'text-right pr-7' : 'text-center'
                        }`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? '>' : '< < <'}
                </button>
                <div
                    className={`p-4 space-y-4 overflow-y-auto transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
                >
                    <label htmlFor="equation" className="block text-sm font-semibold">
                        Fractal Equation:
                    </label>
                    <MathQuill
                        latex={latexInput}
                        onChange={handleInputChange}
                        className="mathquill-input p-2 w-full bg-gray-700 rounded text-white"
                    />
                    {error && (
                        <div className="text-red-400 mt-2">
                            {error.message}
                            {error.variableName && (
                                <button
                                    className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-400"
                                    onClick={() => handleCreateVariable(error.variableName)}
                                >
                                    Create Variable
                                </button>
                            )}
                        </div>
                    )}

                    {/* Variable Controls */}
                    {Object.keys(variables).map((variableName) => (
                        <VariableControl
                            key={variableName}
                            name={variableName}
                            variable={variables[variableName]}
                            onVariableChange={onVariableChange}
                            onVariableDelete={onVariableDelete}
                        />
                    ))}
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

                    <div className="mt-4">
                        <label htmlFor="color-scheme" className="text-sm font-semibold">
                            Color Scheme:
                        </label>
                        <select
                            id="color-scheme"
                            value={colorScheme}
                            onChange={handleColorSchemeChange}
                            className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
                        >
                            <option>Rainbow</option>
                            <option>Snowflake</option>
                            <option>Watercolors</option>
                            <option>Night Sky</option>
                            <option>Neon Sign</option>
                        </select>
                    </div>

                    {/* Sharpness Control */}
                    <div className="mt-4">
                        <label htmlFor="sharpness" className="text-sm font-semibold">
                            Sharpness:
                        </label>
                        <input
                            id="sharpness"
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={fxaaIntensity}
                            onChange={handleSharpnessChange}
                            className="w-full mt-1"
                        />
                    </div>

                    <button
                        onClick={onResetView}
                        className="mt-4 p-2 bg-blue-500 rounded text-white hover:bg-blue-400"
                    >
                        Return to Default View
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Controls;
