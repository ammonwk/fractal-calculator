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

    function promoteToComplex(value) {
        if (value.isComplex) {
            return value.glsl;
        } else {
            return `vec2(${value.glsl}, 0.0)`;
        }
    }

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
                                `vec2(${left.glsl}.x * ${right.glsl}.x - ${left.glsl}.y * ${right.glsl}.y, ${left.glsl}.x * ${right.glsl}.y + ${left.glsl}.y * ${right.glsl}.x)`,
                                true
                            );
                        } else if (left.isComplex || right.isComplex) {
                            const leftComplex = promoteToComplex(left);
                            const rightComplex = promoteToComplex(right);
                            return cacheExpression(
                                `vec2(${leftComplex}.x * ${rightComplex}.x - ${leftComplex}.y * ${rightComplex}.y, ${leftComplex}.x * ${rightComplex}.y + ${leftComplex}.y * ${rightComplex}.x)`,
                                true
                            );
                        }
                        return cacheExpression(`(${left.glsl} * ${right.glsl})`, false);
                    case '/':
                        if (left.isComplex && right.isComplex) {
                            return cacheExpression(
                                `vec2((${left.glsl}.x * ${right.glsl}.x + ${left.glsl}.y * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y), (${left.glsl}.y * ${right.glsl}.x - ${left.glsl}.x * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y))`,
                                true
                            );
                        } else if (left.isComplex || right.isComplex) {
                            const leftComplex = promoteToComplex(left);
                            const rightComplex = promoteToComplex(right);
                            return cacheExpression(
                                `vec2((${leftComplex}.x * ${rightComplex}.x + ${leftComplex}.y * ${rightComplex}.y) / (${rightComplex}.x * ${rightComplex}.x + ${rightComplex}.y * ${rightComplex}.y), (${leftComplex}.y * ${rightComplex}.x - ${leftComplex}.x * ${rightComplex}.y) / (${rightComplex}.x * ${rightComplex}.x + ${rightComplex}.y * ${rightComplex}.y))`,
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
                            return {
                                glsl: `pow(${left.glsl}, ${right.glsl})`,
                                isComplex: false
                            };
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
        const baseLog = `vec2(log(length(${base.glsl})), atan(${base.glsl}.y, ${base.glsl}.x))`;

        if (isExponentComplex) {
            const mulExp = `vec2(${exponent.glsl}.x * ${baseLog}.x - ${exponent.glsl}.y * ${baseLog}.y, ${exponent.glsl}.x * ${baseLog}.y + ${exponent.glsl}.y * ${baseLog}.x)`;
            return {
                glsl: `complexExp(${mulExp})`,
                isComplex: true
            };
        } else {
            const scalarExp = exponent.glsl;
            const mulExp = `vec2(${scalarExp} * ${baseLog}.x, ${scalarExp} * ${baseLog}.y)`;
            return {
                glsl: `complexExp(${mulExp})`,
                isComplex: true
            };
        }
    }

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

    function handleComplexSqrt(arg) {
        return cacheExpression(
            `vec2(sqrt((length(${arg.glsl}) + ${arg.glsl}.x) / 2.0), sign(${arg.glsl}.y) * sqrt((length(${arg.glsl}) - ${arg.glsl}.x) / 2.0))`,
            true
        );
    }

    function handleIntegerExponentiation(base, n) {
        if (n === 0) {
            return { glsl: 'vec2(1.0, 0.0)', isComplex: true };
        } else if (n < 0) {
            const positivePower = handleIntegerExponentiation(base, -n).glsl;
            return {
                glsl: `vec2(1.0, 0.0) / ${positivePower}`,
                isComplex: true
            };
        } else {
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

    return tempDeclarations.join('\n') + `\nz = ${result.glsl};`;
}
