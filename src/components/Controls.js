import React, { useState, useRef, useEffect } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import { tokenize, parse, translateToGLSL } from './EquationParser';
import VariableControl from './VariableControl';

addMathquillStyles();

function Controls({ onEquationChange, onIterationsChange, onCutoffChange, onColorSchemeChange, onResetView, variables, onVariableChange, onVariableDelete, onNewVariable }) {
    const [latexInput, setLatexInput] = useState('z^2 + c');
    const [iterations, setIterations] = useState(1000);
    const [cutoff, setCutoff] = useState(4.0);
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
                // console.log("inputEquation: ", inputEquation);
                const jsEquation = convertLatexToJS(inputEquation);
                // console.log("jsEquation: ", jsEquation);
                const tokens = tokenize(jsEquation, Object.keys(variables));
                // console.log("tokens: ", tokens);

                // Swap out any member of variables with the variable's value
                const replacedTokens = tokens.map(token => {
                    if (variables.hasOwnProperty(token)) {
                        return variables[token].value; // Replace token with its value
                    }
                    return token; // Leave token unchanged if it's not in variables
                });

                console.log("replacedTokens: ", replacedTokens);
                const syntaxTree = parse(replacedTokens);
                // console.log("syntaxTree: ", syntaxTree);
                const glslCode = translateToGLSL(syntaxTree);
                console.log("glslCode: ", glslCode);

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
        setIterations(newIterations);
        onIterationsChange(newIterations);
    };

    const handleCutoffChange = (event) => {
        const newCutoff = parseFloat(event.target.value);
        setCutoff(newCutoff);
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

    return (
        <div className={`relative flex-none transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'} bg-gray-800 text-white shadow-md h-full flex flex-col overflow-hidden`}>
            <button
                className="p-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-tr-md rounded-br-md transition"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? '>' : '< < <'}
            </button>
            {!isCollapsed && (
                <div className="p-4 space-y-4 overflow-y-auto">
                    <label htmlFor="equation" className="block text-sm font-semibold pt-6">
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
