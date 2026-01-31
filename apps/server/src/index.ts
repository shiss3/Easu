import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors()); // 允许前端跨域
app.use(express.json());

// 路由挂载
app.use('/api', routes); // 最终地址: http://localhost:3001/api/hotel/search

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});