module.exports = {
    name: 'reload',
    category: "Essentials",
    description: 'Reloads a bot command. Bot Owner only.',
    aliases: [],
    args: true,
    usage: '<command>',
    permission: 'botowner',
    execute(client, message, args) {
        const commandName = args[0];

        if (client.commands.has(commandName)) {
            // command exists
            let command = client.commands.get(commandName);
        } else {
            return message.reply("That command does not seem to exist!");
        }
        delete require.cache[require.resolve(`../commands/${commandName}.js`)]; // removes the code cache.

        // loading in the command..
        command = require(`../commands/${commandName}`);

        client.commands.set(command.name, command);

        message.reply(`Reloaded ${commandName}.`);
    }
};