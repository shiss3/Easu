import { useNavigate } from 'react-router-dom';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Mic from 'lucide-react/dist/esm/icons/mic';
import Brain from 'lucide-react/dist/esm/icons/brain';

const AIAssistantPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative">
            {/* 背景渐变 - 模拟淡蓝色渐变 */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50/80 to-slate-50 pointer-events-none"></div>

            {/* 顶部导航栏 */}
            <div className="flex items-center px-4 py-3 z-10">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-1 -ml-1 text-slate-800"
                >
                    <ChevronLeft size={28} />
                </button>
            </div>

            {/* 头部欢迎区 */}
            <div className="px-6 z-10 mt-2">
                <div className="flex items-center gap-2 mb-3">
                    <div className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-tr-xl rounded-bl-xl rounded-tl-sm shadow-sm">
                        Hi
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">我是小宿</h1>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                    我可以查酒店、定机票、做攻略、推荐玩乐产品。欢迎问我各种旅游问题哦~
                </p>
            </div>

            {/* 中间区域 - 留白 */}
            <div className="flex-1"></div>

            {/* 底部输入栏 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 z-20 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                {/* 快捷功能区 (深度思考等) */}
                <div className="flex gap-3 mb-3 overflow-x-auto px-1">
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-100/50">
                        <Brain size={14} />
                        <span>深度思考(R1)</span>
                    </div>
                </div>

                {/* 输入框区域 */}
                <div className="relative">
                    <div className="w-full h-12 bg-slate-100 rounded-full flex items-center px-5 text-slate-400 text-sm">
                        任何旅游相关问题都可以问我哦
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500">
                        <Mic size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistantPage;
