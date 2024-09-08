import React, { useState } from 'react';
import FractalCanvas from './components/FractalCanvas';
import Controls from './components/Controls';
import TopBar from './components/TopBar';
import './App.css';

function App() {
  const [equation, setEquation] = useState('vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c');

  return (
    <div className="relative flex flex-col h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <TopBar />
      <div className="flex-none w-64">
        {/* Left Controls Sidebar */}
        <Controls onEquationChange={setEquation} />
      </div>
        {/* Main Content Area (Canvas) */}
        <div className="flex-1 relative">
          <FractalCanvas equation={equation} />
        </div>
    </div>
  );
}

export default App;
