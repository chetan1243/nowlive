module.exports = {
    name: 'live',
    category: "Roles",
    description: 'Toggle the @Live Role for Live Notifications.',
    aliases: [],
    args: false,
    usage: 'Bot will react with ➕ if it sucessfully added the Role, and ➖ if it successfully removed the role. It will shortly after delete the command message',
    permission: "user", 
    execute(client, message, args) {
        var role = '484332514110996490'
        var member = message.member;
        if(member.roles.has(role)) {
            member.removeRole(role)
                .then(member => {
                    if(!member.roles.has(role)) {
                        message.react('➖');
                        message.delete(10000);
                        console.log(`Removed Role`);
                    } else {
                        message.react('❌');
                    }
                })
                .catch(console.error);
            
        } else {
            member.addRole(role)
                .then(member => {
                    if(member.roles.has(role)) {
                        message.react('➕');
                        message.delete(10000);
                        console.log(`Added Role`);
                    } else {
                        message.react('❌');
                    }
                })
                .catch(console.error);
        }
    }
};