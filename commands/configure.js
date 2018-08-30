module.exports = {
    name: 'configure',
    category: "Twitch",
    description: 'Configure the bot for your server. Server Owner only.',
    aliases: ['config'],
    args: false,
    usage: '<setting> <value>',
    permission: 'owner',
    execute(client, message, args) {
        var server = client.servers.find(server => server.name === message.guild.name);
        var twitchChannels = server.twitchChannels;

        if (!args[0]) {
            output = `prefix   ${server.prefix}\nrole     ${server.role}\nchannel  ${server.discordChannels[0]}`
            return message.channel.send(output, { code: "asciidoc" });
        } else if (args[0] == "prefix") {
            if (!args[1]) {
                return message.reply("Please specify an argument");
            } else {
                server.lastPrefix = server.prefix;
                server.prefix = newPrefix;
                return message.reply(`Changed prefix to \`${server.prefix}\``);
            }
        } else if (args[0] == "role") {
            if (!args[1]) {
                return message.reply("Please specify an argument");
            } else {
                server.role = args[1];
                return message.reply(`Changed role to \`${server.role}\``);
            }

        } else if (args[0] == "channel") {
            if (!args[1]) {
                return message.reply("Please specify an argument");
            } else {
                server.discordChannels[0] = args[1];
                return message.reply(`Announcing channel set to \`${args[1]}\``)
            }
        }
    }
};