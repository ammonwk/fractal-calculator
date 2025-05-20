export function compileShader(gl, type, source, onError) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = new Error(gl.getShaderInfoLog(shader));
        if (onError) onError(error);
        console.error("logged", error);
        gl.deleteShader(shader);
        return -1;
    }
    return shader;
}

export function createProgram(gl, vertexShaderSource, fragmentShaderSource, onError) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource, onError);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource, onError);

    if (!vertexShader || !fragmentShader) {
        const error = new Error(gl.getShaderInfoLog(fragmentShader) || gl.getShaderInfoLog(vertexShader));
        if (onError) onError(error);
        return null;
    } else if (vertexShader == -1 || fragmentShader == -1) {
        return null;
    } else {
        if (onError) onError(null);
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const error = new Error(gl.getProgramInfoLog(program));
        if (onError) onError(error);
        gl.deleteProgram(program);
        return null;
    } else {
        if (onError) onError(null);
    }

    return program;
}

export function resizeCanvasToDisplaySize(gl, canvas, fractalTexture, framebuffer) {
    const dpr = window.devicePixelRatio || 1; // Get device pixel ratio
    const displayWidth = Math.floor(window.innerWidth * dpr);  // Adjusted width
    const displayHeight = Math.floor(window.innerHeight * dpr); // Adjusted height

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        if(fractalTexture) {
            // Update the texture with the new size
            gl.bindTexture(gl.TEXTURE_2D, fractalTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        // Bind and set the viewport for the framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Reset the default framebuffer and viewport
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

