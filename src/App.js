import React, { useState } from 'react';
import FractalCanvas from './components/FractalCanvas';
import Controls from './components/Controls';

function App() {
  const [equation, setEquation] = useState('vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c');

  return (
    <div className="App">
      <FractalCanvas equation={equation} />
      <Controls onEquationChange={setEquation} />
    </div>
  );
}

export default App;
