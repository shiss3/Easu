import Home from 'lucide-react/dist/esm/icons/home';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { Outlet, useNavigate } from 'react-router-dom';

const MobileLayout = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 pb-14 font-sans">
            <main>
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
                <button className="flex flex-col items-center gap-0.5 text-xs text-blue-600">
                    <Home size={22} />
                    <span>主页</span>
                </button>
                <button
                    onClick={() => navigate('/ai-assistant')}
                    className="flex flex-col items-center gap-0.5 text-xs text-gray-400"
                >
                    <Sparkles size={22} />
                    <span>小宿AI</span>
                </button>
            </nav>
        </div>
    );
};

export default MobileLayout;
