// FractalCanvas.js
import React, { useEffect, useRef, useState } from 'react';
import DraggableBead from './DraggableBead';
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
    pixelSize,
    inJuliaSetMode
}) {
    const canvasRef = useRef();
    const animationFrameIdRef = useRef(null);
    const [juliaParam, setJuliaParam] = useState({ x: 0.0, y: 0.0 });

    useDragAndZoom(canvasRef, zoom, offset, setZoom, setOffset);

    useEffect(() => {

        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2', { antialias: false });
        if (!gl) {
            console.error('WebGL2 is not supported in your browser.');
            return;
        }

        const resizeCanvas = () => {
            resizeCanvasToDisplaySize(gl, canvas);
        };

        // Call resizeCanvas immediately to ensure correct size on mount
        resizeCanvas();

        // Construct shader programs dynamically
        const fractalProgram = createProgram(
            gl,
            fractalVertexShaderSource,
            fractalFragmentShaderSource(equation, iterations, cutoff, colorScheme, zoom, inJuliaSetMode)
        );
        const fxaaProgram = createProgram(gl, fxaaVertexShaderSource, fxaaFragmentShaderSource);
        if (!fractalProgram || !fxaaProgram) {
            console.error('Failed to create shader programs');
            return;
        }

        // Create geometry and setup framebuffer
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        // Create a lower-resolution framebuffer for rendering fractals
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // Compute the reduced resolution size after ensuring canvas is properly resized
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

        // New uniforms for Julia Set
        const juliaParamLocation = gl.getUniformLocation(fractalProgram, 'u_juliaParam');
        const isJuliaSetLocation = gl.getUniformLocation(fractalProgram, 'u_isJuliaSet');

        const fxaaPositionLocation = gl.getAttribLocation(fxaaProgram, 'position');
        const fxaaTextureLocation = gl.getUniformLocation(fxaaProgram, 'u_texture');
        const fxaaResolutionLocation = gl.getUniformLocation(fxaaProgram, 'u_resolution');
        const fxaaIntensityLocation = gl.getUniformLocation(fxaaProgram, 'u_fxaaIntensity');

        let startTime = performance.now();

        function animate(currentTime) {
            const elapsedTime = (currentTime - startTime) / 1000.0;

            // Render fractal to low-resolution framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, reducedWidth, reducedHeight);
            gl.useProgram(fractalProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.enableVertexAttribArray(fractalPositionLocation);
            gl.vertexAttribPointer(fractalPositionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.uniform2f(fractalResolutionLocation, reducedWidth, reducedHeight);
            gl.uniform2f(fractalOffsetLocation, offset.x, offset.y);
            gl.uniform1f(fractalZoomLocation, zoom);
            gl.uniform1f(fractalTimeLocation, elapsedTime);
            gl.uniform2f(juliaParamLocation, juliaParam.x, juliaParam.y); // Pass Julia parameter
            gl.uniform1i(isJuliaSetLocation, inJuliaSetMode ? 1 : 0); // Pass Julia set mode

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Render the low-resolution framebuffer to the screen
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
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

        window.addEventListener('resize', resizeCanvas);

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
    }, [equation, iterations, cutoff, zoom, offset, colorScheme, fxaaIntensity, pixelSize, inJuliaSetMode, juliaParam]);

    return (
        <div style={{ position: 'relative' }}>
            <canvas ref={canvasRef} style={{ display: 'block' }}></canvas>
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
