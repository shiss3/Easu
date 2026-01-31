import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileLayout from './layouts/MobileLayout';
import HomePage from './page/home/';
import SearchResultPage from './page/search-result';
import HotelDetailPage from "@/page/hotel-detail"; // 下面创建

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MobileLayout />}>
                    <Route index element={<HomePage />} />
                    {/* 搜索结果页 */}
                    <Route path="search" element={<SearchResultPage />} />
                    {/*酒店详情页*/}
                    <Route path="/hotel/:id" element={<HotelDetailPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
export default App;