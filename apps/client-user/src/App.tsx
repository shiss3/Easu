import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './page/home/';
import SearchResultPage from './page/search-result';
import HotelDetailPage from "@/page/hotel-detail";
import LoginPage from "@/page/login";
import AIAssistantPage from "@/page/ai-assistant";
import MobileLayout from "@/layouts/MobileLayout";
import { Toaster } from 'sonner';

function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-center" richColors />
            <Routes>
                <Route element={<MobileLayout />}>
                    <Route index element={<HomePage />} />
                </Route>
                <Route path="/search" element={<SearchResultPage />} />
                <Route path="/hotel/:id" element={<HotelDetailPage />} />
                <Route path="/ai-assistant" element={<AIAssistantPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;