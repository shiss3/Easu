import http from '../utils/http/http';

//将图片通过 FormData 上传到后端，后端中转 Buffer 到阿里云 OSS，返回 CDN 地址。
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = (await http.post('/upload', formData)) as {
    code: number;
    message: string;
    data: { url: string };
  };
  return res.data.url;
}
