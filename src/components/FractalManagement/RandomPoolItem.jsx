import React, { useState, useEffect } from 'react';
import FractalPreview from './FractalPreview';

function RandomPoolItem({ fractal, onRemove }) {
  const [fractalData, setFractalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadFractalData = async () => {
      try {
        const response = await fetch(`/api/loadFractal/${fractal.id}`);
        if (!response.ok) {
          throw new Error('Failed to load fractal');
        }
        const data = await response.json();
        if (data && data.encodedState) {
          const decoded = JSON.parse(atob(data.encodedState));
          setFractalData(decoded);
        } else {
          throw new Error('Invalid fractal data');
        }
      } catch (err) {
        console.error('Error loading fractal for random pool:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFractalData();
  }, [fractal.id]);

  return (
    <div className="bg-gray-700 rounded-lg overflow-hidden">
      <div className="p-2 flex justify-between items-center">
        <span className="text-sm text-gray-400">
          {new Date(fractal.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onRemove(fractal.id)}
          className="text-red-400 hover:text-red-300 text-sm px-2"
          title="Remove from random pool"
        >
          ✕
        </button>
      </div>
      <a
        href={`/share/${fractal.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-square bg-gray-900"
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Failed to load
          </div>
        ) : fractalData ? (
          <FractalPreview
            fractalId={fractal.id}
            fractalData={fractalData}
            size={180}
          />
        ) : null}
      </a>
    </div>
  );
}

export default RandomPoolItem;
