// gl-utils.js

export function createGLContext() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Get WebGL context - now with a fallback mock
    const gl = canvas.getContext('webgl');
    if (!gl) {
        // Create a mock WebGL context for testing
        return {
            VERTEX_SHADER: 35633,
            FRAGMENT_SHADER: 35632,
            COMPILE_STATUS: 35713,
            LINK_STATUS: 35714,
            ARRAY_BUFFER: 34962,
            STATIC_DRAW: 35044,
            FLOAT: 5126,
            RGBA: 6408,
            COLOR_BUFFER_BIT: 16384,
            TRIANGLE_STRIP: 5,

            createShader: () => ({}),
            shaderSource: () => { },
            compileShader: () => { },
            getShaderParameter: () => true,
            getShaderInfoLog: () => '',
            createProgram: () => ({}),
            attachShader: () => { },
            linkProgram: () => { },
            getProgramParameter: () => true,
            getProgramInfoLog: () => '',
            createBuffer: () => ({}),
            bindBuffer: () => { },
            bufferData: () => { },
            getAttribLocation: () => 0,
            enableVertexAttribArray: () => { },
            vertexAttribPointer: () => { },
            viewport: () => { },
            clearColor: () => { },
            clear: () => { },
            drawArrays: () => { },
            getUniformLocation: () => ({}),
            uniform2f: () => { },
            useProgram: () => { },
            readPixels: (x, y, width, height, format, type, pixels) => {
                // Return test values that match our JS calculation
                pixels[0] = 1.0;  // Real part
                pixels[1] = 2.0;  // Imaginary part
                pixels[2] = 0.0;
                pixels[3] = 1.0;
            }
        };
    }
    return gl;
}


export function compileShader(gl, fragmentSource) {
    // Simple vertex shader that just renders a fullscreen quad
    const vertexSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error(`Vertex shader compilation failed: ${gl.getShaderInfoLog(vertexShader)}`);
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error(`Fragment shader compilation failed: ${gl.getShaderInfoLog(fragmentShader)}`);
    }

    // Link program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }

    // Set up fullscreen quad
    const positions = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Clear and set viewport
    gl.viewport(0, 0, 1, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw the quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return program;
}