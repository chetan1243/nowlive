const { logger } = require('./logger.js');

const
    fs = require('fs'),
    Discord = require('discord.js'),
    client = new Discord.Client(),
    commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')),
    channelPath = __dirname + "/channels.json",
    timeout = 4 * 60 * 1000,
    { fancyTimeFormat } = require('./utils.js');

try {
    var { discordtoken, twitchtoken } = require('./config/config.json');
} catch (e) {
    var discordtoken = process.env.discordtoken;
    var twitchtoken = process.env.twitchtoken;
}

client.twitchapi = require('twitch-api-v5');
// var moment = require('moment');
client.twitchapi.clientID = twitchtoken;
//client.twitchapi.debug = true;
client.commands = new Discord.Collection();

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    // set a new item in the Collection
    // with the key as the command name and the value as the exported module
    client.commands.set(command.name, command);
}


client.on('ready', () => {
    logger.info("Logged in to Discord");
    logger.info("Reading file: " + channelPath);
    var file = fs.readFileSync(channelPath, { encoding: "utf-8" });
    client.servers = JSON.parse(file);
    client.user.setActivity('with knives 🔪🧀', { type: 'PLAYING' });

    // Tick twice at startup for weird bug reason
    tick();
    //setTimeout(tick, 10000);
    setInterval(tick, timeout);
});

client.on('message', message => {
    if(!message.guild || !message.guild.available) return; // Stop if message is DM or server is offline

    let index = indexOfObjectByName(client.servers, message.guild.name);
    var server = client.servers[index];

    if(message.type === "PINS_ADD") return message.delete(); // Delete 'user' pinned a message' message
    if (!message.content.startsWith(server.prefix) || message.author.bot) return; // Stop if message does not start with command prefix

    const args = message.content.slice(server.prefix.length).split(/ +/); // remove command prefix from message
    const commandName = args.shift().toLowerCase(); // extract command used from message

    if (index == -1) { // if server not already included in channels.json
        client.servers.push({
            name: message.guild.name,
            lastPrefix: "!", prefix: "~",
            role: "botadmin", discordChannel: [],
            twitchChannels: []
        });
        index = client.servers.length - 1;
    }

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // find the command used

    if (!command) return;

    let permissions = ['user'];

    if (message.member.roles.some(val => server.role === val)) { // if bot owner, give admin role
        permissions.push('admin');
    }

    if (message.guild.owner == message.member) { // if server owner, give admin and owner role
        permissions.push('admin');
        permissions.push('owner');
    }

    if (message.member.id == "140209881280937984") { // if CheeseLiker, give all permissions
        permissions.push('admin');
        permissions.push('owner');
        permissions.push('botowner');
    }

    if (command.permission && !(permissions.indexOf(command.permission) > -1)) { // user does not have command permisions
        // user not allowed...
        message.reply(`You do not have the required permission \`${command.permission}\` to run this command.`);
        return;
    }

    if (command.args && !args.length) { // if needed arguments not provided
        let reply = `You didn't provide any arguments, ${message.author}!`;
        if (command.usage) {
            reply += `\nThe proper usage would be: \`${server.prefix}${command.name} ${command.usage}\``;
        }
        return message.channel.send(reply);
    }

    try { // Run the command
        command.execute(client, message, args);
    }
    catch (error) {
        logger.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});

client.on("guildMemberAdd", member => {
    member.addRole(['476662770209783808','484332514110996490']) // Add roles to user on join
        .then(() => logger.info("Added Roles to New User: " + member.name))
        .catch((e) => logger.error("Add Roles Error: " + e));
});

function indexOfObjectByName(array, value) { 
    // Helper to get Object's Index in an array using it's name
    for (let i = 0; i < array.length; i++) {
        if (array[i].name.toLowerCase().trim() === value.toLowerCase().trim()) {
            return i;
        }
    }
    return -1;
}

function tick() {
    // Get Twitch Channel info from API every tick
    client.servers.forEach((server) => {
        try {
            client.twitchapi.users.usersByName({ users: server.twitchChannels.map(x => x.name) }, getChannelInfo.bind(this, server))
        } catch (err) {
            logger.error(`Error in tick: ${err}`);
        }
    });
    savechannels();
    logger.info("Tick happened!")
}

function getChannelInfo(server, err, res) {
    // Handle the Twitch API response for each Twitch Channel
    if (!res) return;
    if (err) logger.error(`Error in getChannelInfo: ${err}`);

    res.users.forEach((user) => {
        channelID = user._id;
        twitchChannel = server.twitchChannels.find(name => name.name.toLowerCase() === user.name.toLowerCase())
        client.twitchapi.streams.channel({ channelID: user._id }, postDiscord.bind(this, server, twitchChannel));
    })
}

function createEmbed(server, twitchChannel, res) {
    // Create the embed code
    var startDate = Date.parse(res.stream.created_at);
    var endDate = Date.now();
    var uptime = endDate - startDate;
    twitchChannel.uptime = uptime;
    var embed = new Discord.RichEmbed()
        .setColor("#6441A5")
        .setTitle(res.stream.channel.display_name)
        .setURL(res.stream.channel.url)
        .setDescription("**" + res.stream.channel.status +
            "**\n" + res.stream.game)
        //.setImage(res.stream.preview.large)
        .setThumbnail(res.stream.channel.logo)
        .addField("Viewers", res.stream.viewers, true)
        .addField("Uptime", fancyTimeFormat(twitchChannel.uptime), true);
    return embed;
}


function postDiscord(server, twitchChannel, err, res) {
    // Check if Twitch Channel is Live and Make/Update the Live announcement in Discord
    if (!res) return;
    if (err) logger.error(`Error in postDiscord: ${err}`);
    if (server.discordChannels.length == 0) return; // stop if no Discord Channel set to post in

    if (res.stream != null && twitchChannel.messageid == null) {
        // Do new Discord message code
        try {
            const guild = client.guilds.find(guild => guild.name === server.name);
            const discordChannel = guild.channels.find(discordChannel => discordChannel.name === server.discordChannels[0]);
            const discordEmbed = createEmbed(server, twitchChannel, res);
            const discordPing = res.stream.channel.display_name + " is <@&484332514110996490>!" // message with @mention used before embed

            discordChannel.send(discordPing, { embed: discordEmbed }).then( // send the Discord Live Message
                (message) => {
                    logger.info(`[${server.name}/${discordChannel.name}] Now Live: ${twitchChannel.name}`)
                    twitchChannel.messageid = message.id
                }
            );
            twitchChannel.online = true;
            twitchChannel.timestamp = Date.now();
        }
        catch (err) {
            logger.error(`Error in postDiscord new msg: ${err}`);
        }
    } else if (res.stream != null && twitchChannel.messageid != null) {
        // Do edit Discord message code
        try {
            const guild = client.guilds.find(guild => guild.name === server.name);
            const discordChannel = guild.channels.find(discordChannel => discordChannel.name === server.discordChannels[0]);
            const discordEmbed = createEmbed(server, twitchChannel, res);
            const discordLive = res.stream.channel.display_name + " is <@&484332514110996490>!"

            discordChannel.fetchMessage(twitchChannel.messageid).then( // edit/update the message
                message => message.edit(discordLive, { embed: discordEmbed }).then((message) => {
                    logger.info(`[${server.name}/${discordChannel.name}] Channel Update: ${twitchChannel.name}`)
                    twitchChannel.messageid = message.id
                })
            );
            twitchChannel.online = true;
            twitchChannel.timestamp = Date.now();
        } catch (err) {
            logger.error(`Error in postDiscord edit msg: ${err}`);
        }
    } else if (res.stream == null && twitchChannel.messageid != null) {
        // Do delete Discord message code
        try {
            const guild = client.guilds.find(guild => guild.name === server.name);
            const discordChannel = guild.channels.find(discordChannel => discordChannel.name === server.discordChannels[0]);

            discordChannel.fetchMessage(twitchChannel.messageid).then( // delete the message once offline
                message => message.delete().then((message) => {
                    logger.info(`[${server.name}/${discordChannel.name}] Channel Offline: ${twitchChannel.name}`)
                    twitchChannel.messageid = null
                })
            );
            twitchChannel.online = false;
        } catch (err) {
            logger.error(`Error in postDiscord delete msg: ${err}`);
        }
    }
}

function savechannels() {
    // Save Discord / Twitch Channel Information (client.servers) to channels.json
    logger.info("Saving channels to " + channelPath);
    fs.writeFileSync(channelPath, JSON.stringify(client.servers, null, 4));
    logger.info("Done");
}

function exitHandler(opt, err) {
    if (err) {
        logger.error(`Error in exitHandler: ${err}`);
    }
    if (opt.save) {
        savechannels();
    }
    if (opt.exit) {
        process.exit();
    }
}

process.on("exit", exitHandler.bind(null, { save: true }));
process.on("SIGINT", exitHandler.bind(null, { exit: true }));
process.on("SIGTERM", exitHandler.bind(null, { exit: true }));
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));

try { // Login to discord client
    client.login(discordtoken)
} catch (err) {
    logger.error(`Error in Discord login: ${err}`);
}
