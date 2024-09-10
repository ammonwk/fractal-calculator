import React, { useEffect, useRef } from 'react';

function FractalCanvas({ equation, iterations, cutoff, zoom, offset, setZoom, setOffset, colorScheme }) {
    const canvasRef = useRef();
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const animationFrameIdRef = useRef(null);

    // Define the color options as an object
    const colorOptions = {
        'Rainbow 1': `
        float r = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 0.0);
        float g = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 2.0);
        float b = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 4.0);
        outColor = vec4(r, g, b, 1.0);
    `,
        'Rainbow 2': `
        float r = 0.5 + 0.5 * cos(smoothColor * 0.15 + 0.0);
        float g = 0.5 + 0.5 * cos(smoothColor * 0.15 + 2.0);
        float b = 0.5 + 0.5 * cos(smoothColor * 0.15 + 4.0);
        outColor = vec4(r, g, b, 1.0);
    `,
        'Snowflake': `
        float logScale = log(1.0 + smoothColor) / log(1.0 + ${iterations}.0);
        float r = 1.0 - logScale;
        float g = 1.0 - logScale * 0.5;
        float b = 1.0;
        outColor = vec4(r, g, b, 1.0);
    `,
        'Watercolors': `
        float r = 0.7 + 0.2 * sin(smoothColor * 0.2);
        float g = 0.5 + 0.3 * cos(smoothColor * 0.1);
        float b = 0.8 + 0.1 * sin(smoothColor * 0.3);
        outColor = vec4(r, g, b, 0.8);
    `,
        'Night Sky': `
        float brightness = smoothColor / ${iterations}.0;
        float twinkle = 0.8 + 0.5 * sin(smoothColor * 0.5 + u_time); // More pronounced twinkling
        vec3 coreColor = vec3(0.8, 0.7, 1.0); // White and blue core for galaxy center
        vec3 edgeColor = mix(vec3(0.0, 0.0, 0.1), vec3(0.0, 0.1, 0.2), brightness); // Darker edges
        vec3 color = mix(edgeColor, coreColor, brightness) * twinkle;
        outColor = vec4(color, 1.0);
    `,
        'Neon Sign': `
        float pulse = abs(sin(u_time + smoothColor * 0.1));
        float r = 0.5 + 0.5 * cos(smoothColor * 0.1 + 0.0);
        float g = 0.5 + 0.5 * cos(smoothColor * 0.1 + 2.0);
        float b = 0.5 + 0.5 * cos(smoothColor * 0.1 + 4.0);
        vec3 color = vec3(r, g, b) * pulse;
        outColor = vec4(color, 1.0);
    `
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2', { antialias: true });
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
        const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform vec2 u_resolution;
        uniform vec2 u_offset;
        uniform float u_zoom;
        uniform float u_time; // Uniform for time (used in animations)
        out vec4 outColor;

        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec2 complexExp(vec2 z) {
            // z = (x, y) where x is the real part and y is the imaginary part
            float exp_real = exp(z.x); // Compute e^x
            return vec2(exp_real * cos(z.y), exp_real * sin(z.y)); // e^(x + iy) = e^x * (cos(y) + i*sin(y))
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
            uv.x *= u_resolution.x / u_resolution.y;
            uv = uv / u_zoom - u_offset;

            vec2 c = uv;
            vec2 z = vec2(0.0);

            float iterations = ${iterations}.0;
            float smoothColor = 0.0;
            float cutoff = ${cutoff}.0;

            for (float i = 0.0; i < iterations; i++) {
                ${equation}
                if (length(z) > cutoff) {
                    smoothColor = i - log(log(length(z))) / log(2.0);

                    ${colorOptions[colorScheme]} // Insert the selected color option here
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
                    x: prevOffset.x + deltaX * 2.0 * (canvas.width / canvas.height),
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
    }, [offset, zoom, equation, iterations, cutoff, colorScheme]);

    return <canvas ref={canvasRef} className="w-full h-full" />;
}

export default FractalCanvas;
