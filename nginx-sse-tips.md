# 修复 Nginx 下 SSE 流式输出失效的问题

代码中已经携带了 `X-Accel-Buffering: no` 头，如果通过 Nginx 代理后依然变成"整段一下子蹦出来"，请在 Nginx 的 API 路由配置中明确关闭缓冲：

```nginx
location /api/chat {
    proxy_pass http://your_backend_upstream;
    proxy_http_version 1.1;
    proxy_set_header Connection '';

    # 【关键配置】彻底关闭 Nginx 的代理缓冲
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
}
```
