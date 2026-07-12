import { StyleSheet } from "react-native";
import {
    useVideoPlayer,
    VideoView,
} from "expo-video";

type Props = {
    uri: string;
};

export function PostVideo({ uri }: Props) {
    const player = useVideoPlayer(uri);

    return (
        <VideoView
            player={player}
            style={styles.video}
            nativeControls
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
        />
    );
}

const styles = StyleSheet.create({
    video: {
        width: "100%",
        height: 260,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: "#000000",
    },
});