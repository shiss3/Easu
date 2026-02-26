import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './page/home/';
import SearchResultPage from './page/search-result';
import HotelDetailPage from "@/page/hotel-detail";
import LoginPage from "@/page/login";
import AIAssistantPage from "@/page/ai-assistant";
import { Toaster } from 'sonner';

function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-center" richColors />
            <Routes>
                <Route path="/">
                    <Route index element={<HomePage />} />
                    {/* 搜索结果页 */}
                    <Route path="search" element={<SearchResultPage />} />
                    {/*酒店详情页*/}
                </Route>
                <Route path="/hotel/:id" element={<HotelDetailPage />} />
                {/* AI 助手页 */}
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                {/*登陆页*/}
                    <Route path="/login" element={<LoginPage />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;