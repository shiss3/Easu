import logo from "../../assets/logo.png"
import bg0 from "../../assets/bg0.jpg"
import bg1 from "../../assets/bg1.png"
import "./index.css"

import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from "../../api/users";
import { setLogin } from "../../store/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState<boolean>(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    function handleLogin() {
        form.validateFields().then(async (values) => {
            setLoading(true);
            try {
                const { data } = await login({ name: values.name, password: values.password });
                dispatch(setLogin({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    managerInfo: data.manager,
                }));
                message.success('登录成功');
                navigate('/home', { replace: true });
            } catch {
                // 后端返回的 message 已在 http 拦截器中通过 message.error 弹出
            } finally {
                setLoading(false);
            }
        }).catch(() => {
            setLoading(false);
        });
    }

    return (
        <div className="login" style={{ backgroundImage: `url(${bg0})` }}>
            <div className="lgbg" style={{ backgroundImage: `url(${bg1})` }}>
                <div className="part">
                    <div className="title">
                        <div className="logo">
                            <img src={logo} width={200} alt="logo" />
                        </div>
                        <h1>易宿·酒店管理平台</h1>
                    </div>
                    <Form form={form}>
                        <Form.Item
                            name="name"
                            rules={[
                                { required: true, message: '用户名不能为空' },
                                { min: 1, message: '请输入用户名' },
                            ]}
                        >
                            <Input placeholder="请输入您的用户名" prefix={<UserOutlined />} />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: '密码不能为空' }]}
                        >
                            <Input.Password placeholder="请输入您的密码" prefix={<LockOutlined />} />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                style={{ width: "100%" }}
                                onClick={handleLogin}
                                loading={loading}
                            >
                                登录
                            </Button>
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="default"
                                style={{ width: "100%" }}
                                onClick={() => navigate("/register")}
                                loading={loading}
                                className="footer"
                            >
                                还没有账号？ 去注册
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </div>
    );
}

export default Login;
