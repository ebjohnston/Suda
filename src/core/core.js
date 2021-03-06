// import dependent modules
const discord = require('discord.js')
const fs = require('fs')
const path = require('path')
const padEnd = require('string.prototype.padend')
padEnd.shim() // allows appending padEnd to strings

// import source files
var warframe = require('../warframe/warframe.js')

// configuration settings
var settings = require('../../settings.json')
var doWarframe = settings.warframe.enable
var images = settings.images

// initialize imported modules
var bot = new discord.Client()

/*
List of command properties
-name
-description
-suffix
-usage (NOTE: implied [No Parameters] if !suffix)
-help
-admin
-timeout (in seconds)
-process (lambda)
*/

var commands = {
  'help': {
    name: 'help',
    description: 'gets info for all bot commands',
    help: 'use to get information about the usage and properties of different bot commands',
    suffix: true,
    usage: '[command]',
    process: (bot, message, suffix) => {
      if (suffix) {
        // sendCommandHelp(suffix, message.channel);
        var command = null
        var source = null

        var info = retrieveCommand(suffix)

        if (!info) {
          message.channel.send("```I'm sorry, but I don't recognize that command. " +
                        'Please consult ' + settings.prefix + 'help for a list of valid commands.```')
        } else {
          command = info.command
          source = info.source

          if (!command || !source) {
            message.channel.send("```I'm sorry, but I don't recognize that command. " +
                            'Please consult ' + settings.prefix + 'help for a list of valid commands.```')
          } else {
            let response = 'Information for command: **' + command.name + '**\n```'

            // include usage information
            response += 'Usage: ' + settings.prefix
            if (source === 'warframe') {
              response += settings.warframe.prefix
            }
            response += command.name
            if (command.suffix) {
              response += ' ' + command.usage + '\n'
            } else {
              response += '\n'
            }

            if (command === commands['img']) {
              response += 'Available images: '

              var contents = fs.readdirSync(images.directory)
              for (let i in contents) {
                var base = path.basename(contents[i])
                var extension = path.extname(contents[i])

                var imagename = base.substring(0, base.length - extension.length)
                response += imagename + ', '
              }
              response = response.substring(0, response.length - 2) // remove last ", "
              response += '\n'
            }

            response += 'Description: ' + command.help
            if (command.admin) {
              response += '\nNote: This command is restricted to bot administrators'
            }
            response += '```'
            message.channel.send(response)
          }
        }
      } else {
        // sendCommandList(message.channel);
        let response = '**Generic Commands**\n```'
        for (let i in commands) {
          response += settings.prefix + commands[i].name.padEnd(10) + ' | ' +
                      commands[i].description + '\n'
        }
        response += '```'
        message.channel.send(response)

        if (doWarframe) {
          response = '**Warframe Commands**\n```'
          for (let i in warframe.commands) {
            response += settings.prefix + settings.warframe.prefix +
                        warframe.commands[i].name.padEnd(10) +
                        ' | ' + warframe.commands[i].description + '\n'
          }
          response += '```'
          message.channel.send(response)
        }
      }
    }
  },
  'img': {
    name: 'img',
    description: 'sends an image from the server directory',
    help: 'query ./images and posts the first match found. Can also be called with /[image name]',
    suffix: true,
    usage: '[image name (no extension)]',
    process: (bot, message, suffix) => {
      var contents = fs.readdirSync(images.directory)

      for (var i in contents) {
        // remove extension
        var name = contents[i].substring(0, contents[i].lastIndexOf('.'))

        if (name === suffix) {
          for (var j in images.extensions) {
            if (path.extname(contents[i]) === images.extensions[j]) {
              // sends first filename + extension match as only message
              message.channel.send({files: [images.directory + '/' + contents[i]]})
              message.delete() // warning: requires "Manage Messages" permission
            }
          }
        }
      }
    }
  },
  'lenny': {
    name: 'lenny',
    description: '( ͡° ͜ʖ ͡°)',
    help: 'displays the Unicode emoticon ( ͡° ͜ʖ ͡°) in place of the command',
    suffix: false,
    process: (bot, message, suffix) => {
      message.delete() // warning: requires "Manage Messages" permission
      message.channel.send('( ͡° ͜ʖ ͡°)')
    }
  },
  'ping': {
    name: 'ping',
    description: 'responds pong, useful for checking if bot is alive.',
    help: "I'll reply to your ping with pong. This way you can see if I'm still able to take commands.",
    suffix: false,
    process: (bot, message, suffix) => {
      message.channel.send('pong')
    }
  }
}

bot.on('ready', () => {
  console.log('I am ready!')

  if (doWarframe) {
    warframe.scrapeWarframe(bot)
  }
})

bot.on('disconnected', () => {
  // Logger.log("error", "Disconnected!");
  process.exit(0) // exit node.js without an error as this is almost always intentional
})

/*
========================
Command interpeter.

This will check if given message will correspond to a command defined in the command variable.
This will work, so long as the bot isn"t overloaded or still busy.
========================
*/

// create an event listener for messages
bot.on('message', message => {
  // prevent the bot from "echoing" itself and other bots and ignore messages without prefix
  if (message.author.bot || !message.content.startsWith(settings.prefix)) {
    return
  }

  // acknowledge that a message was received
  console.log('message received: ' + message)

  // store first word without prefix as lower-case command
  var commandText = message.content.split(' ')[0].substring(settings.prefix.length).toLowerCase()

  // remove prefix, command, and any spaces before suffix (only first word)
  var suffix = message.content.substring(settings.prefix.length + commandText.length).split(' ')[1]

  var command = retrieveCommand(commandText, message).command

  if (command) {
    command.process(bot, message, suffix)

    if (!command.suffix && suffix) {
      message.channel.send('```Note: ' + command.name + ' takes no arguments```')
    }
  }
})

function retrieveCommand (predicate, message) {
  var command = null
  var source = null

  // check core commands
  if (commands[predicate]) {
    command = commands[predicate]
    source = 'main'
  }

  // check warframe commands
  var wfPrefix = settings.warframe.prefix
  if (!command && doWarframe && predicate.startsWith(wfPrefix)) {
    command = warframe.commands[predicate.substring(wfPrefix.length)]
    if (command) {
      source = 'warframe'
    }
  }

  // attempt image directory alias
  if (!command && message) {
    var suffix = message.content.substring(settings.prefix.length).split(' ')[0]
    commands['img'].process(bot, message, suffix)
  }

  return { command, source }
}

// log in the bot
bot.login(settings.token)
