import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function FractalCanvas({
    equation,
    iterations,
    cutoff,
    zoom,
    offset,
    setZoom,
    setOffset,
    colorScheme,
    fxaaIntensity
}) {
    const canvasRef = useRef();
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const animationFrameIdRef = useRef(null);

    // Define the color options as an object
    const colorOptions = {
        'Rainbow': `
            float r = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 0.0);
            float g = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 2.0);
            float b = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 4.0);
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
        'Twinkling Stars': `
            float brightness = smoothColor / 800.0;
            // Make twinkle more subtle and only affect brighter parts
            float twinkle = 1.0 + 0.5 * sin(u_time * 5.0 + smoothColor * 2.5); // Reduced frequency and amplitude
            vec3 coreColor = vec3(0.8, 0.7, 1.0); // White and blue core for galaxy center
            vec3 edgeColor = mix(vec3(0.0, 0.0, 0.1), vec3(0.0, 0.1, 0.2), brightness); // Darker edges
            vec3 color = mix(edgeColor, coreColor, brightness*2.0); // Base color mixing without twinkle
            color = mix(color, color * twinkle, step(0.25, brightness)); // Apply twinkle only to brighter parts
            outColor = vec4(color, 1.0);
        `,
        'Psychedelics': `
            float pulse = abs(sin(u_time + smoothColor * 0.1));
            float r = 0.5 + 0.5 * cos(smoothColor * 0.1 + 0.0);
            float g = 0.5 + 0.5 * cos(smoothColor * 0.1 + 2.0);
            float b = 0.5 + 0.5 * cos(smoothColor * 0.1 + 4.0);
            vec3 color = vec3(r, g, b) * pulse;
            outColor = vec4(color, 1.0);
        `,
        'Fire and Embers': `
            // Dynamic flickering for fire
            float flicker = 0.7 + 0.3 * sin(u_time * 3.9 + smoothColor * 5.0); // 35% slower
            float r = 1.0 * flicker;
            float g = 0.5 * flicker * (0.5 + 0.5 * sin(smoothColor * 3.0 + u_time * 1.3));
            float b = 0.2 * flicker * (0.5 + 0.5 * cos(smoothColor * 4.0 - u_time * 1.95));

            // Embers with subtle glow
            float emberGlow = smoothstep(0.7, 1.0, sin(u_time * 6.5 + smoothColor * 7.0)) * flicker;
            vec3 emberColor = mix(vec3(r, g, b), vec3(1.0, 0.3, 0.1), emberGlow);

            // More stable smoke effect
            float smokeMovement = 0.1 * sin(u_time * 0.5 + smoothColor * 0.1); // Slower movement for smoke
            vec3 smokeColor = vec3(0.1, 0.1, 0.1) + smokeMovement;

            // Apply fire flicker only to brighter parts
            float brightness = smoothColor / ${iterations}.0; // Normalize brightness
            vec3 finalColor = mix(smokeColor, emberColor, step(${Math.cbrt(zoom)/50}, brightness)); // Fire extends 95% more

            outColor = vec4(finalColor, 1.0);
        `, 
        'Ocean Waves': `
            // Dynamic movement for surf
            float wave = 0.6 + 0.4 * sin(u_time * 2.0 + smoothColor * 1.5);
            float r = 0.2 + 0.3 * wave;
            float g = 0.5 + 0.5 * sin(smoothColor * 0.3 + u_time * 2.0) * wave;
            float b = 0.8 + 0.2 * cos(smoothColor * 0.5 + u_time * 3.0) * wave;

            // Swaying motion for deeper water
            float deepWaterMovement = 0.1 * sin(u_time * 0.5 + smoothColor * 0.2); // Slower, back-and-forth motion
            vec3 deepWaterColor = vec3(0.0, 0.1, 0.2) + vec3(deepWaterMovement, deepWaterMovement * 0.5, deepWaterMovement * 0.3);

            // Smooth blending between surf and deep water
            float brightness = smoothColor / ${iterations}.0; // Normalize brightness
            float mixFactor = smoothstep(0.005, 0.015, brightness); // Gradual transition
            vec3 waveColor = mix(deepWaterColor, vec3(r, g, b), mixFactor); // Blend dynamically based on brightness

            outColor = vec4(waveColor, 1.0);
        `,
        'Aurora Borealis': `
            float shift = 0.5 + 0.5 * sin(u_time * 1.0 + smoothColor * 0.8); // Aurora movement and spacing
            float r = 0.4 + 0.6 * shift * (0.5 + 0.5 * cos(smoothColor * 1.5 + u_time * 0.5));
            float g = 0.7 + 0.3 * shift * (0.5 + 0.5 * sin(smoothColor * 1.2 - u_time * 0.6));
            float b = 0.9 + 0.1 * shift;

            // Create flowing bands for aurora
            float auroraEffect = smoothstep(0.6, 1.1, abs(sin(u_time * 0.75 + smoothColor * ${1/(4*Math.log10(zoom))}))) * 0.8;

            // More stable dark sky background
            float skyMovement = 0.01 * sin(u_time * 0.1 + smoothColor * 0.05); // Very subtle, slow movement
            vec3 skyColor = vec3(0.0, 0.0, 0.1) + skyMovement;

            // Smooth blending between aurora and sky
            float brightness = smoothColor / ${iterations}.0; // Normalize brightness
            float mixFactor = smoothstep(0.001, 0.003, brightness); // Gradual transition
            vec3 auroraColor = mix(skyColor, vec3(r, g, b) * auroraEffect, mixFactor); // Aurora effect with smoother transition

            outColor = vec4(auroraColor, 1.0);
        `,
        'The Matrix': `
            float column = mod(gl_FragCoord.x / u_resolution.x, 1.0); // Keep column stationary
            float row = mod(gl_FragCoord.y / u_resolution.y + u_time * 0.5, 1.0); // Move rows downward
            float character = step(0.95, fract(sin(smoothColor * 100.0 + u_time * 30.0) * 43758.5453123)); // Randomized character effect
            float brightness = step(0.5, abs(sin(u_time * 3.0 + smoothColor * 5.0))) * row * character;

            vec3 matrixColor = mix(vec3(0.0, 0.1, 0.0), vec3(0.0, 1.0, 0.0), brightness); // Bright green falling text

            // Very subtle dark background movement
            float backgroundStability = 0.02 * sin(u_time * 0.1 + smoothColor * 0.05); // Minimal movement
            vec3 backgroundColor = vec3(0.0, 0.0, 0.0) + backgroundStability;

            // Smooth blending between matrix rain and background
            float normalizedBrightness = smoothColor / ${iterations}.0; // Normalize brightness
            float mixFactor = smoothstep(0.001, 0.003, normalizedBrightness); // Gradual transition
            vec3 finalColor = mix(backgroundColor, matrixColor, mixFactor); // Apply smoother transition

            outColor = vec4(finalColor, 1.0);
        `
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl2', { antialias: false }); // Disable default AA
        if (!gl) {
            console.error('WebGL2 is not supported in your browser.');
            return;
        }

        // ===========================
        // 1. Shader Source Definitions
        // ===========================

        // Vertex Shader for Fractal Rendering
        const fractalVertexShaderSource = `#version 300 es
        in vec4 position;
        void main() {
            gl_Position = position;
        }`;

        // Fragment Shader for Fractal Rendering
        const fractalFragmentShaderSource = `#version 300 es
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
                ${equation};
                if (length(z) > cutoff) {
                    smoothColor = i - log(log(length(z))) / log(2.0);

                    ${colorOptions[colorScheme]} // Insert the selected color option here
                    return;
                }
            }
            outColor = vec4(0.0, 0.0, 0.0, 1.0);
        }`;

        // Vertex Shader for FXAA Pass
        const fxaaVertexShaderSource = `#version 300 es
        in vec4 position;
        out vec2 v_uv;

        void main() {
            v_uv = (position.xy + 1.0) * 0.5;
            gl_Position = position;
        }`;

        // Fragment Shader for FXAA Pass with fxaaIntensity
        const fxaaFragmentShaderSource = `#version 300 es
        precision highp float;

        in vec2 v_uv;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_fxaaIntensity; // New uniform for intensity
        out vec4 outColor;

        void main() {
            // FXAA parameters
            float FXAA_SPAN_MAX = 8.0;
            float FXAA_REDUCE_MUL = 1.0 / 8.0;
            float FXAA_REDUCE_MIN = 1.0 / 128.0;

            // Pixel size
            vec2 inverse_resolution = 1.0 / u_resolution;

            // Sample the surrounding pixels
            vec3 rgbNW = texture(u_texture, v_uv + vec2(-inverse_resolution.x, -inverse_resolution.y)).rgb;
            vec3 rgbNE = texture(u_texture, v_uv + vec2(inverse_resolution.x, -inverse_resolution.y)).rgb;
            vec3 rgbSW = texture(u_texture, v_uv + vec2(-inverse_resolution.x, inverse_resolution.y)).rgb;
            vec3 rgbSE = texture(u_texture, v_uv + vec2(inverse_resolution.x, inverse_resolution.y)).rgb;
            vec3 rgbM  = texture(u_texture, v_uv).rgb;

            // Calculate luminance
            float lumaNW = dot(rgbNW, vec3(0.299, 0.587, 0.114));
            float lumaNE = dot(rgbNE, vec3(0.299, 0.587, 0.114));
            float lumaSW = dot(rgbSW, vec3(0.299, 0.587, 0.114));
            float lumaSE = dot(rgbSE, vec3(0.299, 0.587, 0.114));
            float lumaM  = dot(rgbM,  vec3(0.299, 0.587, 0.114));

            // Determine the min and max luminance
            float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
            float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

            // Calculate edge detection
            float edge = (lumaMax - lumaMin);

            // If the edge is too small, don't apply FXAA
            if(edge < FXAA_REDUCE_MIN) {
                outColor = vec4(rgbM, 1.0);
                return;
            }

            // Compute blend weight
            float weight = clamp((edge - FXAA_REDUCE_MIN) / (FXAA_SPAN_MAX * FXAA_REDUCE_MUL), 0.0, 1.0);

            // Adjust weight based on fxaaIntensity
            float adjustedWeight = clamp(weight * u_fxaaIntensity, 0.0, 1.0);

            // Blend the colors
            vec3 finalColor = mix(rgbM, (rgbNW + rgbNE + rgbSW + rgbSE) / 4.0, adjustedWeight);

            outColor = vec4(finalColor, 1.0);
        }`;

        // ===========================
        // 2. Shader Compilation and Program Linking
        // ===========================

        // Utility function to compile a shader
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

        // Utility function to create a program
        function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

            if (!vertexShader || !fragmentShader) {
                console.error('Failed to compile shaders.');
                return null;
            }

            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program failed to link:', gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }

            return program;
        }

        // Create fractal shader program
        const fractalProgram = createProgram(gl, fractalVertexShaderSource, fractalFragmentShaderSource);
        if (!fractalProgram) return;

        // Create FXAA shader program
        const fxaaProgram = createProgram(gl, fxaaVertexShaderSource, fxaaFragmentShaderSource);
        if (!fxaaProgram) return;

        // ===========================
        // 3. Setup Geometry
        // ===========================

        // Create a buffer for a full-screen quad
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const quadVertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        // Create another buffer for FXAA pass (optional, can reuse quadBuffer)
        const fxaaQuadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, fxaaQuadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

        // ===========================
        // 4. Setup Framebuffer for Offscreen Rendering
        // ===========================

        // Create framebuffer
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // Create texture to render fractal into
        const fractalTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            canvas.width,
            canvas.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Attach texture to framebuffer
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            fractalTexture,
            0
        );

        // Check framebuffer status
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is not complete');
            return;
        }

        // Unbind framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // ===========================
        // 5. Get Attribute and Uniform Locations
        // ===========================

        // Fractal Program Locations
        const fractalPositionLocation = gl.getAttribLocation(fractalProgram, 'position');
        const fractalResolutionLocation = gl.getUniformLocation(fractalProgram, 'u_resolution');
        const fractalOffsetLocation = gl.getUniformLocation(fractalProgram, 'u_offset');
        const fractalZoomLocation = gl.getUniformLocation(fractalProgram, 'u_zoom');
        const fractalTimeLocation = gl.getUniformLocation(fractalProgram, 'u_time');

        // FXAA Program Locations
        const fxaaPositionLocation = gl.getAttribLocation(fxaaProgram, 'position');
        const fxaaTextureLocation = gl.getUniformLocation(fxaaProgram, 'u_texture');
        const fxaaResolutionLocation = gl.getUniformLocation(fxaaProgram, 'u_resolution');
        const fxaaIntensityLocation = gl.getUniformLocation(fxaaProgram, 'u_fxaaIntensity'); // New uniform

        // ===========================
        // 6. Handle Resizing
        // ===========================

        function resizeCanvas() {
            const displayWidth = window.innerWidth;
            const displayHeight = window.innerHeight;

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;

                // Resize fractal texture
                gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    canvas.width,
                    canvas.height,
                    0,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    null
                );

                // Update viewport for framebuffer
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Initial resize

        // ===========================
        // 7. Event Handlers for Interaction
        // ===========================

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
            event.preventDefault(); // Prevent page scroll
            const zoomFactor = 1.1;
            const newZoom = zoom * (event.deltaY < 0 ? zoomFactor : 1 / zoomFactor);

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
        canvas.addEventListener('wheel', onWheel, { passive: false });

        // ===========================
        // 8. Animation Loop
        // ===========================

        let startTime = performance.now();

        function animate(currentTime) {
            // Calculate elapsed time in seconds
            const elapsedTime = (currentTime - startTime) / 1000.0;

            // ---------------------------
            // First Pass: Render Fractal to Framebuffer
            // ---------------------------
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(fractalProgram);

            // Bind quad buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.enableVertexAttribArray(fractalPositionLocation);
            gl.vertexAttribPointer(fractalPositionLocation, 2, gl.FLOAT, false, 0, 0);

            // Set uniforms
            gl.uniform2f(fractalResolutionLocation, canvas.width, canvas.height);
            gl.uniform2f(fractalOffsetLocation, offset.x, offset.y);
            gl.uniform1f(fractalZoomLocation, zoom);
            gl.uniform1f(fractalTimeLocation, elapsedTime);

            // Draw the fractal
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // ---------------------------
            // Second Pass: Apply FXAA and Render to Screen
            // ---------------------------
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(fxaaProgram);

            // Bind FXAA quad buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, fxaaQuadBuffer);
            gl.enableVertexAttribArray(fxaaPositionLocation);
            gl.vertexAttribPointer(fxaaPositionLocation, 2, gl.FLOAT, false, 0, 0);

            // Bind the fractal texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
            gl.uniform1i(fxaaTextureLocation, 0);
            gl.uniform2f(fxaaResolutionLocation, canvas.width, canvas.height);
            gl.uniform1f(fxaaIntensityLocation, 2 - fxaaIntensity); // Pass fxaaIntensity
            // Slider value is inverted for better control

            // Draw the quad with FXAA
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Request next frame
            animationFrameIdRef.current = requestAnimationFrame(animate);
        }

        // Start the animation loop
        animationFrameIdRef.current = requestAnimationFrame(animate);

        // ===========================
        // 9. Cleanup on Unmount
        // ===========================

        // Cleanup function
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);

            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }

            // Delete WebGL resources
            gl.deleteProgram(fractalProgram);
            gl.deleteProgram(fxaaProgram);
            gl.deleteShader(fractalProgram.vertexShader);
            gl.deleteShader(fractalProgram.fragmentShader);
            gl.deleteShader(fxaaProgram.vertexShader);
            gl.deleteShader(fxaaProgram.fragmentShader);

            gl.deleteBuffer(quadBuffer);
            gl.deleteBuffer(fxaaQuadBuffer);

            gl.deleteFramebuffer(framebuffer);
            gl.deleteTexture(fractalTexture);
        };
    }, [equation, iterations, cutoff, zoom, offset, colorScheme, fxaaIntensity, setZoom, setOffset]); // Ensure dependencies are correct

    // Define PropTypes for better type checking and documentation
    FractalCanvas.propTypes = {
        equation: PropTypes.string.isRequired,
        iterations: PropTypes.number.isRequired,
        cutoff: PropTypes.number.isRequired,
        zoom: PropTypes.number.isRequired,
        offset: PropTypes.shape({
            x: PropTypes.number.isRequired,
            y: PropTypes.number.isRequired
        }).isRequired,
        setZoom: PropTypes.func.isRequired,
        setOffset: PropTypes.func.isRequired,
        colorScheme: PropTypes.oneOf([
            'Rainbow',
            'Snowflake',
            'Watercolors',
            'Twinkling Stars',
            'Psychedelics',
            'Fire and Embers',
            'Ocean Waves',
            'Aurora Borealis',
            'The Matrix'
        ]).isRequired,
        fxaaIntensity: PropTypes.number // New prop
    };

    // Define default props
    FractalCanvas.defaultProps = {
        fxaaIntensity: 1.0 // Default intensity is 1 (standard FXAA)
    };

    return <canvas ref={canvasRef}></canvas>; // You should render the canvas

}

export default FractalCanvas;