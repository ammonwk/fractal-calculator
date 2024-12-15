import React, { useState, useEffect, useRef } from 'react';

function VariableControl({ name, variable, onVariableChange, onVariableDelete }) {
    const intervalRef = useRef(null);
    const onPlayRef = useRef();

    // Local update helper to trigger onVariableChange with updated variable data
    const updateVariable = (updatedFields) => {
        onVariableChange(name, { ...variable, ...updatedFields });
    };

    // Update onPlayRef function when dependencies change
    useEffect(() => {
        onPlayRef.current = () => {
            // First check if values are valid to be parsed as float
            let value = !isNaN(parseFloat(variable.value)) ? parseFloat(variable.value) : parseFloat(variable.min);
            let step = !isNaN(parseFloat(variable.step)) ? parseFloat(variable.step) : 0;
            let max = !isNaN(parseFloat(variable.max)) ? parseFloat(variable.max) : 0;
            let min = !isNaN(parseFloat(variable.min)) ? parseFloat(variable.min) : 0;
            let newValue = value + step;

            if (variable.playMode === 'loop') {
                if (newValue > max) {
                    newValue = min;
                }
                if (newValue < min) {
                    newValue = max;
                }
            } else if (variable.playMode === 'bounce') {
                if (newValue >= max || newValue <= min) {
                    updateVariable({
                        step: -step, // Convert to number before negating
                        value: Math.max(min + Math.abs(step), Math.min(newValue, max - Math.abs(step)))
                    });
                    newValue = Math.max(min, Math.min(newValue, max));
                    return;
                }
            } else if (variable.playMode === 'rise') {
                if (newValue < min) {
                    newValue = min;
                }
            }

            updateVariable({ value: newValue });
        };
    }, [variable]);

    // Handle play/pause based on isPlaying
    useEffect(() => {
        if (!variable.isPlaying) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null; // Clear reference to avoid potential issues
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            if (onPlayRef.current) onPlayRef.current();
        }, 1000 / variable.speed);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [variable.isPlaying, variable.speed]);

    // Handle play/pause toggle
    const handlePlayToggle = () => {
        updateVariable({ isPlaying: !variable.isPlaying });
    };

    const handleDelete = () => {
        onVariableDelete(name);
    };

    // Handle min, max, and step changes
    const handleNumericInput = (rawValue, onUpdate) => {
        // First check if it's a valid numeric input state
        if (/^-?\d*\.?\d*$/.test(rawValue)) {
            // If it's empty or a partial number, keep as string
            if (rawValue === '' ||
                rawValue === '-' ||
                !Number.isFinite(Number(rawValue))) {
                onUpdate(rawValue);
                return;
            }

            // Otherwise, preserve the exact string representation of the number
            onUpdate(rawValue);
        }
    };

    const handleValueChange = (event) => {
        handleNumericInput(event.target.value, (newValue) => {
            updateVariable({ value: newValue });
        });
    };

    const handleMinChange = (event) => {
        handleNumericInput(event.target.value, (newValue) => {
            updateVariable({ min: newValue });
        });
    };

    const handleMaxChange = (event) => {
        handleNumericInput(event.target.value, (newValue) => {
            updateVariable({ max: newValue });
        });
    };

    const handleStepChange = (event) => {
        handleNumericInput(event.target.value, (newValue) => {
            updateVariable({ step: newValue });
        });
    };

    // Handle slider change
    const handleSliderChange = (event) => {
        updateVariable({ value: parseFloat(event.target.value) });
    };

    // Handle play mode change
    const handlePlayModeChange = (event) => {
        updateVariable({ playMode: event.target.value });
    };

    // Handle speed change
    const handleSpeedChange = (event) => {
        updateVariable({ speed: parseFloat(event.target.value) });
    };

    // Toggle expand/collapse of the control panel
    const toggleExpand = () => {
        updateVariable({ isExpanded: !variable.isExpanded });
    };

    return (
        <div className="bg-gray-700 p-2 rounded mt-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">{name}:</label>
                <input
                    type="text"
                    value={typeof variable.value === 'string' ? variable.value : parseFloat(variable.value.toPrecision(12))}
                    onChange={handleValueChange}
                    className="w-20 p-1 bg-gray-800 rounded text-white"
                />
                {/* Trash Bin Button */}
                <button onClick={handleDelete} className="trash-button ml-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M8 4V2a2 2 0 114 0v2h5a1 1 0 110 2h-1v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h5zm1-2v2h2V2a1 1 0 10-2 0zM7 8a1 1 0 011 1v7a1 1 0 11-2 0V9a1 1 0 011-1zm6 0a1 1 0 011 1v7a1 1 0 11-2 0V9a1 1 0 011-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
                {/* Dropdown Button */}
                <button onClick={toggleExpand} className="dropdown-button text-white ml-2">
                    {variable.isExpanded ? '▲' : '▼'}
                </button>
            </div>
            {variable.isExpanded && (
                <div>
                    <div className="mt-2 flex items-center justify-between">
                        {/* Min, Max, Step Inputs */}
                        <div className="flex flex-col items-center space-y-1">
                            <label className="text-xs">Min:</label>
                            <input
                                type="text"
                                value={typeof variable.min === 'string' ? variable.min : variable.min}
                                onChange={handleMinChange}
                                className="w-8 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                            <label className="text-xs">Max:</label>
                            <input
                                type="text"
                                value={typeof variable.max === 'string' ? variable.max : variable.max}
                                onChange={handleMaxChange}
                                className="w-8 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                            <label className="text-xs">Step:</label>
                            <input
                                type="text"
                                value={typeof variable.step === 'string' ? variable.step : variable.step}
                                onChange={handleStepChange}
                                className="w-16 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                        <button onClick={handlePlayToggle} className="ml-2 p-1 bg-blue-500 rounded text-white">
                            {variable.isPlaying ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6" // Increase size of the pause icon
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M6 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zM14 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6" // You can also increase/decrease this for the play icon size
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5 4.5a1 1 0 011.54-.84l8 5a1 1 0 010 1.68l-8 5A1 1 0 015 14.5v-10z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                    {/* Play Mode and Speed Controls */}
                    <div className="mt-2 flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs">Play Mode:</label>
                            <select
                                value={variable.playMode}
                                onChange={handlePlayModeChange}
                                className="w-18 p-1 bg-gray-800 rounded text-white text-xs"
                            >
                                <option value="loop">Loop</option>
                                <option value="bounce">Bounce</option>
                                <option value="rise">Rise</option>
                            </select>
                            <label className="text-xs">Fps:</label>
                            <input
                                type="number"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={variable.speed}
                                onChange={handleSpeedChange}
                                className="w-6 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                    </div>
                    {/* Slider */}
                    <div className="mt-2">
                        <input
                            type="range"
                            min={variable.min}
                            max={variable.max}
                            step={Math.abs(variable.step)}  // Ensure step is always positive for the slider
                            value={variable.value}
                            onChange={handleSliderChange}
                            className="w-full var-control-slider"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default VariableControl;