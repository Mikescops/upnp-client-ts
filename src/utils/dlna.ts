/** Convert flag byte codes to a final flags string */
const toDlnaFlagString = (flags: number) => {
    return 'DLNA.ORG_FLAGS=' + flags.toString(16) + '000000000000000000000000';
};

const flagByteCodes = {
    /** Content source is the clock source during transport */
    DLNA_ORG_FLAG_SENDER_PACED: 1 << 31,
    /** Limited Operation: time-seek supported */
    DLNA_ORG_FLAG_TIME_BASED_SEEK: 1 << 30,
    /** Limited Operation: byte-seek supported */
    DLNA_ORG_FLAG_BYTE_BASED_SEEK: 1 << 29,
    /** Resource supports 'Container Playback' */
    DLNA_ORG_FLAG_PLAY_CONTAINER: 1 << 28,
    /** Content does not have a fixed beginning */
    DLNA_ORG_FLAG_S0_INCREASE: 1 << 27,
    /** Content does not have a fixed end */
    DLNA_ORG_FLAG_SN_INCREASE: 1 << 26,
    /** RTSP resource supports pausing of media transfer */
    DLNA_ORG_FLAG_RTSP_PAUSE: 1 << 25,
    /** Streaming transfer mode supported */
    DLNA_ORG_FLAG_STREAMING_TRANSFER_MODE: 1 << 24,
    /** Interactive transfer mode supported */
    DLNA_ORG_FLAG_INTERACTIVE_TRANSFERT_MODE: 1 << 23,
    /** Background transfer mode supported */
    DLNA_ORG_FLAG_BACKGROUND_TRANSFERT_MODE: 1 << 22,
    /** No content transfer when paused */
    DLNA_ORG_FLAG_CONNECTION_STALL: 1 << 21,
    /** DLNAv1.5 version flag  */
    DLNA_ORG_FLAG_DLNA_V15: 1 << 20
};

const defaultFlags = {
    DLNA_STREAMING_BYTE_BASED_FLAGS: toDlnaFlagString(
        flagByteCodes.DLNA_ORG_FLAG_DLNA_V15 |
            flagByteCodes.DLNA_ORG_FLAG_BYTE_BASED_SEEK |
            flagByteCodes.DLNA_ORG_FLAG_BACKGROUND_TRANSFERT_MODE |
            flagByteCodes.DLNA_ORG_FLAG_STREAMING_TRANSFER_MODE
    ),
    DLNA_STREAMING_TIME_BASED_FLAGS: toDlnaFlagString(
        flagByteCodes.DLNA_ORG_FLAG_DLNA_V15 |
            flagByteCodes.DLNA_ORG_FLAG_TIME_BASED_SEEK |
            flagByteCodes.DLNA_ORG_FLAG_BACKGROUND_TRANSFERT_MODE |
            flagByteCodes.DLNA_ORG_FLAG_STREAMING_TRANSFER_MODE
    ),
    DLNA_ORIGIN_FLAGS: toDlnaFlagString(
        flagByteCodes.DLNA_ORG_FLAG_DLNA_V15 |
            flagByteCodes.DLNA_ORG_FLAG_CONNECTION_STALL |
            flagByteCodes.DLNA_ORG_FLAG_INTERACTIVE_TRANSFERT_MODE
    )
};

type SeekMode = 'none' | 'time' | 'range' | 'both';

const getDlnaSeekModeFeature = (seekMode: SeekMode) => {
    let feature = 'DLNA.ORG_OP=';

    switch (seekMode) {
        case 'none':
        default:
            feature += '00';
            break;
        case 'range':
            feature += '01';
            break;
        case 'time':
            feature += '10';
            break;
        case 'both':
            feature += '11';
            break;
    }

    return feature;
};

const getDlnaTranscodeFeature = (transcodeEnabled: boolean) => {
    return 'DLNA.ORG_CI=' + (transcodeEnabled ? '1' : '0');
};

export const dlnaHelpers = {
    defaultFlags,
    flagByteCodes,
    getDlnaSeekModeFeature,
    getDlnaTranscodeFeature,
    toDlnaFlagString
};
