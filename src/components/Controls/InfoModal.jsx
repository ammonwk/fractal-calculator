import React from 'react';

function Modal({ isOpen, onClose }) {
    if (!isOpen) return null; // Return null if modal is not open

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>
                    &times;
                </button>
                <h3>What's this?</h3>
                <p>
                    Welcome to JuliaScope! Here, you can explore and create beautiful fractals by playing with mathematical equations.
                    A fractal is a never-ending, infinitely complex pattern created by repeating a simple process over and over again.
                </p>
                <br></br>
                <h3>How to use it:</h3>
                <ul>
                    <li>Type an equation in the "Fractal Equation" box. Try z^2 + c to start!</li>
                    <li>Zoom in to anywhere that looks interesting to you and explore the fractal in more detail.</li>
                    <li>You can also adjust the color scheme, resolution, and other settings to customize your fractal.</li>
                </ul>
                <p>
                    The shapes you see are called Julia sets.
                    They show which points "escape" to infinity when your equation is applied repeatedly.

                    Experiment and have fun! Each equation creates a different fractal world to explore.
                </p>
                <button className="modal-action-button" onClick={onClose}>
                    Got it!
                </button>
            </div>
        </div>
    );
}

export default Modal;
