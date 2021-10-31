import Video from './video.mjs';
import BotConstants from './constants.mjs';

import fs from 'fs';
import { REST } from '@discordjs/rest';
import { Client, Intents } from 'discord.js';

const rest = new REST({version: "9"}).setToken(BotConstants.TOKEN);
const client = new Client({ 
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
 });

function registerCommands(forAppLevel) {
    BotConstants.COMMANDS.forEach(c => {
        if(forAppLevel)
            client.application.commands.create(c);
        else
            client.guilds.cache.get("guildId").commands.create(c);
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
    //registerCommands(false);
    //registerCommands(true);
});

client.login(BotConstants.TOKEN);