const MAX_OUTPUT_SIZE = 7.8 * 8192;     //max size of the file in kilobits
const START_OFFSET = -5;     //start downloading START_OFFSET seconds earlier to catch key frames
const token = process.env.TREMBED_TOKEN;
const MAX_VIDEO_DURATION = 300;     //maximum video duration in seconds

const yt = require("@alpacamybags118/yt-dlp-exec");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { Client, Intents, Constants, MessageAttachment } = require("discord.js");
const rest = new REST({version: "9"}).setToken(token);
const client = new Client({ 
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
 });

 const command = {
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
     };

function convertToSeconds(time){
    let sec = 0;
    time = time.split(":");

    for(let i = time.length-1; i >= 0; i--)
        sec += parseFloat(time[i]) * 60**(time.length-1-i);

    return sec;
}

function getFrameSafeTime(start) {
    let time = convertToSeconds + START_OFFSET;
    return time >= 0 ? time : 0;
}

async function downloadVideo(url, start, end) { 
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
async function trimProperly(fileName, trueStart) {
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

async function fitSize(fileName) {
    return new Promise((resolve, reject) => {
        let fileSize = fs.statSync(fileName).size / 1024 * 8;

        console.log(`MAX_SIZE = ${MAX_OUTPUT_SIZE}`);
        console.log(`size = ${fileSize} kilobits`);

        if(fileSize <= MAX_OUTPUT_SIZE)
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

                    let maxVideoBitrate = (MAX_OUTPUT_SIZE - (audioBitrate * duration))/duration;

                    //trying to lower audio bitrate if there's not enough space for video bitrate
                    while(maxVideoBitrate < 100 && audioBitrate >= 48) {
                        audioBitrate--;
                        maxVideoBitrate = (MAX_OUTPUT_SIZE - (audioBitrate * duration))/duration;
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

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
  
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
  
    if (interaction.commandName == 'embed') {
        let url = interaction.options.getString("url");
        let start = interaction.options.getString("start");
        let end = interaction.options.getString("end");

        await interaction.deferReply(); //waiting for video to be processed

        if(convertToSeconds(end) - convertToSeconds(start) > MAX_VIDEO_DURATION) {
            interaction.editReply(`Select a shorter duration (maximum is ${MAX_VIDEO_DURATION}s)`);
            return;
        }

        try{
            let earlyStart = getFrameSafeTime(start);
            let trueStart = convertToSeconds(start);
            let fileName = await downloadVideo(url, earlyStart, end);

            if(trueStart != earlyStart)
                await trimProperly(fileName, trueStart);

            await fitSize(fileName);

            interaction.editReply({
                content: `<${url}> from ${start} to ${end}`,
                files: [{
                    attachment: fileName
                }]
            })
            .then(() => fs.unlinkSync(fileName));
        }
        catch(exception) {
			console.log(exception);
            try{
                fs.unlinkSync(fileName);
            }
            catch(ex){}
            interaction.editReply("Cannot embed video. Try making it shorter.");
        }
    }
});

client.on("ready", () => {
    //client.guilds.cache.get("guildId").commands.create(command);
    //client.application.commands.create(command);
});

client.login(token);