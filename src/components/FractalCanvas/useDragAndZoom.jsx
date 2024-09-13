// useDragAndZoom.js
import { useEffect, useRef } from 'react';

export function useDragAndZoom(canvasRef, zoom, offset, setZoom, setOffset) {
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;

        const onMouseDown = (event) => {
            isDraggingRef.current = true;
            lastMousePosRef.current = { x: event.clientX, y: event.clientY };
        };

        const onMouseMove = (event) => {
            if (isDraggingRef.current) {
                const deltaX = (event.clientX - lastMousePosRef.current.x) / (zoom * canvas.width);
                const deltaY = (event.clientY - lastMousePosRef.current.y) / (zoom * canvas.height);
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
            event.preventDefault();
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

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [zoom, offset, setZoom, setOffset, canvasRef]);
}
