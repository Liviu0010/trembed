import { Constants } from 'discord.js';

export const MAX_OUTPUT_SIZE = 7.8 * 8192;     //max size of the file in kilobits
export const START_OFFSET = -5;     //start downloading START_OFFSET seconds earlier to catch key frames
export const TOKEN = process.env.TREMBED_TOKEN;
export const MAX_VIDEO_DURATION = 300;     //maximum video duration in seconds

export const COMMANDS = [
    {
        name: "embed",
        description: "Embeds a video on discord.",
        options: [
            {
                name: "url",
                description: "The link to the video.",
                required: true,
                type: Constants.ApplicationCommandOptionTypes.STRING
            },
            {
               name: "start",
               description: "Start time. Can be in seconds or hh:mm:ss.",
               required: true,
               type: Constants.ApplicationCommandOptionTypes.STRING
           },
           {
               name: "end",
               description: "End time. Can be in seconds or hh:mm:ss.",
               required: true,
               type: Constants.ApplicationCommandOptionTypes.STRING
           }
        ]
    }
];

export default {MAX_OUTPUT_SIZE, START_OFFSET, TOKEN, MAX_VIDEO_DURATION, COMMANDS}