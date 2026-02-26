import { Menu } from 'antd';
import { useMemo } from 'react';
import logo from "../../assets/logo.jpg";
import icons from './iconList';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import "./index.css";

interface MenuItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
    children?: MenuItem[];
}

function NavLeft() {
    const role = useSelector((state: RootState) => state.authSlice.managerInfo?.role);
    const location = useLocation();
    const navigate = useNavigate();

    // 根据角色生成菜单：MERCHANT 显示「新增酒店」，ADMIN 仅显示工作台、酒店列表、个人中心
    const menuData: MenuItem[] = useMemo(() => {
        const hotelChildren: MenuItem[] = [
            { key: "/home/hotels/list", label: "酒店列表", icon: icons["UnorderedListOutlined"] },
        ];
        // 仅商户角色能够上传酒店信息
        if (role === 'MERCHANT') {
            hotelChildren.push({
                key: "/home/hotels/add",
                label: "新增酒店",
                icon: icons["AppstoreAddOutlined"],
            });
        }

        return [
            { key: "/home", label: "工作台", icon: icons["DashboardOutlined"] },
            {
                key: "/hotels",
                label: "酒店管理",
                icon: icons["BankOutlined"],
                children: hotelChildren,
            },
            { key: "/home/personal", label: "个人中心", icon: icons["UserOutlined"] },
        ];
    }, [role]);

    function handleClick({ key }: { key: string }) {
        navigate(key);
    }

    return (
        <div className='navleft'>
            <div className='logo'>
                <img src={logo} alt="" width={18}/>
                <h1>易宿酒店管理</h1>
            </div>

            <Menu
                mode="inline"
                theme="dark"
                items={menuData}
                onClick={handleClick}
                selectedKeys={[location.pathname]}
            />
        </div>
    )

}

export default NavLeft;