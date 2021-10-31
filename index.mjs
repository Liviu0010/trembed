import Video from './video.mjs';
import BotConstants from './constants.mjs';
/*
const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { Client, Intents, Constants, MessageAttachment } = require("discord.js");
*/

import fs from 'fs';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Client, Intents, Constants } from 'discord.js';

const rest = new REST({version: "9"}).setToken(BotConstants.TOKEN);
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

        if(Video.convertToSeconds(end) - Video.convertToSeconds(start) > BotConstants.MAX_VIDEO_DURATION) {
            interaction.editReply(`Select a shorter duration (maximum is ${BotConstants.MAX_VIDEO_DURATION}s)`);
            return;
        }

        if(Video.convertToSeconds(end) <= Video.convertToSeconds(start))
        {
            interaction.editReply("Select a valid time range.");
            return;
        }

        try{
            let earlyStart = Video.getFrameSafeTime(start);
            let trueStart = Video.convertToSeconds(start);
            let fileName = await Video.downloadVideo(url, earlyStart, end);

            if(trueStart != earlyStart)
                await Video.trimProperly(fileName, trueStart);

            await Video.fitSize(fileName);

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
            interaction.editReply("Cannot embed video. Perhaps make it shorter.");
        }
    }
});

client.on("ready", () => {
    //client.guilds.cache.get("guildId").commands.create(command);
    //client.application.commands.create(command);
});

client.login(BotConstants.TOKEN);