import React, { useState, useRef, useEffect } from 'react';
import MathQuill, { addStyles as addMathquillStyles } from 'react-mathquill';
import { tokenize } from '../EquationParser/tokenizing';
import { parse } from '../EquationParser/parsing';
import { translateToGLSL } from '../EquationParser/translateToGLSL';
import VariableControl from './VariableControl';
import ToggleSwitch from './ToggleSwitch';
import Tooltip from './Tooltip';
import RandomFractalButton from './RandomFractalButton';

addMathquillStyles();

// Base Components
const SectionHeader = ({ children, tooltip, onMouseEnter, onMouseLeave }) => (
    <div className="flex items-center space-x-2 mb-2">
        <h3 className="text-sm font-medium text-gray-200">{children}</h3>
        {tooltip && (
            <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full 
                         bg-gray-600 text-xs text-gray-200 cursor-help
                         hover:bg-gray-500 transition-colors"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                role="tooltip"
            >
                i
            </span>
        )}
    </div>
);

const Slider = ({ label, value, onChange, min, max, step, tooltip, onMouseEnter, onMouseLeave, displayValue }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <SectionHeader tooltip={tooltip} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                {label}
            </SectionHeader>
            <span className="text-sm text-gray-400">{displayValue || value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer 
                     accent-blue-500 focus:outline-none focus:ring-2 
                     focus:ring-blue-500/50"
            aria-label={label}
        />
    </div>
);

const Select = ({ label, value, onChange, options, tooltip, onMouseEnter, onMouseLeave }) => (
    <div className="space-y-2">
        <SectionHeader tooltip={tooltip} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            {label}
        </SectionHeader>
        <select
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 
                     rounded-lg appearance-none cursor-pointer
                     focus:border-blue-500 focus:outline-none
                     transition-colors"
            aria-label={label}
        >
            {options.map(option => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    </div>
);

function Controls({
    latexInput,
    setLatexInput,
    onEquationChange,
    iterations,
    onIterationsChange,
    cutoff,
    onCutoffChange,
    onColorSchemeChange,
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
    handleToggleChange,
    handleSaveFractal,
    setShareModalVisible,
    setShareUrl,
    initialLatexInput = latexInput,
    onLoadFractal
}) {
    const [error, setError] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [colorScheme, setColorScheme] = useState('Smooth Gradient');
    const [isExpanded, setIsExpanded] = useState(false);
    const timeoutRef = useRef(null);
    const isInitialRender = useRef(true);
    const [tooltip, setTooltip] = useState({
        visible: false,
        content: '',
        position: { top: 0, left: 0 }
    });

    // Effect for MathQuill styling
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
        return () => document.head.removeChild(style);
    }, []);

    // Input handling
    const handleInputChange = (mathField) => {
        const inputEquation = mathField.latex();
        setLatexInput(inputEquation);
        clearTimeout(timeoutRef.current);

        try {
            const tokens = tokenize(inputEquation, Object.keys(variables));
            const replacedTokens = tokens.map(token =>
                (variables.hasOwnProperty(token) ? variables[token].value : token)
            );
            const syntaxTree = parse(replacedTokens);
            const glslCode = translateToGLSL(syntaxTree);
            console.log(glslCode);
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
    };

    // Effect for variable changes
    useEffect(() => {
        try {
            if (!isInitialRender.current) {
                handleInputChange({ latex: () => latexInput });
            } else {
                isInitialRender.current = false;
            }
        } catch (error) {
            console.error('Error processing equation:', error);
            setError({ message: 'An unexpected error occurred while processing the equation.' });
        }
        return () => clearTimeout(timeoutRef.current);
    }, [variables]);

    // Event handlers
    const handleIterationsChange = (event) => {
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value) && value > 0) {
            onIterationsChange(value);
        }
    };

    const handleCutoffChange = (event) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value) && value >= 0) {
            onCutoffChange(value);
        }
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

    const handlePixelSizeChange = (event) => {
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value) && [1, 2, 4, 8, 16].includes(value)) {
            setPixelSize(value);
        }
    };

    const getGraphicsQualityText = () => {
        if (graphicsQuality > 75) return 'HD';
        if (graphicsQuality > 50) return 'Balanced';
        if (graphicsQuality > 25) return 'Performance';
        return 'Fast';
    };

    // UI state handlers
    const toggleExpand = () => setIsExpanded(!isExpanded);

    const handleMouseEnter = (content, event) => {
        const { clientX, clientY } = event;
        setTooltip({
            visible: true,
            content,
            position: { top: clientY, left: clientX + 10 }
        });
    };

    const handleMouseLeave = () => {
        setTooltip({ ...tooltip, visible: false });
    };

    return (
        <div className={`canvas-container ${isCollapsed ? 'w-16 delay-300' : 'w-64 delay-0'} transition-width duration-300`}>
            <div className={`fixed w-64 flex-none transition-all duration-300 ease-in-out 
               ${isCollapsed ? '-translate-x-64' : 'translate-x-0'} 
               bg-gray-800 backdrop-blur-sm text-white shadow-lg h-full 
               flex flex-col border-r border-gray-700`}>
                <button
                    className={`absolute right-[-2rem] top-20 mr-8 p-2 text-sm text-white 
                                bg-gray-700 hover:bg-gray-600 transition-all
               ${isCollapsed
                            ? 'w-8 translate-x-8 rounded-r-md'
                            : 'w-8 rounded-l-md'} right-0`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? "Expand controls" : "Collapse controls"}
                    aria-expanded={!isCollapsed}
                >
                    {isCollapsed ? '>' : '<'}
                </button>
                <div className="h-full overflow-x-hidden">

                    {/* Main Content */}
                    <div className={`p-4 pt-28 space-y-4 overflow-y-auto transition-opacity duration-300 
                                                        ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                        {/* Equation Input Section */}
                        <div className="space-y-2">
                            <SectionHeader
                                tooltip="Enter the equation defining the fractal"
                                onMouseEnter={(e) => handleMouseEnter("Enter the equation defining the fractal. You can use variables, mathematical functions, and constants.", e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                Fractal Equation
                            </SectionHeader>
                            <div className="relative">
                                <MathQuill
                                    latex={latexInput}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-700/50 backdrop-blur-sm 
                                            border border-gray-600 rounded-lg p-3
                                            focus-within:border-blue-500 transition-colors"
                                />
                                {latexInput === initialLatexInput && (
                                    <div className="absolute top-3 right-3">
                                        <RandomFractalButton location="editor" onLoadFractal={onLoadFractal} />
                                    </div>
                                )}
                                {error && (
                                    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 
                                                rounded-lg text-red-400 flex items-center justify-between">
                                        <span>{error.message}</span>
                                        {error.variableName && (
                                            <button
                                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 
                                                        rounded-md transition-colors"
                                                onClick={() => handleCreateVariable(error.variableName)}
                                            >
                                                Create Variable
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fractal Type Toggle */}
                        <div className="space-y-2">
                            <SectionHeader
                                tooltip="Switch between Base Fractal and Julia Set"
                                onMouseEnter={(e) => handleMouseEnter("Switch between Base Fractal and Julia Set.", e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                Fractal Type
                            </SectionHeader>
                            <ToggleSwitch
                                checked={isJuliaSet}
                                onChange={handleToggleChange}
                                leftLabel="Base Fractal"
                                rightLabel="Julia Set"
                            />
                        </div>

                        {/* Variables Section */}
                        {Object.keys(variables).length > 0 && (
                            <div className="space-y-2">
                                <SectionHeader>Variables</SectionHeader>
                                <div className="space-y-3">
                                    {Object.keys(variables).map((variableName) => (
                                        <VariableControl
                                            key={variableName}
                                            name={variableName}
                                            variable={variables[variableName]}
                                            onVariableChange={onVariableChange}
                                            onVariableDelete={onVariableDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Color Scheme Select */}
                        <Select
                            label="Color Scheme"
                            value={colorScheme}
                            onChange={handleColorSchemeChange}
                            options={[
                                'Rainbow',
                                'Snowflake',
                                'Watercolors',
                                'Twinkling Stars',
                                'Psychedelics',
                                'Fire and Embers',
                                'Ocean Waves',
                                'Aurora Borealis',
                                'The Matrix'
                            ]}
                            tooltip="Select the color scheme for the fractal"
                            onMouseEnter={(e) => handleMouseEnter("Select the color scheme used to display the fractal.", e)}
                            onMouseLeave={handleMouseLeave}
                        />

                        {/* Graphics Quality Slider */}
                        <div className="space-y-2">
                            <SectionHeader
                                tooltip="Adjust the graphics quality"
                                onMouseEnter={(e) => handleMouseEnter("Adjust the graphics quality. Higher settings provide better visuals but may reduce performance.", e)}
                                onMouseLeave={handleMouseLeave}
                            >
                                Graphics Quality: {getGraphicsQualityText()}
                            </SectionHeader>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={graphicsQuality}
                                onChange={(event) => setGraphicsQuality(parseInt(event.target.value, 10))} // Remove debouncing
                                className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer 
                                         accent-blue-500 graphics-quality-slider" // Add back the original class
                                aria-label="Graphics quality"
                            />
                        </div>

                        {/* Advanced Options */}
                        <div className="border-t border-gray-700 pt-4">
                            <button
                                onClick={toggleExpand}
                                className="flex items-center justify-between w-full text-sm font-medium"
                                aria-expanded={isExpanded}
                                aria-controls="advanced-options"
                            >
                                <span>Advanced Options</span>
                                <span className={`transform transition-transform duration-200 
                                            ${isExpanded ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            <div
                                id="advanced-options"
                                className={`space-y-4 overflow-hidden transition-all duration-300 
                                        ${isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
                                aria-hidden={!isExpanded}
                            >
                                {/* Iterations Input */}
                                <div className="space-y-2">
                                    <SectionHeader
                                        tooltip="Control iteration count"
                                        onMouseEnter={(e) => handleMouseEnter("Controls the number of iterations for the fractal calculation. Higher values produce more detail but can be slower to compute.", e)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        Iterations
                                    </SectionHeader>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={iterations}
                                        onChange={handleIterationsChange}
                                        className="w-full p-2 bg-gray-700/50 border border-gray-600 
                                                    rounded-lg text-white focus:border-blue-500 
                                                    focus:outline-none transition-colors"
                                    />
                                </div>

                                {/* Pixel Size Select */}
                                <Select
                                    label="Pixel Size"
                                    value={pixelSize}
                                    onChange={handlePixelSizeChange}
                                    options={[1, 2, 4, 8, 16]}
                                    tooltip="Select rendering pixel size"
                                    onMouseEnter={(e) => handleMouseEnter("Select the size of pixels for rendering. Larger sizes improve performance but reduce detail.", e)}
                                    onMouseLeave={handleMouseLeave}
                                />

                                {/* Sharpness Slider */}
                                <Slider
                                    label="Sharpness"
                                    value={fxaaIntensity}
                                    onChange={(e) => setFxaaIntensity(parseFloat(e.target.value))}
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    tooltip="Adjust anti-aliasing"
                                    onMouseEnter={(e) => handleMouseEnter("Adjusts the level of anti-aliasing applied to the fractal. Higher values increase sharpness but may reduce performance.", e)}
                                    onMouseLeave={handleMouseLeave}
                                    displayValue={`${Math.round(75 + (fxaaIntensity / 2) * 25)}%`}
                                />

                                {/* Cutoff Value Input */}
                                <div className="space-y-2">
                                    <SectionHeader
                                        tooltip="Set escape radius"
                                        onMouseEnter={(e) => handleMouseEnter("Sets the escape radius or threshold for the fractal calculation. Points beyond this value are considered outside the set.", e)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        Cut-off Value
                                    </SectionHeader>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={cutoff}
                                        onChange={handleCutoffChange}
                                        className="w-full p-2 bg-gray-700/50 border border-gray-600 
                                                    rounded-lg text-white focus:border-blue-500 
                                                    focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            <Tooltip
                content={tooltip.content}
                position={tooltip.position}
                visible={tooltip.visible}
            />
        </div>
    );
}

export default Controls;