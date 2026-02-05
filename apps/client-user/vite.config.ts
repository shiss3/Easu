import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 引入 path 模块

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // 添加别名配置：将 "@" 指向 "src" 目录
            "@": path.resolve(__dirname, "./src"),
        },
    },
})