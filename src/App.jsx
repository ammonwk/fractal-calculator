import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FractalLoader from './components/FractalLoader';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FractalLoader />} />
        <Route path="/share/:id" element={<FractalLoader />} />
      </Routes>
    </Router>
  );
}

export default App;