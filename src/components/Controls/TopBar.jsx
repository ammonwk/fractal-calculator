import React from 'react';

function TopBar() {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-gray-800 text-white shadow-md p-4">
            <div className="text-2xl font-semibold ml-4">JuliaScope</div>
            <div className="flex space-x-4">
                {/* <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded transition">
                    Log In
                </button>
                <button className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 px-4 rounded transition">
                    Sign Up
                </button> */}
            </div>
        </div>
    );
}

export default TopBar;
