import { tokenize } from './tokenizing';

describe('tokenize', () => {
    // Basic arithmetic
    it('should tokenize simple addition', () => {
        expect(tokenize('1 + 2')).toEqual(['1', '+', '2']);
    });

    it('should tokenize simple subtraction', () => {
        expect(tokenize('5 - 3')).toEqual(['5', '-', '3']);
    });

    it('should tokenize simple multiplication', () => {
        expect(tokenize('4 * 6')).toEqual(['4', '*', '6']);
    });

    it('should tokenize simple division', () => {
        expect(tokenize('8 / 2')).toEqual(['8', '/', '2']);
    });

    it('should handle the power operator', () => {
        expect(tokenize('2 ** 3')).toEqual(['2', '**', '3']);
    });

    // Operator precedence
    it('should handle operator precedence correctly', () => {
        expect(tokenize('2 + 3 * 4')).toEqual(['2', '+', '3', '*', '4']); // Multiplication before addition
        expect(tokenize('10 / 2 - 3')).toEqual(['10', '/', '2', '-', '3']); // Division before subtraction
        expect(tokenize('2 ** 3 * 4')).toEqual(['2', '**', '3', '*', '4']); // Power before multiplication
        expect(tokenize('2 * 3 ** 4')).toEqual(['2', '*', '3', '**', '4']); // Power before multiplication
    });

    // Parentheses
    it('should handle parentheses', () => {
        expect(tokenize('(1 + 2) * 3')).toEqual(['(', '1', '+', '2', ')', '*', '3']);
    });

    // Unary minus
    it('should handle unary minus correctly', () => {
        expect(tokenize('-1 + 2')).toEqual(['-1', '*', '1', '+', '2']);
        expect(tokenize('3 * -2')).toEqual(['3', '*', '-1', '*', '2']);
        expect(tokenize('-\\sin(z)')).toEqual(['-1', '*', 'sin', '(', 'z', ')']);
    });

    // Functions
    it('should tokenize functions', () => {
        expect(tokenize('\\sin (z)')).toEqual(['sin', '(', 'z', ')']);
        expect(tokenize('\\cos(2 * \\pi)')).toEqual(['cos', '(', '2', '*', '3.141592653589793', ')']);
        expect(tokenize('\\sqrt(9)')).toEqual(['sqrt', '(', '9', ')']);
    });

    // Variables
    it('should tokenize variables', () => {
        expect(tokenize('z + c')).toEqual(['z', '+', 'c']);
        expect(tokenize('2 * i')).toEqual(['2', '*', 'i']);
    });

    // Implicit multiplication
    it('should handle implicit multiplication', () => {
        expect(tokenize('2z')).toEqual(['2', '*', 'z']);
        expect(tokenize('3\\sin (z)')).toEqual(['3', '*', 'sin', '(', 'z', ')']);
        expect(tokenize('(1 + 2)(3 - 4)')).toEqual(['(', '1', '+', '2', ')', '*', '(', '3', '-', '4', ')']);
    });

    // LaTeX commands
    it('should handle \\frac', () => {
        expect(tokenize('\\frac(1)(2)')).toEqual(['(', '1', '/', '2', ')']);
        expect(tokenize('\\frac(1 + 2)(3 - 4)')).toEqual(['(', '1', '+', '2', '/', '3', '-', '4', ')']);
    });

    it('should handle \\cdot as multiplication', () => {
        expect(tokenize('2 \\cdot 3')).toEqual(['2', '*', '3']);
    });

    it('should ignore \\quad, \\qquad, \,, \;, \\hspace, \\vspace, \\left, \\right', () => {
        expect(tokenize('\\quad')).toEqual([]);
        expect(tokenize('\\qquad')).toEqual([]);
        expect(tokenize('\\,')).toEqual([]);
        expect(tokenize('\\;')).toEqual([]);
        expect(tokenize('\\hspace{10}')).toEqual([]);
        expect(tokenize('\\vspace{5}')).toEqual([]);
        expect(tokenize('\\left( \\right)')).toEqual([]);

        expect(tokenize('z \\quad c \\qquad 1 \\hspace{10} 2 \\vspace{5} 3 \\left( 4 \\right)')).toEqual(['z', '*', 'c', '*', '1', '*', '2', '*', '3', '*', '4']);
    });

    // Constants
    it('should handle known constants', () => {
        expect(tokenize('\\pi')).toEqual(['3.141592653589793']);
        expect(tokenize('2 * \\e')).toEqual(['2', '*', '2.718281828459045']);
        expect(tokenize('\\phi + \\gamma')).toEqual(['1.61803398875', '+', '0.5772156649']);
    });

    // Absolute Value
    it('should handle absolute value correctly', () => {
        expect(tokenize('\\left| z \\right|')).toEqual(['(\\left|', 'z', '\\right|)']);
        expect(tokenize('2 * \\left| z \\right|')).toEqual(['2', '*', '(\\left|', 'z', '\\right|)']);
        expect(tokenize('\\left| z + 1 \\right|')).toEqual(['(\\left|', 'z', '+', '1', '\\right|)']);
        expect(tokenize('\\left| \\frac{1}{2} \\right|')).toEqual(['(\\left|', '(', '1', ')', '/', '(', '2', ')', '\\right|)']);
        expect(tokenize('\\left| z \\right| + \\left| c \\right|')).toEqual(['(\\left|', 'z', '\\right|)', '+', '(\\left|', 'c', '\\right|)']);
        expect(tokenize('\\left| -2 \\right|')).toEqual(['(\\left|', '-1', '*', '2', '\\right|)']);
        expect(tokenize('\\left| -z \\right|')).toEqual(['(\\left|', '-1', '*', 'z', '\\right|)']);
        expect(tokenize('\\sin(\\left| z \\right|)')).toEqual(['sin', '(', '(\\left|', 'z', '\\right|)', ')']);
        expect(tokenize('\\left| z_1 \\right|', ["z_1"])).toEqual(['(\\left|', 'z_1', '\\right|)']);
        expect(tokenize('\\left| \\sin(z) \\right|')).toEqual(['(\\left|', 'sin', '(', 'z', ')', '\\right|)']);
    });

    it('should throw an error for unmatched absolute value delimiters', () => {
        expect(() => tokenize('\\left| z')).toThrow();
        expect(() => tokenize('z \\right|')).toThrow();
        expect(() => tokenize('\\left| \\left| z \\right|')).toThrow();
    });

    it('should treat standalone | as an error', () => {
        expect(() => tokenize('|')).toThrow();
        expect(() => tokenize('1 | 2')).toThrow();
        expect(() => tokenize('|1 + 2|')).toThrow();
    });

    it('should handle \\left and \\right with regular parentheses', () => {
        expect(tokenize('\\left( z \\right)')).toEqual(['(', 'z', ')']);
        expect(tokenize('\\left( \\frac{1}{2} \\right)')).toEqual(['(', '(', '1', ')', '/', '(', '2', ')', ')']);
    });

    it('should throw an error for unsupported delimiters after \\left or \\right', () => {
        expect(() => tokenize('\\left[ z \\right]')).toThrow();
        expect(() => tokenize('\\left{ z \\right}')).toThrow();
        expect(() => tokenize('\\left. z \\right.')).toThrow(); // . is not a valid delimiter
    });

    it('should throw an error when \\left or \\right is not followed by a delimiter', () => {
        expect(() => tokenize('\\left')).toThrow();
        expect(() => tokenize('\\right')).toThrow();
    });

    // Errors
    it('should throw an error for invalid characters', () => {
        expect(() => tokenize('@')).toThrow();
        expect(() => tokenize('1 $ 2')).toThrow();
    });

    it('should throw an error for unknown LaTeX commands', () => {
        expect(() => tokenize('\\unknown')).toThrow();
        expect(() => tokenize('\\unknown{1}{2}')).toThrow(); // Unknown command with arguments
    });

    it('should throw an error for invalid number formats', () => {
        expect(() => tokenize('1.2.3')).toThrow();
        expect(() => tokenize('1..2')).toThrow();
        expect(() => tokenize('.')).toThrow();
        expect(() => tokenize('..')).toThrow();
    });

    it('should throw an error for invalid variables', () => {
        expect(() => tokenize('x')).toThrow();
        expect(() => tokenize('2x')).toThrow();
        expect(() => tokenize('e_')).toThrow();
        expect(() => tokenize('sinz')).toThrow(); // sin should be recognized as a function
    });

    it('should throw an error for unmatched parentheses', () => {
        expect(() => tokenize('(1 + 2')).toThrow();
        expect(() => tokenize('1 + 2)')).toThrow();
        expect(() => tokenize('((1+2)')).toThrow();
        expect(() => tokenize('(1+2))')).toThrow();
        expect(() => tokenize('\\left(1+2\\right')).toThrow(); // Unmatched \left
    });

    // Edge Cases and Boundary Conditions

    it('should handle empty input', () => {
        expect(tokenize('')).toEqual([]);
    });

    it('should handle various whitespace inputs', () => {
        expect(tokenize('  1  +   2   ')).toEqual(['1', '+', '2']);
        expect(tokenize('\t1\t+\t2\t')).toEqual(['1', '+', '2']);
        expect(tokenize('1\n+\n2')).toEqual(['1', '+', '2']);
        expect(tokenize(' \\quad  ')).toEqual([]);
    });

    it('should handle numbers with leading/trailing zeros', () => {
        expect(tokenize('007')).toEqual(['007']);
        expect(tokenize('0.500')).toEqual(['0.500']);
        expect(tokenize('.5')).toEqual(['.5']);
    });

    it('should tokenize variables with longer subscripts', () => {
        expect(tokenize('z_123', ["z_123"])).toEqual(['z_123']);
    });

    it('should tokenize nested functions', () => {
        expect(tokenize('\\sin(\\cos(z))')).toEqual(['sin', '(', 'cos', '(', 'z', ')', ')']);
    });

    it('should handle consecutive operators', () => {
        expect(() => tokenize('1++2')).toThrow();
        expect(() => tokenize('1+-2')).toThrow();
        expect(() => tokenize('+1')).toThrow(); // + is not a unary operator
        expect(() => tokenize('1/ *2')).toThrow();
    });

    it('should handle edge cases with unary minus', () => {
        expect(tokenize('-z')).toEqual(['-1', '*', 'z']);
        expect(tokenize('-(1+2)')).toEqual(['-1', '*', '(', '1', '+', '2', ')']);
    });

    it('should handle deeply nested parentheses', () => {
        expect(tokenize('(((1+2)))')).toEqual(['(', '(', '(', '1', '+', '2', ')', ')', ')']);
    });

    it('should handle empty parentheses', () => {
        expect(tokenize('()')).toEqual(['(', ')']);
    });

    it('should tokenize deeply nested fractions', () => {
        expect(tokenize('\\frac(\\frac(1)(2))(\\frac(3)(4))')).toEqual(['(', '(', '1', '/', '2', ')', '/', '(', '3', '/', '4', ')', ')']);
    });

    it('should throw an error for fractions with empty numerators or denominators', () => {
        expect(() => tokenize('\\frac()(2)')).toThrow();
        expect(() => tokenize('\\frac(1)()')).toThrow();
    });

    it('should tokenize a fraction as the first or last token', () => {
        expect(tokenize('\\frac(1)(2) + 3')).toEqual(['(', '1', '/', '2', ')', '+', '3']);
        expect(tokenize('1 + \\frac(2)(3)')).toEqual(['1', '+', '(', '2', '/', '3', ')']);
    });

    it('should tokenize fractions nested within function arguments', () => {
        expect(tokenize('\\sin(\\frac(1)(2))')).toEqual(['sin', '(', '(', '1', '/', '2', ')', ')']);
    });

    it('should reject equals signs', () => {
        expect(tokenize('z = 1')).toThrow();
        expect(tokenize('z = 1 + 2')).toThrow();
        expect(tokenize('z = \\frac(1)(2)')).toThrow();
    });
});