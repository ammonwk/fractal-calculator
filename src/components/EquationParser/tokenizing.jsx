const knownFunctions = ['sqrt', 'sin', 'cos', 'tan', 'exp', 'log']; // List of known functions
const allowedVariables = ['z', 'c', 'i']; // Base allowed variables; can be extended as needed

/**
 * Checks if a string is a known function.
 * @param {string} str 
 * @returns {boolean}
 */
function isFunction(str) {
    // Remove leading backslash if present (e.g., \sin -> sin)
    const funcName = str.startsWith('\\') ? str.slice(1) : str;
    return knownFunctions.includes(funcName);
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
    return /[+\-*/^=,|{}]/.test(char);
}

/**
 * Checks if a character is a parenthesis.
 * @param {string} char 
 * @returns {boolean}
 */
function isParenthesis(char) {
    return /[()]/.test(char);
}

/**
 * Tokenizes the input mathematical expression.
 * @param {string} input - The input string to tokenize.
 * @param {Array<string>} variables - Additional allowed variables.
 * @returns {Array<string>} - The list of processed tokens.
 */
export function tokenize(input, variables = []) {
    console.log(input);
    const tokens = [];
    const extendedAllowedVariables = [...allowedVariables, ...variables];
    let i = 0;

    while (i < input.length) {
        const char = input[i];

        // Skip whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Handle functions (with or without leading backslash)
        if (char === '\\' || isLetter(char)) {
            let start = i;
            if (char === '\\') {
                i++; // Skip the backslash
            }
            // Collect all consecutive letters
            while (i < input.length && isLetter(input[i])) {
                i++;
            }
            const funcOrVar = input.slice(start, i);
            if (isFunction(funcOrVar)) {
                tokens.push({ type: 'function', value: funcOrVar });
            } else {
                // Handle variables with optional subscripts (e.g., z_0)
                let varName = '';
                let j = start;
                // Collect letters and possible subscripts
                while (j < input.length) {
                    const currentChar = input[j];
                    if (isLetter(currentChar)) {
                        varName += currentChar;
                        j++;
                        // Check for subscript
                        if (input[j] === '_') {
                            varName += '_';
                            j++;
                            // Collect subscript digits
                            while (j < input.length && isDigit(input[j])) {
                                varName += input[j];
                                j++;
                            }
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                // Validate each variable character
                for (let k = 0; k < varName.length; k++) {
                    const currentChar = varName[k];
                    if (currentChar === '_') continue; // Skip underscore
                    if (!extendedAllowedVariables.includes(currentChar)) {
                        throw new Error(`Invalid variable '${currentChar}' found. Allowed variables are: ${extendedAllowedVariables.join(', ')}.`);
                    }
                }
                tokens.push({ type: 'variable', value: varName });
                i = j;
                continue;
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

        // Handle operators
        if (isOperator(char)) {
            // Handle '**' as exponentiation if needed
            if (char === '*' && input[i + 1] === '*') {
                tokens.push({ type: 'operator', value: '**' });
                i += 2;
                continue;
            }
            tokens.push({ type: 'operator', value: char });
            i++;
            continue;
        }

        // Handle parentheses
        if (isParenthesis(char)) {
            tokens.push({ type: 'parenthesis', value: char });
            i++;
            continue;
        }

        // If none matched, throw an error for invalid character
        throw new Error(`Invalid character '${char}' at position ${i}.`);
    }

    // Post-processing: Handle implicit multiplication and function parentheses
    const processedTokens = [];
    for (let j = 0; j < tokens.length; j++) {
        const currentToken = tokens[j];
        const nextToken = tokens[j + 1];

        processedTokens.push(currentToken.value);

        // Handle functions followed by variables or numbers (e.g., "sin z" should become "sin(z)")
        if (currentToken.type === 'function') {
            // Insert '(' after function
            if (nextToken && nextToken.type === 'parenthesis' && nextToken.value === '(') {
                // Function already followed by '(', so nothing more needed
                continue;
            }
            // Handle functions followed by variables or numbers (e.g., "sin z" -> "sin(z)")
            else if (nextToken && (nextToken.type === 'variable' || nextToken.type === 'number')) {
                processedTokens.push('(');
                processedTokens.push(nextToken.value);
                processedTokens.push(')');
                j++; // Skip the next token since it's already processed
                continue; // Continue to the next iteration
            } else {
                throw new Error(`Function '${currentToken.value}' must be followed by a variable, number, or '('.`);
            }
        }

        // Insert implicit multiplication
        if (nextToken) {
            const currentType = currentToken.type;
            const nextType = nextToken.type;

            const needsMultiplication =
                (currentType === 'number' && (nextType === 'variable' || nextType === 'function')) ||
                (currentType === 'variable' && (nextType === 'number' || nextType === 'variable' || nextType === 'function')) ||
                (currentType === 'parenthesis' && currentToken.value === ')' && (nextType === 'number' || nextType === 'variable' || nextType === 'function'));

            if (needsMultiplication) {
                processedTokens.push('*');
            }
        }
    }

    // Remove any unmatched '(' inserted for functions
    let finalTokens = [];
    let openParenCount = 0;
    processedTokens.forEach(token => {
        if (token === '(') {
            openParenCount++;
        } else if (token === ')') {
            if (openParenCount > 0) {
                openParenCount--;
            } else {
                throw new Error("Unmatched closing parenthesis ')'.");
            }
        }
        finalTokens.push(token);
    });
    // If there are unmatched '(', throw an error
    if (openParenCount > 0) {
        throw new Error("Unmatched opening parenthesis '('.");
    }
    console.log(finalTokens);
    return finalTokens;
}
