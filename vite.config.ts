import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import solidSvg from 'vite-plugin-solid-svg';
import path from 'path';
// import mkcert from 'vite-plugin-mkcert'
// import devtools from 'solid-devtools/vite';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    solidSvg(),
    compression(),
    compression({ algorithm: 'brotliCompress' }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },

  build: {
    target: 'esnext',
  },
});
