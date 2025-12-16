// src/components/InfoButton.js

import React, { useState } from 'react';
import Modal from './InfoModal'; // Import the Modal component

function InfoButton() {
    const [isInfoOpen, setIsInfoOpen] = useState(false); // State for the pop-up
    const [isModalOpen, setIsModalOpen] = useState(false); // State for the modal

    const toggleInfo = () => {
        setIsInfoOpen(!isInfoOpen);
    };

    const openModal = () => {
        setIsModalOpen(true);
        setIsInfoOpen(false); // Close pop-up when opening the modal
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const currentYear = new Date().getFullYear(); // Get the current year

    return (
        <div className="info-button-container">
            <button className="info-button" onClick={toggleInfo}>
                ?
            </button>
            {isInfoOpen && (
                <div className="info-popup">
                    <div className="info-item" onClick={openModal}>
                        What's this?
                    </div>
                    <hr className="info-divider" />
                    <a
                        href="https://github.com/ammonwk/fractal-calculator"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="info-item"
                    >
                        See the code
                    </a>
                    <hr className="info-divider" />
                    <a
                        href="https://www.linkedin.com/in/ammon-kunzler-68a1972b0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="info-item"
                    >
                        © {currentYear} Ammon Kunzler
                    </a>
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={closeModal} /> {/* Render the modal */}
        </div>
    );
}

export default InfoButton;
