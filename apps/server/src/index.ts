import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import xss from 'xss';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;
const SSE_PATHS = ['/api/chat', '/api/realtime/'];
const helmetMiddleware = helmet();

const isSsePath = (path: string) => SSE_PATHS.some((ssePath) => path.startsWith(ssePath));

// 中间件
app.use(cors({
    // 显式包含 PATCH（B 端审核酒店等接口需要）
    // 必须明确允许你的主域名和 www 域名
    origin: ['https://easu.top',
             'https://www.easu.top',
             'https://easu-client-merchant.vercel.app'
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
})); // 允许前端跨域
app.use((req, res, next) => {
    if (isSsePath(req.path)) {
        return next();
    }

    helmetMiddleware(req, res, next);
});
app.use(express.json());
app.use((req, _res, next) => {
    if (isSsePath(req.path)) {
        return next();
    }

    const sanitize = (value: any): any => {
        if (typeof value === 'string') return xss(value);
        if (Array.isArray(value)) return value.map(sanitize);
        if (value && typeof value === 'object') {
            return Object.keys(value).reduce((acc, key) => {
                acc[key] = sanitize(value[key]);
                return acc;
            }, {} as Record<string, any>);
        }
        return value;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }

    if (req.query) {
        Object.assign(req.query, sanitize(req.query));
    }

    if (req.params) {
        Object.assign(req.params, sanitize(req.params));
    }

    next();
});

// 路由挂载
app.use('/api', routes); // 最终地址: http://localhost:3001/api

app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});