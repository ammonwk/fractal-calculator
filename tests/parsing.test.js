import { parse } from './parser';

describe('parse', () => {
    // Basic arithmetic
    it('should parse simple addition', () => {
        expect(parse(['1', '+', '2'])).toEqual({ type: 'binary', operator: '+', left: { type: 'number', value: 1 }, right: { type: 'number', value: 2 } });
    });

    // ... (Similar tests for subtraction, multiplication, division)

    // Operator precedence
    it('should handle operator precedence correctly', () => {
        expect(parse(['2', '+', '3', '*', '4'])).toEqual({
            type: 'binary',
            operator: '+',
            left: { type: 'number', value: 2 },
            right: { type: 'binary', operator: '*', left: { type: 'number', value: 3 }, right: { type: 'number', value: 4 } }
        });
    });

    // Parentheses
    it('should handle parentheses', () => {
        expect(parse(['(', '1', '+', '2', ')', '*', '3'])).toEqual({
            type: 'binary',
            operator: '*',
            left: { type: 'binary', operator: '+', left: { type: 'number', value: 1 }, right: { type: 'number', value: 2 } },
            right: { type: 'number', value: 3 }
        });
    });

    // ... (Tests for unary minus, functions, variables, implicit multiplication, errors)
});