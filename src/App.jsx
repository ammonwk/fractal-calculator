import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FractalLoader from './components/FractalLoader';
import ManagementPage from './components/FractalManagement/ManagementPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FractalLoader />} />
        <Route path="/share/:id" element={<FractalLoader />} />
        <Route path="/manage-fractals" element={<ManagementPage />} />
        <Route path="*" element={<FractalLoader />} />
      </Routes>
    </Router>
  );
}

export default App;