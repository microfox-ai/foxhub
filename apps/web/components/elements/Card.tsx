import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
    cardHeader?: ReactNode;
    cardMedia?: ReactNode;
    cardContent?: ReactNode;
    cardActions?: ReactNode;
    className?: string;
    cardType?: 'simple' | 'overlayed';
}

export const BaseCard: React.FC<BaseCardProps> = ({
    cardHeader,
    cardMedia,
    cardContent,
    cardActions,
    className = '',
    cardType = 'simple',
    ...props
}) => {
    return (
        <div
            className={cn(
                `relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-0 shadow-md`,
                className,
            )}
            {...props}
        >
            {cardType === 'overlayed' && (
                <>
                    {(cardMedia || cardHeader) && (
                        <div className="relative">
                            {cardMedia && <div>{cardMedia}</div>}
                            {cardHeader && (
                                <div className="absolute left-0 top-0">{cardHeader}</div>
                            )}
                        </div>
                    )}
                    {cardContent && cardContent}
                    {cardActions && cardActions}
                </>
            )}

            {cardType === 'simple' && (
                <>
                    {cardHeader && cardHeader}
                    {cardMedia && cardMedia}
                    {cardContent && cardContent}
                    {cardActions && cardActions}
                </>
            )}
        </div>
    );
};
