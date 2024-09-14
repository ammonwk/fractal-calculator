import React, { useState } from 'react';
import FractalCanvas from './components/FractalCanvas/FractalCanvas';
import Controls from './components/Controls/Controls';
import TopBar from './components/Controls/TopBar';
import InfoButton from './components/Controls/InfoButton';
import './App.css';

function App() {
  const [equation, setEquation] = useState('vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c');
  const [iterations, setIterations] = useState(800);
  const [cutoff, setCutoff] = useState(10.0);
  const [zoom, setZoom] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0.7, y: -0.12 });
  const [colorScheme, setColorScheme] = useState('Rainbow');
  const [variables, setVariables] = useState({});
  const [fxaaIntensity, setFxaaIntensity] = useState(2);
  const [pixelSize, setPixelSize] = useState(1);
  const [graphicsQuality, setGraphicsQuality] = useState(70);

  const handleResetView = () => {
    setZoom(0.9);
    setOffset({ x: 0.7, y: -0.12 });
  };

  const handleVariableChange = (variableName, updatedVariable) => {
    setVariables((prevVariables) => ({
      ...prevVariables,
      [variableName]: updatedVariable,
    }));
  };

  const handleVariableDelete = (variableName) => {
    setVariables((prevVariables) => {
      const newVariables = { ...prevVariables };
      delete newVariables[variableName];
      return newVariables;
    });
  };

  const handleNewVariable = (variableName) => {
    setVariables((prevVariables) => ({
      ...prevVariables,
      [variableName]: { value: 1, min: 1, max: 3, step: 0.001, animationMode: 'none', isPlaying: false }
    }));
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
        />
      </div>
      <Controls
        equation={equation}
        onEquationChange={setEquation}
        iterations={iterations}
        onIterationsChange={setIterations}
        cutoff={cutoff}
        onCutoffChange={setCutoff}
        onColorSchemeChange={setColorScheme}
        onResetView={handleResetView}
        variables={variables}
        onVariableChange={handleVariableChange}
        onVariableDelete={handleVariableDelete}
        onNewVariable={handleNewVariable}
        fxaaIntensity={fxaaIntensity}
        setFxaaIntensity={setFxaaIntensity}
        pixelSize={pixelSize}
        setPixelSize={setPixelSize}
        graphicsQuality={graphicsQuality}
        setGraphicsQuality={handleGraphicsQualityChange}
      />
      <InfoButton /> {/* Add the InfoButton component */}
    </div>
  );
}

export default App;
