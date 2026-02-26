import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Home = lazy(() => import('../pages/Home.tsx'))
const DashBoard = lazy(() => import('../pages/DashBoard.tsx'))
const Login = lazy(() => import('../pages/Login/Login.tsx'))
const Register = lazy(() => import('../pages/Register/Register.tsx'))
const Personal = lazy(() => import("../pages/Personal.tsx"))
const AddHotel = lazy(() => import('../pages/AddHotel/AddHotel.tsx'))
const HotelList = lazy(() => import("../pages/HotelList/hotelList.tsx"))

//加载中组件
function LoadingFallback() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: 'var(--text-muted)'
        }}>
            <p>加载中...</p>
        </div>
    )
}

//路由配置组件
function AppRoutes() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                {/* login登录页面 */}
                <Route path="/" element={<Login />} />

                {/* register注册页面 */}
                <Route path="/register" element={<Register />} />

                {/* home管理系统首页（含子路由） */}
                <Route path="/home" element={<Home />}>
                    <Route index element={<DashBoard />} />
                    <Route path="hotels/add" element={<AddHotel />} />
                    <Route path="hotels/list" element={<HotelList />} />
                    <Route path="personal" element={<Personal />} />
                </Route>

                {/* 兼容旧链接：/personal 重定向到 /home/personal */}
                <Route path="/personal" element={<Navigate to="/home/personal" replace />} />

            </Routes>
        </Suspense>
    )
}

export default AppRoutes