// EquationParser.js

export function tokenize(input) {
    const tokens = [];
    const tokenRegex = /\s*([A-Za-z_]\w*|\d+|\.\d+|[+\-*/^()=,])\s*/g;
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
        while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
            const operator = tokens[index++];
            const right = parseFactor();
            node = { type: 'binary', operator, left: node, right };
        }
        return node;
    }

    function parseFactor() {
        let token = tokens[index++];
        if (token === '(') {
            const node = parseExpression();
            if (tokens[index] !== ')') {
                throw new Error('Mismatched parentheses');
            }
            index++;
            return node;
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
                        if (left.isComplex && right.isComplex) {
                            return {
                                glsl: `${left.glsl} ${node.operator} ${right.glsl}`,
                                isComplex: true,
                                separateOp: true
                            };
                        } else if (left.isComplex) {
                            return {
                                glsl: `${left.glsl} ${node.operator} vec2(${right.glsl}, 0.0)`,
                                isComplex: true,
                                separateOp: true
                            };
                        } else if (right.isComplex) {
                            return {
                                glsl: `vec2(${left.glsl}, 0.0) ${node.operator} ${right.glsl}`,
                                isComplex: true,
                                separateOp: true
                            };
                        }
                        break;
                    case '*':
                        if (left.isComplex && right.isComplex) {
                            if (left.glsl === right.glsl) {
                                return {
                                    glsl: `vec2(${left.glsl}.x * ${right.glsl}.x - ${left.glsl}.y * ${right.glsl}.y, 2.0 * ${left.glsl}.x * ${right.glsl}.y)`,
                                    isComplex: true,
                                    separateOp: false
                                };
                            } else {
                                return {
                                    glsl: `vec2(${left.glsl}.x * ${right.glsl}.x - ${left.glsl}.y * ${right.glsl}.y, ${left.glsl}.x * ${right.glsl}.y + ${left.glsl}.y * ${right.glsl}.x)`,
                                    isComplex: true,
                                    separateOp: false
                                };
                            }
                        } else if (left.isComplex) {
                            return {
                                glsl: `${left.glsl} * ${right.glsl}`,
                                isComplex: true,
                                separateOp: false
                            };
                        } else if (right.isComplex) {
                            return {
                                glsl: `${left.glsl} * ${right.glsl}`,
                                isComplex: true,
                                separateOp: false
                            };
                        }
                        break;
                    case '/':
                        if (left.isComplex && right.isComplex) {
                            return {
                                glsl: `vec2((${left.glsl}.x * ${right.glsl}.x + ${left.glsl}.y * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y), (${left.glsl}.y * ${right.glsl}.x - ${left.glsl}.x * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y))`,
                                isComplex: true,
                                separateOp: false
                            };
                        } else if (left.isComplex) {
                            return {
                                glsl: `${left.glsl} / ${right.glsl}`,
                                isComplex: true,
                                separateOp: false
                            };
                        } else if (right.isComplex) {
                            return {
                                glsl: `vec2(${left.glsl} * ${right.glsl}.x, -${left.glsl} * ${right.glsl}.y) / (${right.glsl}.x * ${right.glsl}.x + ${right.glsl}.y * ${right.glsl}.y)`,
                                isComplex: true,
                                separateOp: false
                            };
                        }
                        break;
                    default:
                        throw new Error(`Unsupported operator: ${node.operator}`);
                }
                return {
                    glsl: `(${left.glsl} ${node.operator} ${right.glsl})`,
                    isComplex: false,
                    separateOp: false
                };
            case 'variable':
                if (node.name === 'z' || node.name === 'c') {
                    return {
                        glsl: node.name,
                        isComplex: true,
                        separateOp: false
                    };
                }
                return {
                    glsl: node.name,
                    isComplex: false,
                    separateOp: false
                };
            case 'number':
                return {
                    glsl: node.value.toString(),
                    isComplex: false,
                    separateOp: false
                };
            case 'call':
                const args = node.args.map(arg => processNode(arg).glsl);
                return {
                    glsl: `${node.name}(${args.join(', ')})`,
                    isComplex: false,
                    separateOp: false
                };
            default:
                throw new Error(`Unsupported node type: ${node.type}`);
        }
    }

    const result = processNode(node);
    return result.glsl;
}