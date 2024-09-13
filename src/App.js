import React, { useState } from 'react';
import FractalCanvas from './components/FractalCanvas';
import Controls from './components/Controls';
import TopBar from './components/TopBar';
import './App.css';

function App() {
  const [equation, setEquation] = useState('vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c');
  const [iterations, setIterations] = useState(800);
  const [cutoff, setCutoff] = useState(10.0);
  const [zoom, setZoom] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0.7, y: -0.12 });
  const [colorScheme, setColorScheme] = useState('Rainbow');
  const [variables, setVariables] = useState({});

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

  return (
    <div className="relative-container">
      <TopBar />
      {/* Canvas background container */}
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
        />
      </div>
      {/* Controls container */}
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
      />
    </div>
  );
}

export default App;
