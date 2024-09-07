export function tokenize(input) {
    const tokens = [];
    const knownFunctions = ['sqrt', 'sin', 'cos', 'tan', 'exp', 'log']; // List of known LaTeX functions
    const allowedVariables = ['z', 'c']; // List of allowed variables
    const tokenRegex = /\s*(\*\*|\\[a-zA-Z]+|[A-Za-z_]\w*|\d+(\.\d+)?|[+\-*/^()=,|{}]|\\left|\\right)\s*/g;
    let match;
    let lastTokenWasSymbolOrNumber = false; // Track if the last token was a symbol or number

    while ((match = tokenRegex.exec(input)) !== null) {
        const token = match[1];

        // Check if the token is a known function or command
        if (knownFunctions.includes(token)) {
            // It's a known function, add it directly
            if (lastTokenWasSymbolOrNumber) {
                // If the last token was a symbol or number, insert an implicit multiplication
                tokens.push('*');
            }
            tokens.push(token);
            lastTokenWasSymbolOrNumber = false; // Reset flag after a function
        } else if (/^[A-Za-z_]\w*$/.test(token)) {
            // It's a variable or unknown symbol sequence, split into individual characters
            for (let i = 0; i < token.length; i++) {
                const currentChar = token[i];

                // Check if the variable is allowed
                if (!allowedVariables.includes(currentChar)) {
                    throw new Error(`Either you're missing a multiplication sign, or you're trying to use an invalid variable (${currentChar}). Only 'z' and 'c' are allowed.`);
                }

                // If the last token was a symbol or number and this one is also a symbol, insert an implicit multiplication
                if (lastTokenWasSymbolOrNumber) {
                    tokens.push('*');
                }

                tokens.push(currentChar);
                lastTokenWasSymbolOrNumber = true; // This is a symbol or number
            }
        } else {
            // It's a number or operator
            tokens.push(token);
            lastTokenWasSymbolOrNumber = /^[A-Za-z_]\w*$/.test(token) || /\d/.test(token); // Update flag for symbols or numbers
        }
    }

    // Check for any unrecognized characters
    const unrecognizedMatch = input.match(/[^a-zA-Z0-9\s\\+\-*/^()=,|{}._]/);
    if (unrecognizedMatch) {
        throw new Error(`Invalid character '${unrecognizedMatch[0]}' found. Please remove or correct it.`);
    }

    return tokens;
}

export function parse(tokens) {
    let index = 0;

    function parseExpression() {
        if (tokens.length === 0) {
            throw new Error('Empty expression. Please provide a valid mathematical expression.');
        }

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
        if (index >= tokens.length) {
            throw new Error(`Incomplete expression. An equation cannot end with a "${tokens[index-1]}" operator.`);
        }

        let token = tokens[index++];

        if (token === '(' || token === '\\left(') {
            const node = parseExpression();
            if (tokens[index] !== ')' && tokens[index] !== '\\right)') {
                throw new Error('Mismatched parentheses. Ensure every "(" has a corresponding ")" in your equation.');
            }
            index++;
            return node;
        } else if (token === '\\sqrt') {
            const argument = parseFactor();
            return { type: 'sqrt', argument };
        } else if (/(sin|cos|tan|exp|log|sqrt)/.test(token)) {
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
                if (tokens[index] !== ')') {
                    throw new Error(`Mismatched parentheses in function call for "${token}". Ensure every "(" has a corresponding ")" in your equation.`);
                }
                index++;
                return { type: 'call', name: token, args };
            }
            return { type: 'variable', name: token };
        } else if (/\d/.test(token)) {
            return { type: 'number', value: parseFloat(token) };
        } else {
            throw new Error(`Error: It appears you have some invalid syntax in your equation.`);
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
                            return {
                                glsl: `vec2(${left.glsl}.x * ${right.glsl}.x - ${left.glsl}.y * ${right.glsl}.y, ${left.glsl}.x * ${right.glsl}.y + ${left.glsl}.y * ${right.glsl}.x)`,
                                isComplex: true
                            };
                        } else if (left.isComplex || right.isComplex) {
                            return {
                                glsl: `${left.isComplex ? left.glsl : `vec2(${left.glsl}, 0.0)`} * ${right.isComplex ? right.glsl : `vec2(${right.glsl}, 0.0)`}`,
                                isComplex: true
                            };
                        }
                        break;
                    case '/':
                        if (left.isComplex && right.isComplex) {
                            return {
                                glsl: `vec2((${left.glsl}.x * ${right.glsl}.x + ${left.glsl}.y * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y), (${left.glsl}.y * ${right.glsl}.x - ${left.glsl}.x * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y))`,
                                isComplex: true
                            };
                        }
                        break;
                    case '**':
                        if (left.isComplex) {
                            if (right.isComplex || !Number.isInteger(parseFloat(right.glsl))) {
                                return handleComplexExponentiation(left, right);
                            } else {
                                return handleIntegerExponentiation(left, parseInt(right.glsl, 10));
                            }
                        } else {
                            return {
                                glsl: `pow(${left.glsl}, ${right.glsl})`,
                                isComplex: false
                            };
                        }
                    default:
                        throw new Error(`Unsupported operator "${node.operator}". Please use only supported operators (+, -, *, /, **).`);
                }
                return {
                    glsl: `(${left.glsl} ${node.operator} ${right.glsl})`,
                    isComplex: false
                };
            case 'sqrt':
                const sqrtArg = processNode(node.argument);
                if (sqrtArg.isComplex) {
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
                        return handleComplexFunction(node.name, funcArg);
                    }
                    return {
                        glsl: `${node.name}(${funcArg.glsl})`,
                        isComplex: false
                    };
                } else {
                    throw new Error(`Unsupported function "${node.name}". Please use one of the supported functions: sin, cos, tan, exp, log, sqrt.`);
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
                throw new Error(`Unsupported node type "${node.type}". This likely indicates a bug in the parser.`);
        }
    }

    const result = processNode(node);

    if (result.glsl.includes("undefined")) {
        throw new Error('Internal error: Undefined in generated GLSL code. Please check your expression for mistakes.');
    }

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

// Helper function to handle functions applied to complex numbers
function handleComplexFunction(name, arg) {
    switch (name) {
        case 'sin':
            return { glsl: `vec2(sin(${arg.glsl}.x) * cosh(${arg.glsl}.y), cos(${arg.glsl}.x) * sinh(${arg.glsl}.y))`, isComplex: true };
        case 'cos':
            return { glsl: `vec2(cos(${arg.glsl}.x) * cosh(${arg.glsl}.y), -sin(${arg.glsl}.x) * sinh(${arg.glsl}.y))`, isComplex: true };
        case 'tan':
            // tan(z) = sin(z) / cos(z)
            const sinArg = handleComplexFunction('sin', arg).glsl;
            const cosArg = handleComplexFunction('cos', arg).glsl;
            return { glsl: `(${sinArg}) / (${cosArg})`, isComplex: true };
        case 'exp':
            return { glsl: `vec2(exp(${arg.glsl}.x) * cos(${arg.glsl}.y), exp(${arg.glsl}.x) * sin(${arg.glsl}.y))`, isComplex: true };
        case 'log':
            return { glsl: `vec2(log(length(${arg.glsl})), atan(${arg.glsl}.y, ${arg.glsl}.x))`, isComplex: true };
        case 'sqrt':
            return handleComplexSqrt(arg);
        default:
            throw new Error(`Function ${name} is not supported for complex numbers.`);
    }
}

// Helper function for complex square root
function handleComplexSqrt(arg) {
    return {
        glsl: `vec2(sqrt((length(${arg.glsl}) + ${arg.glsl}.x) / 2.0), sign(${arg.glsl}.y) * sqrt((length(${arg.glsl}) - ${arg.glsl}.x) / 2.0))`,
        isComplex: true
    };
}
