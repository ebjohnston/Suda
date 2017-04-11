// import dependent modules
const Discord = require("discord.js");
const WarframeWorldState = require("warframe-worldstate-parser");
const Request = require("request");
const ArrayList = require("arraylist");

// initialize imported modules
const bot = new Discord.Client();
var alerts_posted = new ArrayList;
var invasions_posted = new ArrayList;
//const warframeWorld = new WarframeWorldState(json-data);

// configuration settings
const settings = require("./settings.json");
const prefix = settings.command_prefix;
const token = settings.discord_token;

// logging utilities
//const ChatLog = require("./runtime/logger.js").ChatLog;
//const Logger = require("./runtime/logger.js").Logger;

/*
    List of command properties
    -name
    -description
    -usage
    -help
    -admin
    -timeout (in seconds)
    -warframe
    -process (lambda)
*/

var commands = {
    "ping": {
        name: "ping",
        description: "Responds pong, useful for checking if bot is alive.",
        help: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
        usage: "[No parameters]",
        admin: false,
        process: (bot, msg, suffix) => {
            msg.channel.sendMessage("pong");

            if (suffix) {
                msg.channel.sendMessage("Note: ping takes no arguments");
            }
        }
    },
    "praise": {
        name: "praise",
        description: "Praise the sun!",
        help: "Image macro - Solaire praising the sun (Dark Souls)",
        usage: "[No parameters]",
        admin: false,
        process: (bot, msg, suffix) => {
            msg.delete(); // warning: requires "Manage Messages" permission
            msg.channel.sendFile("./images/praise.gif");

            if (suffix) {
                msg.channel.sendMessage("Note: praise takes no arguments");
            }
        }
    },
    "lenny": {
        name: "lenny",
        description: "( ͡° ͜ʖ ͡°)",
        help: "displays the Unicode emoticon ( ͡° ͜ʖ ͡°) in place of the command",
        usage: "[No parameters]",
        admin: false,
        process: (bot, msg, suffix) => {
            msg.delete(); // warning: requires "Manage Messages" permission
            msg.channel.sendMessage("( ° ͜ʖ ͡°)");

            if (suffix) {
                msg.channel.sendMessage("Note: lenny takes no arguments");
            }
        }
    },
    "baro": {
        name: "baro",
        description: "retrieve current info on Void Trader",
        help: "scrapes current worldState.php from warframe and returns Void Trader information",
        usage: "[No parameters]",
        admin: false,
        warframe: true,
        process: (bot, msg, suffix) => {
            Request('http://content.warframe.com/dynamic/worldState.php', (error, response, body) => {
                if (response.statusCode != 200) {
                    msg.channel.sendMessage("An error has occured: webpage not accessible");
                }
                else {
                    var warframe_world = new WarframeWorldState(body);
                    msg.channel.sendMessage("`" + warframe_world.voidTrader.toString() + "`");
                }
            });

            if (suffix) {
                msg.channel.sendMessage("Note: baro takes no arguments");
            }
        }
    }
}

bot.on("ready", () => {
    console.log("I am ready!");

    scrapeWarframe();
});

bot.on("disconnected", () => {
    //Logger.log("error", "Disconnected!");
    process.exit(0); // exit node.js without an error as this is almost always intentional
});

/*
========================
Command interpeter.

This will check if given message will correspond to a command defined in the command variable.
This will work, so long as the bot isn"t overloaded or still busy.
========================
*/

// create an event listener for messages
bot.on("message", msg => {

/*
    // log non-DM messages
    if (settings.log_chat === true && msg.channel.server) {
        var date = new Date();
        var dateString = d.toUTCString();
        ChatLog.log("info", dateString + ": " + msg.channel.server.name + ", " + msg.channel.name + ": " + msg.author.username + " said <" + msg + ">");
    }
*/

    // prevent the bot from "echoing" itself and other bots and ignore messages without prefix
    if (msg.author.bot || !msg.content.startsWith(prefix)) {
        return;
    }

    // acknowledge that a message was received
    console.log("message received: " + msg);
    //Logger.log("info", msg.author.username + " executed <" + msg.content + ">");

    var command_text = msg.content.split(" ")[0].substring(1).toLowerCase();
    var suffix = msg.content.substring(command_text.length + 2); //add one for the ! and one for the space

    var command = commands[command_text];

    if (command) {
        command.process(bot, msg, suffix);
    }
});

function scrapeWarframe() {

    setInterval( () => {
        Request('http://content.warframe.com/dynamic/worldState.php', (error, response, body) => {
            if (response.statusCode != 200) {
                msg.channel.sendMessage("An error has occured: webpage not accessible");
            }
            else {
                var warframe_world = new WarframeWorldState(body);
                var warframe_channel = bot.guilds.find("name", "Kvasir").channels.find("name", "warframe");

                if (warframe_world && warframe_channel) {
                    displayAlerts(warframe_world, warframe_channel);
                }
            }
        });
    }, 60000);
}

function displayAlerts(warframe_world, warframe_channel) {
    // buffer to cleanse list of stored alerts
    var current_alerts = new ArrayList;

    for (var i in warframe_world.alerts) {
        alert = warframe_world.alerts[i];
        // omit duplicate alerts and irrelevant item rewards
        if (!alerts_posted.contains(alert.id) && hasGoodItem(alert)) {
            warframe_channel.sendMessage("```" + alert.toString() + "```");
            alerts_posted.add(alert.id);
        }

        // populate alert buffer
        current_alerts.add(alert.id);
    }

    // remove alerts once they expire
    alerts_posted = alerts_posted.intersection(current_alerts);

    var current_invasions = new ArrayList;

    for (var i in warframe_world.invasions) {
        invasion = warframe_world.invasions[i];
        // omit duplicate invasions and irrelevant item rewards
        if (!invasions_posted.contains(invasion.node) && hasGoodItem(invasion)) {
            warframe_channel.sendMessage("```" + invasion.toString() + "```");
            invasions_posted.add(invasion.node);
        }

        // populate invasion buffer
        current_invasions.add(invasion.node);
    }

    // remove invasions once they expire
    invasions_posted = invasions_posted.intersection(current_invasions);
}

//TODO: add custom item matching
function hasGoodItem(event) {
    var item_regex = /nitain|forma|catalyst|reactor|exilus|kubrow|kavat|vandal|wraith/;

    rewards = event.getRewardTypes();
    for (var i in rewards) {
        if (item_regex.test(rewards[i])) {
            return true;
        }
    }

    return false;
}

// log in the bot
bot.login(token);
