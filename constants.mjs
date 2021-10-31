export const MAX_OUTPUT_SIZE = 7.8 * 8192;     //max size of the file in kilobits
export const START_OFFSET = -5;     //start downloading START_OFFSET seconds earlier to catch key frames
export const TOKEN = process.env.TREMBED_TOKEN;
export const MAX_VIDEO_DURATION = 300;     //maximum video duration in seconds

export default {MAX_OUTPUT_SIZE, START_OFFSET, TOKEN, MAX_VIDEO_DURATION}