import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFractalById } from './services/FractalService';
import FractalEditor from './FractalEditor';

function FractalLoader() {
    const { id } = useParams();
    const [fractalState, setFractalState] = useState(null);
    const navigate = useNavigate();
    const DEFAULT_FRACTAL_ID = '673d51608439aa6cb7f6ef34';

    useEffect(() => {
        const loadFractal = async () => {
            try {
                const loadedFractal = await fetchFractalById(id || DEFAULT_FRACTAL_ID);
                console.log('Loaded fractal', loadedFractal);
                setFractalState(loadedFractal);
            } catch (error) {
                console.error('Error loading fractal', error);
                navigate('/');
            }
        };

        loadFractal();
    }, [id, navigate]);

    if (!fractalState) return <div>Loading...</div>;

    return (
        <FractalEditor
            initialInput={fractalState.input}
            initialEquation={fractalState.equation}
            initialIterations={fractalState.iterations}
            initialCutoff={fractalState.cutoff}
            initialZoom={fractalState.zoom}
            initialOffset={fractalState.offset}
            initialColorScheme={fractalState.colorScheme}
            initialVariables={fractalState.variables}
            initialFxaaIntensity={fractalState.fxaaIntensity}
            initialPixelSize={fractalState.pixelSize}
            initialIsJuliaSet={fractalState.inJuliaSetMode}
            initialJuliaParam={fractalState.juliaParam}
        />
    );
}

export default FractalLoader;