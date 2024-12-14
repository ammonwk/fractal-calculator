const knownFunctions = ['sqrt', 'sin', 'cos', 'tan', 'exp', 'log'];
const allowedVariables = ['z', 'c', 'i'];

// spacing and formatting commands to ignore
const ignoredCommands = [
    ' ',      // \ 
    'quad',   // \quad
    'qquad',  // \qquad
    ',',      // \, 
    ';',      // \;
    'hspace', // \hspace{...}
    'vspace', // \vspace{...}
    'left',   // \left
    'right'   // \right
];

const knownConstants = {
    'pi': '3.141592653589793',
    'e': '2.718281828459045',
    'phi': '1.61803398875', // Golden ratio
    'gamma': '0.5772156649', // Euler-Mascheroni constant
};

/**
 * Checks if a string is a known constant.
 * @param {string} str 
 * @returns {boolean}
 */
function isConstant(str) {
    return knownConstants.hasOwnProperty(str);
}

/**
 * Checks if a string is a known function.
 * @param {string} str 
 * @returns {boolean}
 */
function isFunction(str) {
    return knownFunctions.includes(str);
}

/**
 * Checks if a character is a letter.
 * @param {string} char 
 * @returns {boolean}
 */
function isLetter(char) {
    return /^[A-Za-z]$/.test(char);
}

/**
 * Checks if a character is a digit.
 * @param {string} char 
 * @returns {boolean}
 */
function isDigit(char) {
    return /^[0-9]$/.test(char);
}

/**
 * Checks if a character is part of an operator.
 * @param {string} char 
 * @returns {boolean}
 */
function isOperator(char) {
    return /[+\-*/^=|]/.test(char);
}

/**
 * Checks if a character is a parenthesis or brace.
 * @param {string} char 
 * @returns {boolean}
 */
function isParenthesis(char) {
    return /[(){}]/.test(char);
}

/**
 * Recursively processes tokens to handle nested \frac commands.
 * @param {Array<Object>} tokens - The list of tokens to process.
 * @param {number} start - The starting index for processing.
 * @returns {Object} - An object containing the transformed tokens and the new index.
 */
function processFrac(tokens, start) {
    let transformed = [];
    let i = start;

    // Ensure the current token is 'frac'
    if (!(tokens[i].type === 'operator' && tokens[i].value === 'frac')) {
        throw new Error(`Expected 'frac' at position ${i}, found '${tokens[i].value}'.`);
    }
    i++; // Move past 'frac'

    // Process numerator
    if (!(tokens[i].type === 'parenthesis' && tokens[i].value === '(')) {
        throw new Error(`Expected '(' after '\\frac' for numerator at position ${i}, found '${tokens[i].value}'.`);
    }
    i++; // Skip '('
    const numeratorResult = extractGroup(tokens, i);
    const numeratorTokens = numeratorResult.tokens;
    i = numeratorResult.newIndex;

    // Process denominator
    if (!(tokens[i].type === 'parenthesis' && tokens[i].value === '(')) {
        throw new Error(`Expected '(' after '\\frac{numerator}' for denominator at position ${i}, found '${tokens[i].value}'.`);
    }
    i++; // Skip '('
    const denominatorResult = extractGroup(tokens, i);
    const denominatorTokens = denominatorResult.tokens;
    i = denominatorResult.newIndex;

    // Recursively process numerator and denominator in case they contain 'frac'
    const processedNumerator = processTokenList(numeratorTokens);
    const processedDenominator = processTokenList(denominatorTokens);

    // Combine into (numerator / denominator)
    transformed.push('(');
    transformed.push(...processedNumerator);
    transformed.push('/');
    transformed.push(...processedDenominator);
    transformed.push(')');

    return { tokens: transformed, newIndex: i };
}

/**
 * Extracts a group of tokens enclosed by matching parentheses.
 * @param {Array<Object>} tokens - The list of tokens.
 * @param {number} start - The starting index (after opening parenthesis).
 * @returns {Object} - An object containing the extracted tokens and the new index.
 */
function extractGroup(tokens, start) {
    let group = [];
    let braceCount = 1;
    let i = start;

    while (i < tokens.length && braceCount > 0) {
        const tok = tokens[i];
        if (tok.type === 'parenthesis') {
            if (tok.value === '(') braceCount++;
            else if (tok.value === ')') braceCount--;
        }
        if (braceCount > 0) {
            group.push(tok);
        }
        i++;
    }

    if (braceCount !== 0) {
        throw new Error(`Unmatched parenthesis starting at position ${start - 1}.`);
    }

    return { tokens: group, newIndex: i };
}

/**
 * Processes a list of tokens, handling 'frac' recursively.
 * @param {Array<Object>} tokens - The list of tokens to process.
 * @returns {Array<string>} - The transformed token values.
 */
function processTokenList(tokens) {
    const transformed = [];
    let i = 0;

    while (i < tokens.length) {
        const tok = tokens[i];

        if (tok.type === 'operator' && tok.value === 'frac') {
            const fracResult = processFrac(tokens, i);
            transformed.push(...fracResult.tokens);
            i = fracResult.newIndex;
            continue;
        }

        // If the token is a function, variable, number, operator, or parenthesis, add it directly
        transformed.push(tok.value);
        i++;
    }

    return transformed;
}

/**
 * Tokenizes the input LaTeX mathematical expression.
 * @param {string} input - The LaTeX input string to tokenize.
 * @param {Array<string>} variables - Additional allowed variables.
 * @returns {Array<string>} - The list of processed tokens.
 */
export function tokenize(input, variables = []) {
    const tokens = [];
    const extendedAllowedVariables = [...allowedVariables, ...variables];
    let i = 0;

    while (i < input.length) {
        let start = i; // Start position of the current token
        const char = input[i];

        // Skip whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Handle LaTeX commands (functions and operators)
        if (char === '\\') {
            i++; // Skip the backslash

            // Handle backslash followed by space (\ )
            if (input[i] === ' ') {
                // It's a space command; ignore it
                i++; // Skip the space
                start = i; // Update start position
                continue;
            }

            // Collect all consecutive letters for the command
            let cmd = '';
            while (i < input.length && isLetter(input[i])) {
                cmd += input[i];
                i++;
            }

            if (isConstant(cmd)) {
                tokens.push({ type: 'constant', value: knownConstants[cmd] });
            } else if (isFunction(cmd)) {
                tokens.push({ type: 'function', value: cmd });
            }
            // Handle special operators like \cdot
            else if (cmd === 'cdot') {
                tokens.push({ type: 'operator', value: '*' });
            }
            // Handle \frac as a special case
            else if (cmd === 'frac') {
                tokens.push({ type: 'operator', value: 'frac' });
            }
            // Handle \left and \right specifically
            else if (cmd === 'left' || cmd === 'right') {
                // Expecting a delimiter after \left or \right, skip it
                if (i < input.length && (input[i] === '(' || input[i] === ')' || input[i] === '[' || input[i] === ']' || input[i] === '{' || input[i] === '}' || input[i] === '|' || input[i] === '.')) {
                    i++; // Skip the delimiter
                }
                start = i; // Update start position
                continue;
            }
            // Handle commands with arguments like \hspace{...}
            else if (cmd === 'hspace' || cmd === 'vspace' || cmd === 'quad' || cmd === 'qquad') {
                // Expecting a brace-enclosed argument, skip it
                if (input[i] === '{') {
                    let braceCount = 1;
                    i++; // Skip the opening brace
                    while (i < input.length && braceCount > 0) {
                        if (input[i] === '{') braceCount++;
                        else if (input[i] === '}') braceCount--;
                        i++;
                    }
                }
                start = i; // Update start position
                continue;
            }
            // Handle \, and \;
            else if (cmd === '' || cmd === ';') {
                start = i; // Update start position
                continue;
            }
            // Handle unknown commands or throw error
            else {
                throw new Error(`Unknown LaTeX command '\\${cmd}' at position ${start}.`);
            }
            continue;
        }

        // Handle numbers (integers and decimals)
        if (isDigit(char) || (char === '.' && isDigit(input[i + 1]))) {
            let numStr = '';
            let dotCount = 0;
            while (i < input.length && (isDigit(input[i]) || input[i] === '.')) {
                if (input[i] === '.') {
                    dotCount++;
                    if (dotCount > 1) {
                        throw new Error(`Invalid number format at position ${i}: multiple decimal points.`);
                    }
                }
                numStr += input[i];
                i++;
            }
            tokens.push({ type: 'number', value: numStr });
            continue;
        }

        // Handle variables and the constant 'e'
        if (isLetter(char)) {
            let varName = char;
            i++;

            // Check for constant 'e'
            if (varName === 'e' && (i === input.length || (input[i] !== '_'))) {
                tokens.push({ type: 'constant', value: knownConstants['e'] });
                continue;
            }

            // Handle subscripts
            if (i < input.length && input[i] === '_') {
                varName += '_';
                i++;

                // Handle multi-character subscripts in braces
                if (i < input.length && input[i] === '{') {
                    i++; // Skip the opening brace '{'
                    while (i < input.length && input[i] !== '}') {
                        if (!isDigit(input[i]) && !isLetter(input[i])) {
                            throw new Error(`Invalid character in subscript at position ${i}. Subscripts must contain only digits or letters.`);
                        }
                        varName += input[i];
                        i++;
                    }
                    if (i === input.length) {
                        throw new Error("Unmatched opening brace '{' in subscript.");
                    }
                    i++; // Skip the closing brace '}'
                } else if (i < input.length && (isDigit(input[i]) || isLetter(input[i]))) {
                    // Handle single-character subscripts
                    while (i < input.length && (isDigit(input[i]) || isLetter(input[i]))) {
                        varName += input[i];
                        i++;
                    }
                } else {
                    throw new Error(`Incomplete subscript found at position ${i - 1}. Subscripts must be followed by at least one digit or letter, or enclosed in braces.`);
                }
            }

            // Validate variable (no changes needed here)
            if (varName.length > 1 && !extendedAllowedVariables.includes(varName)) {
                throw new Error(`Invalid variable '${varName}' found. Allowed variables are single letters or: ${extendedAllowedVariables.join(', ')}.`);
            }
            if (varName.length === 1 && varName !== 'e' && !extendedAllowedVariables.includes(varName)) {
                throw new Error(`Invalid variable '${varName}' found. Allowed variables are single letters or: ${extendedAllowedVariables.join(', ')}.`);
            }

            tokens.push({ type: 'variable', value: varName });
            continue;
        }

        // Handle operators
        if (isOperator(char)) {
            // Handle '**' as exponentiation if needed
            if (char === '*' && input[i + 1] === '*') {
                tokens.push({ type: 'operator', value: '**' });
                i += 2;
                continue;
            }
            // Handle '-' as unary or binary minus
            if (char === '-') {
                const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;

                if (!prevToken || prevToken.type === 'operator' || prevToken.value === '(') {
                    // Unary minus (negation)
                    tokens.push({ type: 'number', value: '-1' });
                    tokens.push({ type: 'operator', value: '*' });
                } else {
                    // Binary minus (subtraction)
                    tokens.push({ type: 'operator', value: '-' });
                }
            } else {
                tokens.push({ type: 'operator', value: char });
            }
            i++;
            continue;
        }

        // Handle parentheses and braces
        if (isParenthesis(char)) {
            // Convert braces to parentheses for uniformity
            const mappedChar = (char === '{' || char === '}') ?
                (char === '{' ? '(' : ')') :
                char;
            tokens.push({ type: 'parenthesis', value: mappedChar });
            i++;
            continue;
        }

        // If none matched, throw an error for invalid character
        throw new Error(`Invalid character '${char}' at position ${start}.`);
    }

    // At this point, tokens contain all the tokens including 'frac' operators
    // Now, process the tokens to handle 'frac's recursively
    const finalTokens = processTokenList(tokens);

    // Post-processing: Handle implicit multiplication and function parentheses
    const processedTokens = [];
    for (let j = 0; j < finalTokens.length; j++) {
        const currentToken = finalTokens[j];
        const nextToken = finalTokens[j + 1];

        processedTokens.push(currentToken);

        // Handle functions followed by variables or numbers (e.g., "sin z" should become "sin(z)")
        if (knownFunctions.includes(currentToken)) {
            if (nextToken && nextToken !== '(' && !isOperator(nextToken)) {
                processedTokens.push('(');
                processedTokens.push(nextToken);
                processedTokens.push(')');
                j++; // Skip the next token since it's already processed
                continue;
            }
        }

        // Insert implicit multiplication
        if (nextToken) {
            const currentIsNumber = /^[0-9.]+$/.test(currentToken);
            const currentIsVariable = /^[A-Za-z][A-Za-z0-9_]*$/.test(currentToken);
            const currentIsClosingParen = currentToken === ')';

            const nextIsNumber = /^[0-9.]+$/.test(nextToken);
            const nextIsVariable = /^[A-Za-z][A-Za-z0-9_]*$/.test(nextToken);
            const nextIsFunction = knownFunctions.includes(nextToken);
            const nextIsOpeningParen = nextToken === '(';

            const currentIsFunction = knownFunctions.includes(currentToken);

            const needsMultiplication =
                (currentIsNumber || currentIsVariable || currentIsClosingParen) &&
                (nextIsVariable || nextIsNumber || nextIsFunction || nextIsOpeningParen) &&
                !currentIsFunction;  // Prevent multiplication between a function and its argument

            if (needsMultiplication) {
                processedTokens.push('*');
            }
        }
    }

    // Validate parentheses
    let openParenCount = 0;
    for (let token of processedTokens) {
        if (token === '(') {
            openParenCount++;
        } else if (token === ')') {
            openParenCount--;
            if (openParenCount < 0) {
                throw new Error("Unmatched closing parenthesis ')'.");
            }
        }
    }
    if (openParenCount > 0) {
        throw new Error("Unmatched opening parenthesis '('.");
    }

    // Return the processed tokens
    return processedTokens;
}