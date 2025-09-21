import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), wasm()],
  // https://vite.dev/guide/build.html#public-base-path
  base: "./",
});
