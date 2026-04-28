const { Client, GatewayIntentBits, EmbedBuilder, Collection, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { createCanvas, loadImage, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs = require('fs');

// Register Emoji Font for Linux/Render compatibility
try {
    const fontPath = path.join(__dirname, 'fonts', 'NotoColorEmoji.ttf');
    if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: 'NotoColorEmoji' });
        console.log('Emoji font registered successfully.');
    } else {
        console.warn('Emoji font file not found at:', fontPath);
    }
} catch (e) {
    console.error('Error registering emoji font:', e);
}

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is online! ✅'));
app.listen(process.env.PORT || 3000, () => console.log('Web server ready.'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const prefix = process.env.PREFIX || '';

// Market Data
const items = [
    { id: 'wood', name: 'خشب', emoji: '🪵', min: 1000, max: 12500 },
    { id: 'brick', name: 'طوب', emoji: '🧱', min: 5000, max: 30000 },
    { id: 'iron', name: 'حديد', emoji: '⚙️', min: 10000, max: 50000 },
    { id: 'stone', name: 'حجر', emoji: '🪨', min: 15000, max: 70000 },
    { id: 'steel', name: 'فولاذ', emoji: '🔩', min: 30000, max: 120000 },
    { id: 'gold', name: 'ذهب', emoji: '📀', min: 50000, max: 220000 }
];

const properties = [
    { name: 'مقهى', price: 1000000, profit: 500 },
    { name: 'مطعم', price: 1000000, profit: 500 },
    { name: 'صالون', price: 500000, profit: 200 },
    { name: 'محل ملابس', price: 500000, profit: 200 },
    { name: 'مكتبة', price: 500000, profit: 200 },
    { name: 'شركة اتصالات', price: 10000000, profit: 5000 },
    { name: 'شركة تقنية', price: 10000000, profit: 5000 },
    { name: 'مستشفى', price: 5000000, profit: 2500 },
    { name: 'برج', price: 3000000, profit: 1500 },
    { name: 'محطة', price: 2000000, profit: 1000 },
];

let marketPrices = {};
let lastUpdate = Date.now();

function updateMarket() {
    items.forEach(item => {
        const buy = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
        const sell = Math.floor(buy * 0.95);
        const rise = (Math.random() * 25).toFixed(1); // Random rise 0-25%
        marketPrices[item.id] = { buy, sell, rise };
    });
    lastUpdate = Date.now();
    console.log('Market prices updated!');
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function getEmojiUrl(emoji) {
    if (!emoji) return null;
    // Convert to hex code points and filter out variation selectors like fe0f
    const codePoints = [...emoji]
        .map(c => c.codePointAt(0).toString(16))
        .filter(hex => hex !== 'fe0f');
    const hex = codePoints.join('-');
    return `https://abs.twimg.com/emoji/v2/72x72/${hex}.png`;
}

async function drawRewardCard(message, amount, totalBalance) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    const user = message.author;
    const job = await db.get(`job_${user.id}`) || 'عاطل';

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 400);
    grad.addColorStop(0, '#4a4a4a');
    grad.addColorStop(1, '#2c2c2c');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(0, 0, 800, 400, 40); ctx.fill();

    // Subtle texture (diagonal lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 800; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 400, 400); ctx.stroke();
    }

    // Header Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath(); ctx.roundRect(0, 0, 800, 80, 40); ctx.fill();

    // Server Icon & Name
    try {
        const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const serverIcon = await loadImage(iconUrl);
        ctx.save();
        ctx.beginPath(); ctx.arc(60, 40, 25, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(serverIcon, 35, 15, 50, 50);
        ctx.restore();
    } catch (e) {}

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Bank ${message.guild.name}`, 100, 50);

    const isVip = await db.get(`is_vip_${user.id}`);
    if (isVip) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👑', 400, 95);
    }

    // Menu Icon
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(720, 35); ctx.lineTo(760, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(720, 50); ctx.lineTo(760, 50); ctx.stroke();

    // User Profile
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
        ctx.save();
        ctx.beginPath(); ctx.arc(400, 130, 35, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, 365, 95, 70, 70);
        ctx.restore();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    } catch (e) {}

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(user.username, 400, 200);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '18px Arial';
    ctx.fillText(`(${job})`, 400, 225);

    // Amount (Large Green)
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 70px Arial';
    ctx.fillText(`+ $${formatNumber(amount)}`, 400, 290);

    // Total Balance (Small next to icon)
    const balStr = `+ $${formatNumber(totalBalance)}`;
    ctx.font = 'bold 24px Arial';
    const textWidth = ctx.measureText(balStr).width;
    const startX = 400 - (textWidth / 2) + 15;

    // Green Arrow Icon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(startX - 30, 332, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath(); ctx.moveTo(startX - 38, 338); ctx.lineTo(startX - 22, 338); ctx.lineTo(startX - 30, 325); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(balStr, startX, 340);

    // VISA/MC Logos
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('VISA', 50, 340);
    ctx.beginPath(); ctx.arc(150, 332, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(175, 332, 15, 0, Math.PI * 2); ctx.fill();

    // Card Number
    ctx.font = '16px Arial'; ctx.fillStyle = '#888888';
    const idStr = user.id.padEnd(16, '0');
    const cardNumber = `${idStr.substring(0,4)} ${idStr.substring(4,8)} ${idStr.substring(8,12)} ${idStr.substring(12,16)}`;
    ctx.fillText(cardNumber, 50, 370);

    return canvas.toBuffer();
}

async function drawTransferCard(message, targetUser, amount) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    const sender = message.author;
    
    // Background Gradient (Dark Theme)
    const grad = ctx.createLinearGradient(0, 0, 800, 400);
    grad.addColorStop(0, '#4a4a4a');
    grad.addColorStop(1, '#2c2c2c');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(0, 0, 800, 400, 40); ctx.fill();

    // Diagonal highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.moveTo(400, 0); ctx.lineTo(800, 0); ctx.lineTo(800, 400); ctx.lineTo(600, 400);
    ctx.closePath(); ctx.fill();

    // Header Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath(); ctx.roundRect(0, 0, 800, 80, 40); ctx.fill();

    // Server Info
    try {
        const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const serverIcon = await loadImage(iconUrl);
        ctx.save();
        ctx.beginPath(); ctx.arc(60, 40, 25, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(serverIcon, 35, 15, 50, 50);
        ctx.restore();
    } catch (e) {}

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Bank ${message.guild.name}`, 100, 50);

    // Menu Icon
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(720, 35); ctx.lineTo(760, 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(720, 50); ctx.lineTo(760, 50); ctx.stroke();

    // Avatars
    const drawAvatar = async (u, x, y) => {
        try {
            const av = await loadImage(u.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(av, x - 70, y - 70, 140, 140);
            ctx.restore();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.stroke();
        } catch (e) {}
    };

    await drawAvatar(sender, 250, 220);
    await drawAvatar(targetUser, 550, 220);

    // Names
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sender.username, 250, 330);
    ctx.fillText(targetUser.username, 550, 330);

    // Middle Icon (Two Horizontal Arrows)
    ctx.fillStyle = '#ffffff';
    // Top Arrow (Right)
    ctx.beginPath();
    ctx.moveTo(370, 195); ctx.lineTo(430, 195); // line
    ctx.lineTo(430, 185); ctx.lineTo(450, 200); ctx.lineTo(430, 215); ctx.lineTo(430, 205); // head
    ctx.lineTo(370, 205); ctx.closePath(); ctx.fill();
    
    // Bottom Arrow (Left)
    ctx.beginPath();
    ctx.moveTo(430, 235); ctx.lineTo(370, 235); // line
    ctx.lineTo(370, 245); ctx.lineTo(350, 230); ctx.lineTo(370, 215); ctx.lineTo(370, 225); // head
    ctx.lineTo(430, 225); ctx.closePath(); ctx.fill();
    
    // Amount
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`$${formatNumber(amount)}`, 400, 320);

    // Bottom Bar
    ctx.fillStyle = '#333333';
    ctx.beginPath(); ctx.roundRect(350, 350, 100, 8, 4); ctx.fill();

    return canvas.toBuffer();
}

updateMarket();
setInterval(updateMarket, 300000); // 5 minutes

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('add-money')
            .setDescription('إضافة فلوس لشخص معين')
            .addUserOption(option => option.setName('user').setDescription('الشخص').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('المبلغ').setRequired(true)),
        new SlashCommandBuilder()
            .setName('remove-money')
            .setDescription('تنقيص فلوس من شخص معين')
            .addUserOption(option => option.setName('user').setDescription('الشخص').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('المبلغ').setRequired(true)),
        new SlashCommandBuilder()
            .setName('تصفير-الكل')
            .setDescription('تصفير كافة البيانات (فلوس، استثمار، أراضي، مخزون) لجميع المستخدمين'),
        new SlashCommandBuilder()
            .setName('set-channel')
            .setDescription('تحديد الشات المخصص للأوامر')
            .addChannelOption(option => option.setName('channel').setDescription('الشات المخصص').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        
        const guildId = process.env.GUILD_ID;
        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
            console.log(`Successfully reloaded application (/) commands for guild: ${guildId}`);
        } else {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log('Successfully reloaded application (/) commands globally.');
        }
    } catch (error) {
        console.error(error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Guild & Channel Check from .env
    if (process.env.GUILD_ID && message.guild.id !== process.env.GUILD_ID) return;
    if (process.env.CHANNEL_ID && message.channel.id !== process.env.CHANNEL_ID) return;

    let commandName;
    let args;

    if (prefix && message.content.startsWith(prefix)) {
        args = message.content.slice(prefix.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
    } else if (!prefix) {
        args = message.content.trim().split(/ +/);
        commandName = args.shift().toLowerCase();
    } else {
        return;
    }

    // Time Command (وقت)
    if (commandName === 'وقت' || commandName === 'time') {
        const now = Date.now();
        
        // Cooldowns
        const dailyCooldown = await db.get(`daily_${message.author.id}`);
        const robCooldown = await db.get(`rob_cooldown_${message.author.id}`);
        const diceCooldown = await db.get(`dice_cooldown_${message.author.id}`);
        const luckCooldown = await db.get(`luck_cooldown_${message.author.id}`);
        const gambleCooldown = await db.get(`gamble_cooldown_${message.author.id}`);
        const fruitsCooldown = await db.get(`fruits_cooldown_${message.author.id}`);
        const colorCooldown = await db.get(`color_cooldown_${message.author.id}`);
        const tipCooldown = await db.get(`tip_cooldown_${message.author.id}`);
        const transferCooldown = await db.get(`transfer_cooldown_${message.author.id}`);
        
        const m5 = 300000;
        const h1 = 3600000;

        const getRemaining = (timestamp, timeout) => {
            if (!timestamp) return 'متاح الآن ✅';
            const diff = timeout - (now - timestamp);
            if (diff <= 0) return 'متاح الآن ✅';
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        };

        const canvas = createCanvas(600, 770);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath(); ctx.roundRect(0, 0, 600, 770, 30); ctx.fill();

        // Header
        ctx.fillStyle = '#444444';
        ctx.beginPath(); ctx.roundRect(0, 0, 600, 80, 30); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('وقت الأوامر', 300, 50);

        const drawRow = (y, icon, label, time) => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath(); ctx.roundRect(20, y, 560, 60, 10); ctx.fill();
            
            ctx.textAlign = 'left'; ctx.font = '24px Arial';
            ctx.fillText(icon, 40, y + 38);
            
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial';
            ctx.fillText(label, 90, y + 38);
            
            ctx.textAlign = 'right';
            ctx.fillStyle = time.includes('متاح') ? '#2ecc71' : '#aaaaaa';
            ctx.font = '18px Arial';
            ctx.fillText(time, 560, y + 38);
        };

        drawRow(100, '💰', 'الراتب', getRemaining(dailyCooldown, m5));
        drawRow(170, '🥷', 'النهب', getRemaining(robCooldown, m5));
        drawRow(240, '🎲', 'النرد', getRemaining(diceCooldown, m5));
        drawRow(310, '🍀', 'الحظ', getRemaining(luckCooldown, m5));
        drawRow(380, '🎰', 'القمار', getRemaining(gambleCooldown, m5));
        drawRow(450, '🍎', 'الفواكه', getRemaining(fruitsCooldown, m5));
        drawRow(520, '🎨', 'اللون', getRemaining(colorCooldown, m5));
        drawRow(590, '💸', 'البخشيش', getRemaining(tipCooldown, m5));
        drawRow(660, '🔄', 'التحويل', getRemaining(transferCooldown, m5));

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'time.png' });
        return message.reply({ files: [attachment] });
    }

    // Help Command (أوامر)
    if (commandName === 'help' || commandName === 'أوامر' || commandName === 'اوامر') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#1a1a1a')
            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() || client.user.displayAvatarURL() })
            .setTitle('Bank Commands')
            .setDescription(`
**الرصيد والبنك:**
> \`راتب\`
> \`تحويل\`
> \`قرض\`
> \`سداد\`

**المعلومات:**
> \`بروفايل\`
> \`فلوس\` / \`رصيد\`
> \`توب\`
> \`وقت\`

**الترفيه والتجارة:**
> \`أرض\`
> \`سوق\`
> \`شراء\` / \`بيع\`
> \`استثمار\`
> \`تداول\`

**الحظ والمقامرة:**
> \`نرد\`
> \`حظ\`
> \`لون\`
> \`قمار\` / \`فواكه\`
> \`بخشيش\`

**العلاقات:**
> \`زواج\`
> \`طلاق\`
> \`زواجي\`

**الحماية:**
> \`نهب\`
> \`حماية\`

**كبار الشخصيات:**
> \`بارتي\`
            `)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();


        return message.reply({ embeds: [helpEmbed] });
    }

    // Salary Command (راتب)
    if (commandName === 'راتب') {
        const daily = await db.get(`daily_${message.author.id}`);
        const timeout = 300000; // 5 minutes

        if (daily !== null && timeout - (Date.now() - daily) > 0) {
            const time = timeout - (Date.now() - daily);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تستلم راتبك مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }

        let amount = Math.floor(Math.random() * (50000 - 1000 + 1)) + 1000;
        const isVip = await db.get(`is_vip_${message.author.id}`);
        if (isVip) amount *= 2;

        await db.add(`money_${message.author.id}`, amount);
        await db.set(`daily_${message.author.id}`, Date.now());

        const totalBalance = await db.get(`money_${message.author.id}`) || 0;
        const buffer = await drawRewardCard(message, amount, totalBalance);
        const attachment = new AttachmentBuilder(buffer, { name: 'salary.png' });
        
        return message.reply({ 
            content: `| <@${message.author.id}> استلمت راتبك بنجاح!`,
            files: [attachment] 
        });
    }

    // Tip Command (بخشيش)
    if (commandName === 'بخشيش') {
        const cooldown = await db.get(`tip_cooldown_${message.author.id}`);
        const timeout = 300000;
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تطلب بخشيش مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }

        const amount = Math.floor(Math.random() * 4501) + 500; // 500 - 5000
        await db.add(`money_${message.author.id}`, amount);
        await db.set(`tip_cooldown_${message.author.id}`, Date.now());

        const totalBalance = await db.get(`money_${message.author.id}`) || 0;
        const buffer = await drawRewardCard(message, amount, totalBalance);
        const attachment = new AttachmentBuilder(buffer, { name: 'tip.png' });

        return message.reply({ 
            content: `| <@${message.author.id}> حصلت على بخشيش!`,
            files: [attachment] 
        });
    }

    // Color Flood Game (لون)
    if (commandName === 'لون') {
        const cooldown = await db.get(`color_cooldown_${message.author.id}`);
        const timeout = 300000;
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تلعب لون مرة ثانية بعد **${minutes}m ${seconds}s**.`);
        }

        const gameColors = [
            { id: 'red', hex: '#e74c3c', emoji: '🟥', label: 'احمر' },
            { id: 'blue', hex: '#3498db', emoji: '🟦', label: 'ازرق' },
            { id: 'green', hex: '#2ecc71', emoji: '🟩', label: 'اخضر' },
            { id: 'yellow', hex: '#f1c40f', emoji: '🟨', label: 'اصفر' },
            { id: 'purple', hex: '#9b59b6', emoji: '🟪', label: 'بنفسجي' },
            { id: 'orange', hex: '#e67e22', emoji: '🟧', label: 'برتقالي' }
        ];

        const gridSize = 10;
        const maxMoves = 25;
        let grid = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => Math.floor(Math.random() * gameColors.length)));
        let moves = 0;

        const renderGrid = () => {
            const canvas = createCanvas(500, 550);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 500, 550);
            
            const cellSize = 36;
            const gap = 4;
            const offsetX = 52;
            const offsetY = 77;

            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    ctx.fillStyle = gameColors[grid[y][x]].hex;
                    ctx.beginPath();
                    ctx.roundRect(offsetX + x * (cellSize + gap), offsetY + y * (cellSize + gap), cellSize, cellSize, 8);
                    ctx.fill();
                }
            }
            return canvas.toBuffer();
        };

        const floodFill = (targetColor) => {
            const startColor = grid[0][0];
            if (startColor === targetColor) return false;
            
            const queue = [[0, 0]];
            const seen = new Set(['0,0']);
            
            while (queue.length > 0) {
                const [y, x] = queue.shift();
                grid[y][x] = targetColor;
                
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dy, dx]) => {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < gridSize && nx >= 0 && nx < gridSize && !seen.has(`${ny},${nx}`) && grid[ny][nx] === startColor) {
                        seen.add(`${ny},${nx}`);
                        queue.push([ny, nx]);
                    }
                });
            }
            return true;
        };

        const checkWin = () => grid.every(row => row.every(cell => cell === grid[0][0]));

        const attachment = new AttachmentBuilder(renderGrid(), { name: 'flood.png' });
        const rows = [];
        for (let i = 0; i < gameColors.length; i += 3) {
            const row = new ActionRowBuilder().addComponents(
                gameColors.slice(i, i + 3).map(c => new ButtonBuilder().setCustomId(`flood_${c.id}_${message.author.id}`).setEmoji(c.emoji).setStyle(ButtonStyle.Secondary))
            );
            rows.push(row);
        }

        const gameMsg = await message.reply({ 
            content: `🎮 **تحدي الألوان** | النقرات: **${moves}/${maxMoves}**\nحاول توحيد لون الشبكة بالكامل!`,
            files: [attachment],
            components: rows 
        });

        const collector = gameMsg.createMessageComponentCollector({ 
            filter: i => i.user.id === message.author.id && i.customId.startsWith('flood_'),
            time: 3600000 // 1 hour
        });

        collector.on('collect', async i => {
            const colorId = i.customId.split('_')[1];
            const colorIdx = gameColors.findIndex(c => c.id === colorId);
            
            if (floodFill(colorIdx)) {
                moves++;
                const won = checkWin();
                const lost = moves >= maxMoves && !won;

                if (won || lost) {
                    collector.stop(won ? 'win' : 'lose');
                    const finalBuffer = renderGrid();
                    const finalAttachment = new AttachmentBuilder(finalBuffer, { name: 'flood_final.png' });
                    
                    if (won) {
                        const prize = 50000;
                        await db.add(`money_${message.author.id}`, prize);
                        await db.set(`color_cooldown_${message.author.id}`, Date.now());
                        return i.update({ 
                            content: `🎉 **مبروك الفوز!** لقد وحدت الألوان في **${moves}** نقرة!\nربحت **${formatNumber(prize)}** ريال!`,
                            files: [finalAttachment], components: [] 
                        });
                    } else {
                        await db.set(`color_cooldown_${message.author.id}`, Date.now());
                        return i.update({ 
                            content: `❌ **للأسف خسرت!** انتهت عدد النقرات المسموحة.\nحظاً موفقاً في المرة القادمة!`,
                            files: [finalAttachment], components: [] 
                        });
                    }
                }

                const nextBuffer = renderGrid();
                const nextAttachment = new AttachmentBuilder(nextBuffer, { name: 'flood.png' });
                await i.update({ 
                    content: `🎮 **تحدي الألوان** | النقرات: **${moves}/${maxMoves}**\nاستمر في المحاولة!`,
                    files: [nextAttachment] 
                });
            } else {
                await i.reply({ content: '⚠️ هذا اللون هو اللون الحالي للزاوية، اختر لوناً مختلفاً!', ephemeral: true });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                gameMsg.edit({ content: '⏰ انتهى وقت اللعبة!', components: [] });
            }
        });
        return;
    }

    // Profile Command (بروفايل)
    if (commandName === 'بروفايل' || commandName === 'profile') {
        const user = message.mentions.users.first() || message.author;
        
        const balance = await db.get(`money_${user.id}`) || 0;
        const highestBalance = await db.get(`highest_balance_${user.id}`) || balance;
        const highestLoss = await db.get(`highest_loss_${user.id}`) || 0;
        const job = await db.get(`job_${user.id}`) || 'عاطل';
        const level = await db.get(`level_${user.id}`) || 1;
        const xp = await db.get(`xp_${user.id}`) || 0;
        const nextXp = 1400; // Flat 1400 XP requirement

        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, 1000, 500);

        // Main Card
        const cardX = 30, cardY = 30, cardW = 940, cardH = 440;
        ctx.fillStyle = '#444444'; // Base grey
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 40);
        ctx.fill();

        // Darker Header Bar
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, 70, 40);
        ctx.fill();

        // Server Icon & Name (Header)
        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cardX + 60, cardY + 35, 25, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, cardX + 35, cardY + 10, 50, 50);
            ctx.restore();
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bank ${message.guild.name}`, cardX + 100, cardY + 45);

        // Menu Icon (Two lines)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cardX + 850, cardY + 30);
        ctx.lineTo(cardX + 890, cardY + 30);
        ctx.moveTo(cardX + 850, cardY + 42);
        ctx.lineTo(cardX + 890, cardY + 42);
        ctx.stroke();

        // Left Side: User Profile
        // Avatar
        try {
            const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(cardX + 180, cardY + 170, 70, 0, Math.PI * 2);
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(avatar, cardX + 110, cardY + 100, 140, 140);
            ctx.restore();

            const isVip = await db.get(`is_vip_${user.id}`);
            if (isVip) {
                ctx.fillStyle = '#f1c40f';
                ctx.font = '70px "NotoColorEmoji", Arial';
                ctx.textAlign = 'center';
                ctx.fillText('👑', cardX + 180, cardY + 120);
            }
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(user.username, cardX + 180, cardY + 280);

        // VISA Logo & Card Number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('VISA', cardX + 80, cardY + 340);
        ctx.beginPath();
        ctx.arc(cardX + 185, cardY + 330, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cardX + 205, cardY + 330, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '16px Arial';
        ctx.fillStyle = '#cccccc';
        const idStr = user.id.padEnd(16, '0');
        const cardNumber = `${idStr.substring(0,4)} ${idStr.substring(4,8)} ${idStr.substring(8,12)} ${idStr.substring(12,16)}`;
        ctx.fillText(cardNumber, cardX + 80, cardY + 370);

        // Right Side: Stats Panel
        const panelX = cardX + 380;
        const panelY = cardY + 100;
        const panelW = 520;
        const panelH = 300;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 30);
        ctx.fill();

        const drawPill = (x, y, icon, text) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.roundRect(x, y, 220, 45, 22);
            ctx.fill();

            // Icon Circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(x + 22, y + 22, 16, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(icon, x + 22, y + 28);

            ctx.font = 'bold 18px Arial';
            ctx.fillText(text, x + 120, y + 29);
        };

        drawPill(panelX + 30, panelY + 40, '💲', `$${formatNumber(balance)}`);
        drawPill(panelX + 270, panelY + 40, '↗️', `$${formatNumber(highestBalance)}`);
        drawPill(panelX + 30, panelY + 120, '💼', job);
        drawPill(panelX + 270, panelY + 120, '↘️', `$${formatNumber(highestLoss)}`);

        // Level & Progress Bar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${level}`, panelX + 25, panelY + 230);

        // Progress Bar Base
        const barX = panelX + 90;
        const barY = panelY + 215;
        const barW = 400;
        const barH = 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 10);
        ctx.fill();

        // Progress Bar Fill
        const progress = level >= 10 ? 1 : Math.min(xp / nextXp, 1);
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * progress, barH, 10);
        ctx.fill();

        // XP Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        if (level >= 10) {
            ctx.fillText(`MAX LEVEL`, barX + barW / 2, barY + 15);
        } else {
            ctx.fillText(`${xp}/${nextXp} XP`, barX + barW / 2, barY + 15);
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
        return message.reply({ files: [attachment] });
    }

    // Balance Command (رصيد / فلوس)

    if (['رصيد', 'رصيدي', 'فلوس', 'فلوسي', 'balance'].includes(commandName)) {
        const user = message.mentions.users.first() || message.author;
        const balance = await db.get(`money_${user.id}`) || 0;
        
        // Update Highest Balance
        const currentHighest = await db.get(`highest_balance_${user.id}`) || 0;
        if (balance > currentHighest) {
            await db.set(`highest_balance_${user.id}`, balance);
        }
        
        const highestBalance = await db.get(`highest_balance_${user.id}`) || balance;
        const highestLoss = await db.get(`highest_loss_${user.id}`) || 0;

        const canvas = createCanvas(600, 300);
        const ctx = canvas.getContext('2d');

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 600, 300);
        grad.addColorStop(0, '#444444');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 300, 30);
        ctx.fill();

        // Header Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 60, 30);
        ctx.fill();

        // Server Info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bank ${message.guild.name}`, 80, 40);

        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(45, 30, 20, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, 25, 10, 40, 40);
            ctx.restore();
        } catch (e) {}

        // Menu Icon (Two lines)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(540, 25);
        ctx.lineTo(570, 25);
        ctx.moveTo(540, 35);
        ctx.lineTo(570, 35);
        ctx.stroke();

        // User Info (Avatar + Name)
        try {
            const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(260, 110, 18, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 242, 92, 36, 36);
            ctx.restore();
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(user.username, 290, 117);

        // Current Balance (Large Text)
        ctx.font = 'bold 45px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`$${formatNumber(balance)}`, 300, 175);

        // Highest Balance (Green Arrow - Left)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(220, 215, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(215, 218);
        ctx.lineTo(225, 218);
        ctx.lineTo(220, 210);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`+ $${formatNumber(highestBalance)}`, 240, 220);

        // Highest Loss (Red Arrow - Right)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(320, 215, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(315, 212);
        ctx.lineTo(325, 212);
        ctx.lineTo(320, 220);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`- $${formatNumber(highestLoss)}`, 340, 220);

        // Logos (VISA placeholder)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('VISA', 40, 260);
        ctx.beginPath();
        ctx.arc(120, 252, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(135, 252, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px Arial';
        const idStr = user.id.padEnd(16, '0');
        const cardNumber = `${idStr.substring(0,4)} ${idStr.substring(4,8)} ${idStr.substring(8,12)} ${idStr.substring(12,16)}`;
        ctx.fillText(cardNumber, 40, 275);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'balance.png' });
        return message.reply({ files: [attachment] });
    }

    // Transfer Command (تحويل)
    if (commandName === 'تحويل') {
        const user = message.mentions.users.first();
        const amountInput = args[1];

        if (!user) return message.reply('❌ يجب عليك منشن الشخص الذي تريد التحويل له.');
        if (user.id === message.author.id) return message.reply('❌ لا يمكنك التحويل لنفسك.');

        const cooldown = await db.get(`transfer_cooldown_${message.author.id}`);
        const timeout = 300000;
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تحول مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }

        const balance = await db.get(`money_${message.author.id}`) || 0;

        let amount;
        if (amountInput === 'كامل' || amountInput === 'كل') {
            amount = balance;
        } else if (amountInput === 'نص') {
            amount = Math.floor(balance / 2);
        } else if (amountInput === 'ربع') {
            amount = Math.floor(balance / 4);
        } else {
            amount = parseInt(amountInput);
        }

        if (!amount || isNaN(amount) || amount <= 0) return message.reply('❌ يجب عليك تحديد مبلغ صالح للتحويل.');
        if (balance < amount) return message.reply('❌ ليس لديك رصيد كافٍ.');

        await db.sub(`money_${message.author.id}`, amount);
        await db.add(`money_${user.id}`, amount);
        await db.set(`transfer_cooldown_${message.author.id}`, Date.now());

        const buffer = await drawTransferCard(message, user, amount);
        const attachment = new AttachmentBuilder(buffer, { name: 'transfer.png' });

        return message.reply({ 
            content: `| <@${user.id}>`,
            files: [attachment] 
        });
    }
    
    // Dice Command (نرد)
    if (commandName === 'نرد') {
        const amountInput = args[0];
        const userMoney = await db.get(`money_${message.author.id}`) || 0;

        const diceCooldown = await db.get(`dice_cooldown_${message.author.id}`);
        const diceTimeout = 300000; // 5 minutes
        if (diceCooldown !== null && diceTimeout - (Date.now() - diceCooldown) > 0) {
            const time = diceTimeout - (Date.now() - diceCooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تلعب نرد مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }

        let amount;
        if (amountInput === 'كامل' || amountInput === 'كل') {
            amount = userMoney;
        } else if (amountInput === 'نص') {
            amount = Math.floor(userMoney / 2);
        } else if (amountInput === 'ربع') {
            amount = Math.floor(userMoney / 4);
        } else {
            amount = parseInt(amountInput);
        }

        if (!amount || isNaN(amount) || amount <= 0) return message.reply('❌ يجب عليك تحديد مبلغ للمراهنة.');
        if (amount < 500) return message.reply('❌ أقل مبلغ للمراهنة في النرد هو **500** ريال.');
        if (userMoney < amount) return message.reply('❌ ليس لديك رصيد كافٍ.');

        await db.set(`dice_cooldown_${message.author.id}`, Date.now());

        const userRoll = Math.floor(Math.random() * 6) + 1;
        const botRoll = Math.floor(Math.random() * 6) + 1;

        let result = 'draw';
        if (userRoll > botRoll) result = 'win';
        else if (userRoll < botRoll) result = 'loss';

        if (result === 'win') {
            await db.add(`money_${message.author.id}`, amount);
            // Add 75 XP
            let level = await db.get(`level_${message.author.id}`) || 1;
            if (level < 10) {
                let xp = await db.get(`xp_${message.author.id}`) || 0;
                xp += 75;
                const nextXp = level * 1400;
                if (xp >= nextXp) {
                    xp -= nextXp;
                    level += 1;
                    await db.set(`level_${message.author.id}`, level);
                    message.channel.send(`🎉 <@${message.author.id}> مبروك! لقد ارتفع مستواك وأصبحت الآن في المستوى **${level}**!`);
                }
                await db.set(`xp_${message.author.id}`, xp);
            }
        } else if (result === 'loss') {
            await db.sub(`money_${message.author.id}`, amount);
        }

        // Canvas Drawing
        const width = 800;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background Card
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.roundRect(40, 40, 720, 320, 30);
        ctx.fill();

        // Header
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.roundRect(40, 40, 720, 60, 30);
        ctx.fill();

        // Server Icon
        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 70, 20, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, 60, 50, 40, 40);
            ctx.restore();
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bank ${message.guild.name}`, 120, 80);

        // Menu Icon
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(700, 65); ctx.lineTo(730, 65); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(700, 75); ctx.lineTo(730, 75); ctx.stroke();

        // Helper to draw dice
        const drawDice = (x, y, val) => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(x, y, 80, 80, 10);
            ctx.fill();
            ctx.fillStyle = '#000000';
            const dots = {
                1: [[40, 40]],
                2: [[20, 20], [60, 60]],
                3: [[20, 20], [40, 40], [60, 60]],
                4: [[20, 20], [60, 20], [20, 60], [60, 60]],
                5: [[20, 20], [60, 20], [40, 40], [20, 60], [60, 60]],
                6: [[20, 20], [20, 40], [20, 60], [60, 20], [60, 40], [60, 60]]
            };
            dots[val].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(x + dx, y + dy, 6, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        // User Side (Left)
        try {
            const avatar = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath(); ctx.arc(150, 220, 60, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(avatar, 90, 160, 120, 120);
            ctx.restore();
        } catch (e) {}
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(message.author.username, 150, 320);

        // Bot Side (Right)
        try {
            const botAvatar = await loadImage(client.user.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath(); ctx.arc(650, 220, 60, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(botAvatar, 590, 160, 120, 120);
            ctx.restore();
        } catch (e) {}
        ctx.fillText(client.user.username, 650, 320);

        // Dice Rendering
        drawDice(280, 180, userRoll);
        drawDice(440, 180, botRoll);

        // VS Text
        ctx.font = 'bold 30px Arial';
        ctx.fillText('VS', 400, 230);

        // Win/Loss Indicators
        ctx.font = 'bold 20px Arial';
        if (result === 'win') {
            ctx.fillStyle = '#2ecc71';
            ctx.fillText(`+ $${formatNumber(amount)}`, 150, 140);
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`- $${formatNumber(amount)}`, 650, 140);
        } else if (result === 'loss') {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`- $${formatNumber(amount)}`, 150, 140);
            ctx.fillStyle = '#2ecc71';
            ctx.fillText(`+ $${formatNumber(amount)}`, 650, 140);
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'dice.png' });
        
        let contentStr = `| <@${message.author.id}> VS <@${client.user.id}>\n`;
        if (result === 'win') {
            contentStr += `<@${message.author.id}> **+$${amount.toLocaleString('en-US')}.00**`;
        } else if (result === 'loss') {
            contentStr += `<@${message.author.id}> **-$${amount.toLocaleString('en-US')}.00**`;
        } else {
            contentStr += `**🤝 تعادل! لم يتغير شيء.**`;
        }

        return message.reply({ content: contentStr, files: [attachment] });
    }
    if (commandName === 'توب' || commandName === 'top') {
        const allMoney = await db.all();
        const leaderboard = allMoney
            .filter(data => data.id.startsWith('money_'))
            .map(data => ({
                id: data.id.split('_')[1],
                money: data.value
            }))
            .sort((a, b) => b.money - a.money)
            .slice(0, 10);

        const canvas = createCanvas(400, 600);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2c2c2c'; ctx.beginPath(); ctx.roundRect(0, 0, 400, 600, 20); ctx.fill();
        ctx.fillStyle = '#444444'; ctx.beginPath(); ctx.roundRect(0, 0, 400, 80, 20); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
        ctx.fillText('أغنى الأشخاص في السيرفر', 200, 50);

        let y = 140;
        for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            let user;
            try {
                user = await client.users.fetch(entry.id);
            } catch (e) {
                user = { id: entry.id, username: 'Unknown', displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' };
            }

            // Row background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath(); ctx.roundRect(15, y - 35, 370, 65, 15); ctx.fill();

            try {
                const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 64 }));
                
                const isVip = await db.get(`is_vip_${user.id}`);
                if (isVip) {
                    ctx.font = '24px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('👑', 50, y - 35);
                }

                ctx.save(); ctx.beginPath(); ctx.arc(50, y - 2, 22, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(avatar, 28, y - 24, 44, 44); ctx.restore();
            } catch (e) {}

            ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial';
            ctx.fillText(`${i + 1}. ${user.username}`, 90, y - 5);
            
            ctx.fillStyle = '#aaaaaa'; ctx.font = '14px Arial';
            ctx.fillText(`$${formatNumber(entry.money)}`, 90, y + 18);

            y += 80;
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'leaderboard.png' });
        
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lb_rich').setLabel('الأغنياء').setEmoji('💰').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('lb_thieves').setLabel('الحرامية').setEmoji('🥷').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('lb_marriage').setLabel('الزواجات').setEmoji('💍').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lb_investors').setLabel('المستثمرين').setEmoji('📈').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('lb_lands').setLabel('الأراضي').setEmoji('🏢').setStyle(ButtonStyle.Secondary)
        );

        return message.reply({ files: [attachment], components: [row1, row2] });
    }

    // Gambling Command (قمار)
    if (commandName === 'قمار') {
        const amountInput = args[0];
        const userMoney = await db.get(`money_${message.author.id}`) || 0;

        const cooldown = await db.get(`gamble_cooldown_${message.author.id}`);
        const timeout = 300000;
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تقامر مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }

        let amount;
        if (amountInput === 'كامل' || amountInput === 'كل') {
            amount = userMoney;
        } else if (amountInput === 'نص') {
            amount = Math.floor(userMoney / 2);
        } else if (amountInput === 'ربع') {
            amount = Math.floor(userMoney / 4);
        } else {
            amount = parseInt(amountInput);
        }

        if (!amount || isNaN(amount) || amount <= 0) return message.reply('❌ يجب عليك تحديد مبلغ للمراهنة.');
        if (userMoney < amount) return message.reply('❌ ليس لديك رصيد كافٍ.');

        await db.set(`gamble_cooldown_${message.author.id}`, Date.now());

        const fruits = ['🍎', '🍊', '🍇', '🍒', '🍓', '🍉'];
        const slot1 = fruits[Math.floor(Math.random() * fruits.length)];
        const slot2 = fruits[Math.floor(Math.random() * fruits.length)];
        const slot3 = fruits[Math.floor(Math.random() * fruits.length)];

        let winMultiplier = 0;
        if (slot1 === slot2 && slot2 === slot3) {
            winMultiplier = 2; // 3 matches = 2x profit
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            winMultiplier = 1; // 2 matches = 1x profit
        }

        const winAmount = amount * winMultiplier;
        if (winMultiplier > 0) {
            await db.add(`money_${message.author.id}`, winAmount);
            
            // Add XP for winning
            let level = await db.get(`level_${message.author.id}`) || 1;
            if (level < 10) {
                let xp = await db.get(`xp_${message.author.id}`) || 0;
                xp += 50;
                const nextXp = 1400;

                if (xp >= nextXp) {
                    xp -= nextXp;
                    level += 1;
                    if (level >= 10) {
                        level = 10;
                        xp = 0;
                    }
                    await db.set(`level_${message.author.id}`, level);
                    message.channel.send(`🎉 <@${message.author.id}> مبروك! لقد ارتفع مستواك وأصبحت الآن في المستوى **${level}**!`);
                }
                await db.set(`xp_${message.author.id}`, xp);
            }
            
            // Update Highest Balance
            const newBalance = (userMoney - amount) + winAmount;
            const currentHighest = await db.get(`highest_balance_${message.author.id}`) || 0;
            if (newBalance > currentHighest) {
                await db.set(`highest_balance_${message.author.id}`, newBalance);
            }
        } else {
            await db.sub(`money_${message.author.id}`, amount);
            
            // Update Highest Loss
            const currentHighestLoss = await db.get(`highest_loss_${message.author.id}`) || 0;
            if (amount > currentHighestLoss) {
                await db.set(`highest_loss_${message.author.id}`, amount);
            }
        }

        const canvas = createCanvas(600, 300);
        const ctx = canvas.getContext('2d');

        // Background
        const grad = ctx.createLinearGradient(0, 0, 600, 300);
        grad.addColorStop(0, '#444444');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 300, 30);
        ctx.fill();

        // Header
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 60, 30);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bank ${message.guild.name}`, 80, 40);

        // Server Icon
        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(45, 30, 20, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, 25, 10, 40, 40);
            ctx.restore();
        } catch (e) {}

        // Menu Icon (Two lines)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(540, 25);
        ctx.lineTo(570, 25);
        ctx.moveTo(540, 35);
        ctx.lineTo(570, 35);
        ctx.stroke();

        // User
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(message.author.username, 150, 250);

        try {
            const avatar = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(150, 150, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 90, 90, 120, 120);
            ctx.restore();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
        } catch (e) {}

        // Win/Loss Text
        if (winMultiplier > 0) {
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`+ $${formatNumber(winAmount)}`, 150, 80);
        } else {
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`- $${formatNumber(amount)}`, 150, 80);
        }

        // Slots Box
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(300, 100, 250, 150, 20);
        ctx.fill();
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw Fruit Images
        try {
            const [img1, img2, img3] = await Promise.all([
                loadImage(getEmojiUrl(slot1)),
                loadImage(getEmojiUrl(slot2)),
                loadImage(getEmojiUrl(slot3))
            ]);
            ctx.drawImage(img1, 315, 137, 75, 75);
            ctx.drawImage(img2, 385, 137, 75, 75);
            ctx.drawImage(img3, 455, 137, 75, 75);
        } catch (e) {
            console.error('Error drawing gamble emojis:', e);
            ctx.font = '70px Arial'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
            ctx.fillText(slot1, 350, 195); ctx.fillText(slot2, 425, 195); ctx.fillText(slot3, 500, 195);
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'gamble.png' });
        return message.reply({ files: [attachment] });
    }

    // Trade Command (تداول)
    if (commandName === 'تداول') {
        const amountInput = args[0];
        const userMoney = await db.get(`money_${message.author.id}`) || 0;

        let amount;
        if (amountInput === 'كامل' || amountInput === 'كل') {
            amount = userMoney;
        } else if (amountInput === 'نص') {
            amount = Math.floor(userMoney / 2);
        } else if (amountInput === 'ربع') {
            amount = Math.floor(userMoney / 4);
        } else {
            amount = parseInt(amountInput);
        }

        if (!amount || isNaN(amount) || amount <= 0) return message.reply('❌ يجب عليك تحديد مبلغ للتداول.');
        if (userMoney < amount) return message.reply('❌ ليس لديك رصيد كافٍ للتداول.');

        // Generate Random Walk
        const points = 60;
        let walk = [0];
        let currentP = 0;
        
        const targetP = Math.floor(Math.random() * 201) - 100; // -100 to +100
        
        for (let i = 1; i < points; i++) {
            const progress = i / points;
            const expectedP = targetP * progress;
            const noise = (Math.random() - 0.5) * 60; 
            currentP = expectedP + noise;
            
            if (currentP > 100) currentP = 100;
            if (currentP < -100) currentP = -100;
            
            walk.push(currentP);
        }
        walk[points - 1] = targetP;
        
        const finalPercentage = targetP;

        // Calculate Rewards/Losses
        let winAmount = 0;
        let xpGained = 0;

        if (finalPercentage > 0) {
            winAmount = Math.floor(amount * (finalPercentage / 100));
            xpGained = Math.floor(60 * (finalPercentage / 100));
            
            await db.add(`money_${message.author.id}`, winAmount);
            
            if (xpGained > 0) {
                let level = await db.get(`level_${message.author.id}`) || 1;
                if (level < 10) {
                    let xp = await db.get(`xp_${message.author.id}`) || 0;
                    xp += xpGained;
                    const nextXp = level * 1400;

                    if (xp >= nextXp) {
                        xp -= nextXp;
                        level += 1;
                        await db.set(`level_${message.author.id}`, level);
                        message.channel.send(`🎉 <@${message.author.id}> مبروك! لقد ارتفع مستواك وأصبحت الآن في المستوى **${level}**!`);
                    }
                    await db.set(`xp_${message.author.id}`, xp);
                }
            }
        } else if (finalPercentage < 0) {
            const lossAmount = Math.floor(amount * (Math.abs(finalPercentage) / 100));
            await db.sub(`money_${message.author.id}`, lossAmount);
        }

        // Draw Canvas Chart as GIF
        const width = 800;
        const height = 400;
        const encoder = new GIFEncoder(width, height);
        
        const bgCanvas = createCanvas(width, height);
        const bgCtx = bgCanvas.getContext('2d');

        // Render Background Once
        const grad = bgCtx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#2a2a2a');
        grad.addColorStop(1, '#1a1a1a');
        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.roundRect(0, 0, width, height, 15);
        bgCtx.fill();

        const chartX = 0;
        const chartY = 40;
        const chartW = width - 80;
        const chartH = height - 80;

        bgCtx.textAlign = 'right';
        bgCtx.textBaseline = 'middle';
        bgCtx.font = 'bold 16px Arial';
        bgCtx.lineWidth = 2;
        
        const levels = [100, 75, 50, 25, 0, -25, -50, -75, -100];
        
        for (let level of levels) {
            const mappedY = chartY + chartH - ((level + 100) / 200) * chartH;
            
            bgCtx.strokeStyle = '#444444';
            bgCtx.setLineDash([8, 8]);
            bgCtx.beginPath();
            bgCtx.moveTo(chartX, mappedY);
            bgCtx.lineTo(chartX + chartW, mappedY);
            bgCtx.stroke();

            bgCtx.fillStyle = '#cccccc';
            bgCtx.fillText(`${level}%`, width - 15, mappedY);
        }

        // Generate GIF Frames
        encoder.start();
        encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
        encoder.setDelay(30); // 30ms per frame
        
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const stepX = chartW / (points - 1);

        for (let frame = 1; frame <= points; frame++) {
            ctx.drawImage(bgCanvas, 0, 0); // draw pre-rendered bg

            ctx.setLineDash([]);
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            for (let i = 0; i < frame; i++) {
                const val = walk[i];
                const mappedY = chartY + chartH - ((val + 100) / 200) * chartH;
                const x = chartX + (i * stepX);
                
                if (i === 0) ctx.moveTo(x, mappedY);
                else ctx.lineTo(x, mappedY);
            }
            ctx.stroke();

            if (frame > 1) {
                // Fill under the line
                const lastX = chartX + ((frame - 1) * stepX);
                ctx.lineTo(lastX, height);
                ctx.lineTo(chartX, height);
                ctx.closePath();
                const fillGrad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
                fillGrad.addColorStop(0, 'rgba(170, 170, 170, 0.2)');
                fillGrad.addColorStop(1, 'rgba(170, 170, 170, 0.0)');
                ctx.fillStyle = fillGrad;
                ctx.fill();
            }

            if (frame === points) {
                encoder.setDelay(5000); // 5 seconds pause at the end
            }

            encoder.addFrame(ctx);
        }

        encoder.finish();

        // Format message
        let contentStr = `<@${message.author.id}>\n`;
        if (finalPercentage > 0) {
            contentStr += `**+$${winAmount.toLocaleString('en-US')}.00 (${finalPercentage}%)**`;
        } else if (finalPercentage < 0) {
            const lossAmount = Math.floor(amount * (Math.abs(finalPercentage) / 100));
            contentStr += `**-$${lossAmount.toLocaleString('en-US')}.00 (${finalPercentage}%)**`;
        } else {
            contentStr += `**$0.00 (0%)**`;
        }

        const attachment = new AttachmentBuilder(encoder.out.getData(), { name: 'trade.gif' });
        return message.reply({ content: contentStr, files: [attachment] });
    }

    // Plunder Command (نهب)
    if (commandName === 'نهب') {
        const user = message.mentions.users.first();
        if (!user) return message.reply('❌ منشن الشخص اللي تبي تنهبه!');
        if (user.id === message.author.id) return message.reply('❌ ما تقدر تنهب نفسك!');

        const targetProtection = await db.get(`protection_until_${user.id}`);
        if (targetProtection && targetProtection > Date.now()) {
            const remaining = targetProtection - Date.now();
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return message.reply(`🛡️ هذا الشخص لديه حماية نشطة! لا يمكنك نهبه حالياً (تنتهي الحماية بعد **${hours} ساعة و ${minutes} دقيقة**).`);
        }

        const cooldown = await db.get(`rob_cooldown_${message.author.id}`);
        const timeout = 300000; // 5 minutes
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تنهب مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }

        const targetMoney = await db.get(`money_${user.id}`) || 0;
        if (targetMoney < 5000) return message.reply('❌ هذا الشخص فقير، ما يستاهل النهب!');

        const win = Math.random() < 0.4; // 40% chance
        if (win) {
            const stealAmount = Math.floor(targetMoney * (Math.random() * 0.2 + 0.1)); // 10% - 30%
            await db.sub(`money_${user.id}`, stealAmount);
            await db.add(`money_${message.author.id}`, stealAmount);
            await db.add(`stolen_${message.author.id}`, stealAmount);
            await db.set(`rob_cooldown_${message.author.id}`, Date.now());

            const totalBalance = await db.get(`money_${message.author.id}`) || 0;
            const buffer = await drawRewardCard(message, stealAmount, totalBalance);
            const attachment = new AttachmentBuilder(buffer, { name: 'plunder.png' });

            return message.reply({ 
                content: `<@${message.author.id}>\n**+$${formatNumber(stealAmount)} (نجحت السرقة)**`,
                files: [attachment] 
            });
        } else {
            const fine = 2000;
            const currentMoney = await db.get(`money_${message.author.id}`) || 0;
            const toFine = Math.min(currentMoney, fine);
            await db.sub(`money_${message.author.id}`, toFine);
            await db.set(`rob_cooldown_${message.author.id}`, Date.now());
            return message.reply(`👮 حظك سيء! مسكتك الشرطة وغرمتك **${formatNumber(toFine)}** ريال.`);
        }
    }

    // Marriage Command (زواج)
    if (commandName === 'زواج') {
        const target = message.mentions.users.first();
        const mahr = parseInt(args[1]);

        if (!target) return message.reply('❌ يجب عليك منشن الشخص الذي تريد الزواج منه.');
        if (target.id === message.author.id) return message.reply('❌ ما تقدر تزوج نفسك!');
        if (target.bot) return message.reply('❌ البوتات ما تتزوج!');
        if (!mahr || isNaN(mahr) || mahr < 1000) return message.reply('❌ يجب عليك تحديد مهر صالح (أقل شيء 1000).');

        const senderPartner = await db.get(`partner_${message.author.id}`);
        if (senderPartner) return message.reply('❌ أنت متزوج بالفعل!');

        const targetPartner = await db.get(`partner_${target.id}`);
        if (targetPartner) return message.reply('❌ هذا الشخص متزوج بالفعل!');

        const userMoney = await db.get(`money_${message.author.id}`) || 0;
        if (userMoney < mahr) return message.reply('❌ ما عندك فلوس كافية للمهر!');

        // Deduct money immediately
        await db.sub(`money_${message.author.id}`, mahr);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`marry_accept_${message.author.id}_${target.id}_${mahr}`).setLabel('قبول').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`marry_reject_${message.author.id}_${target.id}_${mahr}`).setLabel('رفض').setStyle(ButtonStyle.Danger)
        );


        return message.reply({
            content: `💍 <@${target.id}>، طلب <@${message.author.id}> الزواج منك بمهر قدره **${formatNumber(mahr)}** ريال! هل تقبل؟`,
            components: [row]
        });
    }

    // Divorce Command (طلاق)
    if (commandName === 'طلاق') {
        const partnerID = await db.get(`partner_${message.author.id}`);
        if (!partnerID) return message.reply('❌ أنت غير متزوج أصلاً!');

        await db.delete(`partner_${message.author.id}`);
        await db.delete(`partner_${partnerID}`);
        
        const ids = [message.author.id, partnerID].sort();
        await db.delete(`marriage_${ids[0]}_${ids[1]}`);

        return message.reply(`💔 تم الطلاق بينك وبين <@${partnerID}>. الله يعوضكم.`);
    }

    // Protection Command (حماية)
    if (commandName === 'حماية' || commandName === 'حمايه') {
        const typeArg = args[0];
        
        if (!typeArg) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🛡️ نظام الحماية')
                .setDescription('اختر مدة الحماية التي تريد شراءها:\n\n1️⃣ **ساعة واحدة** - 10,000 ريال\n2️⃣ **ساعتين** - 20,000 ريال\n3️⃣ **ثلاث ساعات** - 30,000 ريال');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_protection_1').setLabel('1 ساعة').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('buy_protection_2').setLabel('2 ساعة').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('buy_protection_3').setLabel('3 ساعة').setStyle(ButtonStyle.Primary)
            );

            return message.reply({ embeds: [embed], components: [row] });
        }

        const type = parseInt(typeArg);
        if (![1, 2, 3].includes(type)) return message.reply('❌ يجب تحديد نوع الحماية (1، 2، أو 3 ساعات). مثال: `حماية 1`');

        const currentProtection = await db.get(`protection_until_${message.author.id}`);
        if (currentProtection && currentProtection > Date.now()) {
            const remaining = currentProtection - Date.now();
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return message.reply(`❌ لديك حماية نشطة بالفعل تنتهي بعد **${hours} ساعة و ${minutes} دقيقة**.`);
        }

        const cost = type * 10000;
        const userMoney = await db.get(`money_${message.author.id}`) || 0;
        if (userMoney < cost) return message.reply(`❌ ليس لديك رصيد كافٍ لشراء حماية لمدة ${type} ساعات (تحتاج ${formatNumber(cost)} ريال).`);

        await db.sub(`money_${message.author.id}`, cost);
        const expireAt = Date.now() + (type * 3600000);
        await db.set(`protection_until_${message.author.id}`, expireAt);

        // Success Canvas
        const canvas = createCanvas(600, 200);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath(); ctx.roundRect(0, 0, 600, 200, 20); ctx.fill();
        ctx.fillStyle = '#3498db';
        ctx.beginPath(); ctx.roundRect(0, 0, 600, 50, 20); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ تم تفعيل الحماية', 300, 35);
        ctx.font = '20px Arial';
        ctx.fillText(`المدة: ${type} ساعات | التكلفة: ${formatNumber(cost)} ريال`, 300, 110);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '16px Arial';
        ctx.fillText(`تنتهي في: ${new Date(expireAt).toLocaleTimeString('ar-EG')}`, 300, 150);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'protection.png' });
        return message.reply({ files: [attachment] });
    }

    // Party Command (بارتي)
    if (commandName === 'بارتي') {
        const isVip = await db.get(`is_vip_${message.author.id}`);
        if (!isVip) return message.reply('❌ هذا الأمر مخصص فقط لـ **كبار الشخصيات** (VIP)!');

        const amount = parseInt(args[0]);
        if (!amount || isNaN(amount) || amount < 1500000) return message.reply('❌ يجب تحديد مبلغ لا يقل عن **1,500,000** ريال لبدء البارتي.');

        const userMoney = await db.get(`money_${message.author.id}`) || 0;
        if (userMoney < amount) return message.reply('❌ ليس لديك رصيد كافٍ لبدء البارتي.');

        await db.sub(`money_${message.author.id}`, amount);

        // Draw Start Party Card (New Style based on reference)
        const startCanvas = createCanvas(600, 350);
        const sctx = startCanvas.getContext('2d');
        
        // Background
        sctx.fillStyle = '#1e1e1e';
        sctx.beginPath(); sctx.roundRect(0, 0, 600, 350, 30); sctx.fill();

        // Header Bar
        sctx.fillStyle = '#333333';
        sctx.beginPath(); sctx.roundRect(0, 0, 600, 70, 30); sctx.fill();
        sctx.fillStyle = '#ffffff'; sctx.font = 'bold 26px Arial'; sctx.textAlign = 'center';
        sctx.fillText('🥳 بدأ البارتي!', 300, 45);

        // Host Avatar (Left)
        try {
            const hostAv = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            sctx.save(); sctx.beginPath(); sctx.arc(180, 180, 65, 0, Math.PI*2); sctx.clip();
            sctx.drawImage(hostAv, 115, 115, 130, 130); sctx.restore();
            sctx.strokeStyle = '#444444'; sctx.lineWidth = 4; sctx.beginPath(); sctx.arc(180, 180, 65, 0, Math.PI*2); sctx.stroke();
        } catch(e) {}

        // Party Icon (Right Placeholder)
        sctx.font = '80px Arial';
        sctx.fillText('🎊', 420, 210);

        // Middle Icon (🎉)
        sctx.font = '50px Arial';
        sctx.fillText('✨', 300, 195);

        // Host Name & Prize Info
        sctx.fillStyle = '#ffffff'; sctx.font = 'bold 22px Arial';
        sctx.fillText(message.author.username, 300, 280);
        
        sctx.fillStyle = '#888888'; sctx.font = '18px Arial';
        sctx.fillText(`ريال ${formatNumber(amount)} :الجائزة`, 300, 315);

        const startAttachment = new AttachmentBuilder(startCanvas.toBuffer(), { name: 'party_start.png' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`party_join_${message.author.id}`).setLabel('انضمام 🎊').setStyle(ButtonStyle.Success)
        );

        const partyMsg = await message.reply({ content: `🎊 <@${message.author.id}> بدأ بارتي! الانضمام متاح لـ **30 ثانية**.`, files: [startAttachment], components: [row] });
        const participants = new Set([message.author.id]);

        const collector = partyMsg.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            if (participants.has(i.user.id)) return i.reply({ content: '❌ أنت منضم بالفعل!', ephemeral: true });
            participants.add(i.user.id);
            await i.reply({ content: '✅ انضممت إلى البارتي بنجاح!', ephemeral: true });
        });

        collector.on('end', async () => {
            if (participants.size < 2) {
                await db.add(`money_${message.author.id}`, amount);
                return partyMsg.edit({ content: '❌ تم إلغاء البارتي لعدم وجود عدد كافٍ من المشاركين (تم استرجاع المبلغ).', files: [], components: [] });
            }

            const pArray = Array.from(participants);
            const winnerId = pArray[Math.floor(Math.random() * pArray.length)];

            // Animation (Slot Machine Vertical Scroll)
            const width = 400, height = 500;
            const encoder = new GIFEncoder(width, height);
            encoder.start(); encoder.setRepeat(0); encoder.setDelay(50);

            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            const avatarBuffers = await Promise.all(pArray.map(async id => {
                const u = await client.users.fetch(id).catch(() => null);
                if (!u) return null;
                const av = await loadImage(u.displayAvatarURL({ extension: 'png', size: 128 }));
                return { id, av };
            }));
            const validAvatars = avatarBuffers.filter(a => a !== null);
            
            const winnerIdx = validAvatars.findIndex(a => a.id === winnerId);
            const itemHeight = 120;
            const totalFrames = 40;

            const totalDistance = (validAvatars.length * 5) * itemHeight + (winnerIdx * itemHeight);
            
            for (let f = 0; f < totalFrames; f++) {
                ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, width, height);
                
                // Vertical Lines for slot look
                ctx.strokeStyle = '#333333'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(100, height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, height); ctx.stroke();

                // Smooth deceleration calculation
                let currentOffset;
                if (f < 30) {
                    currentOffset = (f / 30) * (totalDistance * 0.85);
                } else {
                    const progress = (f - 30) / (totalFrames - 31);
                    const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
                    currentOffset = (totalDistance * 0.85) + (totalDistance * 0.15) * easedProgress;
                }

                // If it's the last frame, snap to target
                if (f === totalFrames - 1) currentOffset = totalDistance;

                // Draw items
                for (let i = 0; i < validAvatars.length * 10; i++) {
                    const idx = i % validAvatars.length;
                    const av = validAvatars[idx].av;
                    const y = (i * itemHeight) - currentOffset + 190;
                    
                    if (y > -itemHeight && y < height) {
                        ctx.save(); ctx.beginPath(); ctx.arc(200, y + itemHeight/2, 45, 0, Math.PI*2); ctx.clip();
                        ctx.drawImage(av, 155, y + itemHeight/2 - 45, 90, 90); ctx.restore();
                        ctx.strokeStyle = '#444444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(200, y + itemHeight/2, 45, 0, Math.PI*2); ctx.stroke();
                    }
                }

                // Selection Overlay
                ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
                ctx.fillRect(0, 190, width, itemHeight);
                ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 5;
                ctx.strokeRect(5, 190, width-10, itemHeight);

                encoder.addFrame(ctx);
            }

            // Add extra static frames at the end for clarity
            for (let i = 0; i < 20; i++) encoder.addFrame(ctx);

            encoder.finish();
            const attachment = new AttachmentBuilder(encoder.out.getData(), { name: 'party_winner.gif' });
            
            await db.add(`money_${winnerId}`, amount);
            await partyMsg.edit({ 
                content: `🎊 مبروك للفائز <@${winnerId}>! لقد ربحت **${formatNumber(amount)}** ريال!`,
                files: [attachment],
                components: []
            });
        });

        return;
    }

    // My Marriage Command (زواجي)
    if (commandName === 'زواجي') {
        const partnerID = await db.get(`partner_${message.author.id}`);
        if (!partnerID) return message.reply('❌ أنت غير متزوج.');

        const partner = await client.users.fetch(partnerID).catch(() => ({ username: 'غير معروف' }));
        const ids = [message.author.id, partnerID].sort();
        const mahr = await db.get(`marriage_${ids[0]}_${ids[1]}`) || 0;

        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');
        
        // Dark theme matching profile
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath(); ctx.roundRect(0, 0, 800, 400, 30); ctx.fill();

        // Header
        ctx.fillStyle = '#444444';
        ctx.beginPath(); ctx.roundRect(0, 0, 800, 80, 30); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('معلومات الزواج', 400, 50);

        try {
            const av1 = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            const av2 = await loadImage(partner.displayAvatarURL({ extension: 'png', size: 128 }));

            ctx.save();
            ctx.beginPath(); ctx.arc(250, 220, 70, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(av1, 180, 150, 140, 140);
            ctx.restore();

            ctx.save();
            ctx.beginPath(); ctx.arc(550, 220, 70, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(av2, 480, 150, 140, 140);
            ctx.restore();
            
            ctx.font = '60px Arial';
            ctx.fillText('❤️', 400, 240);
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${message.author.username} & ${partner.username}`, 400, 330);
        
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`المهر: ${formatNumber(mahr)} ريال`, 400, 370);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'my_marriage.png' });
        return message.reply({ files: [attachment] });
    }

    if (commandName === 'حظ') {
        const cooldown = await db.get(`luck_cooldown_${message.author.id}`);
        const timeout = 300000;
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تجرب حظك مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }
        await db.set(`luck_cooldown_${message.author.id}`, Date.now());
        
        const loadingMsg = await message.reply('جاري انشاء العجله...');

        const rewards = [
            { type: 'money', value: 10000, label: '10K', emoji: '💵' },
            { type: 'money', value: 20000, label: '20K', emoji: '💵' },
            { type: 'money', value: 40000, label: '40K', emoji: '💵' },
            { type: 'money', value: 60000, label: '60K', emoji: '💵' },
            { type: 'item', id: 'gold', value: 100, label: 'ذهب', emoji: '📀' },
            { type: 'item', id: 'steel', value: 50, label: 'فولاذ', emoji: '🔩' },
            { type: 'item', id: 'wood', value: 10, label: 'خشب', emoji: '🪵' },
            { type: 'item', id: 'iron', value: 40, label: 'حديد', emoji: '⚙️' },
            { type: 'item', id: 'brick', value: 70, label: 'طوب', emoji: '🧱' },
            { type: 'item', id: 'stone', value: 120, label: 'حجر', emoji: '🪨' }
        ];

        // Generate a random sequence for the spinner (no consecutive duplicates)
        const spinnerItems = [];
        const shuffledRewards = [...rewards].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 3; i++) {
            spinnerItems.push(...shuffledRewards);
        }
        
        const winnerIndex = 25; // Stop at this index
        const winner = spinnerItems[winnerIndex];

        // Pre-load all reward emojis
        const emojiMap = new Map();
        const uniqueEmojis = [...new Set(rewards.map(r => r.emoji))];
        try {
            const loaded = await Promise.all(uniqueEmojis.map(e => loadImage(getEmojiUrl(e))));
            uniqueEmojis.forEach((e, i) => emojiMap.set(e, loaded[i]));
        } catch (e) { console.error('Error loading luck emojis:', e); }

        const width = 600;
        const height = 300;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const encoder = new GIFEncoder(width, height);

        encoder.start();
        encoder.setRepeat(0);  
        encoder.setDelay(50);   
        encoder.setQuality(10); 

        const totalFrames = 35; 
        let shift = 0;

        let userAvatar;
        try {
            userAvatar = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 64 }));
        } catch (e) {}

        for (let f = 0; f < totalFrames; f++) {
            // Slow down the animation at the end
            if (f > 25) encoder.setDelay(50 + (f - 25) * 50); 
            if (f === totalFrames - 1) encoder.setDelay(5000); // Hold last frame for 5 seconds

            // Background
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(0, 0, width, height);

            // Spinner Bar Background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 100, width, 120);

            // Calculate shift: winner index (25) should be at center (300px)
            // Item center = x + 30. We want x + 30 = 300 => x = 270.
            // Items start at 10. Each item is 65px wide.
            // Target offset for item 25 = 25 * 65.
            // In the final frame (f=totalFrames-1), we want x = 270 for i=25.
            // So 10 + (25 * 65) - totalShift = 270 => totalShift = 10 + 1625 - 270 = 1365.
            
            let currentShift;
            if (f < 25) {
                currentShift = f * 50; // Constant speed
            } else {
                // Smooth deceleration to 1365
                const progress = (f - 25) / (totalFrames - 25 - 1);
                currentShift = 1250 + (1365 - 1250) * progress; 
            }

            // Draw Items with shift
            let x = 10 + (0 * 65) - currentShift; 
            for (let i = 0; i < spinnerItems.length; i++) {
                const item = spinnerItems[i];
                if (x + 60 > 0 && x < width) {
                    ctx.fillStyle = '#3a3a3a';
                    ctx.beginPath(); ctx.roundRect(x, 110, 60, 60, 10); ctx.fill();
                    let color = '#ffffff';
                    if (item.type === 'money') color = '#2ecc71';
                    else if (item.id === 'gold') color = '#FFD700';
                    else if (item.id === 'steel') color = '#b0c4de';
                    else if (item.id === 'wood') color = '#cd853f';
                    else if (item.id === 'iron') color = '#bdc3c7';
                    else if (item.id === 'brick') color = '#e74c3c';
                    else if (item.id === 'stone') color = '#95a5a6';

                    const emojiImg = emojiMap.get(item.emoji);
                    if (emojiImg) {
                        ctx.drawImage(emojiImg, x + 10, 120, 40, 40);
                    } else {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = '35px Arial'; ctx.textAlign = 'center';
                        ctx.fillText(item.emoji, x + 30, 150);
                    }
                    
                    ctx.fillStyle = color;
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 12px Arial';
                    if (item.type === 'money') {
                        ctx.fillText(`${formatNumber(item.value).replace('.0', '')}`, x + 30, 190);
                    } else {
                        ctx.fillText(`x${item.value}`, x + 30, 190);
                        ctx.font = '10px Arial'; ctx.fillText(item.label, x + 30, 205);
                    }
                }
                x += 65;
            }

            // Indicator Arrow
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.moveTo(290, 80); ctx.lineTo(310, 80); ctx.lineTo(300, 100); ctx.closePath(); ctx.fill();

            // User Branding
            if (userAvatar) {
                ctx.save(); ctx.beginPath(); ctx.arc(280, 260, 15, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(userAvatar, 265, 245, 30, 30); ctx.restore();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'left';
                ctx.fillText(message.author.username, 300, 265);
            } else {
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
                ctx.fillText(message.author.username, 300, 265);
            }

            encoder.addFrame(ctx);
        }

        encoder.finish();

        const buffer = encoder.out.getData();

        // Grant Reward
        let rewardMsg = '';
        if (winner.type === 'money') {
            await db.add(`money_${message.author.id}`, winner.value);
            rewardMsg = `💵 حصلت على **${formatNumber(winner.value)}** ريال.`;
        } else {
            await db.add(`inv_${message.author.id}_${winner.id}`, winner.value);
            rewardMsg = `🎁 حصلت على **${winner.value}** حبة من **${winner.label}**.`;
        }

        const attachment = new AttachmentBuilder(buffer, { name: 'luck.gif' });
        return loadingMsg.edit({ content: rewardMsg, files: [attachment] });
    }

    // Fruits Game Command (فواكه)
    if (commandName === 'فواكه') {
        const cooldown = await db.get(`fruits_cooldown_${message.author.id}`);
        const timeout = 300000;
        if (cooldown !== null && timeout - (Date.now() - cooldown) > 0) {
            const time = timeout - (Date.now() - cooldown);
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            return message.reply(`⏰ تقدر تلعب فواكه مرة ثانية بعد **${minutes} دقيقة و ${seconds} ثانية**.`);
        }
        await db.set(`fruits_cooldown_${message.author.id}`, Date.now());
        const fruits = ['🍎', '🍊', '🍌', '🥭', '🥥', '🍋', '🍏', '🍓', '🍉', '🥑'];
        const shuffledFruits = [...fruits].sort(() => Math.random() - 0.5);

        const canvas = createCanvas(800, 500);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Container
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.roundRect(40, 40, 720, 420, 20);
        ctx.fill();

        // Top Text BG
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.roundRect(100, 60, 600, 60, 30);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('سيتم إخفاء الفواكه خلال 5 ثوانٍ ..', 400, 100);

        // Draw Fruits Grid
        const startX = 140;
        const startY = 160;
        const spacingX = 130;
        const spacingY = 140;

        // Pre-load fruit images
        const fruitMap = new Map();
        const uniqueFruits = [...new Set(shuffledFruits)];
        try {
            const loaded = await Promise.all(uniqueFruits.map(f => loadImage(getEmojiUrl(f))));
            uniqueFruits.forEach((f, i) => fruitMap.set(f, loaded[i]));
        } catch (e) { console.error('Error loading fruit images:', e); }

        for (let i = 0; i < 10; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const x = startX + (col * spacingX) - 35;
            const y = startY + (row * spacingY);
            const emojiImg = fruitMap.get(shuffledFruits[i]);
            if (emojiImg) {
                ctx.drawImage(emojiImg, x, y, 75, 75);
            } else {
                ctx.font = '70px Arial'; ctx.fillStyle = '#ffffff';
                ctx.fillText(shuffledFruits[i], x + 35, y + 70);
            }
        }

        const buffer1 = canvas.toBuffer();
        const attachment1 = new AttachmentBuilder(buffer1, { name: 'fruits.png' });

        // Buttons (Disabled with Emojis)
        let rows1 = [];
        for (let i = 0; i < 2; i++) {
            const row = new ActionRowBuilder();
            for (let j = 0; j < 5; j++) {
                const index = i * 5 + j;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`fruit_init_${index}`)
                        .setEmoji(shuffledFruits[index])
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            }
            rows1.push(row);
        }

        const gameMessage = await message.reply({ files: [attachment1], components: rows1 });

        // Wait 5 seconds
        await new Promise(r => setTimeout(r, 5000));

        // Draw Canvas 2 (Fruits Hidden, ?)
        const canvas2 = createCanvas(800, 500);
        const ctx2 = canvas2.getContext('2d');
        ctx2.fillStyle = '#1c1c1c';
        ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
        ctx2.fillStyle = '#2c2c2c';
        ctx2.beginPath();
        ctx2.roundRect(40, 40, 720, 420, 20);
        ctx2.fill();

        ctx2.fillStyle = '#3a3a3a';
        ctx2.beginPath();
        ctx2.roundRect(100, 60, 600, 60, 30);
        ctx2.fill();
        
        ctx2.fillStyle = '#ffffff';
        ctx2.font = 'bold 30px Arial';
        ctx2.textAlign = 'center';
        
        for (let i = 0; i < 10; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const x = startX - 45 + (col * spacingX);
            const y = startY - 70 + (row * spacingY);
            
            ctx2.fillStyle = '#222222';
            ctx2.beginPath();
            ctx2.roundRect(x, y, 90, 90, 10);
            ctx2.fill();

            ctx2.fillStyle = '#ffffff';
            ctx2.font = 'bold 40px Arial';
            ctx2.fillText('?', x + 45, y + 60);
        }

        const targetSequence = [...shuffledFruits].sort(() => Math.random() - 0.5);
        let currentRound = 0;
        let buttonStates = Array(10).fill('secondary');

        const updateGameMessage = async (state) => {
            const currentCanvas = createCanvas(800, 500);
            const cctx = currentCanvas.getContext('2d');
            cctx.drawImage(canvas2, 0, 0);
            
            cctx.fillStyle = '#ffffff';
            cctx.font = 'bold 30px Arial';
            cctx.textAlign = 'center';

            if (state === 'playing') {
                cctx.font = 'bold 30px "Segoe UI Emoji", Arial';
                cctx.fillText(`أين توجد ${targetSequence[currentRound]} ؟`, 400, 100);
            } else if (state === 'won') {
                cctx.fillText('لقد فزت!', 400, 100);
            } else if (state === 'lost') {
                cctx.fillText('لقد خسرت!', 400, 100);
            }

            const buffer = currentCanvas.toBuffer();
            return new AttachmentBuilder(buffer, { name: 'fruits_game.png' });
        };

        const getComponentRows = (disabled = false) => {
            let rows = [];
            for (let i = 0; i < 2; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 5; j++) {
                    const index = i * 5 + j;
                    const styleMap = {
                        'secondary': ButtonStyle.Secondary,
                        'success': ButtonStyle.Success,
                        'danger': ButtonStyle.Danger
                    };
                    const btn = new ButtonBuilder()
                        .setCustomId(`fruit_btn_${index}_${Date.now()}`) // Unique ID
                        .setLabel('\u200b') // Zero-width space
                        .setStyle(styleMap[buttonStates[index]])
                        .setDisabled(disabled || buttonStates[index] !== 'secondary');
                    row.addComponents(btn);
                }
                rows.push(row);
            }
            return rows;
        };

        await gameMessage.edit({
            content: `<@${message.author.id}>`,
            files: [await updateGameMessage('playing')],
            components: getComponentRows()
        });

        const filter = i => i.user.id === message.author.id && i.customId.startsWith('fruit_btn_');
        const collector = gameMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const index = parseInt(i.customId.split('_')[2]);
            const selectedFruit = shuffledFruits[index];
            const target = targetSequence[currentRound];

            if (selectedFruit === target) {
                buttonStates[index] = 'success';
                currentRound++;

                if (currentRound === 10) {
                    collector.stop('won');
                    await db.add(`money_${message.author.id}`, 20000);
                    
                    const currentLevel = await db.get(`level_${message.author.id}`) || 1;
                    if (currentLevel < 10) {
                        const currentXP = await db.get(`xp_${message.author.id}`) || 0;
                        const newXP = currentXP + 42;
                        const xpNeeded = currentLevel * 1400;
                        if (newXP >= xpNeeded) {
                            await db.add(`level_${message.author.id}`, 1);
                            await db.set(`xp_${message.author.id}`, newXP - xpNeeded);
                            message.channel.send(`🎉 مبروك <@${message.author.id}>! ارتفع مستواك إلى **Level ${currentLevel + 1}**!`);
                        } else {
                            await db.set(`xp_${message.author.id}`, newXP);
                        }
                    }

                    await i.update({
                        content: `🎉 <@${message.author.id}> مبروك! لقد فزت بـ **20,000** ريال و **42 XP**!`,
                        files: [await updateGameMessage('won')],
                        components: getComponentRows(true)
                    });
                } else {
                    await i.update({
                        files: [await updateGameMessage('playing')],
                        components: getComponentRows()
                    });
                    collector.resetTimer();
                }
            } else {
                buttonStates[index] = 'danger';
                collector.stop('lost');
                await i.update({
                    content: `❌ <@${message.author.id}> للأسف إجابة خاطئة!`,
                    files: [await updateGameMessage('lost')],
                    components: getComponentRows(true)
                });
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await gameMessage.edit({
                    content: `⏰ انتهى الوقت يا <@${message.author.id}>!`,
                    components: getComponentRows(true)
                });
            }
        });
        
        return;
    }


    // Loan Command (قرض)
    if (commandName === 'قرض') {
        const hasLoan = await db.get(`loan_${message.author.id}`);
        if (hasLoan) return message.reply('❌ عندك قرض سدده أولاً قبل ما تاخذ واحد جديد.');

        const loanAmount = 100000;
        await db.add(`money_${message.author.id}`, loanAmount);
        await db.set(`loan_${message.author.id}`, true);

        const canvas = createCanvas(600, 300);
        const ctx = canvas.getContext('2d');

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 600, 300);
        grad.addColorStop(0, '#444444');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 300, 30);
        ctx.fill();

        // Header Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 60, 30);
        ctx.fill();

        // Server Info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bank ${message.guild.name}`, 80, 40);

        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(45, 30, 20, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, 25, 10, 40, 40);
            ctx.restore();
        } catch (e) {}

        // Menu Icon (Two lines)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(540, 25);
        ctx.lineTo(570, 25);
        ctx.moveTo(540, 35);
        ctx.lineTo(570, 35);
        ctx.stroke();

        // User Info
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(message.author.username, 330, 100);

        try {
            const avatar = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(280, 92, 15, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 265, 77, 30, 30);
            ctx.restore();
        } catch (e) {}

        // Amount Text
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 60px Arial';
        ctx.fillText(`+ $100K`, 300, 180);

        // Green Up Arrow Icon
        ctx.beginPath();
        ctx.moveTo(250, 215); // Bottom
        ctx.lineTo(270, 215); // Bottom
        ctx.lineTo(260, 200); // Top
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`+ $100K`, 280, 218);

        // Logos (Simplified placeholders)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('VISA', 40, 270);
        ctx.beginPath();
        ctx.arc(120, 262, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(135, 262, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px Arial';
        ctx.fillText(message.author.id, 40, 285);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'loan.png' });
        return message.reply({ files: [attachment] });
    }

    // Repay Command (سداد)
    if (commandName === 'سداد') {
        const hasLoan = await db.get(`loan_${message.author.id}`);
        if (!hasLoan) return message.reply('❌ ما عليك قرض أصلاً لتسدده.');

        const repayAmount = 100000;
        const balance = await db.get(`money_${message.author.id}`) || 0;

        if (balance < repayAmount) return message.reply(`❌ رصيدك غير كافٍ لسداد القرض. تحتاج إلى **${formatNumber(repayAmount)}** ريال.`);

        await db.sub(`money_${message.author.id}`, repayAmount);
        await db.delete(`loan_${message.author.id}`);

        const canvas = createCanvas(600, 300);
        const ctx = canvas.getContext('2d');

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 600, 300);
        grad.addColorStop(0, '#444444');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 300, 30);
        ctx.fill();

        // Header Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 600, 60, 30);
        ctx.fill();

        // Server Info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Bank ${message.guild.name}`, 80, 40);

        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(45, 30, 20, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, 25, 10, 40, 40);
            ctx.restore();
        } catch (e) {}

        // Menu Icon (Two lines)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(540, 25);
        ctx.lineTo(570, 25);
        ctx.moveTo(540, 35);
        ctx.lineTo(570, 35);
        ctx.stroke();

        // User Info
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(message.author.username, 330, 100);

        try {
            const avatar = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.beginPath();
            ctx.arc(280, 92, 15, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, 265, 77, 30, 30);
            ctx.restore();
        } catch (e) {}

        // Amount Text
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 60px Arial';
        ctx.fillText(`- $100K`, 300, 180);

        // Red Down Arrow Icon
        ctx.beginPath();
        ctx.moveTo(250, 203); // Top
        ctx.lineTo(270, 203); // Top
        ctx.lineTo(260, 218); // Bottom
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`- $100K`, 280, 218);

        // Logos
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('VISA', 40, 270);
        ctx.beginPath();
        ctx.arc(120, 262, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(135, 262, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px Arial';
        ctx.fillText(message.author.id, 40, 285);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'repay.png' });
        return message.reply({ files: [attachment] });
    }

    // Investment Command (استثمار)
    if (commandName === 'استثمار') {
        const investBalance = await db.get(`invest_balance_${message.author.id}`) || 0;
        const totalProfitEarned = await db.get(`invest_total_profit_${message.author.id}`) || 0;
        
        let readyProfits = 0;
        if (investBalance > 0) {
            const lastCollect = await db.get(`invest_last_collect_${message.author.id}`) || Date.now();
            const diffMs = Date.now() - lastCollect;
            const cycleMs = 3600000; // 1 hour cycle
            const diffCycles = Math.floor(diffMs / cycleMs);
            const profitPerCycle = Math.floor(investBalance * 0.05); // 5% per cycle
            readyProfits = diffCycles * profitPerCycle;
        }

        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, 1000, 500);

        // Main Card
        const cardX = 30, cardY = 30, cardW = 940, cardH = 440;
        ctx.fillStyle = '#444444'; // Base card color
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 40);
        ctx.fill();
        
        // Darker overlay for card depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 40);
        ctx.fill();

        // Darker Header Bar
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, 70, 40);
        ctx.fill();

        // Server Icon & Name (Header)
        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(cardX + 60, cardY + 35, 25, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(serverIcon, cardX + 35, cardY + 10, 50, 50);
            ctx.restore();
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Investment ${message.guild.name}`, cardX + 100, cardY + 45);

        // Left Side: User Profile & Stats
        // Avatar
        try {
            const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(cardX + 250, cardY + 170, 70, 0, Math.PI * 2);
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(avatar, cardX + 180, cardY + 100, 140, 140);
            ctx.restore();
        } catch (e) {}

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message.author.username, cardX + 250, cardY + 280);

        // 3 Stats Pills
        const statsData = [
            { icon: '🏦', val: `$${formatNumber(investBalance)}` },
            { icon: '📈', val: `$${formatNumber(totalProfitEarned)}` },
            { icon: '💰', val: `$${formatNumber(readyProfits)}` }
        ];

        statsData.forEach((stat, i) => {
            const rowY = cardY + 310 + (i * 40);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(cardX + 125, rowY, 250, 32, 16);
            ctx.fill();

            // Icon Circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(cardX + 141, rowY + 16, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(stat.icon, cardX + 141, rowY + 22);

            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(stat.val, cardX + 360, rowY + 22);
        });

        // Right Side: Investment Graphics
        const rightX = cardX + 650;
        const rightY = cardY + 120;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('نسبة الربح الحالية', rightX, rightY - 10);

        // Up Arrow Triangle Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(rightX, rightY + 10);
        ctx.lineTo(rightX + 100, rightY + 120);
        ctx.lineTo(rightX - 100, rightY + 120);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px Arial';
        ctx.fillText('%12', rightX, rightY + 60);
        ctx.font = 'bold 16px Arial';
        ctx.fillText('%2 اساسي', rightX, rightY + 85);
        ctx.fillText('%10 صندوق', rightX, rightY + 110);

        // Value Pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(rightX - 150, rightY + 150, 300, 45, 22);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        const displayVal = investBalance > 0 ? `$${investBalance}` : '$0';
        ctx.fillText(displayVal, rightX, rightY + 178);
        
        ctx.textAlign = 'left';
        ctx.fillText('🏦', rightX - 130, rightY + 178);

        // 3D Isometric Cube Box
        const cx = rightX, cy = rightY + 250, size = 50;
        // Top face
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size * 0.866, cy - size/2);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - size * 0.866, cy - size/2);
        ctx.closePath();
        ctx.fill();

        // Left face
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.866, cy - size/2);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size * 0.866, cy + size/2);
        ctx.closePath();
        ctx.fill();

        // Right face
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + size * 0.866, cy - size/2);
        ctx.lineTo(cx + size * 0.866, cy + size/2);
        ctx.lineTo(cx, cy + size);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', cx - size * 0.4, cy + size * 0.35);
        ctx.fillText('$', cx + size * 0.4, cy + size * 0.35);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'invest.png' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('invest_add').setLabel('استثمر ➕').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('invest_collect_profits').setLabel('سحب الأرباح 💰').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('invest_withdraw').setLabel('سحب المبلغ 🏦').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('invest_info').setLabel('ℹ️').setStyle(ButtonStyle.Secondary)
        );

        return message.reply({ files: [attachment], components: [row] });
    }

    // Real Estate Command (ارض)

    if (commandName === 'ارض') {
        const userLands = await db.get(`lands_data_${message.author.id}`) || [];
        const userMoney = await db.get(`money_${message.author.id}`) || 0;
        
        let totalProfitPerMin = 0;
        userLands.forEach(land => {
            const prop = properties.find(p => p.name === land.name);
            if (prop) totalProfitPerMin += prop.profit;
        });

        const canvas = createCanvas(1000, 500);
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, 1000, 500);

        // Left Card - Exact Reference Style
        const cardX = 30, cardY = 30, cardW = 320, cardH = 440;
        ctx.fillStyle = '#444444'; // Base card color
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 40);
        ctx.fill();
        
        // Darker overlay for card depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 40);
        ctx.fill();

        // User Avatar with Border
        try {
            const avatar = await loadImage(message.author.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.save();
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(cardX + cardW/2, cardY + 80, 55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(avatar, cardX + cardW/2 - 55, cardY + 25, 110, 110);
            ctx.restore();
        } catch (e) {}

        // Username
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message.author.username, cardX + cardW/2, cardY + 170);

        const diffMs = Date.now() - (await db.get(`last_collect_${message.author.id}`) || Date.now());
        const diffCycles = Math.floor(diffMs / 240000);
        const accumulatedProfit = diffCycles * totalProfitPerMin;

        // Stats Rows
        const statsYStart = cardY + 200;
        const statsData = [
            { icon: '💲', val: `$${formatNumber(userMoney)}` },
            { icon: '📊', val: `$${formatNumber(userLands.length * 500000)}` },
            { icon: '🕒', val: `$${formatNumber(totalProfitPerMin)}/4Min` },
            { icon: '🏠', val: `${userLands.length}/11` }
        ];

        statsData.forEach((stat, i) => {
            const rowY = statsYStart + (i * 55);
            // Row background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(cardX + 25, rowY, cardW - 50, 45, 22);
            ctx.fill();

            // Icon Circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(cardX + 50, rowY + 22, 18, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(stat.icon, cardX + 50, rowY + 28);

            // Value
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(stat.val, cardX + cardW - 45, rowY + 30);
        });

        // Right Side - Exact Map from User
        try {
            // Load the user's provided clean map image
            const mapAssetPath = path.join('C:', 'Users', 'HP', '.gemini', 'antigravity', 'brain', '8731095b-9ab2-4261-9057-5c83880f7dc8', 'media__1777329100719.png');
            const mapImage = await loadImage(mapAssetPath);
            // Draw it with a slight crop/adjustment if needed, but here we just place it
            ctx.drawImage(mapImage, 380, 50, 600, 400); 
        } catch (e) {
            console.error('Error loading map asset:', e);
            // Fallback if image fails to load
            ctx.fillStyle = '#2c2c2c';
            ctx.beginPath();
            ctx.roundRect(400, 50, 550, 400, 40);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Map Loading...', 675, 250);
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'land.png' });

        const groupedLands = {};
        userLands.forEach(land => {
            groupedLands[land.name] = (groupedLands[land.name] || 0) + 1;
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId('manage_property')
            .setPlaceholder('اختر العقار للتحكم فيه')
            .addOptions(
                { label: '🏙️ سوق العقارات', description: 'شراء عقارات جديدة', value: 'real_estate_market' },
                ...Object.keys(groupedLands).map(name => ({
                    label: name,
                    description: `أنت تملك ${groupedLands[name]} من هذا العقار`,
                    value: `manage_${name}`
                }))
            );

        const row1 = new ActionRowBuilder().addComponents(select);
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('collect_profits').setLabel('جمع الأرباح').setEmoji('💰').setStyle(ButtonStyle.Success)
        );

        return message.reply({ files: [attachment], components: [row1, row2] });
    }

    // Profile Command (بروفايل)
    if (commandName === 'بروفايل' || commandName === 'profile') {
        const user = message.mentions.users.first() || message.author;
        const balance = await db.get(`money_${user.id}`) || 0;
        
        const profileEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setAuthor({ name: `بروفايل ${user.username}`, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '💰 الرصيد:', value: `\`${balance}\` ريال`, inline: true },
                { name: '🆔 المعرف:', value: `\`${user.id}\``, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.username}` })
            .setTimestamp();

        return message.reply({ embeds: [profileEmbed] });
    }

    // Market Command (سوق)
    if (commandName === 'سوق' || commandName === 'market') {
        const canvas = createCanvas(800, 550);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2c2c2c'; // Grey background
        ctx.beginPath();
        ctx.roundRect(0, 0, 800, 550, 30);
        ctx.fill();

        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Market ${message.guild.name}`, 30, 50);

        // Server Icon
        try {
            const iconUrl = message.guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const serverIcon = await loadImage(iconUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(750, 40, 25, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(serverIcon, 725, 15, 50, 50);
            ctx.restore();
        } catch (e) {
            console.log('Error loading server icon:', e);
        }

        // Draw Items
        let xPos = 30, yPos = 80;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const price = marketPrices[item.id] || { buy: 0, sell: 0 };

            // Item Card Background
            ctx.fillStyle = '#3a3a3a';
            ctx.beginPath();
            ctx.roundRect(xPos, yPos, 220, 120, 15);
            ctx.fill();
            ctx.strokeStyle = '#4a4a4a';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Item Icon Square
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.roundRect(xPos + 10, yPos + 10, 80, 80, 10);
            ctx.fill();

            // Item Emoji
            ctx.fillStyle = '#ffffff';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(item.emoji, xPos + 50, yPos + 65);

            // Item Name (Below Square)
            let color = '#ffffff';
            if (item.id === 'gold') color = '#FFD700';
            else if (item.id === 'steel') color = '#b0c4de';
            else if (item.id === 'wood') color = '#cd853f';
            else if (item.id === 'iron') color = '#bdc3c7';
            else if (item.id === 'brick') color = '#e74c3c';
            else if (item.id === 'stone') color = '#95a5a6';

            ctx.fillStyle = color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            // Random height for the name as requested
            const nameOffset = (Math.random() * 10) - 5; 
            ctx.fillText(item.name, xPos + 50, yPos + 110 + nameOffset);

            // Price Sub-boxes
            // Buy Price Box
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.roundRect(xPos + 100, yPos + 15, 110, 40, 10);
            ctx.fill();
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`▲ $${formatNumber(price.buy)}`, xPos + 110, yPos + 40);

            // Sell Price Box
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.roundRect(xPos + 100, yPos + 65, 110, 40, 10);
            ctx.fill();
            ctx.fillStyle = '#e74c3c';
            ctx.textAlign = 'left';
            ctx.fillText(`▼ $${(price.sell / 1000).toFixed(1)}K`, xPos + 110, yPos + 90);

            yPos += 140;
            if (i === 2) {
                xPos = 270;
                yPos = 80;
            }
        }

        // Right Panel (User Profile)
        const user = message.author;
        const balance = await db.get(`money_${user.id}`) || 0;

        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.roundRect(520, 80, 250, 380, 20);
        ctx.fill();

        // User Avatar
        try {
            const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(645, 160, 60, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 585, 100, 120, 120);
            ctx.restore();

            // Add circular border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(645, 160, 60, 0, Math.PI * 2);
            ctx.stroke();
        } catch (e) {
            console.log('Error loading avatar:', e);
            // Draw a placeholder circle if avatar fails
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(645, 160, 60, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${user.username}`, 645, 250);

        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.roundRect(540, 270, 210, 40, 20);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(`$ ${formatNumber(balance)}`, 645, 297);

        // Inventory Section Background
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.roundRect(540, 320, 210, 120, 15);
        ctx.fill();

        // Inventory
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        let invY = 350;
        for (let i = 0; i < items.length; i++) {
            const count = await db.get(`inv_${user.id}_${items[i].id}`) || 0;
            const xOffset = i % 2 === 0 ? 0 : 100;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${items[i].emoji}`, 555 + xOffset, invY);
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`x${count}`, 585 + xOffset, invY);
            ctx.font = '16px Arial';
            if (i % 2 !== 0) invY += 35;
        }

        // Footer
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const timeStr = new Date(lastUpdate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        const footerX = 400;
        const footerY = 530;
        
        ctx.fillStyle = '#888888';
        ctx.fillText(`آخر تحديث ${timeStr}  • `, footerX - 100, footerY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`سعر الشراء`, footerX + 20, footerY);
        ctx.fillStyle = '#2ecc71';
        ctx.fillText(`▲`, footerX + 75, footerY);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`  سعر البيع`, footerX + 130, footerY);
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`▼`, footerX + 180, footerY);

        const buffer = canvas.toBuffer();
        const attachment = new AttachmentBuilder(buffer, { name: 'market.png' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('market_select')
            .setPlaceholder('اختر نوع العملية والمادة')
            .addOptions(
                items.flatMap(item => [
                    { label: `شراء ${item.name}`, value: `buy_${item.id}`, emoji: item.emoji },
                    { label: `بيع ${item.name}`, value: `sell_${item.id}`, emoji: item.emoji }
                ]).concat([
                    { label: 'شراء من كل المواد', description: 'شراء بالتساوي بكل رصيدك', value: 'buyall_global', emoji: '🛒' },
                    { label: 'بيع كل المخزون', description: 'بيع جميع موادك', value: 'sellall_global', emoji: '💰' }
                ])
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        return message.reply({ files: [attachment], components: [row] });
    }

    // Buy Command (شراء)
    if (commandName === 'شراء') {
        const itemNameInput = args[0];
        let quantityInput = args[1];

        if (!itemNameInput) return message.reply('❌ الاستخدام الصحيح: `شراء [اسم المادة] [الكمية]`\nمثال: `شراء حجر 500` أو `شراء حجر` (لشراء أقصى كمية برصيدك)');

        const item = items.find(i => i.name === itemNameInput || i.id === itemNameInput);
        if (!item) return message.reply('❌ هذه المادة غير موجودة في السوق.');

        const price = marketPrices[item.id];
        const userMoney = await db.get(`money_${message.author.id}`) || 0;

        let quantity;
        if (!quantityInput || quantityInput === 'كامل' || quantityInput === 'كل') {
            quantity = Math.floor(userMoney / price.buy);
        } else if (quantityInput === 'نص') {
            quantity = Math.floor((userMoney / 2) / price.buy);
        } else if (quantityInput === 'ربع') {
            quantity = Math.floor((userMoney / 4) / price.buy);
        } else {
            quantity = parseInt(quantityInput);
        }

        if (isNaN(quantity) || quantity < 500) {
            if (!quantityInput || quantityInput === 'كامل' || quantityInput === 'كل') {
                return message.reply(`❌ رصيدك لا يكفي لشراء الحد الأدنى (500) من **${item.name}**.\nتحتاج على الأقل **${formatNumber(price.buy * 500)}** ريال.`);
            }
            return message.reply('❌ أقل كمية يمكنك شراؤها هي **500**.');
        }

        const totalCost = price.buy * quantity;
        if (userMoney < totalCost) {
            return message.reply(`❌ ليس لديك رصيد كافٍ. التكلفة الإجمالية: **${totalCost}** ريال.`);
        }

        await db.sub(`money_${message.author.id}`, totalCost);
        await db.add(`inv_${message.author.id}_${item.id}`, quantity);
        return message.reply(`✅ لقد اشتريت **${formatNumber(quantity)}** من **${item.name}** بسعر **${formatNumber(totalCost)}** ريال.`);
    }

    // Sell Command (بيع)
    if (commandName === 'بيع') {
        const itemNameInput = args[0];
        let quantityInput = args[1];

        if (!itemNameInput) return message.reply('❌ الاستخدام الصحيح: `بيع [اسم المادة] [الكمية]`\nمثال: `بيع حجر 500` أو `بيع حجر` (لبيع كل الكمية)');

        const item = items.find(i => i.name === itemNameInput || i.id === itemNameInput);
        if (!item) return message.reply('❌ هذه المادة غير موجودة في السوق.');

        const userInv = await db.get(`inv_${message.author.id}_${item.id}`) || 0;

        let quantity;
        if (!quantityInput || quantityInput === 'كامل' || quantityInput === 'كل') {
            quantity = userInv;
        } else if (quantityInput === 'نص') {
            quantity = Math.floor(userInv / 2);
        } else if (quantityInput === 'ربع') {
            quantity = Math.floor(userInv / 4);
        } else {
            quantity = parseInt(quantityInput);
        }

        if (isNaN(quantity) || quantity < 500) {
            if (!quantityInput || quantityInput === 'كامل' || quantityInput === 'كل') {
                return message.reply(`❌ لا تملك الحد الأدنى (500) من **${item.name}** للبيع. لديك **${userInv}** فقط.`);
            }
            return message.reply('❌ أقل كمية يمكنك بيعها هي **500**.');
        }

        const price = marketPrices[item.id];
        const totalGain = price.sell * quantity;

        await db.add(`money_${message.author.id}`, totalGain);
        await db.sub(`inv_${message.author.id}_${item.id}`, quantity);
        return message.reply(`✅ لقد بعت **${formatNumber(quantity)}** من **${item.name}** بسعر **${formatNumber(totalGain)}** ريال.`);
    }
});

// Interaction Handling
client.on('interactionCreate', async (interaction) => {
    // Guild Check
    if (process.env.GUILD_ID && interaction.guild.id !== process.env.GUILD_ID) return;
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'market_select') {
            const [action, itemId] = interaction.values[0].split('_');

            if (action === 'buyall' && itemId === 'global') {
                const userMoney = await db.get(`money_${interaction.user.id}`) || 0;
                if (userMoney < items.length * 500) return interaction.reply({ content: '❌ رصيدك غير كافٍ لشراء جميع المواد.', ephemeral: true });

                const budgetPerItem = Math.floor(userMoney / items.length);
                let totalCost = 0;
                let boughtText = [];

                for (const item of items) {
                    const price = marketPrices[item.id].buy;
                    const quantity = Math.floor(budgetPerItem / price);
                    if (quantity > 0) {
                        const cost = quantity * price;
                        totalCost += cost;
                        boughtText.push(`${formatNumber(quantity)} ${item.name}`);
                        await db.add(`inv_${interaction.user.id}_${item.id}`, quantity);
                    }
                }
                
                if (totalCost === 0) return interaction.reply({ content: '❌ لم تتمكن من شراء أي شيء بهذا الرصيد.', ephemeral: true });
                await db.sub(`money_${interaction.user.id}`, totalCost);
                return interaction.reply({ content: `✅ اشتريت من كل المواد: **${boughtText.join('، ')}** بإجمالي **${formatNumber(totalCost)}** ريال.`, ephemeral: true });

            } else if (action === 'sellall' && itemId === 'global') {
                let totalGain = 0;
                let soldText = [];

                for (const item of items) {
                    const inv = await db.get(`inv_${interaction.user.id}_${item.id}`) || 0;
                    if (inv > 0) {
                        const gain = inv * marketPrices[item.id].sell;
                        totalGain += gain;
                        soldText.push(`${formatNumber(inv)} ${item.name}`);
                        await db.sub(`inv_${interaction.user.id}_${item.id}`, inv);
                    }
                }

                if (totalGain === 0) return interaction.reply({ content: '❌ ما عندك أي مواد في المخزون عشان تبيعها.', ephemeral: true });
                await db.add(`money_${interaction.user.id}`, totalGain);
                return interaction.reply({ content: `✅ بعت كل اللي بمخزونك: **${soldText.join('، ')}** بإجمالي **${formatNumber(totalGain)}** ريال.`, ephemeral: true });

            } else {
                const item = items.find(i => i.id === itemId);
                if (!item) return interaction.reply({ content: '❌ مادة غير صالحة.', ephemeral: true });
                const modal = new ModalBuilder()
                    .setCustomId(`market_modal_${action}_${itemId}`)
                    .setTitle(`${action === 'buy' ? 'شراء' : 'بيع'} ${item.name}`);

                const quantityInput = new TextInputBuilder()
                    .setCustomId('quantity')
                    .setLabel('الكمية')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('أدخل الكمية هنا، أو اكتب "كامل" للكل')
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(quantityInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'invest_submit') {
            const amountInput = interaction.fields.getTextInputValue('invest_amount');
            let amount;
            const userMoney = await db.get(`money_${interaction.user.id}`) || 0;
            if (amountInput === 'كامل' || amountInput === 'كل') amount = userMoney;
            else if (amountInput === 'نص') amount = Math.floor(userMoney / 2);
            else amount = parseInt(amountInput);

            if (isNaN(amount) || amount < 1000) return interaction.reply({ content: '❌ أقل مبلغ للاستثمار هو 1000 ريال.', ephemeral: true });
            if (userMoney < amount) return interaction.reply({ content: '❌ ليس لديك رصيد كافٍ للاستثمار.', ephemeral: true });

            await db.sub(`money_${interaction.user.id}`, amount);
            await db.add(`invest_balance_${interaction.user.id}`, amount);
            
            const lastCollect = await db.get(`invest_last_collect_${interaction.user.id}`);
            if (!lastCollect) await db.set(`invest_last_collect_${interaction.user.id}`, Date.now());

            return interaction.reply({ content: `✅ تم استثمار **${formatNumber(amount)}** ريال بنجاح! ستبدأ الأرباح بالتراكم بنسبة 5% كل ساعة.`, ephemeral: true });
        }

        if (interaction.customId.startsWith('market_modal_')) {
            const [, , action, itemId] = interaction.customId.split('_');
            const quantityInput = interaction.fields.getTextInputValue('quantity');
            const item = items.find(i => i.id === itemId);

            const price = marketPrices[itemId];
            if (!price) return interaction.reply({ content: '❌ حدث خطأ في جلب الأسعار، حاول لاحقاً.', ephemeral: true });

            const userMoney = await db.get(`money_${interaction.user.id}`) || 0;
            const userInv = await db.get(`inv_${interaction.user.id}_${itemId}`) || 0;

            let quantity;
            if (quantityInput === 'كامل' || quantityInput === 'كل') {
                if (action === 'buy') quantity = Math.floor(userMoney / price.buy);
                else quantity = userInv;
            } else if (quantityInput === 'نص') {
                if (action === 'buy') quantity = Math.floor((userMoney / 2) / price.buy);
                else quantity = Math.floor(userInv / 2);
            } else {
                quantity = parseInt(quantityInput);
            }

            if (isNaN(quantity) || quantity < 500) {
                return interaction.reply({ content: `❌ أقل كمية مسموح بها هي **500**. (الكمية المحسوبة: ${quantity || 0})`, ephemeral: true });
            }

            if (action === 'buy') {
                const totalCost = price.buy * quantity;
                if (userMoney < totalCost) {
                    return interaction.reply({ content: `❌ ليس لديك رصيد كافٍ. التكلفة الإجمالية: **${totalCost}** ريال.`, ephemeral: true });
                }

                await db.sub(`money_${interaction.user.id}`, totalCost);
                await db.add(`inv_${interaction.user.id}_${itemId}`, quantity);
                await interaction.reply({ content: `✅ لقد اشتريت **${quantity}** من **${item.name}** بسعر **${totalCost}** ريال.`, ephemeral: true });
            } else if (action === 'sell') {
                if (userInv < quantity) {
                    return interaction.reply({ content: `❌ ليس لديك كمية كافية من **${item.name}** للبيع.`, ephemeral: true });
                }

                const totalGain = price.sell * quantity;
                await db.add(`money_${interaction.user.id}`, totalGain);
                await db.sub(`inv_${interaction.user.id}_${itemId}`, quantity);
                await interaction.reply({ content: `✅ لقد بعت **${quantity}** من **${item.name}** بسعر **${totalGain}** ريال.`, ephemeral: true });
            }
        }
    }

    if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId.startsWith('marry_')) {
            const [ , action, senderID, targetID, mahrStr] = customId.split('_');
            const mahr = parseInt(mahrStr);

            if (interaction.user.id !== targetID) {
                return interaction.reply({ content: '❌ هذا الطلب ليس لك!', ephemeral: true });
            }

            if (action === 'accept') {
                if (await db.get(`partner_${senderID}`) || await db.get(`partner_${targetID}`)) {
                    return interaction.reply({ content: '❌ أحدكما تزوج بالفعل!', ephemeral: true });
                }

                await db.add(`money_${targetID}`, Math.floor(mahr / 2));
                await db.set(`partner_${senderID}`, targetID);
                await db.set(`partner_${targetID}`, senderID);
                
                // Save marriage record (sort IDs to keep unique key)
                const ids = [senderID, targetID].sort();
                await db.set(`marriage_${ids[0]}_${ids[1]}`, mahr);
                
                // Generate Congrats Image
                const canvas = createCanvas(800, 400);
                const ctx = canvas.getContext('2d');
                
                // Dark theme
                ctx.fillStyle = '#2c2c2c';
                ctx.beginPath(); ctx.roundRect(0, 0, 800, 400, 30); ctx.fill();

                // Header
                ctx.fillStyle = '#444444';
                ctx.beginPath(); ctx.roundRect(0, 0, 800, 80, 30); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('مبروك الزواج', 400, 50);

                const u1 = await client.users.fetch(senderID);
                const u2 = await client.users.fetch(targetID);

                try {
                    const av1 = await loadImage(u1.displayAvatarURL({ extension: 'png', size: 128 }));
                    const av2 = await loadImage(u2.displayAvatarURL({ extension: 'png', size: 128 }));

                    ctx.save();
                    ctx.beginPath(); ctx.arc(250, 220, 70, 0, Math.PI * 2); ctx.clip();
                    ctx.drawImage(av1, 180, 150, 140, 140);
                    ctx.restore();

                    ctx.save();
                    ctx.beginPath(); ctx.arc(550, 220, 70, 0, Math.PI * 2); ctx.clip();
                    ctx.drawImage(av2, 480, 150, 140, 140);
                    ctx.restore();
                    
                    ctx.font = '60px Arial';
                    ctx.fillText('❤️', 400, 240);
                } catch (e) {}

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${u1.username} & ${u2.username}`, 400, 330);
                
                ctx.fillStyle = '#aaaaaa';
                ctx.font = 'bold 20px Arial';
                ctx.fillText(`المهر: ${formatNumber(mahr)} ريال`, 400, 370);

                const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'married.png' });
                
                return interaction.update({
                    content: `🎉 مبروك! <@${targetID}> قبل الزواج من <@${senderID}>! بارك الله لهما وبارك عليهما وجمع بينهما في خير. 💍`,
                    files: [attachment],
                    components: []
                });
            } else if (action === 'reject') {
                await db.add(`money_${senderID}`, mahr);
                return interaction.update({
                    content: `❌ <@${targetID}> رفض طلب الزواج من <@${senderID}>. تم إعادة المهر للمرسل.`,
                    components: []
                });
            }
        }


        if (customId === 'invest_add') {
            const modal = new ModalBuilder()
                .setCustomId('invest_submit')
                .setTitle('استثمار جديد');

            const amountInput = new TextInputBuilder()
                .setCustomId('invest_amount')
                .setLabel('المبلغ المراد استثماره')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('أدخل المبلغ، "نص"، أو "كامل"')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(amountInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        if (customId === 'invest_collect_profits') {
            const investBalance = await db.get(`invest_balance_${interaction.user.id}`) || 0;
            if (investBalance <= 0) return interaction.reply({ content: '❌ ليس لديك أي مبالغ مستثمرة لجمع أرباحها.', ephemeral: true });

            const lastCollect = await db.get(`invest_last_collect_${interaction.user.id}`) || Date.now();
            const diffMs = Date.now() - lastCollect;
            const cycleMs = 3600000; // 1 hour
            const diffCycles = Math.floor(diffMs / cycleMs);

            if (diffCycles < 1) {
                const remainingMs = cycleMs - (diffMs % cycleMs);
                const minutes = Math.floor(remainingMs / 60000);
                return interaction.reply({ content: `❌ الأرباح لم تجهز بعد. انتظر **${minutes}** دقيقة.`, ephemeral: true });
            }

            const profitPerCycle = Math.floor(investBalance * 0.05); // 5% per cycle
            const totalProfit = diffCycles * profitPerCycle;

            await db.add(`money_${interaction.user.id}`, totalProfit);
            await db.add(`invest_total_profit_${interaction.user.id}`, totalProfit);
            await db.set(`invest_last_collect_${interaction.user.id}`, Date.now());

            return interaction.reply({ content: `✅ تم جمع **${formatNumber(totalProfit)}** ريال من أرباح الاستثمار!`, ephemeral: true });
        }

        if (customId === 'invest_withdraw') {
            const investBalance = await db.get(`invest_balance_${interaction.user.id}`) || 0;
            if (investBalance <= 0) return interaction.reply({ content: '❌ ليس لديك أي مبالغ مستثمرة لسحبها.', ephemeral: true });

            await db.add(`money_${interaction.user.id}`, investBalance);
            await db.delete(`invest_balance_${interaction.user.id}`);
            await db.delete(`invest_last_collect_${interaction.user.id}`);

            return interaction.reply({ content: `✅ تم سحب رأس المال المستثمر بقيمة **${formatNumber(investBalance)}** ريال وإضافته لرصيدك.`, ephemeral: true });
        }

        if (customId === 'invest_info') {
            return interaction.reply({ content: `ℹ️ **نظام الاستثمار:**\n- يمكنك استثمار أموالك للحصول على أرباح بنسبة **5%** كل ساعة.\n- الأرباح تتراكم بناءً على المبلغ المستثمر.\n- يمكنك سحب الأرباح أو سحب رأس المال كاملاً في أي وقت.\n- الاستثمار آمن 100% ولا توجد نسبة خسارة.`, ephemeral: true });
        }

        if (customId === 'collect_profits') {
            const userLands = await db.get(`lands_data_${interaction.user.id}`) || [];
            if (userLands.length === 0) return interaction.reply({ content: '❌ أنت لا تملك أي عقارات لجمع أرباح منها!', ephemeral: true });

            const lastCollect = await db.get(`last_collect_${interaction.user.id}`);
            const timer = lastCollect || Date.now();
            const diffMs = Date.now() - timer;
            const cycleMs = 240000; // 4 minutes
            const diffCycles = Math.floor(diffMs / cycleMs);
            
            if (diffCycles < 1) {
                const remainingMs = cycleMs - (diffMs % cycleMs);
                const seconds = Math.floor((remainingMs / 1000) % 60);
                const minutes = Math.floor(remainingMs / 60000);
                return interaction.reply({ content: `❌ لا توجد أرباح جاهزة حالياً. انتظر **${minutes}** دقيقة و **${seconds}** ثانية حتى تكتمل الدورة.`, ephemeral: true });
            }

            let totalProfitPerCycle = 0;
            userLands.forEach(land => {
                const prop = properties.find(p => p.name === land.name);
                if (prop) totalProfitPerCycle += prop.profit;
            });

            if (totalProfitPerCycle === 0) return interaction.reply({ content: '❌ عقاراتك الحالية لا تنتج أي أرباح!', ephemeral: true });

            const totalEarned = diffCycles * totalProfitPerCycle;
            await db.add(`money_${interaction.user.id}`, totalEarned);
            await db.add(`lands_total_profit_${interaction.user.id}`, totalEarned);
            await db.set(`last_collect_${interaction.user.id}`, Date.now());

            return interaction.reply({ content: `✅ تم جمع **${formatNumber(totalEarned)}** ريال من أرباح جميع عقاراتك!`, ephemeral: true });
        }

        if (customId.startsWith('lb_')) {
            const category = customId.split('_')[1];
            let title = 'قائمة الأغنياء';
            
            if (category === 'thieves') title = 'قائمة الحرامية';
            if (category === 'marriage') title = 'أغلى زواجات في السيرفر';
            if (category === 'investors') title = 'قائمة المستثمرين';
            if (category === 'lands') title = 'قائمة الأراضي';
            if (category === 'cars') title = 'قائمة السيارات';

            // Fetch data based on category
            const allData = await db.all();
            let leaderboardData = [];
            let prefix = 'money_';
            let isCount = false;
            
            if (category === 'thieves') prefix = 'stolen_';
            if (category === 'marriage') prefix = 'marriage_';
            if (category === 'investors') prefix = 'invest_balance_';
            if (category === 'lands') prefix = 'lands_total_profit_';
            if (category === 'cars') { prefix = 'cars_count_'; isCount = true; }

            leaderboardData = allData
                .filter(data => data.id.startsWith(prefix) && data.value > 0)
                .map(data => ({ id: data.id.split('_')[prefix.split('_').length - 1], value: data.value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);

            if (category === 'marriage') {
                const marriageList = allData
                    .filter(data => data.id.startsWith('marriage_'))
                    .map(data => {
                        const parts = data.id.split('_');
                        return { id1: parts[1], id2: parts[2], mahr: data.value };
                    })
                    .sort((a, b) => b.mahr - a.mahr)
                    .slice(0, 10);

                const canvas = createCanvas(400, 600);
                const ctx = canvas.getContext('2d');

                // Background
                ctx.fillStyle = '#2c2c2c';
                ctx.beginPath();
                ctx.roundRect(0, 0, 400, 600, 25);
                ctx.fill();

                // Header
                ctx.fillStyle = '#555555';
                ctx.beginPath();
                ctx.roundRect(0, 0, 400, 80, 25);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('أغلى زواجات في السيرفر', 200, 50);

                let y = 100;
                for (let i = 0; i < marriageList.length; i++) {
                    const entry = marriageList[i];
                    let u1, u2;
                    try { u1 = await client.users.fetch(entry.id1); } catch (e) { u1 = { username: '?', displayAvatarURL: () => '' }; }
                    try { u2 = await client.users.fetch(entry.id2); } catch (e) { u2 = { username: '?', displayAvatarURL: () => '' }; }

                    // Row background
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.beginPath();
                    ctx.roundRect(10, y, 380, 75, 10);
                    ctx.fill();

                    // Avatars
                    try {
                        const av1 = await loadImage(u1.displayAvatarURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
                        const av2 = await loadImage(u2.displayAvatarURL({ extension: 'png', size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
                        
                        ctx.save();
                        ctx.beginPath(); ctx.arc(45, y + 37, 25, 0, Math.PI * 2); ctx.clip();
                        ctx.drawImage(av1, 20, y + 12, 50, 50);
                        ctx.restore();

                        ctx.save();
                        ctx.beginPath(); ctx.arc(80, y + 37, 25, 0, Math.PI * 2); ctx.clip();
                        ctx.drawImage(av2, 55, y + 12, 50, 50);
                        ctx.restore();
                    } catch (e) {}

                    // Text
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 16px Arial';
                    ctx.fillText(`${i + 1}. ${u1.username} & ${u2.username}`, 115, y + 35);
                    
                    ctx.fillStyle = '#aaaaaa';
                    ctx.font = '14px Arial';
                    ctx.fillText(`$${formatNumber(entry.mahr)}`, 115, y + 55);

                    y += 85;
                }

                const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'marriage_lb.png' });
                return interaction.update({ files: [attachment] });
            }

            const canvas = createCanvas(400, 600);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#2c2c2c'; ctx.beginPath(); ctx.roundRect(0, 0, 400, 600, 20); ctx.fill();
            ctx.fillStyle = '#444444'; ctx.beginPath(); ctx.roundRect(0, 0, 400, 80, 20); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
            ctx.fillText(title, 200, 50);

            let y = 140;
            if (leaderboardData.length === 0) {
                ctx.fillStyle = '#aaaaaa'; ctx.font = '16px Arial';
                ctx.fillText('لا يوجد بيانات لهذه الفئة حالياً', 200, 300);
            } else {
                for (let i = 0; i < leaderboardData.length; i++) {
                    const entry = leaderboardData[i];
                    let user;
                    try { user = await client.users.fetch(entry.id); } catch (e) { user = { id: entry.id, username: 'Unknown', displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' }; }
                    
                    // Row background
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.beginPath(); ctx.roundRect(15, y - 35, 370, 65, 15); ctx.fill();

                    try {
                        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 64 }));
                        
                        const isVip = await db.get(`is_vip_${user.id}`);
                        if (isVip) {
                            ctx.font = '24px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText('👑', 50, y - 35);
                        }

                        ctx.save(); ctx.beginPath(); ctx.arc(50, y - 2, 22, 0, Math.PI * 2); ctx.clip();
                        ctx.drawImage(avatar, 28, y - 24, 44, 44); ctx.restore();
                    } catch (e) {}

                    ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial';
                    ctx.fillText(`${i + 1}. ${user.username}`, 90, y - 5);
                    
                    ctx.fillStyle = '#aaaaaa'; ctx.font = '14px Arial';
                    const displayValue = isCount ? `${entry.value} سيارة` : `$${formatNumber(entry.value)}`;
                    ctx.fillText(displayValue, 90, y + 18);

                    y += 80;
                }
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'leaderboard.png' });
            return interaction.update({ files: [attachment] });
        }
    }

    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        // Admin Role Check
        const adminRoleId = process.env.ADMIN_ROLE_ID;
        const isUserAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const hasAdminRole = adminRoleId ? interaction.member.roles.cache.has(adminRoleId) : isUserAdmin;

        if (!hasAdminRole) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذه الأوامر الإدارية (تحتاج لرتبة محددة أو صلاحية Administrator).', ephemeral: true });
        }

        if (commandName === 'set-channel') {
            const channel = options.getChannel('channel');
            await db.set(`active_channel_${interaction.guild.id}`, channel.id);
            return interaction.reply({ content: `✅ تم تحديد الشات **${channel.name}** كشات مخصص للأوامر بنجاح.`, ephemeral: true });
        }

        if (commandName === 'add-money') {
            const user = options.getUser('user');
            const amount = options.getInteger('amount');
            await db.add(`money_${user.id}`, amount);
            return interaction.reply({ content: `✅ تم إضافة **${formatNumber(amount)}** ريال إلى رصيد **${user.username}**.`, ephemeral: true });
        }

        if (commandName === 'remove-money') {
            const user = options.getUser('user');
            const amount = options.getInteger('amount');
            const current = await db.get(`money_${user.id}`) || 0;
            const toRemove = Math.min(current, amount);
            await db.sub(`money_${user.id}`, toRemove);
            return interaction.reply({ content: `✅ تم سحب **${formatNumber(toRemove)}** ريال من رصيد **${user.username}**.`, ephemeral: true });
        }

        if (commandName === 'تصفير-الكل') {
            const allData = await db.all();
            
            // Find richest person first
            let richestId = null;
            let maxMoney = -1;
            allData.filter(d => d.id.startsWith('money_')).forEach(d => {
                if (d.value > maxMoney) {
                    maxMoney = d.value;
                    richestId = d.id.split('_')[1];
                }
            });

            const prefixesToClear = [
                'money_', 'daily_', 'inv_', 'invest_balance_', 'invest_last_collect_', 
                'invest_total_profit_', 'lands_data_', 'lands_', 'lands_total_profit_', 
                'last_collect_', 'stolen_', 'rob_cooldown_', 'highest_balance_', 'highest_loss_',
                'is_vip_'
            ];

            let clearedCount = 0;
            for (const data of allData) {
                if (prefixesToClear.some(p => data.id.startsWith(p))) {
                    await db.delete(data.id);
                    clearedCount++;
                }
            }

            if (richestId) {
                await db.set(`is_vip_${richestId}`, true);
            }

            return interaction.reply({ content: `✅ تم تصفير كافة البيانات بنجاح! \n👑 الشخص الأغنى قبل التصفير كان <@${richestId}> وقد حصل على رتبة **كبار الشخصيات** ومميزات خاصة!`, ephemeral: false });
        }
    }

    if (interaction.isStringSelectMenu()) {
        const { customId, values } = interaction;

        if (customId === 'manage_property' && values[0] === 'real_estate_market') {
            const marketEmbed = new EmbedBuilder()
                .setColor('#e67e22')
                .setTitle('🏙️ سوق العقارات')
                .setDescription('اختر العقار الذي تريد شراؤه من القائمة أدناه:');

            const select = new StringSelectMenuBuilder()
                .setCustomId('buy_property')
                .setPlaceholder('اختر عقار للشراء')
                .addOptions(properties.map((p, i) => ({
                    label: p.name,
                    description: `السعر: ${formatNumber(p.price)} | الربح: ${p.profit}/دقيقة`,
                    value: `buy_${i}`
                })));

            const row = new ActionRowBuilder().addComponents(select);
            return interaction.reply({ embeds: [marketEmbed], components: [row], ephemeral: true });
        }

        if (customId === 'buy_property') {
            const index = parseInt(values[0].split('_')[1]);
            const prop = properties[index];
            const userMoney = await db.get(`money_${interaction.user.id}`) || 0;

            if (userMoney < prop.price) return interaction.reply({ content: `❌ ليس لديك رصيد كافٍ لشراء ${prop.name}.`, ephemeral: true });

            await db.sub(`money_${interaction.user.id}`, prop.price);
            await db.push(`lands_data_${interaction.user.id}`, { name: prop.name, boughtAt: Date.now() });
            await db.add(`lands_${interaction.user.id}`, 1); 

            // Initialize collect timer if not exists
            const lastCollect = await db.get(`last_collect_${interaction.user.id}`);
            if (!lastCollect) await db.set(`last_collect_${interaction.user.id}`, Date.now());

            return interaction.reply({ content: `🎉 مبروك! اشتريت **${prop.name}** بنجاح.`, ephemeral: true });
        }

        if (customId.startsWith('buy_protection_')) {
            const type = parseInt(customId.split('_')[2]);
            const cost = type * 10000;
            const userMoney = await db.get(`money_${interaction.user.id}`) || 0;

            const currentProtection = await db.get(`protection_until_${interaction.user.id}`);
            if (currentProtection && currentProtection > Date.now()) {
                const remaining = currentProtection - Date.now();
                const hours = Math.floor(remaining / 3600000);
                const minutes = Math.floor((remaining % 3600000) / 60000);
                return interaction.reply({ content: `❌ لديك حماية نشطة بالفعل تنتهي بعد **${hours} ساعة و ${minutes} دقيقة**.`, ephemeral: true });
            }

            if (userMoney < cost) return interaction.reply({ content: `❌ ليس لديك رصيد كافٍ (تحتاج ${formatNumber(cost)} ريال).`, ephemeral: true });

            await db.sub(`money_${interaction.user.id}`, cost);
            const expireAt = Date.now() + (type * 3600000);
            await db.set(`protection_until_${interaction.user.id}`, expireAt);

            return interaction.reply({ content: `🛡️ تم شراء حماية لمدة **${type}** ساعات بنجاح!`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
