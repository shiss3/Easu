import OSS from 'ali-oss';
import multer from 'multer';

// 初始化 OSS 客户端
const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_AK!,
    accessKeySecret: process.env.OSS_SK!,
    bucket: process.env.OSS_BUCKET,
});

// 使用内存存储，不存本地硬盘
export const uploadMiddleware = multer({ storage: multer.memoryStorage() });

export const uploadToOSS = async (file: Express.Multer.File) => {
    const fileName = `hotels/${Date.now()}-${file.originalname}`;
    // 上传 buffer 到 OSS
    const result = await client.put(fileName, file.buffer);
    return result.url; // 返回 https://... 的永久地址
};