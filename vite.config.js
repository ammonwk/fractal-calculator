import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
            '/ws': {
                target: 'ws://localhost:3000',
                ws: true,
            },
            '/wss': {
                target: 'ws://localhost:3000',
                ws: true,
            },
        },
    },
});
