// FractalCanvas.js
import React, { useEffect, useRef } from 'react';
import { fractalVertexShaderSource, fractalFragmentShaderSource, fxaaVertexShaderSource, fxaaFragmentShaderSource } from './shaders';
import { useDragAndZoom } from './useDragAndZoom';
import { compileShader, createProgram, resizeCanvasToDisplaySize } from './WebGLUtils';

function FractalCanvas({
    equation,
    iterations,
    cutoff,
    zoom,
    offset,
    setZoom,
    setOffset,
    colorScheme,
    fxaaIntensity,
    pixelSize
}) {
    const canvasRef = useRef();
    const animationFrameIdRef = useRef(null);

    useDragAndZoom(canvasRef, zoom, offset, setZoom, setOffset);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2', { antialias: false });
        if (!gl) {
            console.error('WebGL2 is not supported in your browser.');
            return;
        }

        // Construct shader programs dynamically
        const fractalProgram = createProgram(
            gl,
            fractalVertexShaderSource,
            fractalFragmentShaderSource(equation, iterations, cutoff, colorScheme, zoom) // Pass pixelSize to the shader
        );
        const fxaaProgram = createProgram(gl, fxaaVertexShaderSource, fxaaFragmentShaderSource);
        if (!fractalProgram || !fxaaProgram) return;

        // Create geometry and setup framebuffer
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        // Create a lower-resolution framebuffer for rendering fractals
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // Compute the reduced resolution size
        const reducedWidth = Math.ceil(canvas.width / pixelSize);
        const reducedHeight = Math.ceil(canvas.height / pixelSize);

        // Create a texture to store the fractal at a lower resolution
        const fractalTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, reducedWidth, reducedHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fractalTexture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is not complete');
            return;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Get attribute and uniform locations
        const fractalPositionLocation = gl.getAttribLocation(fractalProgram, 'position');
        const fractalResolutionLocation = gl.getUniformLocation(fractalProgram, 'u_resolution');
        const fractalOffsetLocation = gl.getUniformLocation(fractalProgram, 'u_offset');
        const fractalZoomLocation = gl.getUniformLocation(fractalProgram, 'u_zoom');
        const fractalTimeLocation = gl.getUniformLocation(fractalProgram, 'u_time');

        const fxaaPositionLocation = gl.getAttribLocation(fxaaProgram, 'position');
        const fxaaTextureLocation = gl.getUniformLocation(fxaaProgram, 'u_texture');
        const fxaaResolutionLocation = gl.getUniformLocation(fxaaProgram, 'u_resolution');
        const fxaaIntensityLocation = gl.getUniformLocation(fxaaProgram, 'u_fxaaIntensity');

        const resizeCanvas = () => resizeCanvasToDisplaySize(gl, canvas, fractalTexture, framebuffer);

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let startTime = performance.now();

        function animate(currentTime) {
            const elapsedTime = (currentTime - startTime) / 1000.0;

            // Render fractal to low-resolution framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, reducedWidth, reducedHeight); // Set viewport to low resolution
            gl.useProgram(fractalProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.enableVertexAttribArray(fractalPositionLocation);
            gl.vertexAttribPointer(fractalPositionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.uniform2f(fractalResolutionLocation, reducedWidth, reducedHeight);
            gl.uniform2f(fractalOffsetLocation, offset.x, offset.y);
            gl.uniform1f(fractalZoomLocation, zoom);
            gl.uniform1f(fractalTimeLocation, elapsedTime);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Render the low-resolution framebuffer to the screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height); // Set viewport to full canvas size
            gl.useProgram(fxaaProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.enableVertexAttribArray(fxaaPositionLocation);
            gl.vertexAttribPointer(fxaaPositionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
            gl.uniform1i(fxaaTextureLocation, 0);
            gl.uniform2f(fxaaResolutionLocation, canvas.width, canvas.height);
            gl.uniform1f(fxaaIntensityLocation, 2 - fxaaIntensity);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            animationFrameIdRef.current = requestAnimationFrame(animate);
        }

        animationFrameIdRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            gl.deleteProgram(fractalProgram);
            gl.deleteProgram(fxaaProgram);
            gl.deleteBuffer(quadBuffer);
            gl.deleteFramebuffer(framebuffer);
            gl.deleteTexture(fractalTexture);
        };
    }, [equation, iterations, cutoff, zoom, offset, colorScheme, fxaaIntensity, setZoom, setOffset, pixelSize]);  // Include pixelSize in the dependencies

    return <canvas ref={canvasRef}></canvas>;
}

export default FractalCanvas;