import React, { useState } from 'react';
import FractalCanvas from './components/FractalCanvas';
import Controls from './components/Controls';
import TopBar from './components/TopBar';
import './App.css';

function App() {
  const [equation, setEquation] = useState('vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c');
  const [iterations, setIterations] = useState(1000); // State for iterations
  const [cutoff, setCutoff] = useState(4.0); // State for cutoff value
  const [zoom, setZoom] = useState(0.9); // State for zoom level
  const [offset, setOffset] = useState({ x: 0.7, y: -0.12 }); // State for offset

  const handleResetView = () => {
    setZoom(0.9); // Reset zoom to default
    setOffset({ x: 0.7, y: -0.12 }); // Reset offset to default
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <TopBar />
      <div className="flex-none w-64">
        {/* Left Controls Sidebar */}
        <Controls
          onEquationChange={setEquation}
          onIterationsChange={setIterations}
          onCutoffChange={setCutoff}
          onResetView={handleResetView}
        />
      </div>
      {/* Main Content Area (Canvas) */}
      <div className="flex-1 relative">
        <FractalCanvas
          equation={equation}
          iterations={iterations}
          cutoff={cutoff}
          zoom={zoom}
          offset={offset}
          setZoom={setZoom}
          setOffset={setOffset}
        />
      </div>
    </div>
  );
}

export default App;
