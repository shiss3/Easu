import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { authApi } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft } from 'lucide-react';
import { toast } from "sonner";

const COUNTDOWN_KEY = 'sms_countdown_end';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const setLogin = useUserStore((state) => state.setLogin);

    // 状态管理
    const [loginType, setLoginType] = useState<'code' | 'password'>('code');
    const [phone, setPhone] = useState('');
    const [credential, setCredential] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // 初始化检查：组件挂载时恢复倒计时
    useEffect(() => {
        const storedEnd = localStorage.getItem(COUNTDOWN_KEY);
        if (storedEnd) {
            const endTime = parseInt(storedEnd, 10);
            const remaining = Math.ceil((endTime - Date.now()) / 1000);

            if (remaining > 0) {
                setCountdown(remaining);
            } else {
                // 已过期，清理旧数据
                localStorage.removeItem(COUNTDOWN_KEY);
            }
        }
    }, []);

    // 倒计时计时器逻辑
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        // 倒计时结束，清理 Storage
                        localStorage.removeItem(COUNTDOWN_KEY);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    // 发送验证码
    const handleSendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            toast.error('请输入正确的手机号');
            return;
        }

        try {
            await authApi.sendCode(phone);

            // 成功逻辑：设置持久化时间戳 (当前时间 + 60秒)
            const endTime = Date.now() + 60 * 1000;
            localStorage.setItem(COUNTDOWN_KEY, endTime.toString());

            setCountdown(60);
            toast.success('验证码已发送');

        } catch (error: any) {
            console.error(error);
            // 错误处理逻辑
            if (error.response?.status === 429) {
                toast.error("发送太频繁，请稍后再试");
            } else {
                toast.error(error.message || "验证码发送失败");
            }
        }
    };

    // 执行登录
    const handleLogin = async () => {
        if (!phone || !credential) {
            toast.warning('请填写完整信息');
            return;
        }

        setLoading(true);
        try {
            const res = await authApi.login({
                phone,
                loginType,
                credential,
                device: 'H5-Mobile'
            });

            setLogin({
                accessToken: res.data.accessToken,
                refreshToken: res.data.refreshToken,
                userInfo: res.data.user
            });

            toast.success('登录成功');

            // 跳转逻辑
            const fromState = location.state?.from;
            const searchParams = new URLSearchParams(location.search);
            const fromQuery = searchParams.get('from');

            navigate(fromState || fromQuery || '/', { replace: true });

        } catch (error: any) {
            toast.error(error.message || '登录失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white text-gray-900 p-8 flex flex-col pt-32 overflow-y-auto overscroll-none">
            {/* 左上角返回按钮 */}
            <div
                className="absolute top-8 left-6 p-2 -ml-2 rounded-full active:bg-gray-100 cursor-pointer text-gray-600"
                onClick={() => navigate(-1)} // 返回上一页
            >
                <ChevronLeft size={28} />
            </div>

            {/* 标题区 */}
            <h1 className="text-3xl font-bold mb-2">
                {loginType === 'code' ? '手机验证码登录' : '账号密码登录'}
            </h1>
            <p className="text-gray-400 text-sm mb-12">
                {loginType === 'code' ? '未注册手机验证后即可完成注册' : '请输入您的账号密码'}
            </p>

            {/* 表单区 */}
            <div className="space-y-6">
                {/* 手机号输入 */}
                <div className="border-b border-gray-200 pb-2 flex items-center">
                    <span className="text-lg font-medium mr-4">+86</span>
                    <input
                        type="tel"
                        placeholder="请输入手机号"
                        className="flex-1 outline-none text-lg bg-transparent placeholder:text-gray-300"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                {/* 凭证输入 (验证码 或 密码) */}
                <div className="border-b border-gray-200 pb-2 flex items-center justify-between">
                    <input
                        type={loginType === 'password' ? 'password' : 'text'}
                        placeholder={loginType === 'code' ? '请输入验证码' : '请输入密码'}
                        className="flex-1 outline-none text-lg bg-transparent placeholder:text-gray-300"
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                    />

                    {/* 仅在验证码模式显示获取按钮 */}
                    {loginType === 'code' && (
                        <button
                            onClick={handleSendCode}
                            disabled={countdown > 0 || !phone}
                            className={`text-sm font-medium ${
                                countdown > 0 ? 'text-gray-400' : 'text-blue-600'
                            }`}
                        >
                            {countdown > 0 ? `${countdown}s 后重试` : '获取验证码'}
                        </button>
                    )}

                    {/* 密码模式显示忘记密码 (仅展示) */}
                    {loginType === 'password' && (
                        <span className="text-sm text-gray-400">忘记密码</span>
                    )}
                </div>

                {/* 登录按钮 */}
                <Button
                    className="w-full h-12 text-lg rounded-lg bg-blue-600 hover:bg-blue-700 mt-8"
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    登录
                </Button>

                {/* 切换登录方式 */}
                <div className="flex justify-between text-sm text-gray-500 mt-4">
                  <span
                      onClick={() => {
                          setLoginType(loginType === 'code' ? 'password' : 'code');
                          setCredential('');
                      }}
                      className="cursor-pointer"
                  >
                    {loginType === 'code' ? '账号密码登录' : '手机验证码登录'}
                  </span>
                    <span className="opacity-50">境外手机密码登录</span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;