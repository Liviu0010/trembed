import Constants from './constants.mjs';

import yt from '@alpacamybags118/yt-dlp-exec';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

export default {convertToSeconds, getFrameSafeTime, downloadVideo, trimProperly, fitSize}

export function convertToSeconds(time){
    let sec = 0;
    time = time.split(":");

    for(let i = time.length-1; i >= 0; i--)
        sec += parseFloat(time[i]) * 60**(time.length-1-i);

    return sec;
}

export function getFrameSafeTime(start) {
    let time = convertToSeconds + Constants.START_OFFSET;
    return time >= 0 ? time : 0;
}

export async function downloadVideo(url, start, end) { 
    return new Promise((resolve, reject) => {
        const fileName = (new Date()).getTime() + ".mp4";
        const res = yt.createYtDlpAsProcess(url, {
            f: "best[protocol!*=dash][height<=360]",
            output: fileName,
            externalDownloader: "ffmpeg",
            externalDownloaderArgs: `-ss ${start-0.1} -to ${end}`
        });
    
        res.on("exit", () => {
            resolve(fileName);
        });

        res.on("error", reject);
    });
}

//since we downloaded START_OFFSET seconds in advance in order to catch the key frame
//we now need to trim the video properly
export async function trimProperly(fileName, trueStart) {
    return new Promise((resolve, reject) => {
        ffmpeg(fileName)
            .setStartTime(trueStart)
            .audioCodec("libvorbis")
            .videoCodec("libx264")
            .output(fileName+"_conv.mp4")
            .on('end', () => {
                fs.renameSync(fileName + "_conv.mp4", fileName);
                resolve();
            })
            .on("error", reject)
            .run();
    });
}

export async function fitSize(fileName) {
    return new Promise((resolve, reject) => {
        let fileSize = fs.statSync(fileName).size / 1024 * 8;

        console.log(`MAX_SIZE = ${Constants.MAX_OUTPUT_SIZE}`);
        console.log(`size = ${fileSize} kilobits`);

        if(fileSize <= Constants.MAX_OUTPUT_SIZE)
            resolve();
        else {
            ffmpeg(fileName)
                .ffprobe((err, data) => {
                    let audioBitrate, duration;

                    data.streams.forEach(stream => {
                        duration = stream.duration;
                        if(stream.codec_type == "audio")
                            audioBitrate = stream.bit_rate / 1000;
                    });

                    let maxVideoBitrate = (Constants.MAX_OUTPUT_SIZE - (audioBitrate * duration))/duration;

                    //trying to lower audio bitrate if there's not enough space for video bitrate
                    while(maxVideoBitrate < 100 && audioBitrate >= 48) {
                        audioBitrate--;
                        maxVideoBitrate = (Constants.MAX_OUTPUT_SIZE - (audioBitrate * duration))/duration;
                    }

                    if(maxVideoBitrate < 100)
                    {
                        reject("Cannot convert video to desired bitrate!");
                    }
                    else
                        ffmpeg(fileName)
                            .output(fileName + "_conv.mp4")
                            .audioCodec("libvorbis")
                            .audioBitrate(Math.floor(audioBitrate)+"k")
                            .videoCodec("libx264")
                            .videoBitrate(Math.floor(maxVideoBitrate)+"k")
                            .on("end", () => {
                                fs.renameSync(fileName + "_conv.mp4", fileName);
                                resolve();
                            })
                            .on("error", reject)
                            .run();

                    console.log(`audio bitrate = ${audioBitrate}kbps`);
                    console.log(`duration = ${duration}`);
                    console.log(`maxVideoBitrate = ${maxVideoBitrate}`);

                });
        }
    });
}