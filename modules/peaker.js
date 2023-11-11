"use strict";

// Dependencies
const discord = require("discord.js-selfbot-v13")

// Main
module.exports = function(token, listener){
    const client = new discord.Client({ checkUpdate: false, intents: [ discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES, discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, discord.Intents.FLAGS.DIRECT_MESSAGES ] });

    client.on("ready", ()=>{
        console.log(`Listening to user ${client.user.username}`)
    })
    
    client.on("message", (message)=>{
        var nitroCode = message.content.match(/discord.gift\/\w+/)

        if(nitroCode){
            nitroCode = nitroCode[0].replace("discord.gift\/", "")
    
            listener(message, nitroCode)
        }
    })
    
    client.login(token).catch(()=>{
        console.log(`[ERR] Invalid token. ${token}`)
    })
}