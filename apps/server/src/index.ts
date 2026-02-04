import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import xss from 'xss';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors()); // 允许前端跨域
app.use(helmet());
app.use(express.json());
app.use((req, _res, next) => {
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
app.use('/api', routes); // 最终地址: http://localhost:3001/api/hotel/search

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});