import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileLayout from './layouts/MobileLayout';
import HomePage from './page/home/';
import SearchResultPage from './page/search-result'; // 下面创建

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MobileLayout />}>
                    <Route index element={<HomePage />} />
                    {/* 搜索结果页 */}
                    <Route path="search" element={<SearchResultPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
export default App;