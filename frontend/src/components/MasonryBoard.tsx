import { useMemo, useRef, useState } from "react";
import {
    Image,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import {
    useVideoPlayer,
    VideoView,
} from "expo-video";

import { Post, PostMedia, Thread } from "../type/objects";

type Props = {
    threads: Thread[];
    onEditPost?: (post: Post) => void;
};

type BoardItem = {
    key: string;
    threadId: number;
    threadName: string;
    post: Post;
};

type MasonryColumn = {
    items: BoardItem[];
    estimatedHeight: number;
};

type DisplayMedia = {
    id: string;
    uri: string;
    type: "image" | "video";
};

function getColumnCount(width: number): number {
    if (width < 650) return 1;
    if (width < 950) return 2;
    if (width < 1250) return 3;
    return 4;
}

function formatDate(value: Date | string | null | undefined): string {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function getMediaUrl(value: string | null | undefined): string {
    if (!value) return "";

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }

    const cleanValue = value.startsWith("/") ? value : `/${value}`;

    if (typeof window !== "undefined") {
        return `${window.location.origin}${cleanValue}`;
    }

    const backendUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
    return `${backendUrl}${cleanValue}`;
}

function buildDisplayMedia(post: Post): DisplayMedia[] {
    const mediaList: PostMedia[] = Array.isArray(post.media)
        ? post.media
        : [];

    if (mediaList.length > 0) {
        return mediaList
            .map((media, index) => {
                const uri = getMediaUrl(media.file);

                if (!uri) {
                    return null;
                }

                return {
                    id: `${media.id}-${index}`,
                    uri,
                    type: media.media_type === "video" ? "video" : "image",
                } satisfies DisplayMedia;
            })
            .filter(Boolean) as DisplayMedia[];
    }

    const fallbackMedia: DisplayMedia[] = [];

    const imageUrl = getMediaUrl(post.image_content);
    const videoUrl = getMediaUrl(post.video_content);

    if (imageUrl) {
        fallbackMedia.push({
            id: "legacy-image",
            uri: imageUrl,
            type: "image",
        });
    }

    if (videoUrl) {
        fallbackMedia.push({
            id: "legacy-video",
            uri: videoUrl,
            type: "video",
        });
    }

    return fallbackMedia;
}

function estimatePostHeight(post: Post): number {
    const messageLength = String(post.message ?? "").length;
    const tagCount = Array.isArray(post.tags) ? post.tags.length : 0;
    const mediaCount = buildDisplayMedia(post).length;

    let height = 165;

    height += Math.min(messageLength * 0.3, 150);
    height += tagCount * 8;

    if (mediaCount > 0) {
        height += 330;
    }

    if (post.posted) {
        height += 25;
    }

    return height;
}

function buildColumns(
    items: BoardItem[],
    columnCount: number
): MasonryColumn[] {
    const columns: MasonryColumn[] = Array.from(
        { length: columnCount },
        () => ({
            items: [],
            estimatedHeight: 0,
        })
    );

    items.forEach((item) => {
        let targetColumn = columns[0];

        for (const column of columns) {
            if (column.estimatedHeight < targetColumn.estimatedHeight) {
                targetColumn = column;
            }
        }

        targetColumn.items.push(item);
        targetColumn.estimatedHeight += estimatePostHeight(item.post);
    });

    return columns;
}

type AutoImageProps = {
    uri: string;
    width: number;
};

function AutoImage({ uri, width }: AutoImageProps) {
    const [height, setHeight] = useState<number>(260);

    useMemo(() => {
        if (!uri || width <= 0) {
            return;
        }

        Image.getSize(
            uri,
            (imageWidth, imageHeight) => {
                if (!imageWidth || !imageHeight) {
                    return;
                }

                const ratio = imageHeight / imageWidth;
                const computedHeight = width * ratio;

                setHeight(computedHeight);
            },
            () => {
                setHeight(260);
            }
        );
    }, [uri, width]);

    return (
        <Image
            source={{ uri }}
            style={[
                styles.autoImage,
                {
                    width,
                    height,
                },
            ]}
            resizeMode="contain"
        />
    );
}

type PostVideoProps = {
    uri: string;
    width: number;
};

function PostVideo({ uri, width }: PostVideoProps) {
    const player = useVideoPlayer(uri, (videoPlayer) => {
        videoPlayer.loop = false;
    });

    return (
        <VideoView
            player={player}
            style={[
                styles.video,
                {
                    width,
                    height: Math.min(width * 0.75, 420),
                },
            ]}
            nativeControls
            contentFit="contain"
        />
    );
}

type MediaCarouselProps = {
    media: DisplayMedia[];
};

function MediaCarousel({ media }: MediaCarouselProps) {
    const scrollRef = useRef<ScrollView | null>(null);

    const [containerWidth, setContainerWidth] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);

    function handleLayout(event: LayoutChangeEvent) {
        setContainerWidth(event.nativeEvent.layout.width);
    }

    function goToIndex(index: number) {
        if (containerWidth <= 0) {
            return;
        }

        const safeIndex = Math.max(
            0,
            Math.min(index, media.length - 1)
        );

        setActiveIndex(safeIndex);

        scrollRef.current?.scrollTo({
            x: safeIndex * containerWidth,
            animated: true,
        });
    }

    function handleScrollEnd(
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) {
        if (containerWidth <= 0) {
            return;
        }

        const offsetX = event.nativeEvent.contentOffset.x;
        const nextIndex = Math.round(offsetX / containerWidth);

        setActiveIndex(
            Math.max(0, Math.min(nextIndex, media.length - 1))
        );
    }

    if (media.length === 0) {
        return null;
    }

    return (
        <View style={styles.carouselContainer} onLayout={handleLayout}>
            {containerWidth > 0 ? (
                <View style={styles.carouselWrapper}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScrollEnd}
                        scrollEventThrottle={16}
                        style={styles.carousel}
                    >
                        {media.map((item) => (
                            <View
                                key={item.id}
                                style={[
                                    styles.carouselSlide,
                                    {
                                        width: containerWidth,
                                    },
                                ]}
                            >
                                {item.type === "video" ? (
                                    <PostVideo
                                        uri={item.uri}
                                        width={containerWidth}
                                    />
                                ) : (
                                    <AutoImage
                                        uri={item.uri}
                                        width={containerWidth}
                                    />
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {media.length > 1 ? (
                        <>
                            <Pressable
                                style={[
                                    styles.carouselArrow,
                                    styles.carouselArrowLeft,
                                    activeIndex === 0 &&
                                        styles.carouselArrowDisabled,
                                ]}
                                onPress={() => goToIndex(activeIndex - 1)}
                                disabled={activeIndex === 0}
                            >
                                <Text style={styles.carouselArrowText}>
                                    ‹
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.carouselArrow,
                                    styles.carouselArrowRight,
                                    activeIndex === media.length - 1 &&
                                        styles.carouselArrowDisabled,
                                ]}
                                onPress={() => goToIndex(activeIndex + 1)}
                                disabled={activeIndex === media.length - 1}
                            >
                                <Text style={styles.carouselArrowText}>
                                    ›
                                </Text>
                            </Pressable>
                        </>
                    ) : null}
                </View>
            ) : null}

            {media.length > 1 ? (
                <View style={styles.carouselFooter}>
                    <View style={styles.dots}>
                        {media.map((item, index) => (
                            <Pressable
                                key={`${item.id}-dot`}
                                onPress={() => goToIndex(index)}
                                style={[
                                    styles.dot,
                                    index === activeIndex && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>

                    <Text style={styles.counter}>
                        {activeIndex + 1} / {media.length}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

type PostCardProps = {
    item: BoardItem;
    onEditPost?: (post: Post) => void;
};

function PostCard({ item, onEditPost }: PostCardProps) {
    const { post, threadName } = item;

    const media = buildDisplayMedia(post);
    const displayedDate = formatDate(post.posted);

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerText}>
                    <Text
                        style={styles.threadName}
                        numberOfLines={1}
                    >
                        {String(
                            post.sender?.username ?? "Utilisateur"
                        )}
                    </Text>
                </View>
                
                {post.can_edit ? (
                    <Pressable
                        style={styles.editButton}
                        onPress={() => onEditPost?.(post)}
                    >
                        <Text style={styles.editButtonText}>
                            Modifier
                        </Text>
                    </Pressable>
                ) : null}

                {post.sender?.profilPicture ? (
                    <Image
                        source={{
                            uri: getMediaUrl(post.sender.profilPicture),
                        }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarLetter}>
                            {String(
                                post.sender?.username?.[0] ?? "U"
                            ).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            <MediaCarousel media={media} />

            {post.message ? (
                <Text style={styles.message}>
                    {String(post.message)}
                </Text>
            ) : null}

            {displayedDate ? (
                <Text style={styles.posted}>
                    {displayedDate}
                </Text>
            ) : null}

            {Array.isArray(post.tags) && post.tags.length > 0 ? (
                <View style={styles.tags}>
                    {post.tags.map((tag, index) => (
                        <View
                            key={`${String(tag)}-${index}`}
                            style={styles.tag}
                        >
                            <Text style={styles.tagText}>
                                {String(tag)}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export function MasonryBoard({ threads, onEditPost }: Props) {
    const { width } = useWindowDimensions();

    const columnCount = getColumnCount(width);

    const items = useMemo<BoardItem[]>(() => {
        const boardItems: BoardItem[] = [];

        threads.forEach((thread) => {
            const posts = Array.isArray(thread.posts)
                ? thread.posts
                : [];

            posts.forEach((post, index) => {
                boardItems.push({
                    key: `${thread.id}-${post.id || index}`,
                    threadId: thread.id,
                    threadName: String(thread.name ?? "Thread"),
                    post,
                });
            });
        });

        return boardItems;
    }, [threads]);

    const columns = useMemo(
        () => buildColumns(items, columnCount),
        [items, columnCount]
    );

    if (threads.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                    Aucun mood board
                </Text>

                <Text style={styles.emptyText}>
                    Les threads où tu es membre apparaîtront ici.
                </Text>
            </View>
        );
    }

    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                    Aucun post pour l’instant
                </Text>

                <Text style={styles.emptyText}>
                    Ajoute un premier post dans un thread pour démarrer le mood board.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.board}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.columns}>
                {columns.map((column, columnIndex) => (
                    <View
                        key={`column-${columnIndex}`}
                        style={styles.column}
                    >
                        {column.items.map((item) => (
                            <PostCard
                                key={item.key}
                                item={item}
                                onEditPost={onEditPost}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        width: "100%",
    },

    board: {
        width: "100%",
        paddingBottom: 60,
    },

    columns: {
        width: "100%",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 16,
    },

    column: {
        flex: 1,
        minWidth: 0,
        gap: 16,
    },

    card: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 22,
        padding: 16,
        backgroundColor: "#FFFFFF",

        shadowColor: "#000000",
        shadowOpacity: 0.07,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 8,
        },
    },

    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 13,
    },

    headerText: {
        flex: 1,
        paddingRight: 10,
    },

    threadName: {
        color: "#2F241D",
        fontSize: 16,
        fontWeight: "800",
    },

    author: {
        marginTop: 3,
        color: "#8A6F5A",
        fontSize: 13,
    },

    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#FFE8CC",
    },

    avatarFallback: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFE8CC",
    },

    avatarLetter: {
        color: "#E76F51",
        fontWeight: "900",
        fontSize: 17,
    },

    carouselContainer: {
        width: "100%",
        marginBottom: 14,
    },

    carousel: {
        width: "100%",
    },

    carouselSlide: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },

    autoImage: {
        borderRadius: 17,
        backgroundColor: "#F5E7DB",
    },

    video: {
        borderRadius: 17,
        overflow: "hidden",
        backgroundColor: "#000000",
    },

    carouselFooter: {
        marginTop: 9,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    dots: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#F1C6A8",
    },

    dotActive: {
        width: 18,
        backgroundColor: "#E76F51",
    },

    counter: {
        color: "#8A6F5A",
        fontSize: 12,
        fontWeight: "700",
    },

    message: {
        color: "#2F241D",
        fontSize: 15,
        lineHeight: 22,
    },

    posted: {
        marginTop: 10,
        color: "#8A6F5A",
        fontSize: 12,
        fontWeight: "600",
    },

    tags: {
        marginTop: 13,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },

    tag: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#FFE8CC",
    },

    tagText: {
        color: "#B4533D",
        fontSize: 11,
        fontWeight: "800",
    },

    emptyContainer: {
        width: "100%",
        minHeight: 280,
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        backgroundColor: "#FFFFFF",
    },

    emptyTitle: {
        color: "#2F241D",
        fontSize: 22,
        fontWeight: "800",
        textAlign: "center",
    },

    emptyText: {
        maxWidth: 420,
        marginTop: 10,
        color: "#8A6F5A",
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },

    carouselWrapper: {
        width: "100%",
        position: "relative",
    },

    carouselArrow: {
        position: "absolute",
        top: "50%",
        width: 38,
        height: 38,
        marginTop: -19,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(47, 36, 29, 0.72)",
    },

    carouselArrowLeft: {
        left: 8,
    },

    carouselArrowRight: {
        right: 8,
    },

    carouselArrowDisabled: {
        opacity: 0.25,
    },

    carouselArrowText: {
        color: "#FFFFFF",
        fontSize: 34,
        lineHeight: 36,
        fontWeight: "700",
    },

    editButton: {
        marginRight: 8,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#FFF7ED",
        borderWidth: 1,
        borderColor: "#F1C6A8",
    },

    editButtonText: {
        color: "#E76F51",
        fontSize: 12,
        fontWeight: "800",
    },
    });