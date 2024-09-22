import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FractalCanvas from './FractalCanvas/FractalCanvas';
import Controls from './Controls/Controls';
import TopBar from './Controls/TopBar';
import InfoButton from './Controls/InfoButton';
import { saveFractalState } from './services/FractalService';
import ShareModal from './Controls/ShareModal';

function FractalEditor({
    initialInput,
    initialEquation,
    initialIterations,
    initialCutoff,
    initialZoom,
    initialOffset,
    initialColorScheme,
    initialVariables,
    initialFxaaIntensity,
    initialPixelSize,
    initialIsJuliaSet
}) {
    const [input, setInput] = useState(initialInput);
    const [equation, setEquation] = useState(initialEquation);
    const [iterations, setIterations] = useState(initialIterations);
    const [cutoff, setCutoff] = useState(initialCutoff);
    const [zoom, setZoom] = useState(initialZoom);
    const [offset, setOffset] = useState(initialOffset);
    const [colorScheme, setColorScheme] = useState(initialColorScheme);
    const [variables, setVariables] = useState(initialVariables);
    const [fxaaIntensity, setFxaaIntensity] = useState(initialFxaaIntensity);
    const [pixelSize, setPixelSize] = useState(initialPixelSize);
    const [isJuliaSet, setIsJuliaSet] = useState(initialIsJuliaSet);
    const [shareModalVisible, setShareModalVisible] = useState({ visible: false, x: 0, y: 0 });
    const [shareUrl, setShareUrl] = useState('');
    const [graphicsQuality, setGraphicsQuality] = useState(70);

    const navigate = useNavigate();

    const handleSaveFractal = async () => {
        const fractalState = {
            input,
            equation,
            iterations,
            cutoff,
            zoom,
            offset,
            colorScheme,
            variables,
            fxaaIntensity,
            pixelSize,
            inJuliaSetMode: isJuliaSet,
        };

        try {
            const id = await saveFractalState(fractalState);
            const shareUrl = `/share/${id}`;
            return shareUrl; // Return the shareable URL instead of navigating
        } catch (error) {
            console.error('Error saving fractal', error);
            return null;
        }
    };

    const handleGraphicsQualityChange = (quality) => {
        setGraphicsQuality(quality);
        const newPixelSize = quality > 75 ? 1 : quality > 50 ? 1 : quality > 25 ? 2 : 8;
        const newIterations = quality > 75 ? 1000 : quality > 50 ? 500 : quality > 25 ? 250 : 100;
        setPixelSize(newPixelSize);
        setIterations(newIterations);
    };

    return (
        <div className="relative-container">
            <TopBar />
            <div className="canvas-container">
                <FractalCanvas
                    equation={equation}
                    iterations={iterations}
                    cutoff={cutoff}
                    zoom={zoom}
                    offset={offset}
                    setZoom={setZoom}
                    setOffset={setOffset}
                    colorScheme={colorScheme}
                    variables={variables}
                    fxaaIntensity={fxaaIntensity}
                    pixelSize={pixelSize}
                    inJuliaSetMode={isJuliaSet}
                />
            </div>
            <Controls
                latexInput={input}
                setLatexInput={setInput}
                equation={equation}
                onEquationChange={setEquation}
                iterations={iterations}
                onIterationsChange={setIterations}
                cutoff={cutoff}
                onCutoffChange={setCutoff}
                onColorSchemeChange={setColorScheme}
                onResetView={() => { setZoom(0.9); setOffset({ x: 0.7, y: -0.12 }); }}
                variables={variables}
                onVariableChange={(name, value) => setVariables((prev) => ({ ...prev, [name]: value }))}
                onVariableDelete={(name) => setVariables((prev) => {
                    const newVars = { ...prev };
                    delete newVars[name];
                    return newVars;
                })}
                onNewVariable={(name) => setVariables((prev) => ({
                    ...prev,
                    [name]: { value: 1, min: 1, max: 3, step: 0.001, animationMode: 'none', isPlaying: false },
                }))}
                fxaaIntensity={fxaaIntensity}
                setFxaaIntensity={setFxaaIntensity}
                pixelSize={pixelSize}
                setPixelSize={setPixelSize}
                graphicsQuality={graphicsQuality}
                setGraphicsQuality={handleGraphicsQualityChange}
                isJuliaSet={isJuliaSet}
                handleToggleChange={() => setIsJuliaSet((prev) => !prev)}
                handleSaveFractal={handleSaveFractal} // Pass down the modified handleSaveFractal
                setShareModalVisible={setShareModalVisible} // Pass down the setShareModalVisible
                setShareUrl={setShareUrl} // Pass down the setShareUrl
            />
            {shareModalVisible.visible && (
                <ShareModal
                    shareUrl={shareUrl}
                    onClose={() => setShareModalVisible({ visible: false, x: 0, y: 0 })}
                    initialPosition={{ x: shareModalVisible.x, y: shareModalVisible.y }} // Pass the initial position
                />
            )}
            <InfoButton />
        </div>
    );
}

export default FractalEditor;
