import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FractalEditor from './components/FractalEditor';
import FractalLoader from './components/FractalLoader';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FractalEditor
          initialInput={'z^2+c'}
          initialEquation={'vec2 temp_0 = (vec2(z.x * z.x - z.y * z.y, z.x * z.y + z.y * z.x) + c);\nz = temp_0;'}
          initialIterations={800}
          initialCutoff={10.0}
          initialZoom={0.8}
          initialOffset={{ x: 0.7, y: -0.12 }}
          initialColorScheme={'Rainbow'}
          initialVariables={{}}
          initialFxaaIntensity={2}
          initialPixelSize={1}
          initialIsJuliaSet={false}
        />} />
        <Route path="/share/:id" element={<FractalLoader />} />
      </Routes>
    </Router>
  );
}

export default App;
