import React from 'react';

const ToggleSwitch = ({ checked, onChange, leftLabel, rightLabel }) => {
    return (
        <div className="flex items-center justify-between mt-4">
            <span className="text-sm font-semibold text-white">{leftLabel}</span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
            <span className="text-sm font-semibold text-white">{rightLabel}</span>
        </div>
    );
};

export default ToggleSwitch;
