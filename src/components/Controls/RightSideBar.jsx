import React, { useEffect, useRef, useState } from 'react';
import { FiShare2, FiHome, FiZoomIn, FiZoomOut, FiDownload, FiMaximize, FiMinimize } from 'react-icons/fi';

const IconButton = ({ onClick, onMouseDown, onMouseUp, onMouseLeave, title, children, isActive }) => (
    <button
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className={`p-2 rounded-lg transition-all duration-200
                   ${isActive
                ? 'bg-blue-500 text-white shadow-lg animate-pulse'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        title={title}
    >
        <div className="relative">
            {children}
            {isActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
        </div>
    </button>
);

function RightSideBar({
    onShare,
    onResetView,
    onZoom,
    sidebarRef,
    continuousZoom,
    setContinuousZoom,
    zoomRate,
    setZoomRate
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isHolding, setIsHolding] = useState(null);
    const lastClickTime = useRef(0);
    const ZOOM_FACTOR_CLICK = 1.2;
    const ZOOM_RATE_MIN = 1.001;
    const ZOOM_RATE_MAX = 1.1;
    const ZOOM_RATE_STEP = 0.002;
    const DOUBLE_CLICK_TIME = 300;

    useEffect(() => {
        const activeZoom = continuousZoom || isHolding;
        if (activeZoom) {
            const factor = activeZoom === 'in' ? zoomRate : 1 / zoomRate;
            const interval = setInterval(() => {
                onZoom(factor);
            }, 16);
            return () => clearInterval(interval);
        }
    }, [continuousZoom, isHolding, zoomRate, onZoom]);


    // Handle scroll events to adjust zoom rate
    useEffect(() => {
        const handleWheel = (e) => {
            if (continuousZoom) {
                e.preventDefault();
                setZoomRate(prevRate => {
                    // Reverse scroll direction for zoom out
                    const increasing = continuousZoom === 'in' ? e.deltaY < 0 : e.deltaY > 0;
                    const newRate = increasing
                        ? prevRate + ZOOM_RATE_STEP
                        : prevRate - ZOOM_RATE_STEP;
                    return Math.min(Math.max(newRate, ZOOM_RATE_MIN), ZOOM_RATE_MAX);
                });
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [continuousZoom]);

    const handleMouseDown = (direction) => (e) => {
        e.preventDefault();

        if (continuousZoom) {
            setContinuousZoom(null);
            setZoomRate(1.01);
            return;
        }

        setIsHolding(direction);

        const now = Date.now();
        if (now - lastClickTime.current < DOUBLE_CLICK_TIME) {
            setContinuousZoom(direction);
        }
        lastClickTime.current = now;
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsHolding(null);
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleClick = (direction) => {
        if (continuousZoom) {
            setContinuousZoom(null);
            setZoomRate(1.01);
            return;
        }

        const factor = direction === 'in' ? ZOOM_FACTOR_CLICK : 1 / ZOOM_FACTOR_CLICK;
        onZoom(factor);
    };

    // Calculate percentage for tooltip
    const getZoomRatePercentage = () => {
        const normalized = (zoomRate - ZOOM_RATE_MIN) / (ZOOM_RATE_MAX - ZOOM_RATE_MIN);
        return Math.round(normalized * 100);
    };

    const handleScreenshot = async () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            try {
                const dataURL = canvas.toDataURL('image/png', 1.0);

                if (dataURL.length > 100) {
                    // Get AI-generated name
                    const response = await fetch('/api/getFractalName', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ imageData: dataURL }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to get fractal name');
                    }

                    const { name } = await response.json();

                    // Download with the AI-generated name
                    const link = document.createElement('a');
                    link.download = `${name}.png`;
                    link.href = dataURL;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    console.error('Canvas appears to be empty');
                }
            } catch (err) {
                console.error('Error capturing screenshot:', err);
            }
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Update fullscreen state when it changes outside our control
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <div ref={sidebarRef} className="fixed right-0 top-0 h-full w-12 bg-gray-800 border-l border-gray-700 
                        flex flex-col items-center z-50 shadow-lg">
            <div className="flex-1 min-h-[20px]" /> {/* Top buffer */}

            <div className="flex flex-col items-center space-y-4">
                <IconButton
                    onClick={onShare}
                    title="Share Fractal"
                >
                    <FiShare2 size={20} />
                </IconButton>

                <IconButton
                    onClick={handleScreenshot}
                    title="Save Screenshot"
                >
                    <FiDownload size={20} />
                </IconButton>
            </div>

            <div className="flex-1" /> {/* Middle spacer */}

            <div className="flex flex-col items-center space-y-4">
                <IconButton
                    onMouseDown={handleMouseDown('in')}
                    onClick={() => handleClick('in')}
                    title={`Zoom In ${continuousZoom === 'in' ? `(Auto ${getZoomRatePercentage()}%) - Click to Stop` : ''}`}
                    isActive={continuousZoom === 'in'}
                >
                    <FiZoomIn size={20} />
                </IconButton>

                <IconButton
                    onClick={onResetView}
                    title="Reset View"
                >
                    <FiHome size={20} />
                </IconButton>

                <IconButton
                    onMouseDown={handleMouseDown('out')}
                    onClick={() => handleClick('out')}
                    title={`Zoom Out ${continuousZoom === 'out' ? `(Auto ${getZoomRatePercentage()}%) - Click to Stop` : ''}`}
                    isActive={continuousZoom === 'out'}
                >
                    <FiZoomOut size={20} />
                </IconButton>
            </div>

            <div className="flex-1" /> {/* Pre-fullscreen spacer */}

            <div className="flex flex-col items-center space-y-4">
                <IconButton
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
                </IconButton>
            </div>

            <div className="flex-1 min-h-[20px]" /> {/* Bottom buffer */}
        </div>
    );
}

export default RightSideBar;