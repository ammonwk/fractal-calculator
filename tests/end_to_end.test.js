import Complex from 'complex';
import { createGLContext, compileShader } from './gl-utils'; // You'll need to implement these

describe('Complex number calculations', () => {
    test('WebGL output matches JavaScript complex math', () => {
        // The GLSL shader code
        const fragmentShader = `
      precision highp float;
      uniform vec2 z;
      uniform vec2 c;
      
      void main() {
        vec2 temp_0 = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        vec2 temp_1 = (temp_0 + c);
        vec2 temp_2 = vec2(0.64 * z.x, 0.64 * z.y);
        vec2 temp_3 = (temp_1 + temp_2);
        vec2 temp_4 = (temp_3 - vec2(0.32, 0.0));
        gl_FragColor = vec4(temp_4, 0.0, 1.0);
      }
    `;

        // JavaScript implementation
        const z = new Complex(1, 2); // test value
        const c = new Complex(-0.4, 0.6); // test value

        const jsResult = z.pow(2)
            .add(c)
            .add(z.multiply(0.64))
            .sub(new Complex(0.32, 0));

        // WebGL implementation
        const gl = createGLContext();
        const program = compileShader(gl, fragmentShader);
        gl.useProgram(program);

        // Set uniforms
        const zLoc = gl.getUniformLocation(program, 'z');
        const cLoc = gl.getUniformLocation(program, 'c');
        gl.uniform2f(zLoc, z.re, z.im);
        gl.uniform2f(cLoc, c.re, c.im);

        // Read result
        const pixels = new Float32Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, pixels);
        const glResult = new Complex(pixels[0], pixels[1]);

        // Compare results
        expect(Math.abs(glResult.re - jsResult.re)).toBeLessThan(1e-6);
        expect(Math.abs(glResult.im - jsResult.im)).toBeLessThan(1e-6);
    });
});