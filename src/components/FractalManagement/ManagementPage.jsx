import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import FractalPreviewGrid from './FractalPreviewGrid';
import PasswordModal from './PasswordModal';
import RandomPoolItem from './RandomPoolItem';

function ManagementPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [fractals, setFractals] = useState([]);
  const [randomFractals, setRandomFractals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handlePasswordSubmit = async (password) => {
    try {
      const response = await fetch('/api/admin/getAllFractals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      setFractals(data.fractals);
      
      // Filter random fractals
      const randomPoolFractals = data.fractals.filter(f => f.isInRandomPool);
      setRandomFractals(randomPoolFractals);
      
      setIsAuthenticated(true);
      setIsModalOpen(false);
      setLoading(false);
    } catch (error) {
      setError('Invalid password. Please try again.');
      setLoading(false);
    }
  };

  const handleAddToRandomPool = async (fractalId) => {
    try {
      const response = await fetch('/api/admin/addToRandomPool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password: 'code82094', // Using hardcoded password since we're already authenticated
          fractalId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to random pool');
      }

      // Update local state to reflect the change
      const updatedFractals = fractals.map(fractal => 
        fractal.id === fractalId 
          ? { ...fractal, isInRandomPool: true } 
          : fractal
      );
      setFractals(updatedFractals);
      
      // Update random fractals list
      const updatedRandomFractals = [...randomFractals, updatedFractals.find(f => f.id === fractalId)];
      setRandomFractals(updatedRandomFractals);
    } catch (error) {
      console.error('Error adding to random pool:', error);
      setError('Failed to add to random pool');
    }
  };

  const handleRemoveFromRandomPool = async (fractalId) => {
    try {
      const response = await fetch('/api/admin/removeFromRandomPool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          password: 'code82094', // Using hardcoded password since we're already authenticated
          fractalId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove from random pool');
      }

      // Update local state to reflect the change
      const updatedFractals = fractals.map(fractal => 
        fractal.id === fractalId 
          ? { ...fractal, isInRandomPool: false } 
          : fractal
      );
      setFractals(updatedFractals);
      
      // Update random fractals list - remove the fractal
      setRandomFractals(randomFractals.filter(f => f.id !== fractalId));
    } catch (error) {
      console.error('Error removing from random pool:', error);
      setError('Failed to remove from random pool');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {isModalOpen && <PasswordModal onSubmit={handlePasswordSubmit} error={error} />}
      
      {!isAuthenticated && !isModalOpen && <Navigate to="/" />}
      
      {isAuthenticated && (
        <>
          <h1 className="text-3xl font-bold mb-8 text-center">Fractal Management</h1>
          
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center">{error}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3">
                <h2 className="text-xl font-semibold mb-4">All Fractals</h2>
                <FractalPreviewGrid 
                  fractals={fractals} 
                  onAddToRandomPool={handleAddToRandomPool} 
                  onRemoveFromRandomPool={handleRemoveFromRandomPool} 
                />
              </div>
              
              <div className="lg:col-span-1">
                <h2 className="text-xl font-semibold mb-4">Random Pool</h2>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-gray-400 mb-2 text-sm">
                    Fractals in the random pool will appear when users click the dice button.
                  </p>
                  {randomFractals.length === 0 ? (
                    <div className="text-gray-400 text-center py-4">
                      No fractals in random pool yet. Add some from the main grid.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {randomFractals.map(fractal => (
                        <RandomPoolItem
                          key={fractal.id}
                          fractal={fractal}
                          onRemove={handleRemoveFromRandomPool}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ManagementPage;