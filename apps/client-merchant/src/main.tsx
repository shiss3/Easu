import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/index.ts'
import App from './App.tsx'
import './index.css'

import {ConfigProvider} from "antd";
import zhCN from 'antd/locale/zh_CN';

const root = ReactDOM.createRoot(document.getElementById('root')!)


root.render(
    // StrictMode 会在开发模式下进行额外检查：
    // - 检测不安全的生命周期方法
    // - 检测过时的 API 使用
    // - 检测意外的副作用（会双重调用某些函数）
    <React.StrictMode>
        {/* Provider 使 Redux store 对整个应用可用 */}
        <Provider store={store}>
            {/* BrowserRouter 提供路由功能，使用 HTML5 History API */}
            <ConfigProvider locale={zhCN}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </ConfigProvider>
        </Provider>
    </React.StrictMode>
)