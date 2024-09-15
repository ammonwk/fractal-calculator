export function translateToGLSL(node) {
    const tempDeclarations = []; // To accumulate temporary variable declarations
    const cachedExpressions = new Map(); // To cache repeated subexpressions
    let tempVariableCounter = 0; // Counter for generating unique temp variable names

    // Function to cache expressions and avoid redundant calculations
    function cacheExpression(expression, isComplex) {
        // If the expression is already cached, use its variable name
        if (cachedExpressions.has(expression)) {
            return cachedExpressions.get(expression);
        }

        // Create a new temporary variable for the expression
        const tempVar = `temp_${tempVariableCounter++}`;
        cachedExpressions.set(expression, { glsl: tempVar, isComplex });

        // Emit the declaration of the temporary variable
        tempDeclarations.push(`vec2 ${tempVar} = ${expression};`);

        return { glsl: tempVar, isComplex };
    }

    function processNode(node) {
        switch (node.type) {
            case 'binary': {
                const left = processNode(node.left);
                const right = processNode(node.right);

                // Handle different binary operators
                switch (node.operator) {
                    case '+':
                    case '-':
                        return cacheExpression(
                            `(${left.glsl} ${node.operator} ${right.glsl})`,
                            left.isComplex || right.isComplex
                        );
                    case '*':
                        if (left.isComplex && right.isComplex) {
                            return cacheExpression(
                                `vec2(${left.glsl}.x * ${right.glsl}.x - ${left.glsl}.y * ${right.glsl}.y, ${left.glsl}.x * ${right.glsl}.y + ${left.glsl}.y * ${right.glsl}.x)`,
                                true
                            );
                        } else if (left.isComplex) {
                            // Handle multiplication of complex number by scalar
                            return cacheExpression(
                                `vec2(${left.glsl}.x * ${right.glsl}, ${left.glsl}.y * ${right.glsl})`,
                                true
                            );
                        } else if (right.isComplex) {
                            // Handle multiplication of scalar by complex number
                            return cacheExpression(
                                `vec2(${right.glsl}.x * ${left.glsl}, ${right.glsl}.y * ${left.glsl})`,
                                true
                            );
                        }
                        // Handle multiplication of two scalars
                        return cacheExpression(`(${left.glsl} * ${right.glsl})`, false);
                    case '/':
                        if (left.isComplex && right.isComplex) {
                            return cacheExpression(
                                `vec2((${left.glsl}.x * ${right.glsl}.x + ${left.glsl}.y * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y), (${left.glsl}.y * ${right.glsl}.x - ${left.glsl}.x * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y))`,
                                true
                            );
                        }
                        return cacheExpression(`(${left.glsl} / ${right.glsl})`, false);
                    case '**':
                        if (left.isComplex) {
                            if (right.isComplex || !Number.isInteger(parseFloat(right.glsl))) {
                                return handleComplexExponentiation(left, right);
                            } else {
                                return handleIntegerExponentiation(left, parseInt(right.glsl, 10));
                            }
                        } else {
                            return cacheExpression(`pow(${left.glsl}, ${right.glsl})`, false);
                        }
                    default:
                        throw new Error(`Unsupported operator "${node.operator}". Please use only supported operators (+, -, *, /, **).`);
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
            }
            case 'variable': {
                if (node.name === 'z' || node.name === 'c') {
                    return {
                        glsl: node.name,
                        isComplex: true
                    };
                }
                if (node.name === 'i') {
                    // Handle the imaginary unit 'i' as a complex number (0.0, 1.0)
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
                const realPart = isInteger ? `${node.value}.0` : node.value.toString();
                return {
                    // Treat real numbers as (x, 0.0)
                    glsl: `vec2(${realPart}, 0.0)`,
                    isComplex: true
                };
            }
            case 'call': {
                const callArgs = node.args.map(arg => processNode(arg).glsl);
                return {
                    glsl: `${node.name}(${callArgs.join(', ')})`,
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
        const baseLog = cacheExpression(`vec2(log(length(${base.glsl})), atan(${base.glsl}.y, ${base.glsl}.x))`, true);

        if (isExponentComplex) {
            const mulExp = cacheExpression(
                `vec2(${exponent.glsl}.x * ${baseLog.glsl}.x - ${exponent.glsl}.y * ${baseLog.glsl}.y, ${exponent.glsl}.x * ${baseLog.glsl}.y + ${exponent.glsl}.y * ${baseLog.glsl}.x)`,
                true
            );
            return {
                glsl: `complexExp(${mulExp.glsl})`,
                isComplex: true
            };
        } else {
            const scalarExp = exponent.glsl;
            const mulExp = cacheExpression(
                `vec2(${scalarExp} * ${baseLog.glsl}.x, ${scalarExp} * ${baseLog.glsl}.y)`,
                true
            );
            return {
                glsl: `complexExp(${mulExp.glsl})`,
                isComplex: true
            };
        }
    }

    // Helper function to handle functions applied to complex numbers
    function handleComplexFunction(name, arg) {
        const argStr = arg.glsl;
        switch (name) {
            case 'sin':
                return cacheExpression(
                    `vec2(sin(${argStr}.x) * cosh(${argStr}.y), cos(${argStr}.x) * sinh(${argStr}.y))`,
                    true
                );
            case 'cos':
                return cacheExpression(
                    `vec2(cos(${argStr}.x) * cosh(${argStr}.y), -sin(${argStr}.x) * sinh(${argStr}.y))`,
                    true
                );
            case 'tan': {
                const sinArg = handleComplexFunction('sin', arg).glsl;
                const cosArg = handleComplexFunction('cos', arg).glsl;
                return cacheExpression(`(${sinArg}) / (${cosArg})`, true);
            }
            case 'exp':
                return cacheExpression(
                    `vec2(exp(${argStr}.x) * cos(${argStr}.y), exp(${argStr}.x) * sin(${argStr}.y))`,
                    true
                );
            case 'log':
                return cacheExpression(
                    `vec2(log(length(${argStr})), atan(${argStr}.y, ${argStr}.x))`,
                    true
                );
            case 'sqrt':
                return handleComplexSqrt(arg);
            default:
                throw new Error(`Function ${name} is not supported for complex numbers.`);
        }
    }

    // Helper function for complex square root
    function handleComplexSqrt(arg) {
        return cacheExpression(
            `vec2(sqrt((length(${arg.glsl}) + ${arg.glsl}.x) / 2.0), sign(${arg.glsl}.y) * sqrt((length(${arg.glsl}) - ${arg.glsl}.x) / 2.0))`,
            true
        );
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

    const result = processNode(node);

    if (result.glsl.includes("undefined")) {
        throw new Error('Internal error: Undefined in generated GLSL code. Please check your expression for mistakes.');
    }

    // Combine the temporary declarations with the final assignment to 'z'
    return tempDeclarations.join('\n') + `\nz = ${result.glsl};`;
}
