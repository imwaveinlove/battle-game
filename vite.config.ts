/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base는 GitHub Pages(/battle-game/)에서도, 로컬에서도 동작하도록 상대경로 사용
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    // `npm run balance` 는 밸런스 시뮬레이션만 실행
    include: process.env.BALANCE ? ['scripts/**/*.test.ts'] : ['src/**/*.test.ts'],
  },
});
