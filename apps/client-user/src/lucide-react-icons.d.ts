declare module 'lucide-react/dist/esm/icons/*' {
    import type {
        ForwardRefExoticComponent,
        RefAttributes,
        SVGProps,
    } from 'react';

    export interface LucideProps extends SVGProps<SVGSVGElement> {
        color?: string;
        size?: string | number;
        strokeWidth?: string | number;
        absoluteStrokeWidth?: boolean;
    }

    const icon: ForwardRefExoticComponent<
        Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
    >;

    export default icon;
}

