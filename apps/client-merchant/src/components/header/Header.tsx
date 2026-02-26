import { UserOutlined, PoweroffOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Dropdown, Space } from 'antd';
import { logout } from '../../store/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store';

const items: MenuProps['items'] = [
    {
        key: '1',
        label: (
            <a target="_blank" >
                个人中心
            </a>
        ),
        icon: <UserOutlined />,
    },
    {
        key: '2',
        label: (
            <a target="_blank" >
                退出登录
            </a>
        ),
        icon: <PoweroffOutlined />,
    },

];
function MyHeader() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const managerInfo = useSelector((state: RootState) => state.authSlice.managerInfo);
    const onClick: MenuProps['onClick'] = ({ key }) => {
        if (key === "1") {
            navigate("/home/personal");
        } else {
            dispatch(logout());
            sessionStorage.clear();
            navigate("/", { replace: true });
        }
    };
    return <div>
        <Dropdown menu={{ items,onClick}}>
            <a onClick={(e) => e.preventDefault()}>
                <Space>
                    欢迎您,{managerInfo?.name ?? '—'}
                    <DownOutlined />
                </Space>
            </a>
        </Dropdown>
    </div>
}

export default MyHeader