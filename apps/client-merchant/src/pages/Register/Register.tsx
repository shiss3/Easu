import { Button, Form, Input, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { register as registerApi, type RegisterData, type ManagerRole } from '../../api/users';
import logo from '../../assets/logo.png';
import bg0 from '../../assets/bg0.jpg';
import bg1 from '../../assets/bg1.png';
import './index.css';

const roleOptions: { value: ManagerRole; label: string }[] = [
    { value: 'MERCHANT', label: '商户' },
    { value: 'ADMIN', label: '管理员' },
];

function Register() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values: RegisterData) => {
        setLoading(true);
        try {
            await registerApi({
                name: values.name.trim(),
                password: values.password,
                phone: values.phone.trim(),
                email: values.email.trim(),
                role: values.role ?? 'MERCHANT',
            });
            message.success('注册成功，请登录');
            navigate('/');
        } catch {
            // 后端返回的 message 已在 http 拦截器中通过 message.error 弹出
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page" style={{ backgroundImage: `url(${bg0})` }}>
            <div className="register-box">
            {/* 左侧：注册表单区（视觉主体） */}
            <div className="register-left">
                <div className="register-header">
                    <img src={logo} className="register-logo" alt="易宿" />
                    <div className="register-header-text">
                        <h1 className="register-title">易宿·酒店管理平台</h1>
                        <p className="register-subtitle">注册帐号，免费发布您的住宿</p>
                    </div>
                </div>

                <Form
                    form={form}
                    onFinish={onFinish}
                    layout="vertical"
                    initialValues={{ role: 'MERCHANT' }}
                    className="register-form"
                >
                    <Form.Item
                        name="name"
                        label="用户名"
                        rules={[
                            { required: true, message: '用户名不能为空' },
                            { min: 1, message: '用户名不能为空' },
                        ]}
                    >
                        <Input placeholder="请输入用户名" prefix={<UserOutlined />} allowClear />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="密码"
                        rules={[
                            { required: true, message: '密码不能为空' },
                            { min: 6, message: '密码至少6位' },
                        ]}
                    >
                        <Input.Password placeholder="请输入密码（至少6位）" prefix={<LockOutlined />} />
                    </Form.Item>
                    <Form.Item
                        name="phone"
                        label="手机号"
                        rules={[
                            { required: true, message: '请输入手机号' },
                            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
                        ]}
                    >
                        <Input placeholder="请输入手机号" prefix={<PhoneOutlined />} allowClear />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="邮箱"
                        rules={[
                            { required: true, message: '请输入邮箱' },
                            { type: 'email', message: '邮箱格式不正确' },
                        ]}
                    >
                        <Input placeholder="请输入邮箱" prefix={<MailOutlined />} allowClear />
                    </Form.Item>
                    <Form.Item name="role" label="角色">
                        <Select options={roleOptions} placeholder="请选择角色" />
                    </Form.Item>

                    <Form.Item className="register-actions">
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            className="register-btn-primary"
                        >
                            免费注册
                        </Button>
                    </Form.Item>
                    <Form.Item className="register-actions">
                        <Button
                            type="default"
                            block
                            onClick={() => navigate('/')}
                            className="register-btn-login"
                        >
                            已注册？点此登录
                        </Button>
                    </Form.Item>
                </Form>

                <div className="register-footer">
                    <p>
                        登录或注册帐号即代表您同意本公司的
                        <a href="#" className="register-link">隐私条款</a>
                    </p>
                    <p>
                        注册遇到困难？请参考
                        <a href="#" className="register-link">常见问题</a>
                        或联系
                        <a href="#" className="register-link">support@easu.com</a>
                    </p>
                </div>
            </div>

            {/* 右侧：装饰图（不拉伸，cover 裁剪） */}
            <div
                className="register-right"
                style={{ backgroundImage: `url(${bg1})` }}
            />
            </div>
        </div>
    );
}

export default Register;
