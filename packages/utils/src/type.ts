// 统一的接口返回结构

export interface ApiResponse<T = any> {
    code: number;       // 业务状态码：200 成功
    message: string;    // 提示信息
    data: T;            // 核心业务数据
    meta?: {            // 分页或元数据
        total?: number;
        page?: number;
        pageSize?: number;
    };
}