import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import FractalPreview from './FractalPreview';

function FractalPreviewGrid({ fractals, onAddToRandomPool, onRemoveFromRandomPool }) {
  const [loadedPreviews, setLoadedPreviews] = useState({});
  const [loadingErrors, setLoadingErrors] = useState({});
  const [fractalData, setFractalData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const fractalsPerPage = 16;
  const loadingFractals = useRef(new Set());
  const maxRetries = 2;
  
  // Calculate pagination
  const indexOfLastFractal = currentPage * fractalsPerPage;
  const indexOfFirstFractal = indexOfLastFractal - fractalsPerPage;
  const currentFractals = fractals.slice(indexOfFirstFractal, indexOfLastFractal);
  const totalPages = Math.ceil(fractals.length / fractalsPerPage);

  const loadPreview = async (fractalId, retryCount = 0) => {
    // Skip if already loading or loaded
    if (loadingFractals.current.has(fractalId) || loadedPreviews[fractalId] !== undefined) {
      return;
    }
    
    // Mark as loading to prevent duplicate requests
    loadingFractals.current.add(fractalId);
    
    try {
      // Add a small delay between retries to prevent overwhelming the server
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
      
      // Load the fractal data with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`/api/loadFractal/${fractalId}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to load fractal data: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse fractal state from encoded data
      if (data && data.encodedState) {
        try {
          // Decode the fractal data
          const decodedData = JSON.parse(atob(data.encodedState));
          
          // Store the fractal data
          setFractalData(prev => ({
            ...prev,
            [fractalId]: decodedData
          }));
          
          // Set the preview URL in state
          setLoadedPreviews(prev => ({
            ...prev,
            [fractalId]: `/share/${fractalId}`
          }));
          
          // Clear any previous errors
          if (loadingErrors[fractalId]) {
            setLoadingErrors(prev => {
              const newErrors = {...prev};
              delete newErrors[fractalId];
              return newErrors;
            });
          }
        } catch (error) {
          console.error('Error decoding fractal data:', error);
          throw new Error('Invalid fractal data format');
        }
      } else {
        throw new Error('No fractal data found');
      }
    } catch (error) {
      console.error(`Error loading preview (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Try again if we haven't reached max retries
      if (retryCount < maxRetries) {
        loadingFractals.current.delete(fractalId);
        loadPreview(fractalId, retryCount + 1);
        return;
      }
      
      // Set as failed after max retries
      setLoadedPreviews(prev => ({
        ...prev,
        [fractalId]: null
      }));
      
      // Record the error
      setLoadingErrors(prev => ({
        ...prev,
        [fractalId]: error.message || 'Failed to load preview'
      }));
    } finally {
      // Remove from loading set whether successful or not
      loadingFractals.current.delete(fractalId);
    }
  };

  // Load previews for current page
  useEffect(() => {
    currentFractals.forEach(fractal => {
      if (loadedPreviews[fractal.id] === undefined && !loadingFractals.current.has(fractal.id)) {
        loadPreview(fractal.id);
      }
    });
  }, [currentFractals, loadedPreviews]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentFractals.map(fractal => (
          <div key={fractal.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <div className="relative pb-[56.25%] bg-gray-700">
              {/* Preview image or placeholder */}
              <Link to={`/share/${fractal.id}`} target="_blank" rel="noopener noreferrer" className="absolute inset-0">
                <div className="w-full h-full flex items-center justify-center">
                  {loadingFractals.current.has(fractal.id) ? (
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mb-2"></div>
                      <span className="text-sm text-gray-400">Loading...</span>
                    </div>
                  ) : loadingErrors[fractal.id] ? (
                    <div className="text-center">
                      <span className="text-red-400 text-sm">Failed to load</span>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          loadPreview(fractal.id);
                        }}
                        className="block mx-auto mt-2 text-blue-400 hover:text-blue-300 text-xs">
                        Retry
                      </button>
                    </div>
                  ) : fractalData[fractal.id] ? (
                    <FractalPreview 
                      fractalId={fractal.id} 
                      fractalData={fractalData[fractal.id]} 
                      size={240}
                    />
                  ) : (
                    <span className="text-lg text-gray-400">Preview Ready</span>
                  )}
                </div>
              </Link>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">
                  {formatDate(fractal.createdAt)}
                </span>
                <div>
                  {fractal.isInRandomPool ? (
                    <button
                      onClick={() => onRemoveFromRandomPool(fractal.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      title="Remove from random pool"
                    >
                      <i className="fas fa-ban mr-1"></i> Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => onAddToRandomPool(fractal.id)}
                      className="text-green-400 hover:text-green-300 text-sm"
                      title="Add to random pool"
                    >
                      <i className="fas fa-plus mr-1"></i> Add
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex mt-2">
                <Link
                  to={`/share/${fractal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded mr-2"
                >
                  View
                </Link>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/share/${fractal.id}`)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-l-md border border-gray-700 ${
                currentPage === 1 ? 'bg-gray-800 text-gray-500' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              &laquo; Prev
            </button>
            
            <span className="px-4 py-2 border-t border-b border-gray-700 bg-gray-800 text-white">
              {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-r-md border border-gray-700 ${
                currentPage === totalPages ? 'bg-gray-800 text-gray-500' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              Next &raquo;
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

export default FractalPreviewGrid;