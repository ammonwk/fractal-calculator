import React, { useState } from 'react';
import FractalCanvas from './components/FractalCanvas';
import Controls from './components/Controls';
import TopBar from './components/TopBar';
import './App.css';

function App() {
  const [equation, setEquation] = useState('vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c');
  const [iterations, setIterations] = useState(1000);
  const [cutoff, setCutoff] = useState(4.0);
  const [zoom, setZoom] = useState(0.9);
  const [offset, setOffset] = useState({ x: 0.7, y: -0.12 });
  const [colorScheme, setColorScheme] = useState('Rainbow 1');

  const handleResetView = () => {
    setZoom(0.9);
    setOffset({ x: 0.7, y: -0.12 });
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <TopBar />
      <div className="flex-none w-64">
        <Controls
          onEquationChange={setEquation}
          onIterationsChange={setIterations}
          onCutoffChange={setCutoff}
          onColorSchemeChange={setColorScheme}
          onResetView={handleResetView}
        />
      </div>
      <div className="flex-1 relative">
        <FractalCanvas
          equation={equation}
          iterations={iterations}
          cutoff={cutoff}
          zoom={zoom}
          offset={offset}
          setZoom={setZoom}
          setOffset={setOffset}
          colorScheme={colorScheme}
        />
      </div>
    </div>
  );
}

export default App;
