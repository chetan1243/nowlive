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
            server.twitchChannels = twitchChannels.filter(channel => channel.name !== twitchMember.name)
            message.reply("Removed " + streamer + ".");
        } else {
            message.reply(streamer + " isn't in the list.");
        }

    },
};