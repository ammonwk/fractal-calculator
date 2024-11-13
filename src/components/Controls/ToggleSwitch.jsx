import React from 'react';

const ToggleSwitch = ({ checked, onChange, leftLabel, rightLabel }) => {
    return (
        <div className="relative w-full flex mt-4">
            <div className="
                relative
                bg-gray-600
                rounded-lg
                p-1
                w-full
                h-10
                flex
                items-center
                cursor-pointer
            ">
                {/* Sliding highlight */}
                <div className={`
                    absolute
                    top-1
                    ${checked ? 'left-[50%]' : 'left-1'}
                    w-[calc(50%-4px)]
                    h-[calc(100%-8px)]
                    bg-blue-500
                    rounded-md
                    transition-all
                    duration-300
                    ease-in-out
                    shadow-md
                `}></div>

                {/* Labels */}
                <div className="
                    relative
                    flex
                    w-full
                    text-sm
                    font-medium
                    select-none
                ">
                    <span
                        onClick={() => onChange({ target: { checked: false } })}
                        className={`
                            flex-1
                            text-center
                            z-10
                            transition-colors
                            duration-300
                            ${checked ? 'text-gray-300' : 'text-white'}
                        `}
                    >
                        {leftLabel}
                    </span>
                    <span
                        onClick={() => onChange({ target: { checked: true } })}
                        className={`
                            flex-1
                            text-center
                            z-10
                            transition-colors
                            duration-300
                            ${checked ? 'text-white' : 'text-gray-300'}
                        `}
                    >
                        {rightLabel}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ToggleSwitch;