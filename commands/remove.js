const { logger } = require('../logger.js');

module.exports = {
    name: 'remove',
    category: "Twitch",
    description: 'Remove Twitch channel from broadcast list.',
    aliases: ['r','del'],
    args: true,
    usage: '<TwitchChannel>',
    permission: "admin", // not used yet, 
    execute(client, message, args) {
        const streamer = args[0];
        var server = client.servers.find(server => server.name === message.guild.name);
        var twitchChannels = server.twitchChannels;
        const twitchMember = twitchChannels.find(channel => channel.name.toLowerCase() === streamer.toLowerCase());

        if (twitchMember) {
            if(twitchMember.messageid) {
                try {
                    const guild = client.guilds.find(guild => guild.name === server.name);
                    const discordChannel = guild.channels.find(discordChannel => discordChannel.name === server.discordChannels[0]);
                    // const discordEmbed = createEmbed(server, twitchChannel, res);
        
                    discordChannel.fetchMessage(twitchChannel.messageid).then(
                        message => message.delete().then((message) => {
                            twitchChannel.messageid = null
                        })
                    );
                    twitchChannel.online = false;
                } catch (err) {
                    logger.error(`Error in remove command delete msg: ${err}`);
                }
            }
            server.twitchChannels = twitchChannels.filter(channel => channel.name !== twitchMember.name)
            message.reply("Removed " + streamer + ".");
            logger.info(`[${server.name}] Removed Twitch Channel: ${streamer}`);
        } else {
            message.reply(streamer + " isn't in the list.");
        }

    },
};