import React, { useEffect, useRef, useState } from 'react';
import DraggableBead from './DraggableBead';
import {
    fractalVertexShaderSource,
    fractalFragmentShaderSource,
    fxaaVertexShaderSource,
    fxaaFragmentShaderSource
} from './shaders';
import { useDragAndZoom } from './useDragAndZoom';
import { createProgram, resizeCanvasToDisplaySize } from './WebGLUtils';

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
    pixelSize,
    inJuliaSetMode,
    juliaParam,
    setJuliaParam,
    onError
}) {
    const canvasRef = useRef();
    const animationFrameIdRef = useRef(null);

    // Refs to hold WebGL resources
    const framebufferRef = useRef(null);
    const fractalTextureRef = useRef(null);

    // Ref to hold the latest juliaParam without causing re-renders
    const juliaParamRef = useRef(juliaParam);
    useEffect(() => {
        juliaParamRef.current = juliaParam;
        console.log("Julia Param Updated", juliaParam);
    }, [juliaParam]);

    // Initialize drag and zoom functionality
    useDragAndZoom(canvasRef, zoom, offset, setZoom, setOffset);

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2', { 
            antialias: false, 
            preserveDrawingBuffer: true 
        });
        if (!gl) {
            console.error('WebGL2 is not supported in your browser.');
            return;
        }

        const handleShaderError = (error) => {
            if (onError) {
                onError({
                    type: 'runtime',
                    message: error.message || 'WebGL shader runtime error occurred'
                });
            }
        };

        try {
            // Shader programs
            const fractalProgram = createProgram(
                gl,
                fractalVertexShaderSource,
                fractalFragmentShaderSource(equation, iterations, cutoff, colorScheme, zoom, inJuliaSetMode),
                onError
            );
            const fxaaProgram = createProgram(gl, fxaaVertexShaderSource, fxaaFragmentShaderSource, onError);
            if (!fractalProgram || !fxaaProgram) {
                console.error('Failed to create shader programs');
                return;
            }

            // Create geometry (quad)
            const quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
            gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

            // Function to set up or resize framebuffer and texture
            const setupFramebuffer = () => {
                // Compute the reduced resolution size based on current canvas size and pixelSize
                const reducedWidth = Math.ceil(canvas.width / pixelSize);
                const reducedHeight = Math.ceil(canvas.height / pixelSize);

                // Clean up existing framebuffer and texture
                if (framebufferRef.current) {
                    gl.deleteFramebuffer(framebufferRef.current);
                    framebufferRef.current = null;
                }
                if (fractalTextureRef.current) {
                    gl.deleteTexture(fractalTextureRef.current);
                    fractalTextureRef.current = null;
                }

                // Create a new framebuffer
                const framebuffer = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

                // Create a texture to store the fractal at a lower resolution
                const fractalTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, reducedWidth, reducedHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fractalTexture, 0);

                if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                    console.error('Framebuffer is not complete');
                }

                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                // Update refs with new framebuffer and texture
                framebufferRef.current = framebuffer;
                fractalTextureRef.current = fractalTexture;
            };

            // Initial setup
            setupFramebuffer();

            // Handle canvas resizing
            const handleResize = () => {
                // Resize the canvas to match the display size
                resizeCanvasToDisplaySize(gl, canvas, fractalTextureRef.current, framebufferRef.current);
                // Re-setup framebuffer and texture after resizing
                setupFramebuffer();
            };

            // Perform initial resize
            handleResize();

            // Add resize event listener
            window.addEventListener('resize', handleResize);

            // Get attribute and uniform locations for fractal program
            const fractalPositionLocation = gl.getAttribLocation(fractalProgram, 'position');
            const fractalResolutionLocation = gl.getUniformLocation(fractalProgram, 'u_resolution');
            const fractalOffsetLocation = gl.getUniformLocation(fractalProgram, 'u_offset');
            const fractalZoomLocation = gl.getUniformLocation(fractalProgram, 'u_zoom');
            const fractalTimeLocation = gl.getUniformLocation(fractalProgram, 'u_time');
            const juliaParamLocation = gl.getUniformLocation(fractalProgram, 'u_juliaParam');
            const isJuliaSetLocation = gl.getUniformLocation(fractalProgram, 'u_isJuliaSet');

            // Get attribute and uniform locations for FXAA program
            const fxaaPositionLocation = gl.getAttribLocation(fxaaProgram, 'position');
            const fxaaTextureLocation = gl.getUniformLocation(fxaaProgram, 'u_texture');
            const fxaaResolutionLocation = gl.getUniformLocation(fxaaProgram, 'u_resolution');
            const fxaaIntensityLocation = gl.getUniformLocation(fxaaProgram, 'u_fxaaIntensity');

            let startTime = performance.now();

            // Animation loop
            const animate = (currentTime) => {
                const elapsedTime = (currentTime - startTime) / 1000.0;

                // Render fractal to low-resolution framebuffer
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebufferRef.current);
                const reducedWidth = Math.ceil(canvas.width / pixelSize);
                const reducedHeight = Math.ceil(canvas.height / pixelSize);
                gl.viewport(0, 0, reducedWidth, reducedHeight);
                gl.useProgram(fractalProgram);
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
                gl.enableVertexAttribArray(fractalPositionLocation);
                gl.vertexAttribPointer(fractalPositionLocation, 2, gl.FLOAT, false, 0, 0);

                // Set uniforms
                gl.uniform2f(fractalResolutionLocation, reducedWidth, reducedHeight);
                gl.uniform2f(fractalOffsetLocation, offset.x, offset.y);
                gl.uniform1f(fractalZoomLocation, zoom);
                gl.uniform1f(fractalTimeLocation, elapsedTime);
                gl.uniform2f(juliaParamLocation, juliaParamRef.current.x, juliaParamRef.current.y);
                gl.uniform1i(isJuliaSetLocation, inJuliaSetMode ? 1 : 0);

                // Draw fractal
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Render the low-resolution framebuffer to the screen with FXAA
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.useProgram(fxaaProgram);
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
                gl.enableVertexAttribArray(fxaaPositionLocation);
                gl.vertexAttribPointer(fxaaPositionLocation, 2, gl.FLOAT, false, 0, 0);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, fractalTextureRef.current);
                gl.uniform1i(fxaaTextureLocation, 0);
                gl.uniform2f(fxaaResolutionLocation, canvas.width, canvas.height);
                gl.uniform1f(fxaaIntensityLocation, 2 - fxaaIntensity);

                // Draw FXAA
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Request the next frame
                animationFrameIdRef.current = requestAnimationFrame(animate);
            };

            // Start the animation loop
            animationFrameIdRef.current = requestAnimationFrame(animate);

            // Cleanup on unmount
            return () => {
                window.removeEventListener('resize', handleResize);
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                }
                gl.deleteProgram(fractalProgram);
                gl.deleteProgram(fxaaProgram);
                gl.deleteBuffer(quadBuffer);
                if (framebufferRef.current) gl.deleteFramebuffer(framebufferRef.current);
                if (fractalTextureRef.current) gl.deleteTexture(fractalTextureRef.current);
            };
        } catch (error) {
            handleShaderError(error);
        }
    }, [
        equation,
        iterations,
        cutoff,
        zoom,
        offset,
        colorScheme,
        fxaaIntensity,
        pixelSize,
        inJuliaSetMode
        // Note: 'juliaParam' is intentionally excluded from dependencies for now
    ]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
            {inJuliaSetMode && (
                <DraggableBead
                    canvasRef={canvasRef}
                    juliaParam={juliaParam}
                    setJuliaParam={setJuliaParam}
                />
            )}
        </div>
    );
}

export default FractalCanvas;
