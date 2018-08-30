const { logger } = require('../logger.js');

module.exports = {
    name: 'add',
    category: "Twitch",
    description: 'Add Twitch channel from broadcast list.',
    aliases: ['a'],
    args: true,
    usage: '<TwitchChannel>',
    permission: 'admin',
    execute(client, message, args) {
        const streamer = args[0];
        var server = client.servers.find(server => server.name === message.guild.name);
        var twitchChannels = server.twitchChannels;
        var twitchMember = twitchChannels.find(channel => channel.name === streamer);

        if (twitchMember)
            return message.reply(streamer + " is already in the list.");

        client.twitchapi.users.usersByName({ users: streamer }, (err, res) => {
            if (err)
                logger.error(err);
            if (!res)
                return message.reply("API error finding user, rate limited: " + streamer)

            if (res.users.length > 0) {
                twitchChannels.push({
                    name: streamer, timestamp: 0,
                    online: false
                });
                logger.info(`[${server.name}] Added Twitch Channel: ${streamer}`);
                message.reply("Added " + streamer + ".");
                //tick();
            } else {
                message.reply(streamer + " doesn't seem to exist.");
            }
        });

    }
};