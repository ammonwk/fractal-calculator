// shaders.js

// Color options for dynamic fragment shader generation
export const colorOptions = (zoom) => ({
  'Rainbow': `
            float r = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 0.0);
            float g = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 2.0);
            float b = 0.5 + 0.5 * cos(3.0 + smoothColor * 0.15 + 4.0);
            outColor = vec4(r, g, b, 1.0);
        `,
  'Snowflake': `
            float logScale = log(1.0 + smoothColor) / log(800.0);
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

            // Normalize brightness
            float brightness = smoothColor / 800.0;

            // Calculate mixFactor for smooth blending between ember and smoke colors
            float mixFactor = smoothstep(0.005, 0.015, brightness); // Gradual transition range for smooth blending

            // Adjust ember intensity based on zoom factor
            float zoomFactor = ${Math.cbrt(zoom) / 50.0}; // Incorporate zoom factor as per original logic

            // Combine smoke and ember colors dynamically, scaling effect by zoom
            vec3 finalColor = mix(smokeColor, emberColor, mixFactor * step(zoomFactor, brightness)); // Apply zoom effect

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
            float brightness = smoothColor / 800.0; // Normalize brightness
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
            float auroraEffect = smoothstep(0.6, 1.1, abs(sin(u_time * 0.75 + smoothColor * ${1 / (4 * Math.log10(zoom))}))) * 0.8;

            // More stable dark sky background
            float skyMovement = 0.01 * sin(u_time * 0.1 + smoothColor * 0.05); // Very subtle, slow movement
            vec3 skyColor = vec3(0.0, 0.0, 0.1) + skyMovement;

            // Smooth blending between aurora and sky
            float brightness = smoothColor / 800.0; // Normalize brightness
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
            float normalizedBrightness = smoothColor / 800.0; // Normalize brightness
            float mixFactor = smoothstep(0.001, 0.003, normalizedBrightness); // Gradual transition
            vec3 finalColor = mix(backgroundColor, matrixColor, mixFactor); // Apply smoother transition

            outColor = vec4(finalColor, 1.0);
        `
});

// Fractal Vertex Shader
export const fractalVertexShaderSource = `#version 300 es
in vec4 position;
void main() {
    gl_Position = position;
}`;

// Fractal Fragment Shader
export const fractalFragmentShaderSource = (equation, iterations, cutoff, colorScheme, zoom, inJuliaSetMode) => `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_zoom;
uniform float u_time;
uniform vec2 u_juliaParam; // Julia set parameter
uniform int u_isJuliaSet; // Flag to toggle Julia set
out vec4 outColor;

// Complex multiplication
vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Complex division
vec2 complexDiv(vec2 a, vec2 b) {
    float denom = b.x * b.x + b.y * b.y;
    return vec2((a.x * b.x + a.y * b.y) / denom, (a.y * b.x - a.x * b.y) / denom);
}

// Complex exponentiation
vec2 complexExp(vec2 z) {
    float expReal = exp(z.x);
    return vec2(expReal * cos(z.y), expReal * sin(z.y));
}

// Complex logarithm
vec2 complexLog(vec2 z) {
    return vec2(log(length(z)), atan(z.y, z.x));
}

// Complex sine
vec2 complexSin(vec2 z) {
    return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
}

// Complex cosine
vec2 complexCos(vec2 z) {
    return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y));
}

// Complex square root
vec2 complexSqrt(vec2 z) {
    float r = length(z);
    float angle = atan(z.y, z.x);
    return vec2(sqrt((r + z.x) / 2.0), sign(z.y) * sqrt((r - z.x) / 2.0));
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    uv = uv / u_zoom - u_offset;

    vec2 c = u_isJuliaSet == 1 ? u_juliaParam : uv; // Use Julia parameter if in Julia set mode
    vec2 z = u_isJuliaSet == 1 ? uv : vec2(0.0); // Swap z and c in Julia mode

    float iterations = ${iterations}.0;
    float smoothColor = 0.0;
    float cutoff = ${cutoff}.0;

    for (float i = 0.0; i < iterations; i++) {
        ${equation};
        if (length(z) > cutoff) {
            smoothColor = i - log(log(length(z))) / log(2.0);

            ${colorOptions(zoom)[colorScheme] || colorOptions['Rainbow']} // Default to 'Rainbow' if colorScheme is not found
            return;
        }
    }
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
}`;

// FXAA Vertex Shader
export const fxaaVertexShaderSource = `#version 300 es
in vec4 position;
out vec2 v_uv;
void main() {
    v_uv = (position.xy + 1.0) * 0.5;
    gl_Position = position;
}`;

// FXAA Fragment Shader
export const fxaaFragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_fxaaIntensity;
out vec4 outColor;

void main() {
    float FXAA_SPAN_MAX = 8.0;
    float FXAA_REDUCE_MUL = 1.0 / 8.0;
    float FXAA_REDUCE_MIN = 1.0 / 128.0;
    vec2 inverse_resolution = 1.0 / u_resolution;

    vec3 rgbNW = texture(u_texture, v_uv + vec2(-inverse_resolution.x, -inverse_resolution.y)).rgb;
    vec3 rgbNE = texture(u_texture, v_uv + vec2(inverse_resolution.x, -inverse_resolution.y)).rgb;
    vec3 rgbSW = texture(u_texture, v_uv + vec2(-inverse_resolution.x, inverse_resolution.y)).rgb;
    vec3 rgbSE = texture(u_texture, v_uv + vec2(inverse_resolution.x, inverse_resolution.y)).rgb;
    vec3 rgbM  = texture(u_texture, v_uv).rgb;

    float lumaNW = dot(rgbNW, vec3(0.299, 0.587, 0.114));
    float lumaNE = dot(rgbNE, vec3(0.299, 0.587, 0.114));
    float lumaSW = dot(rgbSW, vec3(0.299, 0.587, 0.114));
    float lumaSE = dot(rgbSE, vec3(0.299, 0.587, 0.114));
    float lumaM  = dot(rgbM,  vec3(0.299, 0.587, 0.114));

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    float edge = (lumaMax - lumaMin);

    if(edge < FXAA_REDUCE_MIN) {
        outColor = vec4(rgbM, 1.0);
        return;
    }

    float weight = clamp((edge - FXAA_REDUCE_MIN) / (FXAA_SPAN_MAX * FXAA_REDUCE_MUL), 0.0, 1.0);
    float adjustedWeight = clamp(weight * u_fxaaIntensity, 0.0, 1.0);
    vec3 finalColor = mix(rgbM, (rgbNW + rgbNE + rgbSW + rgbSE) / 4.0, adjustedWeight);

    outColor = vec4(finalColor, 1.0);
}`;
