// 简单的内存存储验证码
const otpStore = new Map<string, { code: string; expires: number }>();

export const SmsService = {

     // 发送验证码
    sendSMS: async (phone: string, code: string) => {
        // 存入内存，有效期 5 分钟 (300000ms)
        otpStore.set(phone, {
            code,
            expires: Date.now() + 5 * 60 * 1000,
        });

        // 调用第三方 SDK (此处模拟)
        console.log(`[SMS MOCK] To: ${phone}, Code: ${code}`);
        return true;
    },


     // 校验验证码

    verifyCode: (phone: string, code: string): boolean => {
        const record = otpStore.get(phone);
        if (!record) return false;

        // 检查过期
        if (Date.now() > record.expires) {
            otpStore.delete(phone);
            return false;
        }

        // 检查匹配
        if (record.code === code) {
            otpStore.delete(phone); // 验证成功后立即销毁，防止重放
            return true;
        }

        return false;
    }
};