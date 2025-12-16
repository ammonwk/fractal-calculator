import React, { useState } from 'react';
import { BsDice5 } from 'react-icons/bs';
import { fetchFractalById } from '../services/FractalService';

function RandomFractalButton({ location = 'sidebar', onLoadFractal, isVisible = true }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRandomFractal = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/randomFractal');
      if (!response.ok) {
        throw new Error('Failed to get random fractal');
      }
      
      const data = await response.json();
      const fractalId = data.id;
      
      // Update URL without reloading
      window.history.pushState({}, '', `/share/${fractalId}`);
      
      // Load the fractal data
      const fractalData = await fetchFractalById(fractalId);
      
      // Pass the loaded fractal to parent component for rendering
      if (onLoadFractal) {
        onLoadFractal(fractalData, fractalId);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading random fractal:', error);
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  if (location === 'sidebar') {
    return (
      <button
        onClick={handleRandomFractal}
        disabled={isLoading}
        className={`p-2 rounded-lg transition-all duration-200 
                   ${isLoading 
                     ? 'bg-gray-700 cursor-wait' 
                     : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
        title="Load a random fractal"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        ) : (
          <BsDice5 size={20} />
        )}
      </button>
    );
  } else {
    // Editor version - more subtle, transparent button
    return (
      <button
        onClick={handleRandomFractal}
        disabled={isLoading}
        className={`absolute top-3 right-3 text-gray-400 hover:text-white bg-transparent 
                    rounded-full p-1 transition-all ${isLoading ? 'cursor-wait' : ''}`}
        title="Load a random fractal"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        ) : (
          <BsDice5 size={18} />
        )}
      </button>
    );
  }
}

export default RandomFractalButton;