import React, { useEffect, useRef, useState } from 'react';

function FractalCanvas({ equation }) {
    const canvasRef = useRef();
    const [zoom, setZoom] = useState(1.0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const animationFrameIdRef = useRef(null); // Reference to store the animation frame ID

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error('WebGL2 is not supported in your browser.');
            return;
        }

        // Vertex Shader
        const vertexShaderSource = `#version 300 es
        in vec4 position;
        void main() {
            gl_Position = position;
        }`;

        // Fragment Shader
        console.log(equation);
        const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform vec2 u_resolution;
        uniform vec2 u_offset;
        uniform float u_zoom;
        out vec4 outColor;

        void main() {
            vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
            uv.x *= u_resolution.x / u_resolution.y;
            uv = uv / u_zoom - u_offset;

            vec2 c = uv;
            vec2 z = vec2(0.0);

            float iterations = 100.0;
            float smoothColor = 0.0;

            for (float i = 0.0; i < iterations; i++) {
                z = ${equation};  // Dynamic equation
                if (length(z) > 4.0) {
                    smoothColor = i - log(log(length(z))) / log(2.0);
                    float r = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 0.0);
                    float g = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 2.0);
                    float b = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 4.0);
                    outColor = vec4(r, g, b, 1.0);
                    return;
                }
            }
            outColor = vec4(0.0, 0.0, 0.0, 1.0);
        }`;

        // Compile Shader
        function compileShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile failed with:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        // Create and Link Program
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Check if shaders were created successfully
        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            return;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program failed to link:', gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        // Setup Quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Uniforms
        const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
        const offsetLocation = gl.getUniformLocation(program, 'u_offset');
        const zoomLocation = gl.getUniformLocation(program, 'u_zoom');

        // Handle Resize
        function onResize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        }

        window.addEventListener('resize', onResize);
        onResize();

        // Animation Loop
        function animate() {
            gl.useProgram(program); // Ensure the program is in use
            gl.uniform2f(offsetLocation, offset.x, offset.y);
            gl.uniform1f(zoomLocation, zoom);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrameIdRef.current = requestAnimationFrame(animate); // Store the animation frame ID
        }

        animate();

        const onMouseDown = (event) => {
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: event.clientX, y: event.clientY };
        };

        const onMouseMove = (event) => {
            if (isDraggingRef.current) {
                const deltaX = (event.clientX - lastMousePosRef.current.x) / (zoom * canvas.width);
                const deltaY = (event.clientY - lastMousePosRef.current.y) / (zoom * canvas.height);
                setOffset(prevOffset => ({
                    x: prevOffset.x + deltaX * 2.0,
                    y: prevOffset.y - deltaY * 2.0
                }));
                lastMousePosRef.current = { x: event.clientX, y: event.clientY };
            }
        };

        const onMouseUp = () => {
            isDraggingRef.current = false;
        };

        const onWheel = (event) => {
            const newZoom = zoom * (event.deltaY < 0 ? 1.1 : 0.9);
            const rect = canvas.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left) / rect.width;
            const mouseY = (event.clientY - rect.top) / rect.height;

            const aspectRatio = canvas.width / canvas.height;
            const newOffsetX = offset.x - ((mouseX - 0.5) * aspectRatio * 2.0) * (1 / zoom - 1 / newZoom);
            const newOffsetY = offset.y + ((mouseY - 0.5) * 2.0) * (1 / zoom - 1 / newZoom);

            setZoom(newZoom);
            setOffset({ x: newOffsetX, y: newOffsetY });
        };

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel);

        return () => {
            window.removeEventListener('resize', onResize);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);

            // Cancel the animation loop
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }

            // Delete WebGL resources
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
        };
    }, [offset, zoom, equation]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

export default FractalCanvas;
