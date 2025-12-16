// services/FractalService.js
import { encodeFractal, decodeFractal } from '../../utils/encoding';

export async function saveFractalState(fractalState) {
    const encodedState = encodeFractal(fractalState);

    const url = '/api/saveFractal';
    console.log(`Request URL (saveFractalState): ${url}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encodedState }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to save fractal');
    }

    return data.id;
}

export async function fetchFractalById(id) {
    const url = `/api/loadFractal/${id}`;
    console.log(`Request URL (fetchFractalById): ${url}`);

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to load fractal');
    }

    return decodeFractal(data.encodedState);
}
