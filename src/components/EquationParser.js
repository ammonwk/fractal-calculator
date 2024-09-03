// EquationParser.js

export function tokenize(input) {
    const tokens = [];
    const tokenRegex = /\s*(\*\*|\\[a-zA-Z]+|[A-Za-z_]\w*|\d+(\.\d+)?|[+\-*/^()=,|{}]|\\left|\\right)\s*/g;
    let match;
    while ((match = tokenRegex.exec(input)) !== null) {
        tokens.push(match[1]);
    }
    return tokens;
}

export function parse(tokens) {
    let index = 0;

    function parseExpression() {
        let node = parseTerm();
        while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
            const operator = tokens[index++];
            const right = parseTerm();
            node = { type: 'binary', operator, left: node, right };
        }
        return node;
    }

    function parseTerm() {
        let node = parseFactor();
        while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/' || tokens[index] === '\\frac')) {
            const operator = tokens[index++];
            const right = parseFactor();
            node = { type: 'binary', operator, left: node, right };
        }
        return node;
    }

    function parseFactor() {
        let node = parseExponent();
        while (index < tokens.length && (tokens[index] === '**')) {
            const operator = tokens[index++];
            const right = parseExponent();
            node = { type: 'binary', operator, left: node, right };
        }
        return node;
    }

    function parseExponent() {
        let token = tokens[index++];

        if (token === '(' || token === '\\left(') {
            const node = parseExpression();
            if (tokens[index] !== ')' && tokens[index] !== '\\right)') {
                throw new Error('Mismatched parentheses');
            }
            index++;
            return node;
        } else if (token === '\\sqrt') {
            const argument = parseFactor();
            return { type: 'sqrt', argument };
        } else if (/\\(sin|cos|tan|exp|log|sqrt)/.test(token)) {
            const functionName = token.replace('\\', '');
            const argument = parseFactor();
            return { type: 'function', name: functionName, argument };
        } else if (/[A-Za-z_]\w*/.test(token)) {
            if (tokens[index] === '(') {
                index++;
                const args = [];
                while (tokens[index] !== ')') {
                    args.push(parseExpression());
                    if (tokens[index] === ',') {
                        index++;
                    }
                }
                index++;
                return { type: 'call', name: token, args };
            }
            return { type: 'variable', name: token };
        } else if (/\d/.test(token)) {
            return { type: 'number', value: parseFloat(token) };
        } else {
            throw new Error(`Unexpected token: ${token}`);
        }
    }

    return parseExpression();
}

export function translateToGLSL(node) {
    function processNode(node) {
        switch (node.type) {
            case 'binary':
                const left = processNode(node.left);
                const right = processNode(node.right);

                switch (node.operator) {
                    case '+':
                    case '-':
                        return {
                            glsl: `(${left.glsl} ${node.operator} ${right.glsl})`,
                            isComplex: left.isComplex || right.isComplex
                        };
                    case '*':
                        if (left.isComplex && right.isComplex) {
                            // Complex multiplication
                            return {
                                glsl: `vec2(${left.glsl}.x * ${right.glsl}.x - ${left.glsl}.y * ${right.glsl}.y, ${left.glsl}.x * ${right.glsl}.y + ${left.glsl}.y * ${right.glsl}.x)`,
                                isComplex: true
                            };
                        } else if (left.isComplex || right.isComplex) {
                            // Multiplication of a complex and a real number
                            return {
                                glsl: `${left.isComplex ? left.glsl : `vec2(${left.glsl}, 0.0)`} * ${right.isComplex ? right.glsl : `vec2(${right.glsl}, 0.0)`}`,
                                isComplex: true
                            };
                        }
                        break;
                    case '/':
                        if (left.isComplex && right.isComplex) {
                            // Complex division
                            return {
                                glsl: `vec2((${left.glsl}.x * ${right.glsl}.x + ${left.glsl}.y * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y), (${left.glsl}.y * ${right.glsl}.x - ${left.glsl}.x * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y))`,
                                isComplex: true
                            };
                        }
                        break;
                    case '**':
                        if (left.isComplex) {
                            if (right.isComplex || !Number.isInteger(parseFloat(right.glsl))) {
                                // Complex exponentiation: z ** n where n is real or complex
                                return handleComplexExponentiation(left, right);
                            } else {
                                // Integer power of complex number
                                return handleIntegerExponentiation(left, parseInt(right.glsl, 10));
                            }
                        } else {
                            // Real number exponentiation
                            return {
                                glsl: `pow(${left.glsl}, ${right.glsl})`,
                                isComplex: false
                            };
                        }
                    default:
                        throw new Error(`Unsupported operator: ${node.operator}`);
                }
                return {
                    glsl: `(${left.glsl} ${node.operator} ${right.glsl})`,
                    isComplex: false
                };
            case 'sqrt':
                const sqrtArg = processNode(node.argument);
                if (sqrtArg.isComplex) {
                    // Handle square root for complex numbers
                    return handleComplexSqrt(sqrtArg);
                }
                return {
                    glsl: `sqrt(${sqrtArg.glsl})`,
                    isComplex: false
                };
            case 'function':
                const funcArg = processNode(node.argument);
                if (['sin', 'cos', 'tan', 'exp', 'log', 'sqrt'].includes(node.name)) {
                    if (funcArg.isComplex) {
                        // Handle complex numbers for each function where appropriate
                        return handleComplexFunction(node.name, funcArg);
                    }
                    return {
                        glsl: `${node.name}(${funcArg.glsl})`,
                        isComplex: false
                    };
                } else {
                    throw new Error(`Unsupported function: ${node.name}`);
                }
            case 'variable':
                if (node.name === 'z' || node.name === 'c') {
                    return {
                        glsl: node.name,
                        isComplex: true
                    };
                }
                return {
                    glsl: node.name,
                    isComplex: false
                };
            case 'number':
                return {
                    glsl: node.value.toString(),
                    isComplex: false
                };
            case 'call':
                const callArgs = node.args.map(arg => processNode(arg).glsl);
                return {
                    glsl: `${node.name}(${callArgs.join(', ')})`,
                    isComplex: false
                };
            default:
                throw new Error(`Unsupported node type: ${node.type}`);
        }
    }

    const result = processNode(node);
    return result.glsl;
}

// Helper function to handle complex exponentiation
function handleComplexExponentiation(base, exponent) {
    const logBase = `vec2(log(length(${base.glsl})), atan(${base.glsl}.y, ${base.glsl}.x))`;
    const mulExp = `vec2(${exponent.glsl}.x * ${logBase}.x - ${exponent.glsl}.y * ${logBase}.y, ${exponent.glsl}.x * ${logBase}.y + ${exponent.glsl}.y * ${logBase}.x)`;
    return {
        glsl: `vec2(exp(${mulExp}.x) * cos(${mulExp}.y), exp(${mulExp}.x) * sin(${mulExp}.y))`,
        isComplex: true
    };
}

// Helper function to handle integer exponentiation of complex numbers
function handleIntegerExponentiation(base, n) {
    if (n === 0) {
        return { glsl: 'vec2(1.0, 0.0)', isComplex: true }; // z**0 = 1
    } else if (n < 0) {
        // Negative power: compute reciprocal of positive power
        const positivePower = handleIntegerExponentiation(base, -n).glsl;
        return {
            glsl: `vec2(1.0, 0.0) / ${positivePower}`,
            isComplex: true
        };
    } else {
        // Positive integer power
        let result = base.glsl;
        for (let i = 1; i < n; i++) {
            result = `vec2(${result}.x * ${base.glsl}.x - ${result}.y * ${base.glsl}.y, ${result}.x * ${base.glsl}.y + ${result}.y * ${base.glsl}.x)`;
        }
        return { glsl: result, isComplex: true };
    }
}

// Helper function for complex square root
function handleComplexSqrt(arg) {
    return {
        glsl: `vec2(sqrt((length(${arg.glsl}) + ${arg.glsl}.x) / 2.0), sign(${arg.glsl}.y) * sqrt((length(${arg.glsl}) - ${arg.glsl}.x) / 2.0))`,
        isComplex: true
    };
}

// Helper function to handle functions applied to complex numbers
function handleComplexFunction(name, arg) {
    switch (name) {
        case 'sin':
            return { glsl: `vec2(sin(${arg.glsl}.x) * cosh(${arg.glsl}.y), cos(${arg.glsl}.x) * sinh(${arg.glsl}.y))`, isComplex: true };
        case 'cos':
            return { glsl: `vec2(cos(${arg.glsl}.x) * cosh(${arg.glsl}.y), -sin(${arg.glsl}.x) * sinh(${arg.glsl}.y))`, isComplex: true };
        case 'exp':
            return { glsl: `vec2(exp(${arg.glsl}.x) * cos(${arg.glsl}.y), exp(${arg.glsl}.x) * sin(${arg.glsl}.y))`, isComplex: true };
        case 'log':
            return { glsl: `vec2(log(length(${arg.glsl})), atan(${arg.glsl}.y, ${arg.glsl}.x))`, isComplex: true };
        default:
            throw new Error(`Function ${name} is not supported for complex numbers.`);
    }
}
