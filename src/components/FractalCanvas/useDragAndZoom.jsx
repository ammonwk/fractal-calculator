import { useEffect, useRef } from 'react';

export function useDragAndZoom(canvasRef, zoom, offset, setZoom, setOffset) {
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const lastTouchDistanceRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const devicePixelRatio = window.devicePixelRatio || 1;

        // Apply the CSS rule to disable default touch actions on the canvas only
        canvas.style.touchAction = 'none';

        const getTouchDistance = (touch1, touch2) => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const onMouseDown = (event) => {
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: event.clientX, y: event.clientY };
        };

        const onMouseMove = (event) => {
            if (isDraggingRef.current) {
                const deltaX = (event.clientX - lastMousePosRef.current.x) / (zoom * canvas.width / devicePixelRatio);
                const deltaY = (event.clientY - lastMousePosRef.current.y) / (zoom * canvas.height / devicePixelRatio);
                setOffset(prevOffset => ({
                    x: prevOffset.x + deltaX * 2.0 * (canvas.width / canvas.height),
                    y: prevOffset.y - deltaY * 2.0
                }));
                lastMousePosRef.current = { x: event.clientX, y: event.clientY };
            }
        };

        const onMouseUp = () => {
            isDraggingRef.current = false;
        };

        const onWheel = (event) => {
            if (event.target !== canvas) return; // Only handle wheel events on the canvas
            event.preventDefault(); // Prevent default page zooming
            const zoomFactor = 1.1;
            const newZoom = zoom * (event.deltaY < 0 ? zoomFactor : 1 / zoomFactor);

            const rect = canvas.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left) / rect.width;
            const mouseY = (event.clientY - rect.top) / rect.height;

            const aspectRatio = canvas.width / canvas.height;
            const newOffsetX = offset.x - ((mouseX - 0.5) * aspectRatio * 2.0) * (1 / zoom - 1 / newZoom);
            const newOffsetY = offset.y + ((mouseY - 0.5) * 2.0) * (1 / zoom - 1 / newZoom);

            setZoom(newZoom);
            setOffset({ x: newOffsetX, y: newOffsetY });
        };

        const onTouchStart = (event) => {
            if (event.target !== canvas) return; // Only handle touch events on the canvas
            if (event.touches.length === 1) {
                isDraggingRef.current = true;
                lastMousePosRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else if (event.touches.length === 2) {
                isDraggingRef.current = false;  // Stop dragging during pinch-to-zoom
                const [touch1, touch2] = event.touches;
                lastTouchDistanceRef.current = getTouchDistance(touch1, touch2);
            }
        };

        const onTouchMove = (event) => {
            if (event.target !== canvas) return; // Only handle touch events on the canvas
            event.preventDefault(); // Prevent default pinch-zoom behavior
            if (isDraggingRef.current && event.touches.length === 1) {
                const deltaX = (event.touches[0].clientX - lastMousePosRef.current.x) / (zoom * canvas.width / devicePixelRatio);
                const deltaY = (event.touches[0].clientY - lastMousePosRef.current.y) / (zoom * canvas.height / devicePixelRatio);
                setOffset(prevOffset => ({
                    x: prevOffset.x + deltaX * 2.0 * (canvas.width / canvas.height),
                    y: prevOffset.y - deltaY * 2.0
                }));
                lastMousePosRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else if (event.touches.length === 2) {
                const [touch1, touch2] = event.touches;
                const currentTouchDistance = getTouchDistance(touch1, touch2);
                const zoomFactor = currentTouchDistance / lastTouchDistanceRef.current;

                const newZoom = zoom * zoomFactor;
                const rect = canvas.getBoundingClientRect();
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                const mouseX = (centerX - rect.left) / rect.width;
                const mouseY = (centerY - rect.top) / rect.height;

                const aspectRatio = canvas.width / canvas.height;
                const newOffsetX = offset.x - ((mouseX - 0.5) * aspectRatio * 2.0) * (1 / zoom - 1 / newZoom);
                const newOffsetY = offset.y + ((mouseY - 0.5) * 2.0) * (1 / zoom - 1 / newZoom);

                setZoom(newZoom);
                setOffset({ x: newOffsetX, y: newOffsetY });

                lastTouchDistanceRef.current = currentTouchDistance;
            }
        };

        const onTouchEnd = () => {
            isDraggingRef.current = false;
            lastTouchDistanceRef.current = null;
        };

        const onTouchCancel = onTouchEnd;

        // Add mouse event listeners
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        // Add touch event listeners
        canvas.addEventListener('touchstart', onTouchStart);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchCancel);

        return () => {
            // Remove mouse event listeners
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);

            // Remove touch event listeners
            canvas.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchCancel);
        };
    }, [zoom, offset, setZoom, setOffset, canvasRef]);
}
