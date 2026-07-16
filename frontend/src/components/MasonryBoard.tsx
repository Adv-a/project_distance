import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

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

import {
    Post,
    PostMedia,
    Thread,
} from "../type/objects";

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

type MediaDimensions = {
    width: number;
    height: number;
};

const GAP = 16;
const MIN_CARD_WIDTH = 260;
const MAX_CARD_WIDTH = 330;

function getColumnCount(width: number): number {
    const usableWidth = Math.max(width - 32, MIN_CARD_WIDTH);

    const count = Math.floor(
        (usableWidth + GAP) / (MIN_CARD_WIDTH + GAP)
    );

    return Math.max(1, Math.min(count, 5));
}

function getColumnWidth(width: number, columnCount: number): number {
    const usableWidth = Math.max(width - 32, MIN_CARD_WIDTH);

    const rawWidth =
        (usableWidth - GAP * (columnCount - 1)) / columnCount;

    return Math.max(
        MIN_CARD_WIDTH,
        Math.min(rawWidth, MAX_CARD_WIDTH)
    );
}

function formatDate(
    value: Date | string | null | undefined
): string {
    if (!value) {
        return "";
    }

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

function getMediaUrl(
    value: string | null | undefined
): string {
    if (!value) {
        return "";
    }

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }

    const cleanValue = value.startsWith("/")
        ? value
        : `/${value}`;

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
                    type:
                        media.media_type === "video"
                            ? "video"
                            : "image",
                } satisfies DisplayMedia;
            })
            .filter(
                (media): media is DisplayMedia => media !== null
            );
    }

    const fallbackMedia: DisplayMedia[] = [];

    const imageUrl = getMediaUrl(post.image_content);
    const videoUrl = getMediaUrl(post.video_content);

    if (imageUrl) {
        fallbackMedia.push({
            id: `legacy-image-${post.id}`,
            uri: imageUrl,
            type: "image",
        });
    }

    if (videoUrl) {
        fallbackMedia.push({
            id: `legacy-video-${post.id}`,
            uri: videoUrl,
            type: "video",
        });
    }

    return fallbackMedia;
}

function estimatePostHeight(post: Post): number {
    const messageLength = String(post.message ?? "").length;

    const tagCount = Array.isArray(post.tags)
        ? post.tags.length
        : 0;

    const mediaCount = buildDisplayMedia(post).length;

    let height = 150;

    height += Math.min(messageLength * 0.35, 160);
    height += tagCount * 8;

    if (mediaCount > 0) {
        height += 320;
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

function getSafeMediaSize(
    containerWidth: number,
    mediaWidth: number,
    mediaHeight: number
): { width: number; height: number } {
    if (
        containerWidth <= 0 ||
        mediaWidth <= 0 ||
        mediaHeight <= 0
    ) {
        return {
            width: containerWidth,
            height: 260,
        };
    }

    const ratio = mediaWidth / mediaHeight;

    const maxHeight =
        containerWidth < 500
            ? Math.min(containerWidth * 1.55, 620)
            : Math.min(containerWidth * 1.4, 700);

    let width = containerWidth;
    let height = containerWidth / ratio;

    if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
    }

    return {
        width: Math.max(120, width),
        height: Math.max(120, height),
    };
}

type AutoImageProps = {
    uri: string;
    width: number;
    height: number;
};

function AutoImage({
    uri,
    width,
    height,
}: AutoImageProps) {
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
    height: number;
};

function PostVideo({
    uri,
    width,
    height,
}: PostVideoProps) {
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
                    height,
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
    const [mediaDimensions, setMediaDimensions] = useState<
        Record<number, MediaDimensions>
    >({});

    function handleLayout(event: LayoutChangeEvent) {
        const nextWidth = event.nativeEvent.layout.width;

        if (nextWidth > 0 && Math.abs(nextWidth - containerWidth) > 1) {
            setContainerWidth(nextWidth);
        }
    }

    function updateMediaDimensions(
        index: number,
        width: number,
        height: number
    ) {
        setMediaDimensions((currentDimensions) => {
            const current = currentDimensions[index];

            if (
                current &&
                current.width === width &&
                current.height === height
            ) {
                return currentDimensions;
            }

            return {
                ...currentDimensions,
                [index]: {
                    width,
                    height,
                },
            };
        });
    }

    function getCurrentHeight(): number {
        const dimensions = mediaDimensions[activeIndex];

        if (!dimensions) {
            return Math.min(containerWidth * 0.75, 420);
        }

        return getSafeMediaSize(
            containerWidth,
            dimensions.width,
            dimensions.height
        ).height;
    }

    function updateActiveIndexFromOffset(offsetX: number) {
        if (containerWidth <= 0 || media.length === 0) {
            return;
        }

        const nextIndex = Math.round(offsetX / containerWidth);

        const safeIndex = Math.max(
            0,
            Math.min(nextIndex, media.length - 1)
        );

        setActiveIndex((currentIndex) => {
            if (currentIndex === safeIndex) {
                return currentIndex;
            }

            return safeIndex;
        });
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
            y: 0,
            animated: true,
        });
    }

    function handleScroll(
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) {
        updateActiveIndexFromOffset(
            event.nativeEvent.contentOffset.x
        );
    }

    function handleScrollEnd(
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) {
        updateActiveIndexFromOffset(
            event.nativeEvent.contentOffset.x
        );
    }

    useEffect(() => {
        setActiveIndex(0);
        setMediaDimensions({});

        scrollRef.current?.scrollTo({
            x: 0,
            y: 0,
            animated: false,
        });
    }, [media]);

    useEffect(() => {
        if (containerWidth <= 0 || media.length === 0) {
            return;
        }

        media.forEach((item, index) => {
            if (item.type === "video") {
                updateMediaDimensions(index, 16, 9);
                return;
            }

            Image.getSize(
                item.uri,
                (imageWidth, imageHeight) => {
                    updateMediaDimensions(
                        index,
                        imageWidth,
                        imageHeight
                    );
                },
                () => {
                    updateMediaDimensions(index, 4, 3);
                }
            );
        });
    }, [containerWidth, media]);

    if (media.length === 0) {
        return null;
    }

    const currentHeight = getCurrentHeight();

    return (
        <View
            style={styles.carouselContainer}
            onLayout={handleLayout}
        >
            {containerWidth > 0 ? (
                <View
                    style={[
                        styles.carouselWrapper,
                        {
                            height: currentHeight,
                        },
                    ]}
                >
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        nestedScrollEnabled
                        decelerationRate="fast"
                        disableIntervalMomentum
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        onMomentumScrollEnd={handleScrollEnd}
                        onScrollEndDrag={handleScrollEnd}
                        style={[
                            styles.carousel,
                            {
                                height: currentHeight,
                            },
                        ]}
                        contentContainerStyle={{
                            height: currentHeight,
                            alignItems: "center",
                        }}
                    >
                        {media.map((item, index) => {
                            const itemDimensions = mediaDimensions[index];

                            let itemWidth = containerWidth;
                            let itemHeight = currentHeight;

                            if (itemDimensions) {
                                const safeSize = getSafeMediaSize(
                                    containerWidth,
                                    itemDimensions.width,
                                    itemDimensions.height
                                );

                                itemWidth = safeSize.width;
                                itemHeight = safeSize.height;
                            }

                            return (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.carouselSlide,
                                        {
                                            width: containerWidth,
                                            height: currentHeight,
                                        },
                                    ]}
                                >
                                    {item.type === "video" ? (
                                        <PostVideo
                                            uri={item.uri}
                                            width={itemWidth}
                                            height={itemHeight}
                                        />
                                    ) : (
                                        <AutoImage
                                            uri={item.uri}
                                            width={itemWidth}
                                            height={itemHeight}
                                        />
                                    )}
                                </View>
                            );
                        })}
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
                                onPress={() =>
                                    goToIndex(activeIndex - 1)
                                }
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
                                onPress={() =>
                                    goToIndex(activeIndex + 1)
                                }
                                disabled={
                                    activeIndex === media.length - 1
                                }
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
                                    index === activeIndex &&
                                        styles.dotActive,
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

function PostCard({
    item,
    onEditPost,
}: PostCardProps) {
    const { post, threadName } = item;

    const media = buildDisplayMedia(post);
    const displayedDate = formatDate(post.posted);
    const avatarUrl = getMediaUrl(post.sender?.profilPicture);

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerText}>
                    <Text
                        style={styles.threadName}
                        numberOfLines={1}
                    >
                        {String(threadName ?? "Thread")}
                    </Text>

                    <Text
                        style={styles.author}
                        numberOfLines={1}
                    >
                        {String(
                            post.sender?.username ?? "Utilisateur"
                        )}
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    {post.can_edit && onEditPost ? (
                        <Pressable
                            style={styles.editButton}
                            onPress={() => onEditPost(post)}
                        >
                            <Text style={styles.editButtonText}>
                                Modifier
                            </Text>
                        </Pressable>
                    ) : null}

                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                            resizeMode="cover"
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

export function MasonryBoard({
    threads,
    onEditPost,
}: Props) {
    const { width } = useWindowDimensions();

    const columnCount = getColumnCount(width);
    const columnWidth = getColumnWidth(width, columnCount);

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
                    Aucun post ne correspond à ce thread ou à ces tags.
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
                        style={[
                            styles.column,
                            {
                                width: columnWidth,
                            },
                        ]}
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
        justifyContent: "center",
        gap: GAP,
    },

    column: {
        gap: GAP,
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

        elevation: 3,
    },

    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 13,
    },

    headerText: {
        flex: 1,
        minWidth: 0,
        paddingRight: 10,
    },

    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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

    editButton: {
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: "#FFF7ED",
    },

    editButtonText: {
        color: "#E76F51",
        fontSize: 12,
        fontWeight: "800",
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

    carouselWrapper: {
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 17,
        backgroundColor: "transparent",
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
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 5,
        paddingRight: 12,
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
        zIndex: 10,
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
});