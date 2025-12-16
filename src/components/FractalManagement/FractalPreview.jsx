import React, { useEffect, useRef, useState } from 'react';
import { createProgram } from '../FractalCanvas/WebGLUtils';
import {
  fractalVertexShaderSource,
  fractalFragmentShaderSource,
} from '../FractalCanvas/shaders';

function FractalPreview({ fractalId, fractalData, size = 240 }) {
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fractalData) return;

    // Create an offscreen canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      console.error('WebGL2 is not supported in your browser.');
      setError(true);
      return;
    }

    try {
      gl.viewport(0, 0, size, size);

      // Extract fractal parameters
      const {
        equation,
        iterations = 100,
        cutoff = 4.0,
        zoom = 1.0,
        offset = { x: 0, y: 0 },
        inJuliaSetMode = false,
        juliaParam = { x: 0, y: 0 }
      } = fractalData;

      if (!equation) {
        console.error('No equation provided for fractal preview');
        setError(true);
        return;
      }

      // Create shader program
      const colorSchemeName = fractalData.colorScheme || 'Rainbow';
      const shaderSource = fractalFragmentShaderSource(
        equation,
        iterations,
        cutoff,
        colorSchemeName,
        zoom,
        inJuliaSetMode
      );

      const fractalProgram = createProgram(
        gl,
        fractalVertexShaderSource,
        shaderSource
      );

      if (!fractalProgram) {
        console.error('Failed to create WebGL program');
        setError(true);
        return;
      }

      // Create a position buffer
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      const positions = [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

      const positionAttributeLocation = gl.getAttribLocation(fractalProgram, "position");

      if (positionAttributeLocation !== -1) {
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
      } else {
        console.error('Could not find position attribute in shader');
        setError(true);
        return;
      }

      // Get uniform locations
      const zoomLocation = gl.getUniformLocation(fractalProgram, "u_zoom");
      const offsetLocation = gl.getUniformLocation(fractalProgram, "u_offset");
      const resolutionLocation = gl.getUniformLocation(fractalProgram, "u_resolution");
      const modeLocation = gl.getUniformLocation(fractalProgram, "u_isJuliaSet");
      const juliaParamLocation = gl.getUniformLocation(fractalProgram, "u_juliaParam");
      const timeLocation = gl.getUniformLocation(fractalProgram, "u_time");

      // Render a single frame
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(fractalProgram);

      gl.uniform1f(zoomLocation, zoom);
      gl.uniform2f(offsetLocation, offset.x, offset.y);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1i(modeLocation, inJuliaSetMode ? 1 : 0);
      gl.uniform2f(juliaParamLocation, juliaParam.x, juliaParam.y);
      gl.uniform1f(timeLocation, 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Convert to image data URL
      const dataUrl = canvas.toDataURL('image/png');
      setImageDataUrl(dataUrl);

      // Clean up WebGL resources
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(fractalProgram);

      // Lose the WebGL context to free up resources
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }

    } catch (error) {
      console.error('Error rendering fractal preview:', error);
      setError(true);
    }
  }, [fractalData, size]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-sm">
        Preview failed
      </div>
    );
  }

  if (!imageDataUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <div className="w-6 h-6 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <img
      src={imageDataUrl}
      alt={`Fractal preview ${fractalId}`}
      className="w-full h-full object-cover"
      width={size}
      height={size}
    />
  );
}

export default FractalPreview;
