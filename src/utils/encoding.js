export function encodeFractal(fractalState) {
    const jsonString = JSON.stringify(fractalState);
    const base64String = btoa(jsonString); // Encode to base64
    return base64String;
}

export function decodeFractal(base64String) {
    const jsonString = atob(base64String); // Decode from base64
    const fractalState = JSON.parse(jsonString);
    return fractalState;
}
