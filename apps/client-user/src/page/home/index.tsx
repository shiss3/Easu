import { MapPin, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Shadcn Button
import { useNavigate } from 'react-router-dom';



const HomePage = () => {
    const navigate = useNavigate();
    return (
        <div className="relative">
            {/* 1. 顶部 Banner 区域 */}
            <div className="relative h-64 w-full overflow-hidden">
                <img  alt="Hotel Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent p-4">
                    {/* 顶部状态栏占位 */}
                    <div className="h-8"></div>
                    <h1 className="text-white text-3xl font-bold mt-4">全新酒店开业</h1>
                    <div className="inline-block bg-black/40 text-gold-200 text-sm px-2 py-1 rounded mt-2 text-yellow-300 border border-yellow-300">
                        会员限时尊享至高 75折优惠
                    </div>
                </div>
            </div>

            {/* 2. 核心搜索卡片 - 负Margin实现重叠效果 */}
            <div className="relative px-4 -mt-16 z-10">
                <div className="bg-white rounded-xl shadow-lg p-5">
                    {/* Tabs: 国内/海外... */}
                    <div className="flex gap-6 text-lg font-medium mb-4 border-b border-gray-100 pb-2">
                        <span className="text-blue-600 border-b-2 border-blue-600 pb-1">国内</span>
                        <span className="text-gray-500">海外</span>
                        <span className="text-gray-500">钟点房</span>
                        <span className="text-gray-500">民宿</span>
                    </div>

                    {/* 城市与搜索 */}
                    <div className="flex items-center justify-between border-b border-gray-100 py-4">
                        <div className="flex items-center gap-1 text-xl font-bold min-w-[80px]">
                            上海 <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-black translate-y-0.5 ml-1"></div>
                        </div>
                        <div className="flex-1 ml-4 text-gray-400 text-sm flex items-center">
                            <Search size={16} className="mr-2"/>
                            位置/品牌/酒店
                        </div>
                        <MapPin className="text-blue-600" size={20} />
                    </div>

                    {/* 日期选择 */}
                    <div className="flex justify-between items-center border-b border-gray-100 py-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-500">入住</span>
                            <div className="flex items-end gap-2">
                                <span className="text-lg font-bold">1月29日</span>
                                <span className="text-xs text-gray-500 mb-1">今天</span>
                            </div>
                        </div>
                        <div className="bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600">
                            共1晚
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-sm text-gray-500">离店</span>
                            <div className="flex items-end justify-end gap-2">
                                <span className="text-lg font-bold">1月30日</span>
                                <span className="text-xs text-gray-500 mb-1">明天</span>
                            </div>
                        </div>
                    </div>

                    {/* 人数/价格 */}
                    <div className="flex items-center justify-between py-4 text-lg">
                        <div>
                            1间房 1成人 0儿童 <span className="text-gray-300 text-sm ml-2">▼</span>
                        </div>
                        <div className="text-gray-300 text-sm">
                            价格/星级
                        </div>
                    </div>

                    {/* 查询按钮 */}
                    <Button
                        onClick={() => navigate('/search?city=上海')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg rounded-lg shadow-blue-200 shadow-xl mt-2">
                        查询
                    </Button>
                </div>
            </div>

            {/* 3. 营销入口 Grid (图1下半部分) */}
            <div className="px-4 mt-6">
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <MarketingCard title="口碑榜" sub="城市精选" icon="🏆" />
                    <MarketingCard title="特价套餐" sub="随时退" icon="🏷️" />
                    <MarketingCard title="超值低价" sub="7折起" icon="📉" />
                </div>

                {/* 季节性Banner */}
                <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-4 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            🍂 步履秋冬，即刻出发
                        </h3>
                        <ChevronRight size={20}/>
                    </div>
                    {/* 横向滚动区域 */}
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <FeatureChip label="♨️ 暖冬温泉" active />
                        <FeatureChip label="🏖️ 过冬·避寒" />
                        <FeatureChip label="❄️ 冰雪狂欢" />
                    </div>

                    {/* 推荐酒店卡片容器 (水平滚动) */}
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                        {[1,2,3].map(i => (
                            <div key={i} className="min-w-[140px] h-[100px] bg-white/20 rounded-lg border border-white/30"></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 辅助小组件
const MarketingCard = ({ title, sub, icon }: any) => (
    <div className="bg-white p-3 rounded-lg shadow-sm flex flex-col items-center justify-center text-center">
        <div className="text-2xl mb-1">{icon}</div>
        <div className="font-bold text-gray-800 text-sm">{title}</div>
        <div className="text-xs text-gray-500">{sub}</div>
    </div>
);

const FeatureChip = ({ label, active }: any) => (
    <div className={`whitespace-nowrap px-3 py-1.5 rounded text-sm ${active ? 'bg-white text-orange-600 font-bold' : 'bg-white/20 text-white'}`}>
        {label}
    </div>
);

export default HomePage;