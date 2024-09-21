import React, { useState, useEffect, useRef } from 'react';

function VariableControl({ name, variable, onVariableChange, onVariableDelete }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playMode, setPlayMode] = useState('loop'); // 'loop', 'ping-pong', 'rise'
    const [speed, setSpeed] = useState(60); // Default speed is 1
    const intervalRef = useRef(null);
    const [direction, setDirection] = useState(1); // 1 for ascending, -1 for descending
    const [isExpanded, setIsExpanded] = useState(false); // State to handle dropdown visibility

    const onPlayRef = useRef();

    useEffect(() => {
        onPlayRef.current = () => {
            // Calculate the new value based on the current variable state
            let newValue = variable.value + variable.step * direction;

            if (playMode === 'loop') {
                if (newValue > variable.max) {
                    newValue = variable.min;
                }
                if (newValue < variable.min) {
                    newValue = variable.min;
                }
            } else if (playMode === 'ping-pong') {
                if (newValue >= variable.max || newValue <= variable.min) {
                    setDirection((prevDirection) => -prevDirection);
                    newValue = Math.max(variable.min, Math.min(newValue, variable.max));
                }
            } else if (playMode === 'rise') {
                if (newValue > variable.max) {
                    newValue = variable.min;
                }
            }

            // Pass the updated variable object to onVariableChange
            onVariableChange(name, { ...variable, value: newValue });
        };
    }, [playMode, direction, name, onVariableChange, variable]);

    useEffect(() => {
        if (!isPlaying) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null; // Clear reference to avoid potential issues
            }
            return;
        }

        // Start the interval using the latest version of onPlay
        intervalRef.current = setInterval(() => {
            if (onPlayRef.current) onPlayRef.current();
        }, 1000 / speed); // Adjust interval based on speed (fixed to 1000ms instead of 100)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPlaying, speed]);

    const handlePlayToggle = () => {
        setIsPlaying((prevIsPlaying) => !prevIsPlaying);
    };

    const handleValueChange = (event) => {
        const newValue = parseFloat(event.target.value);
        onVariableChange(name, { ...variable, value: newValue });
    };

    const handleDelete = () => {
        onVariableDelete(name);
    };

    const handleMinChange = (event) => {
        const newMin = parseFloat(event.target.value);
        onVariableChange(name, { ...variable, min: newMin });
    };

    const handleMaxChange = (event) => {
        const newMax = parseFloat(event.target.value);
        onVariableChange(name, { ...variable, max: newMax });
    };

    const handleStepChange = (event) => {
        const newStep = parseFloat(event.target.value);
        onVariableChange(name, { ...variable, step: newStep });
    };

    const handleSliderChange = (event) => {
        const newValue = parseFloat(event.target.value);
        onVariableChange(name, { ...variable, value: newValue });
    };

    const handlePlayModeChange = (event) => {
        setPlayMode(event.target.value);
    };

    const handleSpeedChange = (event) => {
        setSpeed(parseFloat(event.target.value));
    };

    const toggleExpand = () => {
        setIsExpanded((prevIsExpanded) => !prevIsExpanded);
    };

    return (
        <div className="bg-gray-700 p-2 rounded mt-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">{name}:</label>
                <input
                    type="number"
                    value={variable.value}
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
                    {isExpanded ? '▲' : '▼'}
                </button>
            </div>
            {isExpanded && (
                <div>
                    <div className="mt-2 flex items-center justify-between">
                        {/* Min, Max, Step Inputs */}
                        <div className="flex flex-col items-center space-y-1">
                            <label className="text-xs">Min:</label>
                            <input
                                type="number"
                                value={variable.min}
                                onChange={handleMinChange}
                                className="w-8 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                            <label className="text-xs">Max:</label>
                            <input
                                type="number"
                                value={variable.max}
                                onChange={handleMaxChange}
                                className="w-8 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                            <label className="text-xs">Step:</label>
                            <input
                                type="number"
                                value={variable.step}
                                onChange={handleStepChange}
                                className="w-16 p-1 bg-gray-800 rounded text-white text-xs"
                            />
                        </div>
                        <button onClick={handlePlayToggle} className="ml-2 p-1 bg-blue-500 rounded text-white">
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                    </div>
                    {/* Play Mode and Speed Controls */}
                    <div className="mt-2 flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs">Play Mode:</label>
                            <select
                                value={playMode}
                                onChange={handlePlayModeChange}
                                className="w-18 p-1 bg-gray-800 rounded text-white text-xs"
                            >
                                <option value="loop">Loop</option>
                                <option value="ping-pong">Bounce</option>
                                <option value="rise">Rise</option>
                            </select>
                            <label className="text-xs">Fps:</label>
                            <input
                                type="number"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={speed}
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
                            step={variable.step}
                            value={variable.value}
                            onChange={handleSliderChange}
                            className="w-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default VariableControl;
