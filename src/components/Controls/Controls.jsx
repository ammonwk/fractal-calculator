import React, { useState, useRef, useEffect } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import { tokenize, parse, translateToGLSL } from '../EquationParser/EquationParser';
import VariableControl from './VariableControl';
import ToggleSwitch from './ToggleSwitch';
import Tooltip from './Tooltip';

addMathquillStyles();

function Controls({
    onEquationChange,
    iterations,
    onIterationsChange,
    cutoff,
    onCutoffChange,
    onColorSchemeChange,
    onResetView,
    variables,
    onVariableChange,
    onVariableDelete,
    onNewVariable,
    fxaaIntensity,
    setFxaaIntensity,
    pixelSize,
    setPixelSize,
    graphicsQuality,
    setGraphicsQuality,
    isJuliaSet,
    handleToggleChange
}) {
    const [latexInput, setLatexInput] = useState('z^2 + c');
    const [error, setError] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [colorScheme, setColorScheme] = useState('Smooth Gradient');
    const [isExpanded, setIsExpanded] = useState(false);
    const timeoutRef = useRef(null);

    // State for managing tooltip
    const [tooltip, setTooltip] = useState({ visible: false, content: '', position: { top: 0, left: 0 } });

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
                const replacedTokens = tokens.map(token => (variables.hasOwnProperty(token) ? variables[token].value : token));
                const syntaxTree = parse(replacedTokens);
                const glslCode = translateToGLSL(syntaxTree);
                onEquationChange(glslCode);
                setError(null);
            } catch (error) {
                if (error.message.includes("Invalid variable")) {
                    const variableName = error.message.match(/'([^']+)'/)[1];
                    setError({ message: `No variable "${variableName}" has been declared.`, variableName });
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
        jsEquation = jsEquation.replace(/\\left/g, '').replace(/\\right/g, '').replace(/\\text\{([^}]*)\}/g, '$1').replace(/\{([^}]*)\}/g, '($1)').replace(/\^/g, '**').replace(/\\/g, '').replace(/\{/g, '(').replace(/\}/g, ')');
        return jsEquation;
    }

    useEffect(() => {
        handleInputChange({ latex: () => latexInput });
        return () => clearTimeout(timeoutRef.current);
    }, [variables]);

    const handleIterationsChange = (event) => onIterationsChange(parseInt(event.target.value, 10));
    const handleCutoffChange = (event) => onCutoffChange(parseFloat(event.target.value));
    const handleColorSchemeChange = (event) => {
        const newColorScheme = event.target.value;
        setColorScheme(newColorScheme);
        onColorSchemeChange(newColorScheme);
    };
    const handleCreateVariable = (variableName) => {
        onNewVariable(variableName);
        setError(null);
    };
    const handleSharpnessChange = (event) => setFxaaIntensity(parseFloat(event.target.value));

    const handlePixelSizeChange = (event) => setPixelSize(parseInt(event.target.value, 10));

    const getGraphicsQualityText = () => {
        if (graphicsQuality > 75) return 'High Definition';
        if (graphicsQuality > 50) return 'Balanced';
        if (graphicsQuality > 25) return 'Performance';
        return 'Fast Rendering';
    };

    const toggleExpand = () => setIsExpanded(!isExpanded);

    // Handle mouse hover for tooltip
    const handleMouseEnter = (content, event) => {
        const { clientX, clientY } = event;
        setTooltip({
            visible: true,
            content,
            position: { top: clientY, left: clientX + 10 } // Adjust position slightly to the right
        });
    };

    const handleMouseLeave = () => {
        setTooltip({ ...tooltip, visible: false });
    };

    return (
        <div className={`canvas-container ${isCollapsed ? 'w-16 delay-300' : 'w-64 delay-0'} transition-width duration-300`}>
            <div className={`absolute w-64 flex-none transition-all duration-300 ease-in-out ${isCollapsed ? '-translate-x-48' : 'translate-x-0'} bg-gray-800 text-white shadow-md h-full flex flex-col overflow-hidden`}>
                <button className={`p-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-tr-md rounded-br-md transition pt-16 ${isCollapsed ? 'text-right pr-7' : 'text-center'}`} onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? '>' : '< < <'}</button>
                <div className={`p-4 space-y-4 overflow-y-auto transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <label htmlFor="equation" className="block text-sm font-semibold">
                        Fractal Equation:
                        <span
                            className="tooltip"
                            onMouseEnter={(e) => handleMouseEnter("Enter the equation defining the fractal. You can use variables, mathematical functions, and constants.", e)}
                            onMouseLeave={handleMouseLeave}
                        >
                            <span className="tooltip-icon">i</span>
                        </span>
                    </label>
                    <MathQuill latex={latexInput} onChange={handleInputChange} className="mathquill-input p-2 w-full bg-gray-700 rounded text-white" />
                    {error && (
                        <div className="text-red-400 mt-2">
                            {error.message}
                            {error.variableName && (
                                <button className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-400" onClick={() => handleCreateVariable(error.variableName)}>Create Variable</button>
                            )}
                        </div>
                    )}
                    <div className="mt-4">
                        <label className="text-sm font-semibold flex items-center">
                            Fractal Type:
                            <span
                                className="tooltip"
                                onMouseEnter={(e) => handleMouseEnter("Switch between Base Fractal and Julia Set.", e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <span className="tooltip-icon">i</span>
                            </span>
                        </label>
                        <ToggleSwitch
                            checked={isJuliaSet}
                            onChange={handleToggleChange}
                            leftLabel="Base Fractal"
                            rightLabel="Julia Set"
                        />
                    </div>
                    {Object.keys(variables).map((variableName) => (
                        <VariableControl key={variableName} name={variableName} variable={variables[variableName]} onVariableChange={onVariableChange} onVariableDelete={onVariableDelete} />
                    ))}
                    <div className="mt-4">
                        <label htmlFor="color-scheme" className="text-sm font-semibold">
                            Color Scheme:
                            <span
                                className="tooltip"
                                onMouseEnter={(e) => handleMouseEnter("Select the color scheme used to display the fractal.", e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <span className="tooltip-icon">i</span>
                            </span>
                        </label>
                        <select id="color-scheme" value={colorScheme} onChange={handleColorSchemeChange} className="w-full mt-1 p-2 bg-gray-700 rounded text-white">
                            <option>Rainbow</option>
                            <option>Snowflake</option>
                            <option>Watercolors</option>
                            <option>Twinkling Stars</option>
                            <option>Psychedelics</option>
                            <option>Fire and Embers</option>
                            <option>Ocean Waves</option>
                            <option>Aurora Borealis</option>
                            <option>The Matrix</option>
                        </select>
                    </div>
                    <div className="mt-4 flex items-center">
                        <label htmlFor="graphics-quality" className="text-sm font-semibold">
                            Graphics Quality: {getGraphicsQualityText()}
                            <span
                                className="tooltip"
                                onMouseEnter={(e) => handleMouseEnter("Adjust the graphics quality. Higher settings provide better visuals but may reduce performance.", e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <span className="tooltip-icon">i</span>
                            </span>
                        </label>
                    </div>
                    <input id="graphics-quality" type="range" min="0" max="100" value={graphicsQuality} onChange={(event) => setGraphicsQuality(parseInt(event.target.value, 10))} className="w-full mt-1" />

                    {/* Advanced Options Toggle */}
                    <div className="mt-2 flex items-center">
                        <span className="text-sm font-semibold">Advanced Graphics Options</span>
                        <button onClick={toggleExpand} className="dropdown-button-small">{isExpanded ? '▲' : '▼'}</button>
                    </div>

                    {/* Dropdown Content */}
                    <div className={`dropdown-content ${isExpanded ? 'dropdown-content-expanded' : ''}`}>
                        <div className="mt-4">
                            <label htmlFor="iterations" className="text-sm font-semibold flex items-center">
                                Iterations
                                <span
                                    className="tooltip"
                                    onMouseEnter={(e) => handleMouseEnter("Controls the number of iterations for the fractal calculation. Higher values produce more detail but can be slower to compute.", e)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <span className="tooltip-icon">i</span>
                                </span>
                            </label>
                            <input id="iterations" type="number" min="1" value={iterations} onChange={handleIterationsChange} className="w-full mt-1 p-2 bg-gray-700 rounded text-white" />
                        </div>
                        <div className="mt-4">
                            <label htmlFor="pixel-size" className="text-sm font-semibold">
                                Pixel Size:
                                <span
                                    className="tooltip"
                                    onMouseEnter={(e) => handleMouseEnter("Select the size of pixels for rendering. Larger sizes improve performance but reduce detail.", e)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <span className="tooltip-icon">i</span>
                                </span>
                            </label>
                            <select id="pixel-size" value={pixelSize} onChange={handlePixelSizeChange} className="w-full mt-1 p-2 bg-gray-700 rounded text-white">
                                <option value="1">1x1</option>
                                <option value="2">2x2</option>
                                <option value="4">4x4</option>
                                <option value="8">8x8</option>
                                <option value="16">16x16</option>
                            </select>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="sharpness" className="text-sm font-semibold">
                                Sharpness:
                                <span
                                    className="tooltip"
                                    onMouseEnter={(e) => handleMouseEnter("Adjusts the level of anti-aliasing applied to the fractal. Higher values increase sharpness but may reduce performance.", e)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <span className="tooltip-icon">i</span>
                                </span>
                            </label>
                            <input id="sharpness" type="range" min="0" max="2" step="0.1" value={fxaaIntensity} onChange={handleSharpnessChange} className="w-full mt-1" />
                        </div>
                        <div className="mt-4">
                            <label htmlFor="cutoff" className="text-sm font-semibold flex items-center">
                                Cut-off Value
                                <span
                                    className="tooltip"
                                    onMouseEnter={(e) => handleMouseEnter("Sets the escape radius or threshold for the fractal calculation. Points beyond this value are considered outside the set.", e)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <span className="tooltip-icon">i</span>
                                </span>
                            </label>
                            <input id="cutoff" type="number" min="0" step="0.1" value={cutoff} onChange={handleCutoffChange} className="w-full mt-1 p-2 bg-gray-700 rounded text-white" />
                        </div>
                    </div>

                    <button onClick={onResetView} className="mt-4 p-2 bg-blue-500 rounded text-white hover:bg-blue-400">Return to Default View</button>
                </div>
            </div>
            {/* Render Tooltip Component */}
            <Tooltip content={tooltip.content} position={tooltip.position} visible={tooltip.visible} />
        </div>
    );
}

export default Controls;
