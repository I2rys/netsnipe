(async()=>{
    "use strict";

    // Dependencies
    const { JsonDB, Config } = require("node-json-db")
    const randomString = require("randomstring")
    const peaker = require("./modules/peaker")
    const request = require("request-async")
    const discord = require("discord.js")
    const _ = require("lodash")
    const fs = require("fs")
    
    // Variables
    const bot = new discord.Client({ intents: [ discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES, discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, discord.Intents.FLAGS.DIRECT_MESSAGES ] })
    const database = new JsonDB(new Config("database.json", true, false, "/"))
    const tokens = fs.readFileSync("./tokens.txt", "utf8").split("\n")
    
    var claimsChannel;
    var queuedChannel;
    var serverMembers;
    var netSnipe = {
        found: [],
        codes: [],
        config: {
            serverID: "",
            claimChannelID: "",
            queuedChannelID: "",
            roleID: "",
            testMode: await database.getData("/testMode")
        },
        token: ""
    }
    
    // Functions
    async function updateEmbed(){
        const oldMessage = await database.getData("/sentMessage")
        const queued = await database.getData("/queued")
        const claimFor = await database.getData("/claimFor")
        const results = []
    
        if(!claimFor) await database.push("/claimFor", queued[Math.floor(Math.random() * queued.length)].userID,true)
        if(queued.length) for( const q in queued ) results.push(`${+q+1}) ${queued[q].userTag} | ${queued[q].claimed.length}/${queued[q].max}`)
    
        const embed = new discord.MessageEmbed()
        .setTitle("NetSnipe - Queue")
        .setDescription(queued.length ? results.join("\n") : "None")
        .setColor("#704AEC")
    
        if(oldMessage){
            queuedChannel.messages.edit(oldMessage, { embeds: [embed] })
        }else{
            const sentMessage = await queuedChannel.send({ embeds: [embed] })
            database.push("/sentMessage", sentMessage.id, true)
        }
    }
    
    async function listener(message, nitroCode){
        if(message.guild.id === netSnipe.config.serverID) return

        var response = await request(`https://discordapp.com/api/v6/entitlements/gift-codes/${nitroCode}?with_application=false&with_subscription_plan=true`)
        response = JSON.parse(response.body)
    
        if(netSnipe.config.testMode || response.statusCode === 200){
            const queued = await database.getData("/queued")
            const userID = await database.getData("/claimFor")
            var user = _.find(queued, { userID: userID })
    
            if(!user) return
            user.claimed.push(nitroCode)
            await database.push(`/queued[${_.findIndex(queued, { userID: userID })}]`, user, true)
    
            if(user.claimed.length > user.max-1) await database.delete(`/queued[${_.findIndex(queued, { userID: userID })}}]`)
    
            try{
                await request.post(`https://discordapp.com/api/v6/entitlements/gift-codes/${nitroCode}/redeem`, {
                    headers: {
                        authorization: user.token
                    }
                })
            }catch{}
    
            var embed = new discord.MessageEmbed()
            .setTitle("NetSnipe - Nitro Claim!")
            .addFields(
                { name: "**Nitro Type**", value: "Gay", inline: true },
                { name: "**Claims Recieved**", value: user.claimed.length.toString(), inline: true },
                { name: "**Claims Left**", value: (user.max-user.claimed.length).toString(), inline: true }
            )
            .setColor("#704AEC")
    
            const a = await database.getData("/claimFor")
            serverMembers.cache.find(m => m.id == a).send({ embeds: [embed] })
            await database.push("/claimFor", queued[_.findIndex(queued, { userID: userID }).userID+1], true)
            updateEmbed()
    
            var embed = new discord.MessageEmbed()
            .setTitle("NetSnipe - Claimed!")
            .setDescription(`Successfully claimed ${response.type === "classic" ? "**Classic Nitro**" : "**Boost Nitro**"}.`)
            .addFields(
                { name: "**User Claimed**", value: user.userTag },
                { name: "**Claim Time**", value: (Math.random() * (2 - 1) + 1).toString() }
            )
            .setThumbnail(response.type === "classic" ? "https://cdn.discordapp.com/emojis/984084906202243112.gif?size=44&quality=lossless": "https://cdn.discordapp.com/emojis/984085287338639370.gif?size=44&quality=lossless")
            .setColor("#704AEC")
    
            claimsChannel.send({ embeds: [embed] })
        }
    }
    
    // Main
    bot.on("ready", async()=>{
        bot.user.setActivity(".help | NetSnipe")
        console.log("NetSnipe is running.")
    
        if(tokens.length) for( const t of tokens ) peaker(t, listener)
    
        const guild = bot.guilds.cache.find(g => g.id == netSnipe.config.serverID) // Server ID
        claimsChannel = guild.channels.cache.find(ch => ch.id == netSnipe.config.claimChannelID) // Claim Channel
        queuedChannel = guild.channels.cache.find(ch => ch.id == netSnipe.config.queuedChannelID) // Queue Channel
        serverMembers = guild.members
    
        const oldMessage = await database.getData("/sentMessage")
        const queued = await database.getData("/queued")
        const claimFor = await database.getData("/claimFor")
        const results = []
    
        if(!claimFor) await database.push("/claimFor", queued[Math.floor(Math.random() * queued.length)].userID,true)

        for( const q of queued ){
            var user = _.find(queued, { userID: q.userID })

            if(user.claimed.length > user.max) await database.delete(`/queued[${_.findIndex(queued, { userID: user.userID })}]`)
        }

        if(queued.length) for( const q in queued ) results.push(`${+q+1}) ${queued[q].userTag} | ${queued[q].claimed.length}/${queued[q].max}`)
    
        const embed = new discord.MessageEmbed()
        .setTitle("NetSnipe - Queue")
        .setDescription(queued.length ? results.join("\n") : "None")
        .setColor("#704AEC")
    
        if(oldMessage){
            queuedChannel.messages.edit(oldMessage, { embeds: [embed] })
        }else{
            const sentMessage = await queuedChannel.send({ embeds: [embed] })
            database.push("/sentMessage", sentMessage.id, true)
        }
    })
    
    bot.on("message", async(message)=>{
        if(!message.guild){
            if(messageArgs[0] === ".redeem"){
                if(!messageArgs[1] || !messageArgs[2]) return message.reply(".radeem <code> <accountToken>")
        
                const queued = await database.getData("/queued")
                var user = _.find(queued, { userID: message.author.id })
        
                if(queued.length === 9) return message.reply("Queue is full.")
                if(user) return message.reply("You are already in queue.")
        
                const codeData = _.find(netSnipe.codes, { code: messageArgs[1] })
                
                if(!codeData) return message.reply("Invalid code.")
        
                await database.push("/queued", [{ userTag: message.author.tag, userID: message.author.id, max: _.find(netSnipe.codes, { code: messageArgs[1] }).amount, claimed: [], token: messageArgs[2] }], false)
                delete netSnipe.codes[_.findIndex(netSnipe.codes, { code: messageArgs[1] })]
                updateEmbed()
                message.reply("Successfully queued.")
            }

            return
        }
        if(message.author.bot) return
        if(!message.member.roles.cache.find(r => r.id == netSnipe.config.roleID)) return
    
        var nitroCode = message.content.match(/discord.gift\/\w+/)
    
        if(nitroCode){
            nitroCode = nitroCode[0].replace("discord.gift\/", "")
    
            var response = await request(`https://discordapp.com/api/v6/entitlements/gift-codes/${nitroCode}?with_application=false&with_subscription_plan=true`)
            response = JSON.parse(response.body)
    
            if(netSnipe.config.testMode || response.statusCode === 200){
                const queued = await database.getData("/queued")
                const userID = await database.getData("/claimFor")
                var user = _.find(queued, { userID: userID })
        
                if(!user) return
                user.claimed.push(nitroCode)
                await database.push(`/queued[${_.findIndex(queued, { userID: userID })}]`, user, true)
        
                if(user.claimed.length === user.max) await database.delete(`/queued[${_.findIndex(queued, { userID: userID })}]`)
        
                try{
                    await request.post(`https://discordapp.com/api/v6/entitlements/gift-codes/${nitroCode}/redeem`, {
                        headers: {
                            authorization: user.token
                        }
                    })
                }catch{}
        
                var embed = new discord.MessageEmbed()
                .setTitle("NetSnipe - Nitro Claim!")
                .addFields(
                    { name: "**Nitro Type**", value: "Gay", inline: true },
                    { name: "**Claims Recieved**", value: user.claimed.length.toString(), inline: true },
                    { name: "**Claims Left**", value: (user.max-user.claimed.length).toString(), inline: true }
                )
                .setColor("#704AEC")
        
                message.author.send({ embeds: [embed] })
                await database.push("/claimFor", queued[_.findIndex(queued, { userID: userID }).userID+1], true)
                updateEmbed()
    
                var embed = new discord.MessageEmbed()
                .setTitle("NetSnipe - Claimed!")
                .setDescription(`Successfully claimed ${response.type === "classic" ? "**Classic Nitro**" : "**Boost Nitro**"}.`)
                .addFields(
                    { name: "**User Claimed**", value: user.userTag },
                    { name: "**Claim Time**", value: (Math.random() * (2 - 1) + 1).toString() }
                )
                .setThumbnail(response.type === "classic" ? "https://cdn.discordapp.com/emojis/984084906202243112.gif?size=44&quality=lossless": "https://cdn.discordapp.com/emojis/984085287338639370.gif?size=44&quality=lossless")
                .setColor("#704AEC")
    
                claimsChannel.send({ embeds: [embed] })
            }
        }
    
        if(!message.content.startsWith(".")) return
    
        const messageArgs = message.content.split(" ")
    
        if(messageArgs[0] === ".help"){
            const embed = new discord.MessageEmbed()
            .setTitle("NetSnipe - Help")
            .addFields(
                { name: ".createClaim <amount>", value: "Get a code." },
                { name: ".redeem <code> <accountToken>", value: "Redeem your code to be queued." },
                { name: ".retire", value: "Remove yourself from current queue." },
            )
            .setColor("#704AEC")
    
            message.reply({ embeds: [embed] })
        }else if(messageArgs[0] === ".testMode"){
            if(!messageArgs[1]) return message.reply(".testmode <on/off>")
    
            if(messageArgs[1] === "on"){
                await database.push("/testMode", true, true)
                netSnipe.config.testMode = true
                message.reply("Test Mode turned on.")
            }else{
                await database.push("/testMode", false, true)
                netSnipe.config.testMode = false
                message.reply("Test Mode turned off.")
            }
        }else if(messageArgs[0] === ".TESTLINKBASIC"){
            const embed = new discord.MessageEmbed()
            .setTitle("NetSnipe - Claimed!")
            .setDescription(`Successfully claimed **Classic Nitro**.`)
            .addFields(
                { name: "**User Claimed**", value: message.author.tag },
                { name: "**Claim Time**", value: (Math.random() * (2 - 1) + 1).toString() }
            )
            .setThumbnail("https://cdn.discordapp.com/emojis/984084906202243112.gif?size=44&quality=lossless")
            .setColor("#704AEC")
    
            claimsChannel.send({ embeds: [embed] })
        }else if(messageArgs[0] === ".TESTLINKNITRO"){
            const embed = new discord.MessageEmbed()
            .setTitle("NetSnipe - Claimed!")
            .setDescription(`Successfully claimed **Boost Mitro**.`)
            .addFields(
                { name: "**User Claimed**", value: message.author.tag },
                { name: "**Claim Time**", value: (Math.random() * (2 - 1) + 1).toString() }
            )
            .setThumbnail("https://cdn.discordapp.com/emojis/984085287338639370.gif?size=44&quality=lossless")
            .setColor("#704AEC")
    
            claimsChannel.send({ embeds: [embed] })
        }else if(messageArgs[0] === ".retire"){
            const queued = await database.getData("/queued")
            var user = _.find(queued, { userID: message.author.id })
    
            if(!user) return message.reply("You are already not in queue.")
    
            await database.delete(`/queued[${_.findIndex(queued, { userID: message.author.id })}]`)
            updateEmbed()
            message.reply("You have been successfully removed from queue.")
        }else if(messageArgs[0] === ".createClaim"){
            if(!messageArgs[1]) return message.reply(".createClaim <amount>")
            if(messageArgs[1] > 100) return message.reply("Maximum amount is 100.")
    
            const code = randomString.generate(Math.floor(Math.random() * 20))
    
            netSnipe.codes.push({ amount: +messageArgs[1], code: code })
            message.author.send(`Your code: **${code}**`).catch(()=>{
                message.reply("Unable to send you a code for some reason.")
            }).then(()=>{
                message.reply("Please check your DM.")
            })
        }
    })
    
    bot.login(netSnipe.token)
})()