import { forwardRef, useEffect, useState, type ImgHTMLAttributes } from 'react';
import { DEFAULT_HOTEL_IMAGE } from '@/lib/constants';

export type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    /** 原始图片地址；空字符串或缺省时直接使用兜底图，不发起无效请求 */
    src?: string | null;
};

/**
 * 图片加载失败时切换到 `DEFAULT_HOTEL_IMAGE`，布局类名透传，不破坏外层排版。
 */
export const SafeImage = forwardRef<HTMLImageElement, SafeImageProps>(function SafeImage(
    { src, className, onError, ...rest },
    ref,
) {
    const resolveSrc = (raw: string | null | undefined) =>
        !raw || String(raw).trim() === '' ? DEFAULT_HOTEL_IMAGE : raw;

    const [imgSrc, setImgSrc] = useState(() => resolveSrc(src));

    useEffect(() => {
        setImgSrc(resolveSrc(src));
    }, [src]);

    const handleError: ImgHTMLAttributes<HTMLImageElement>['onError'] = (e) => {
        onError?.(e);
        setImgSrc((current) => (current !== DEFAULT_HOTEL_IMAGE ? DEFAULT_HOTEL_IMAGE : current));
    };

    return <img ref={ref} {...rest} src={imgSrc} className={className} onError={handleError} />;
});

SafeImage.displayName = 'SafeImage';
