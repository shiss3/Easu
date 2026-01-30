import { Home, ShoppingCart, Gem, MessageSquareText, User } from 'lucide-react';
import { Outlet } from 'react-router-dom';


const MobileLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* 页面内容区域 */}
            <main>
                <Outlet />
            </main>

            {/* 底部导航栏 - 对应图1底部 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50 text-xs">
                <NavItem icon={<Home size={24} />} label="首页" active />
                <NavItem icon={<ShoppingCart size={24} />} label="购物车/收藏" />
                <NavItem icon={<Gem size={24} />} label="我的权益" />
                <NavItem icon={<MessageSquareText size={24} />} label="我的点评" />
                <NavItem icon={<User size={24} />} label="我的订单" />
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active }: { icon: any, label: string, active?: boolean }) => (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
        {icon}
        <span>{label}</span>
    </div>
);

export default MobileLayout;