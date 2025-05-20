export function translateToGLSL(node) {
    const tempDeclarations = []; // To accumulate temporary variable declarations
    const cachedExpressions = new Map(); // To cache repeated subexpressions
    let tempVariableCounter = 0; // Counter for generating unique temp variable names

    // Function to cache expressions and avoid redundant calculations
    function cacheExpression(expression, isComplex) {
        if (cachedExpressions.has(expression)) {
            return cachedExpressions.get(expression);
        }

        const tempVar = `temp_${tempVariableCounter++}`;
        cachedExpressions.set(expression, { glsl: tempVar, isComplex });

        tempDeclarations.push(`vec2 ${tempVar} = ${expression};`);

        return { glsl: tempVar, isComplex };
    }

    // Promote a real value to complex by setting the imaginary part to 0.0
    function promoteToComplex(value) {
        if (value.isComplex) {
            return value.glsl;
        } else {
            return `vec2(${value.glsl}, 0.0)`;
        }
    }

    // Process the AST node recursively
    function processNode(node) {
        switch (node.type) {
            case 'binary': {
                const left = processNode(node.left);
                const right = processNode(node.right);

                switch (node.operator) {
                    case '+':
                    case '-':
                        if (left.isComplex || right.isComplex) {
                            const leftComplex = promoteToComplex(left);
                            const rightComplex = promoteToComplex(right);
                            return cacheExpression(
                                `(${leftComplex} ${node.operator} ${rightComplex})`,
                                true
                            );
                        }
                        return {
                            glsl: `(${left.glsl} ${node.operator} ${right.glsl})`,
                            isComplex: false
                        };
                    case '*':
                        if (left.isComplex && right.isComplex) {
                            return cacheExpression(
                                `complexMul(${left.glsl}, ${right.glsl})`,
                                true
                            );
                        } else if (left.isComplex || right.isComplex) {
                            const leftComplex = promoteToComplex(left);
                            const rightComplex = promoteToComplex(right);
                            return cacheExpression(
                                `complexMul(${leftComplex}, ${rightComplex})`,
                                true
                            );
                        }
                        return {
                            glsl: `(${left.glsl} * ${right.glsl})`,
                            isComplex: false
                        };
                    case '/':
                        if (right.glsl === 'z') {  // Direct division by z or 0
                            throw new Error("This formula would divide by zero when z = 0. Try modifying the equation to avoid this.");
                        } else if (right.glsl === 'vec2(0.0, 0.0)') {
                            throw new Error("This formula would divide by zero. Try modifying the equation to avoid this.");
                        }
                        if (left.isComplex && right.isComplex) {
                            return cacheExpression(
                                `complexDiv(${left.glsl}, ${right.glsl})`,
                                true
                            );
                        } else if (left.isComplex || right.isComplex) {
                            const leftComplex = promoteToComplex(left);
                            const rightComplex = promoteToComplex(right);
                            return cacheExpression(
                                `complexDiv(${leftComplex}, ${rightComplex})`,
                                true
                            );
                        }
                        return {
                            glsl: `(${left.glsl} / ${right.glsl})`,
                            isComplex: false
                        };
                    case '^': {
                        const leftIsComplex = left.isComplex;
                        const rightIsComplex = right.isComplex;
                        const rightIsInteger = !rightIsComplex && Number.isInteger(parseFloat(right.glsl));

                        // Special cases for small integer powers
                        if (!rightIsComplex) {
                            const base = leftIsComplex ? left.glsl : `vec2(${left.glsl}, 0.0)`;

                            if (right.glsl === "2.0") {
                                return cacheExpression(
                                    `vec2(${base}.x * ${base}.x - ${base}.y * ${base}.y, 2.0 * ${base}.x * ${base}.y)`,
                                    true
                                );
                            }

                            if (right.glsl === "3.0") {
                                // For z³ = z * z²
                                return cacheExpression(
                                    `complexMul(${base}, vec2(${base}.x * ${base}.x - ${base}.y * ${base}.y, 2.0 * ${base}.x * ${base}.y))`,
                                    true
                                );
                            }

                            if (right.glsl === "4.0") {
                                // For z⁴ = (z²)²
                                const z2 = `vec2(${base}.x * ${base}.x - ${base}.y * ${base}.y, 2.0 * ${base}.x * ${base}.y)`;
                                return cacheExpression(
                                    `vec2(${z2}.x * ${z2}.x - ${z2}.y * ${z2}.y, 2.0 * ${z2}.x * ${z2}.y)`,
                                    true
                                );
                            }
                        }

                        if (leftIsComplex || rightIsComplex || !rightIsInteger) {
                            // Promote real numbers to vec2 if necessary
                            const base = leftIsComplex ? left.glsl : `vec2(${left.glsl}, 0.0)`;
                            const exponent = rightIsComplex ? right.glsl : `vec2(${right.glsl}, 0.0)`;
                            return cacheExpression(
                                `complexPow(${base}, ${exponent})`,
                                true
                            );
                        } else {
                            // Handle integer exponentiation for real numbers
                            return handleIntegerExponentiation(left, parseInt(right.glsl, 10));
                        }
                    }
                    case 'mod': {
                        if (left.isComplex || right.isComplex) {
                            throw new Error("Complex modulo is not supported in this version.");
                        }
                        return {
                            glsl: `mod(${left.glsl}, ${right.glsl})`,
                            isComplex: false
                        };
                    }
                    default:
                        throw new Error(`Unsupported operator "${node.operator}". Please use only supported operators (+, -, *, /, ^).`);
                }
            }
            case 'sqrt': {
                const sqrtArg = processNode(node.argument);
                if (sqrtArg.isComplex) {
                    return handleComplexSqrt(sqrtArg);
                }
                return {
                    glsl: `sqrt(${sqrtArg.glsl})`,
                    isComplex: false
                };
            }
            case 'function': {
                const funcName = node.name;
                if (['gcd', 'lcm', 'mod'].includes(funcName)) {
                    // Handle multi-argument functions
                    const args = node.args.map(arg => processNode(arg));
                    if (args.some(arg => arg.isComplex)) {
                        throw new Error(`Complex arguments are not supported for ${funcName}.`);
                    }
                    return {
                        glsl: `${funcName}(${args.map(arg => arg.glsl).join(', ')})`,
                        isComplex: false
                    };
                } else {
                    // Handle single-argument functions
                    const funcArg = processNode(node.argument);
                    if (['sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'arcsinh', 'arccosh', 'arctanh', 'sec', 'csc', 'cot', 'sech', 'csch', 'coth'].includes(node.name)) {
                        if (funcArg.isComplex) {
                            return handleComplexFunction(node.name, funcArg);
                        }
                        return {
                            glsl: `${node.name}(${funcArg.glsl})`,
                            isComplex: false
                        };
                    } else if (['floor', 'ceil', 'round', 'sign'].includes(node.name)) {
                        if (funcArg.isComplex) {
                            return {
                                glsl: `vec2(${node.name}(${funcArg.glsl}.x), ${node.name}(${funcArg.glsl}.y))`,
                                isComplex: true
                            };
                        }
                        return {
                            glsl: `${node.name}(${funcArg.glsl})`,
                            isComplex: false
                        };
                    } else if (node.name === 'gamma') {
                        if (funcArg.isComplex) {
                            throw new Error("Complex gamma function is not supported in this version.");
                        }
                        return {
                            glsl: `gamma(${funcArg.glsl})`, // Assuming you have a gamma function in your GLSL environment
                            isComplex: false
                        };
                    } else if (['erf', 'erfc'].includes(node.name)) {
                        if (funcArg.isComplex) {
                            throw new Error(`Complex ${node.name} function is not supported in this version.`);
                        }
                        return {
                            glsl: `${node.name}(${funcArg.glsl})`, // Assuming you have erf and erfc functions in your GLSL environment
                            isComplex: false
                        };
                    } else {
                        throw new Error(`Unsupported function "${node.name}". Please use one of the supported functions.`);
                    }
                }
            }
            case 'variable': {
                if (node.name === 'z' || node.name === 'c') {
                    return {
                        glsl: node.name,
                        isComplex: true
                    };
                }
                if (node.name === 'i') {
                    return {
                        glsl: 'vec2(0.0, 1.0)',
                        isComplex: true
                    };
                }
                return {
                    glsl: node.name,
                    isComplex: false
                };
            }
            case 'number': {
                const isInteger = Number.isInteger(node.value);
                const glslValue = isInteger ? `${node.value}.0` : node.value.toString();
                return {
                    glsl: glslValue,
                    isComplex: false
                };
            }
            case 'call': {
                // Assuming 'call' nodes represent function calls with multiple arguments
                const callArgs = node.args.map(arg => processNode(arg).glsl);
                return {
                    glsl: `${node.name}(${callArgs.join(', ')})`,
                    isComplex: false
                };
            }
            // Handle absolute value nodes
            case 'absoluteValue': {
                const arg = processNode(node.argument); // Recursively process the argument
                if (arg.isComplex) {
                    // For complex numbers, use length()
                    return cacheExpression(
                        `vec2(length(${arg.glsl}), 0.0)`,
                        true
                    );
                } else {
                    // For real numbers, use abs()
                    return {
                        glsl: `abs(${arg.glsl})`,
                        isComplex: false
                    };
                }
            }
            // Handle factorial
            case 'factorial': {
                const { value } = node;
                const operand = processNode(value);

                if (operand.isComplex) {
                    throw new Error("Factorial of complex numbers is not supported in this version.");
                }

                // Implement factorial using a loop (for reasonable integer values)
                return {
                    glsl: `factorial(${operand.glsl})`,
                    isComplex: false
                };
            }
            default: {
                throw new Error(`Unsupported node type "${node.type}". This likely indicates a bug in the parser.`);
            }
        }
    }

    // Helper function to handle complex exponentiation
    function handleComplexExponentiation(base, exponent) {
        const isExponentComplex = exponent.isComplex;
        const baseLog = `complexLog(${base.glsl})`; // Use helper function for log

        if (isExponentComplex) {
            return cacheExpression(
                `complexExp(complexMul(${exponent.glsl}, ${baseLog}))`,
                true
            );
        } else {
            const scalarExp = exponent.glsl;
            return cacheExpression(
                `complexExp(vec2(${scalarExp} * ${baseLog}.x, ${scalarExp} * ${baseLog}.y))`,
                true
            );
        }
    }

    // Handle complex functions like sin, cos, etc.
    function handleComplexFunction(name, arg) {
        const argStr = arg.glsl;
        switch (name) {
            case 'sin':
                return cacheExpression(
                    `complexSin(${argStr})`,
                    true
                );
            case 'cos':
                return cacheExpression(
                    `complexCos(${argStr})`,
                    true
                );
            case 'tan': {
                const sinArg = `complexSin(${argStr})`;
                const cosArg = `complexCos(${argStr})`;
                return cacheExpression(
                    `complexDiv(${sinArg}, ${cosArg})`,
                    true
                );
            }
            case 'exp':
                return cacheExpression(
                    `complexExp(${argStr})`,
                    true
                );
            case 'log':
                return cacheExpression(
                    `complexLog(${argStr})`,
                    true
                );
            case 'sqrt':
                return handleComplexSqrt(arg);
            case 'arcsin':
            case 'asin':
                return cacheExpression(
                    `complexAsin(${argStr})`,
                    true
                );
            case 'arccos':
            case 'acos':
                return cacheExpression(
                    `complexAcos(${argStr})`,
                    true
                );
            case 'arctan':
            case 'atan':
                return cacheExpression(
                    `complexAtan(${argStr})`,
                    true
                );
            case 'sinh':
                return cacheExpression(
                    `complexSinh(${argStr})`,
                    true
                );
            case 'cosh':
                return cacheExpression(
                    `complexCosh(${argStr})`,
                    true
                );
            case 'tanh':
                return cacheExpression(
                    `complexTanh(${argStr})`,
                    true
                );
            case 'arcsinh':
                return cacheExpression(
                    `complexAsinh(${argStr})`,
                    true
                );
            case 'arccosh':
                return cacheExpression(
                    `complexAcosh(${argStr})`,
                    true
                );
            case 'arctanh':
                return cacheExpression(
                    `complexAtanh(${argStr})`,
                    true
                );
            case 'sec':
                return cacheExpression(
                    `complexDiv(vec2(1.0, 0.0), complexCos(${argStr}))`,
                    true
                );
            case 'csc':
                return cacheExpression(
                    `complexDiv(vec2(1.0, 0.0), complexSin(${argStr}))`,
                    true
                );
            case 'cot':
                return cacheExpression(
                    `complexDiv(complexCos(${argStr}), complexSin(${argStr}))`,
                    true
                );
            case 'sech':
                return cacheExpression(
                    `complexDiv(vec2(1.0, 0.0), complexCosh(${argStr}))`,
                    true
                );
            case 'csch':
                return cacheExpression(
                    `complexDiv(vec2(1.0, 0.0), complexSinh(${argStr}))`,
                    true
                );
            case 'coth':
                return cacheExpression(
                    `complexDiv(complexCosh(${argStr}), complexSinh(${argStr}))`,
                    true
                );
            default:
                throw new Error(`Function ${name} is not supported for complex numbers.`);
        }
    }

    // Handle complex square root
    function handleComplexSqrt(arg) {
        return cacheExpression(
            `complexSqrt(${arg.glsl})`,
            true
        );
    }

    // Handle integer exponentiation using repeated multiplication
    function handleIntegerExponentiation(base, n) {
        if (n === 0) {
            return { glsl: 'vec2(1.0, 0.0)', isComplex: true };
        } else if (n < 0) {
            const positivePower = handleIntegerExponentiation(base, -n).glsl;
            return {
                glsl: `complexDiv(vec2(1.0, 0.0), ${positivePower})`,
                isComplex: true
            };
        } else {
            let result = base.glsl;
            for (let i = 1; i < n; i++) {
                result = `complexMul(${result}, ${base.glsl})`;
            }
            return { glsl: result, isComplex: true };
        }
    }

    // Begin processing the AST
    let result = processNode(node);

    result = (result.isComplex || result.glsl.startsWith('vec2(')) ?
        result.glsl :
        `vec2(${result.glsl}, 0.0)`;

    if (result.includes("undefined")) {
        throw new Error('Internal error: Undefined in generated GLSL code. Please check your expression for mistakes.');
    }

    // Combine helper functions, temporary declarations, and the final assignment
    return tempDeclarations.join('\n') + `\nz = ${result};`;
}