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
            throw new Error(`Incomplete expression. An equation cannot end with a "${tokens[index - 1]}" operator.`);
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