import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api': 'http://localhost:4000',
            '/ws': {
                target: 'ws://localhost:4000',
                ws: true,
            },
            '/wss': {
                target: 'ws://localhost:4000',
                ws: true,
            },
        },
    },
});
