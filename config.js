// Pre-requisits. Do not touch these.
let date = new Date();
module.exports = {

    // Content

    redisToken: process.env.REDIS_TOKEN ?? "",
    redisUrl: `rediss://default:${encodeURIComponent(process.env.REDIS_TOKEN ?? "")}@alert-jennet-81049.upstash.io:6379`,

    // Web Server
    // This code handles how the web server handles data.

    // Port that this server uses!
    PORT: 3000,

    // token
    token: process.env.SERVER_TOKEN ?? "",

    // General settings
    // These affect the bot as a whole.

    // Note that these commands are buggy, and may not work.
    // restart: "gnome-terminal", // Restart command. This would be different on a linux based system. It would be "sh start.sh".
    restart: "start start.bat", // Restart command. This would be different on a linux based system. It would be "sh start.sh".
    // args: ['--', 'bash', '-c', "./start.sh"],

    // These can be changed, but only if you know what you are doing.
    dateOptions: {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    },
    logFormat: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`, // Log format of the bot


    // Do not change these. Used for version checking, command line functionality, and more.
    botName: "NexAPI Server",
    version: "0.0.0",
    versionID: 1, // nexint raw server version (index.js), plugins are updated independantly
    botChannel: "dev",
    fileCount: 55, // file count, if more files are added / removed the server detects the instance is modified
    mikuVer: "0.3.0",
    mikuChannel: "prod",
    updateURL: 'https://raw.githubusercontent.com/Nexint-Labs/NexAPI/refs/heads/main/config.js',
    src: "https://github.com/Nexints/open-bot",
}