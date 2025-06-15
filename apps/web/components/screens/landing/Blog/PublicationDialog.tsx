import { CardBody, CardContainer, CardItem } from '@/components/ui/3d-card';
import { Dialog } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';

export interface IPublication {
    title: string;
    description: string;
    link: string;
    image_url?: string | null;
    type: 'article' | 'website' | 'video';
    cta_text?: string;
    video_url?: string;
    name?: string;
    avatar?: string;

    isHot?: boolean;

    [key: string]: any;
}
export const PublicationDialog = ({
    open,
    data,
    setPublication,
    setOpenDialog,
}: {
    open: boolean;
    setOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
    setPublication: React.Dispatch<
        React.SetStateAction<IPublication | undefined>
    >;
    data: IPublication | undefined;
}) => {
    return (
        <Dialog
            open={open}
            onClose={() => {
                setOpenDialog(false);
                setTimeout(() => setPublication(undefined), 500);
                // setTimeout(() => setPublication(undefined), 500);
            }}
            sx={{ zIndex: 9999, backdropFilter: 'blur(8px)' }}
            PaperProps={{
                sx: {
                    width: 'fit-content',
                    height: 'fit-content',
                    shadow: 'none',
                    boxShadow: 'none',
                    borderRadius: '1.5rem',
                    background: 'transparent',
                    overflow: 'visible',
                },
            }}
        >
            <CardContainer className="inter-var">
                <CardBody className="group/card group relative h-auto w-auto overflow-hidden rounded-3xl border-2 border-gray-50 bg-[rgba(43,43,43,0.5)] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] sm:w-[30rem] md:hover:overflow-visible">
                    {data?.image_url && (
                        <CardItem
                            translateZ="100"
                            className="w-full !overflow-hidden rounded-tl-xl rounded-tr-xl md:group-hover:rounded-bl-xl md:group-hover:rounded-br-xl"
                        >
                            <Image
                                src={data?.image_url || ''}
                                height="1000"
                                width="1000"
                                className="h-60 w-full object-cover group-hover/card:shadow-xl"
                                alt="thumbnail"
                            />
                        </CardItem>
                    )}
                    {data?.video_url && (
                        <CardItem
                            translateZ="100"
                            className="w-full !overflow-hidden rounded-tl-xl rounded-tr-xl md:group-hover:rounded-bl-xl md:group-hover:rounded-br-xl"
                        >
                            <video
                                src={data?.video_url || ''}
                                className="h-60 w-full object-cover group-hover/card:shadow-xl"
                                autoPlay
                                loop
                                muted
                            />
                        </CardItem>
                    )}
                    <div className="p-4">
                        <CardItem
                            translateZ="50"
                            className="mt-2 text-xl font-bold text-gray-50 dark:text-white"
                        >
                            {data?.title}
                        </CardItem>
                        <CardItem
                            as="p"
                            translateZ="60"
                            className="mt-2 max-w-sm text-sm text-neutral-400 dark:text-neutral-300"
                        >
                            {data?.description}
                        </CardItem>
                        <div className="mt-4 flex items-center justify-between">
                            {(data?.avatar || data?.name) && (
                                <CardItem
                                    translateZ={20}
                                    as={Link}
                                    href="https://twitter.com/mannupaaji"
                                    target="__blank"
                                    className="flex items-center rounded-xl py-2 text-xs font-normal dark:text-white"
                                >
                                    {data?.avatar && (
                                        <Image
                                            src={data?.avatar || ''}
                                            height={20}
                                            width={20}
                                            className="mr-2 inline-block rounded-full"
                                            alt={data?.name || 'Author Photo'}
                                        />
                                    )}
                                    {data?.name && <span>{data?.name}</span>}
                                </CardItem>
                            )}
                            {data?.link && (
                                <CardItem
                                    translateZ={20}
                                    as="button"
                                    className="rounded-xl bg-gray-50 px-4 py-2 text-xs font-bold text-black dark:bg-white dark:text-black"
                                >
                                    <Link href={data?.link} target='_blank' className="flex items-center gap-2">
                                        <div>
                                            {data.type === 'article' && !data.cta_text &&
                                                'Read Full Article'}
                                            {data.type === 'website' && !data.cta_text &&
                                                'Visit Website'}
                                            {data.type === 'video' && !data.cta_text && 'Watch Video'}
                                            {data.cta_text && data.cta_text}
                                        </div>
                                        <span className="material-symbols-outlined !text-lg">
                                            arrow_right_alt
                                        </span>
                                    </Link>
                                </CardItem>
                            )}
                        </div>
                    </div>
                </CardBody>
            </CardContainer>
        </Dialog>
    );
};
