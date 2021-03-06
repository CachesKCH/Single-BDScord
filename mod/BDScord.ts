/**
 * BDScord Plugin
 * Developed by ! Pixel
 *
 */

import {Client, TextChannel, WebhookClient} from "discord.js";
import {events} from "bdsx/event";
import {NetworkIdentifier} from "bdsx/bds/networkidentifier";
import {DeviceOS} from "bdsx/common";
import {MinecraftPacketIds} from "bdsx/bds/packetids";
import {bedrockServer} from "bdsx/launcher";
import {serverInstance} from "bdsx/bds/server";
// @ts-ignore
import DiscordWebhook, {Webhook} from 'discord-webhook-ts';
import {sendHelp, sendSpecical, tellAllRaw} from "./ChatManager/MessageManager";
import {takeBackup} from "./Backup/Backup";
import {Config} from "./Config/config";

// @ts-ignore
export const client = new Client();
client.login(Config.token)
export const system = server.registerSystem(0, 0);
export let channel: TextChannel;
export const discordClient = new DiscordWebhook(Config.webhook_url);
export const connectionList = new Map<NetworkIdentifier, string>();
events.packetAfter(MinecraftPacketIds.Login).on((ptr, networkIdentifier, packetId) => {
    const connreq = ptr.connreq;
    if (connreq === null) return;
    const cert = connreq.cert;
    console.log(`Connection: ${cert.getId()}>  XUID=${cert.getXuid()}, OS=${DeviceOS[connreq.getDeviceOS()] || 'UNKNOWN'}`);
    if (cert.getId()) connectionList.set(networkIdentifier, cert.getId());
});

client.on("ready", async () => {
    console.log("\x1b[32m%s\x1b[0m", `[BDScord main] Info: Connected to Discord`);
    const tmpChannel = client.channels.get(Config.channel);
    if (!tmpChannel)
        throw new Error("\x1b[31m[BDScord main] Error: Unable to set channel\x1b[0m");
    channel = tmpChannel as TextChannel;
    sendSpecical("Server Info:", "**The server has started up!**", "#31b40c", false);
});

let whitelistArgs: string[] = ["on", "off", "add", "remove", "list"];
client.on("message", (message) => {
    if (message.channel.id !== channel.id)
        return;
    if (message.author.bot)
        return;
    if (!message.content.startsWith(Config.bot_prefix)) {
        tellAllRaw(`[§9Discord§r] ${message.author.username}: ${message.content}`);
    } else {
        let a: string[] = message.content.split(" ");
        let cmd = a[0].replace(Config.bot_prefix, "");
        switch (cmd) {
            case "whitelist": {
                if (!message.member.roles.has(Config.server_manager_roleID)) {
                    sendSpecical("Error:", `You do not have the permissions to run this command`, "#9b1010", false);
                    return;
                }
                if (Object.values(whitelistArgs).includes(a[1])) {
                    WhitelistResponse(message.content.substr(1));
                } else {
                    sendSpecical("Error:", `Invalid format. Please run ${Config.bot_prefix}help for more info`, "#9b1010", false);
                }
                break;
            }
            case "stop": {
                if (!message.member.roles.has(Config.server_manager_roleID))
                    return;
                bedrockServer.executeCommand("stop");
                break;
            }
            case "raw": {
                if (!message.member.roles.has(Config.server_manager_roleID)) {
                    sendSpecical("Error:", `You do not have the permissions to run this command`, "#9b1010", false);
                    return;
                }
                system.executeCommand(`${message.content.substring(4)}`, result => {
                    sendSpecical("Command result:", `${result.data.statusMessage}`, "#0960d0", false);
                })
                break;
            }
            case"backup": {
                takeBackup()
                break;
            }
            case "list": {
                list()
                break;
            }
            case "help": {
                sendHelp()
                break;
            }
            case "scoreboard": {
                switch (a[1]) {
                    case "stats":
                        let objectiveNames = serverInstance.minecraft.getLevel().getScoreboard().getObjectiveNames()
                        let s: string = "";
                        for (let i = 0; i < objectiveNames.length; i++) {
                            s += `\n ${objectiveNames[i]}: ${getScore(` ${a.slice(2).join(' ')}`, `${objectiveNames[i]}`)}`
                        }
                        sendSpecical(`Stats for ${a.slice(2).join(' ')}`, s, "#14a7e5", false);
                        break;
                }
                break;
            }
            default: {
                sendSpecical("Error:", `Unknown command. Please run ${Config.bot_prefix}help for help`, "#9b1010", false);
                break;
            }
        }
    }

});

client.on("messageUpdate", (oldMessage, newMessage) => {
    if (oldMessage.channel.id !== channel.id)
        return;
    tellAllRaw(`[§9Discord§r] ${oldMessage.author.username} [Message edited]: Original: §8${oldMessage}§r  =>  ${newMessage}`);
})

export function sendMessage(content: string, playerName: string) {
    const requestBody: Webhook.input.POST = {
        username: playerName,
        content: content
    }
    discordClient.execute(requestBody);
}

function getScore(target: String, objectives: string): null | number {
    let level = serverInstance.minecraft.getLevel();
    let score = level.getScoreboard();
    let obj = score.getObjective(objectives)!;
    if (obj === null) return null;
    // @ts-ignore
    let id = score.getFakePlayerScoreboardId(target);
    return obj.getPlayerScore(id).value;
}

function WhitelistResponse(command: string) {
    system.executeCommand(command, result => {
        if (command.includes(" list")) {
            let json = JSON.parse(result.data.statusMessage.substring(4, result.data.statusMessage.length - 4));
            let res = JSON.parse(JSON.stringify(json.result));
            let s: string = "";
            for (let i = 0; i < res.length; i++) {
                s += `\n - ${res[i].name}`
            }
            sendSpecical("Whitelist:", s, "#345678", false);
        } else {
            sendSpecical("Whitelist:", result.data.statusMessage, "#345678", false);
        }
    });
}

function list() {
    let s: string = "";
    for (const i of serverInstance.minecraft.getLevel().players.toArray()) {
        s += `\n - ${i.getName()}`;
    }
    sendSpecical("Current players online:", (s === "" ? "No players are online" : s), "#0c6dcb", false);
}