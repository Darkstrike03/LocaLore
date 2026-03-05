import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    // DotLottie uses a Web Worker + WASM internally.
    // Excluding it prevents Vite from pre-bundling it,
    // which would break the worker's relative path lookup.
    exclude: ['@lottiefiles/dotlottie-react'],
  },
})
