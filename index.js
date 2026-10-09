'use strict';

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits: P,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  MessageFlags,
  ActivityType
} = require('discord.js');

const Database = require('better-sqlite3');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomInt } = require('node:crypto');

// ============================================================
// الإعدادات الأساسية
// لا تنشر هذا الملف إذا وضعت التوكن فيه.
// يمكن بدل ذلك وضع التوكن في متغير البيئة DISCORD_TOKEN.
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN || 'PUT_BOT_TOKEN_HERE';

// أثناء التجربة ضع معرّف سيرفرك، فتظهر الأوامر أسرع.
// اتركه فارغًا لتسجيل أوامر عامة.
// لا تبدّل النطاق باستمرار حتى لا تظهر أوامر مكررة.
const TEST_GUILD_ID = process.env.GUILD_ID || '';

const COLOR = 0x5865f2;
const DATA_DIR = path.join(__dirname, 'data');
const TRANSCRIPT_DIR = path.join(DATA_DIR, 'transcripts');
const EPHEMERAL = MessageFlags.Ephemeral;
const DAY = 24 * 60 * 60 * 1000;

if (!TOKEN || TOKEN === 'PUT_BOT_TOKEN_HERE') {
  console.error('ضع توكن البوت في TOKEN أو DISCORD_TOKEN.');
  process.exit(1);
}

if (TEST_GUILD_ID && !/^\d{17,20}$/.test(TEST_GUILD_ID)) {
  console.error('TEST_GUILD_ID ليس معرّف سيرفر صحيحًا.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel],
  allowedMentions: {
    parse: [],
    repliedUser: false
  }
});

let db;
let giveawayTimer;
let shuttingDown = false;
let sweepRunning = false;

const locks = new Set();
const commandCooldowns = new Map();
const spamBuckets = new Map();
const automodCooldowns = new Map();
const giveawayRetryAt = new Map();

class UserError extends Error {}

function embed(title, description = '') {
  const result = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(title)
    .setTimestamp();

if (description) result.setDescription(description);
  return result;
}

function timestamp(ms, format = 'F') {
  return `<t:${Math.floor(ms / 1000)}:${format}>`;
}

function cleanText(value, max = 1000) {
  return String(value ?? '')
    .replace(/@/g, '@\u200b')
    .slice(0, max);
}

function safeError(label, error) {
  console.error(label, {
    name: error?.name || 'Error',
    code: error?.code || 'UNKNOWN'
  });
}

function validId(value) {
  return /^\d{17,20}$/.test(String(value));
}

async function locked(key, operation) {
  if (locks.has(key)) {
    throw new UserError('هناك عملية قيد التنفيذ، انتظر قليلًا.');
  }

locks.add(key);

try {
    return await operation();
  } finally {
    locks.delete(key);
  }
}

// ============================================================
// قاعدة البيانات
// ============================================================

function initializeDatabase() {
  db = new Database(path.join(DATA_DIR, 'bot.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel TEXT,
      log_channel TEXT,
      auto_role TEXT,
      support_role TEXT,
      ticket_category TEXT,
      automod INTEGER NOT NULL DEFAULT 0,
      block_links INTEGER NOT NULL DEFAULT 0,
      mention_limit INTEGER NOT NULL DEFAULT 6,
      spam_limit INTEGER NOT NULL DEFAULT 7,
      levels INTEGER NOT NULL DEFAULT 1
    );

CREATE TABLE IF NOT EXISTS users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0),
      balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
      last_xp INTEGER NOT NULL DEFAULT 0,
      last_daily INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

CREATE TABLE IF NOT EXISTS tickets (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      claimed_by TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL,
      closed_at INTEGER,
      transcript_path TEXT
    );

CREATE UNIQUE INDEX IF NOT EXISTS one_open_ticket_per_user
    ON tickets(guild_id, owner_id)
    WHERE status IN ('open', 'closing');

CREATE TABLE IF NOT EXISTS giveaways (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winner_count INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      winners_json TEXT,
      announced INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

CREATE TABLE IF NOT EXISTS giveaway_entries (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id)
        REFERENCES giveaways(message_id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS warnings_lookup
    ON warnings(guild_id, user_id, active);

CREATE INDEX IF NOT EXISTS case_lookup
    ON cases(guild_id, id);

CREATE INDEX IF NOT EXISTS giveaway_due
    ON giveaways(status, ends_at);
  `);

// لو توقف البرنامج أثناء الإغلاق، تصبح التذكرة قابلة للمحاولة مجددًا.
  db.prepare(`
    UPDATE tickets SET status = 'open'
    WHERE status = 'closing'
  `).run();
}

function settings(guildId) {
  db.prepare(`
    INSERT OR IGNORE INTO guild_settings(guild_id) VALUES (?)
  `).run(guildId);

return db.prepare(`
    SELECT * FROM guild_settings WHERE guild_id = ?
  `).get(guildId);
}

function setSetting(guildId, key, value) {
  const allowed = new Set([
    'welcome_channel',
    'log_channel',
    'auto_role',
    'support_role',
    'ticket_category',
    'automod',
    'block_links',
    'mention_limit',
    'spam_limit',
    'levels'
  ]);

if (!allowed.has(key)) throw new Error('Invalid setting key');

settings(guildId);

// key مأخوذ حصريًا من القائمة الثابتة أعلاه.
  db.prepare(`
    UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?
  `).run(value, guildId);
}

function userData(guildId, userId) {
  db.prepare(`
    INSERT OR IGNORE INTO users(guild_id, user_id)
    VALUES (?, ?)
  `).run(guildId, userId);

return db.prepare(`
    SELECT * FROM users WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId);
}

function levelFromXp(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

async function sendLog(guild, title, description, files = []) {
  const channelId = settings(guild.id).log_channel;
  if (!channelId) return;

try {
    const channel = await guild.channels.fetch(channelId);

if (
      !channel?.isTextBased() ||
      typeof channel.send !== 'function'
    ) return;

await channel.send({
      embeds: [embed(title, cleanText(description, 4000))],
      files,
      allowedMentions: { parse: [] }
    });
  } catch (error) {
    safeError('تعذر إرسال اللوق:', error);
  }
}

async function recordCase(guild, moderatorId, userId, action, reason) {
  const result = db.prepare(`
    INSERT INTO cases(
      guild_id, user_id, moderator_id, action, reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    guild.id,
    userId,
    moderatorId,
    action,
    reason,
    Date.now()
  );

const id = Number(result.lastInsertRowid);

await sendLog(
    guild,
    `قضية #${id} — ${action}`,
    `المستخدم: ${userId}\n` +
    `المسؤول: ${moderatorId}\n` +
    `السبب: ${reason}`
  );

return id;
}

// ============================================================
// فحص الصلاحيات والرتب
// ============================================================

function requirePermission(interaction, permission) {
  if (!interaction.memberPermissions?.has(permission)) {
    throw new UserError('لا تملك الصلاحية المطلوبة.');
  }
}

async function botMember(guild) {
  return guild.members.me || guild.members.fetchMe();
}

async function requireBot(interaction, permissions, channel = null) {
  const bot = await botMember(interaction.guild);
  const effective = channel
    ? channel.permissionsFor(bot)
    : bot.permissions;

if (!effective?.has(permissions)) {
    throw new UserError(
      'البوت لا يملك الصلاحيات اللازمة. راجع رتبته وصلاحيات القناة.'
    );
  }

return bot;
}

function textChannel(interaction) {
  const channel = interaction.channel;

if (
    !channel?.isTextBased() ||
    typeof channel.send !== 'function'
  ) {
    throw new UserError('استخدم الأمر في قناة نصية.');
  }

return channel;
}

async function memberById(guild, userId, required = true) {
  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    if (Number(error.code) === 10007) {
      if (!required) return null;
      throw new UserError('المستخدم ليس عضوًا في هذا السيرفر.');
    }

throw error;
  }
}

async function checkTarget(interaction, user, target) {
  if (user.id === interaction.user.id) {
    throw new UserError('لا يمكنك تنفيذ الإجراء على نفسك.');
  }

if (user.id === client.user.id) {
    throw new UserError('لا يمكنك تنفيذ الإجراء على البوت.');
  }

if (user.id === interaction.guild.ownerId) {
    throw new UserError('لا يمكنك تنفيذ الإجراء على مالك السيرفر.');
  }

if (target && interaction.user.id !== interaction.guild.ownerId) {
    const actor = await memberById(
      interaction.guild,
      interaction.user.id
    );

if (
      actor.roles.highest.comparePositionTo(target.roles.highest) <= 0
    ) {
      throw new UserError('رتبة المستخدم مساوية لرتبتك أو أعلى.');
    }
  }
}

function isSupport(interaction) {
  const roleId = settings(interaction.guildId).support_role;

return Boolean(
    interaction.memberPermissions?.has(P.ManageChannels) ||
    (roleId && interaction.member.roles.cache.has(roleId))
  );
}

function ticketFor(channelId, guildId) {
  return db.prepare(`
    SELECT * FROM tickets
    WHERE channel_id = ? AND guild_id = ? AND status = 'open'
  `).get(channelId, guildId);
}

function requireTicketAccess(interaction, staffOnly = false) {
  const ticket = ticketFor(
    interaction.channelId,
    interaction.guildId
  );

if (!ticket) {
    throw new UserError('هذه ليست تذكرة مفتوحة مسجلة لدى البوت.');
  }

if (
    !isSupport(interaction) &&
    (staffOnly || ticket.owner_id !== interaction.user.id)
  ) {
    throw new UserError('لا تملك صلاحية تنفيذ هذا الإجراء في التذكرة.');
  }

return ticket;
}

// ============================================================
// بناء أوامر السلاش
// ============================================================

function command(name, description, permission) {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDMPermission(false);

if (permission !== undefined) {
    builder.setDefaultMemberPermissions(permission);
  }

return builder;
}

function addMember(sub, required = true) {
  return sub.addUserOption(option =>
    option.setName('member')
      .setDescription('المستخدم')
      .setRequired(required)
  );
}

function addReason(sub, required = false) {
  return sub.addStringOption(option =>
    option.setName('reason')
      .setDescription('السبب')
      .setMaxLength(400)
      .setRequired(required)
  );
}

const configCommand = command(
  'config',
  'إعداد أنظمة السيرفر',
  P.ManageGuild
)
  .addSubcommand(sub =>
    sub.setName('show').setDescription('عرض الإعدادات الحالية')
  )
  .addSubcommand(sub =>
    sub.setName('welcome').setDescription('إعداد الترحيب والرتبة')
      .addChannelOption(option =>
        option.setName('channel').setDescription('قناة الترحيب')
          .addChannelTypes(ChannelType.GuildText)
      )
      .addRoleOption(option =>
        option.setName('role').setDescription('الرتبة التلقائية')
      )
      .addBooleanOption(option =>
        option.setName('disable').setDescription('تعطيل الترحيب والرتبة')
      )
  )
  .addSubcommand(sub =>
    sub.setName('logs').setDescription('إعداد سجل البوت')
      .addChannelOption(option =>
        option.setName('channel').setDescription('قناة خاصة بالإدارة')
          .addChannelTypes(ChannelType.GuildText)
      )
      .addBooleanOption(option =>
        option.setName('disable').setDescription('تعطيل اللوق')
      )
  )
  .addSubcommand(sub =>
    sub.setName('tickets').setDescription('إعداد التذاكر')
      .addRoleOption(option =>
        option.setName('support').setDescription('رتبة فريق الدعم')
      )
      .addChannelOption(option =>
        option.setName('category').setDescription('تصنيف التذاكر')
          .addChannelTypes(ChannelType.GuildCategory)
      )
  )
  .addSubcommand(sub =>
    sub.setName('automod').setDescription('إعداد الحماية')
      .addBooleanOption(option =>
        option.setName('enabled').setDescription('تفعيل الحماية')
          .setRequired(true)
      )
      .addBooleanOption(option =>
        option.setName('links').setDescription('منع الروابط')
      )
      .addIntegerOption(option =>
        option.setName('mentions').setDescription('حد المنشن في الرسالة')
          .setMinValue(3).setMaxValue(30)
      )
      .addIntegerOption(option =>
        option.setName('spam').setDescription('حد الرسائل خلال 8 ثوانٍ')
          .setMinValue(4).setMaxValue(20)
      )
  )
  .addSubcommand(sub =>
    sub.setName('levels').setDescription('تفعيل أو تعطيل المستويات')
      .addBooleanOption(option =>
        option.setName('enabled').setDescription('التفعيل')
          .setRequired(true)
      )
  );

const modCommand = command(
  'mod',
  'أوامر الإدارة والتحذيرات',
  P.ModerateMembers | P.KickMembers | P.BanMembers | P.ManageMessages
);

// يتم فحص الصلاحية الخاصة بكل إجراء داخل الكود أيضًا.
for (const [name, description] of [
  ['kick', 'طرد عضو'],
  ['ban', 'حظر مستخدم'],
  ['untimeout', 'إلغاء التايم أوت'],
  ['warn', 'إضافة تحذير دائم'],
  ['warnings', 'عرض التحذيرات'],
  ['clearwarnings', 'إلغاء تحذيرات مستخدم']
]) {
  modCommand.addSubcommand(sub => {
    sub.setName(name).setDescription(description);
    addMember(sub);

if (['kick', 'ban', 'warn', 'clearwarnings'].includes(name)) {
      addReason(sub, name === 'warn');
    }

return sub;
  });
}

modCommand
  .addSubcommand(sub =>
    addReason(
      addMember(
        sub.setName('timeout').setDescription('تقييد عضو')
      ).addIntegerOption(option =>
        option.setName('minutes').setDescription('المدة بالدقائق')
          .setRequired(true).setMinValue(1).setMaxValue(40320)
      )
    )
  )
  .addSubcommand(sub =>
    sub.setName('clear').setDescription('حذف رسائل حديثة')
      .addIntegerOption(option =>
        option.setName('amount').setDescription('عدد الرسائل')
          .setRequired(true).setMinValue(1).setMaxValue(100)
      )
  )
  .addSubcommand(sub =>
    sub.setName('case').setDescription('عرض قضية إدارية')
      .addIntegerOption(option =>
        option.setName('id').setDescription('رقم القضية')
          .setRequired(true).setMinValue(1)
      )
  );

const commands = [
  command('help', 'عرض المساعدة'),
  command('ping', 'سرعة اتصال البوت'),
  command('server', 'معلومات السيرفر'),
  addMember(command('user', 'معلومات مستخدم'), false),
  configCommand,
  modCommand,

command('ticket', 'إدارة التذاكر')
    .addSubcommand(sub =>
      sub.setName('panel').setDescription('نشر لوحة التذاكر')
    )
    .addSubcommand(sub =>
      sub.setName('claim').setDescription('استلام التذكرة')
    )
    .addSubcommand(sub =>
      sub.setName('close').setDescription('طلب إغلاق التذكرة')
    ),

command('rank', 'عرض المستوى والرصيد')
    .addUserOption(option =>
      option.setName('member').setDescription('المستخدم')
    ),

command('leaderboard', 'ترتيب السيرفر')
    .addStringOption(option =>
      option.setName('type').setDescription('نوع الترتيب')
        .setRequired(true)
        .addChoices(
          { name: 'المستويات', value: 'xp' },
          { name: 'الأرصدة', value: 'balance' }
        )
    ),

command('economy', 'نظام الاقتصاد')
    .addSubcommand(sub =>
      sub.setName('balance').setDescription('عرض الرصيد')
        .addUserOption(option =>
          option.setName('member').setDescription('المستخدم')
        )
    )
    .addSubcommand(sub =>
      sub.setName('daily').setDescription('المكافأة اليومية')
    )
    .addSubcommand(sub =>
      sub.setName('transfer').setDescription('تحويل عملات لعضو')
        .addUserOption(option =>
          option.setName('member').setDescription('المستلم')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount').setDescription('المبلغ')
            .setRequired(true).setMinValue(1).setMaxValue(1000000)
        )
    ),

command('giveaway', 'إدارة السحوبات', P.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('start').setDescription('بدء سحب')
        .addStringOption(option =>
          option.setName('prize').setDescription('الجائزة')
            .setRequired(true).setMaxLength(200)
        )
        .addIntegerOption(option =>
          option.setName('minutes').setDescription('المدة بالدقائق')
            .setRequired(true).setMinValue(1).setMaxValue(43200)
        )
        .addIntegerOption(option =>
          option.setName('winners').setDescription('عدد الفائزين')
            .setRequired(true).setMinValue(1).setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub.setName('end').setDescription('إنهاء السحب الآن')
        .addStringOption(option =>
          option.setName('message').setDescription('معرّف رسالة السحب')
            .setRequired(true).setMinLength(17).setMaxLength(20)
        )
    ),

command('announce', 'نشر إعلان', P.ManageMessages)
    .addStringOption(option =>
      option.setName('text').setDescription('نص الإعلان دون منشن')
        .setRequired(true).setMaxLength(3500)
    )
];

// ============================================================
// الإعدادات
// ============================================================

async function handleConfig(interaction) {
  requirePermission(interaction, P.ManageGuild);

const sub = interaction.options.getSubcommand();
  const opts = interaction.options;

if (sub === 'show') {
    const s = settings(interaction.guildId);

const channelLabel = id => id ? `<#${id}>` : 'غير محدد';
    const roleLabel = id => id ? `<@&${id}>` : 'غير محدد';

await interaction.editReply({
      embeds: [
        embed('إعدادات السيرفر').addFields(
          { name: 'الترحيب', value: channelLabel(s.welcome_channel), inline: true },
          { name: 'اللوق', value: channelLabel(s.log_channel), inline: true },
          { name: 'الرتبة التلقائية', value: roleLabel(s.auto_role), inline: true },
          { name: 'الدعم', value: roleLabel(s.support_role), inline: true },
          { name: 'تصنيف التذاكر', value: channelLabel(s.ticket_category), inline: true },
          { name: 'المستويات', value: s.levels ? 'مفعلة' : 'معطلة', inline: true },
          {
            name: 'الحماية',
            value:
              `التفعيل: ${s.automod ? 'نعم' : 'لا'}\n` +
              `منع الروابط: ${s.block_links ? 'نعم' : 'لا'}\n` +
              `حد المنشن: ${s.mention_limit}\n` +
              `حد السبام: ${s.spam_limit} رسائل / 8 ثوانٍ`
          }
        )
      ]
    });
    return;
  }

if (sub === 'welcome') {
    if (opts.getBoolean('disable')) {
      setSetting(interaction.guildId, 'welcome_channel', null);
      setSetting(interaction.guildId, 'auto_role', null);
    } else {
      const channel = opts.getChannel('channel');
      const role = opts.getRole('role');

if (!channel && !role) {
        throw new UserError('حدد قناة أو رتبة، أو استخدم disable.');
      }

if (channel) {
        await requireBot(
          interaction,
          [P.ViewChannel, P.SendMessages, P.EmbedLinks],
          channel
        );
      }

if (role) {
        const bot = await requireBot(interaction, [P.ManageRoles]);

if (
          role.managed ||
          role.id === interaction.guildId ||
          bot.roles.highest.comparePositionTo(role) <= 0 ||
          role.permissions.has(P.Administrator)
        ) {
          throw new UserError(
            'اختر رتبة عادية تحت رتبة البوت، ولا تمنح Administrator تلقائيًا.'
          );
        }

if (interaction.user.id !== interaction.guild.ownerId) {
          const actor = await memberById(
            interaction.guild,
            interaction.user.id
          );

if (
            actor.roles.highest.comparePositionTo(role) <= 0 ||
            !role.permissions.missing(actor.permissions).length === false
          ) {
            // فحص ترتيب الرتبة منفصل أدناه لتوضيح الخطأ.
          }

if (actor.roles.highest.comparePositionTo(role) <= 0) {
            throw new UserError('الرتبة التلقائية يجب أن تكون تحت رتبتك.');
          }

const excess = role.permissions.toArray().filter(
            permission => !actor.permissions.has(permission)
          );

if (excess.length) {
            throw new UserError(
              'لا يمكنك إعداد رتبة تلقائية بصلاحيات لا تملكها.'
            );
          }
        }
      }

if (channel) {
        setSetting(interaction.guildId, 'welcome_channel', channel.id);
      }

if (role) {
        setSetting(interaction.guildId, 'auto_role', role.id);
      }
    }
  }

if (sub === 'logs') {
    const channel = opts.getChannel('channel');

if (opts.getBoolean('disable')) {
      setSetting(interaction.guildId, 'log_channel', null);
    } else {
      if (!channel) throw new UserError('حدد قناة اللوق.');

await requireBot(
        interaction,
        [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.AttachFiles],
        channel
      );

setSetting(interaction.guildId, 'log_channel', channel.id);
    }
  }

if (sub === 'tickets') {
    const support = opts.getRole('support');
    const category = opts.getChannel('category');

if (!support && !category) {
      throw new UserError('حدد رتبة الدعم أو تصنيف التذاكر.');
    }

if (support) {
      if (support.id === interaction.guildId || support.managed) {
        throw new UserError('اختر رتبة دعم عادية، وليس everyone.');
      }
    }

if (category) {
      await requireBot(interaction, [P.ManageChannels], category);
    }

if (support) {
      setSetting(interaction.guildId, 'support_role', support.id);
    }

if (category) {
      setSetting(interaction.guildId, 'ticket_category', category.id);
    }
  }

if (sub === 'automod') {
    setSetting(
      interaction.guildId,
      'automod',
      opts.getBoolean('enabled', true) ? 1 : 0
    );

const links = opts.getBoolean('links');
    const mentions = opts.getInteger('mentions');
    const spam = opts.getInteger('spam');

if (links !== null) {
      setSetting(interaction.guildId, 'block_links', links ? 1 : 0);
    }

if (mentions !== null) {
      setSetting(interaction.guildId, 'mention_limit', mentions);
    }

if (spam !== null) {
      setSetting(interaction.guildId, 'spam_limit', spam);
    }
  }

if (sub === 'levels') {
    setSetting(
      interaction.guildId,
      'levels',
      opts.getBoolean('enabled', true) ? 1 : 0
    );
  }

await interaction.editReply({
    content: 'تم حفظ الإعدادات بشكل دائم.'
  });
}

// ============================================================
// الإدارة
// ============================================================

async function handleModeration(interaction) {
  const sub = interaction.options.getSubcommand();

const required = {
    kick: P.KickMembers,
    ban: P.BanMembers,
    timeout: P.ModerateMembers,
    untimeout: P.ModerateMembers,
    warn: P.ModerateMembers,
    warnings: P.ModerateMembers,
    clearwarnings: P.ModerateMembers,
    clear: P.ManageMessages,
    case: P.ModerateMembers
  }[sub];

requirePermission(interaction, required);

if (sub === 'clear') {
    const channel = textChannel(interaction);

if (typeof channel.bulkDelete !== 'function') {
      throw new UserError('الحذف الجماعي غير متاح هنا.');
    }

await requireBot(
      interaction,
      [P.ViewChannel, P.ReadMessageHistory, P.ManageMessages],
      channel
    );

const amount = interaction.options.getInteger('amount', true);
    const deleted = await channel.bulkDelete(amount, true);

await recordCase(
      interaction.guild,
      interaction.user.id,
      interaction.user.id,
      'CLEAR',
      `${deleted.size} رسالة في القناة ${channel.id}`
    );

await interaction.editReply({
      content:
        `تم حذف ${deleted.size} رسالة.\n` +
        'الرسائل التي عمرها 14 يومًا أو أكثر يتم تجاهلها.'
    });
    return;
  }

if (sub === 'case') {
    const id = interaction.options.getInteger('id', true);

const row = db.prepare(`
      SELECT * FROM cases WHERE id = ? AND guild_id = ?
    `).get(id, interaction.guildId);

if (!row) throw new UserError('القضية غير موجودة في هذا السيرفر.');

await interaction.editReply({
      embeds: [
        embed(`قضية #${row.id}`, cleanText(row.reason)).addFields(
          { name: 'الإجراء', value: row.action, inline: true },
          { name: 'المستخدم', value: row.user_id, inline: true },
          { name: 'المسؤول', value: row.moderator_id, inline: true },
          { name: 'التاريخ', value: timestamp(row.created_at) }
        )
      ]
    });
    return;
  }

const user = interaction.options.getUser('member', true);
  const reason = interaction.options.getString('reason') || 'لم يحدد سبب';

if (sub === 'warnings') {
    const rows = db.prepare(`
      SELECT * FROM warnings
      WHERE guild_id = ? AND user_id = ? AND active = 1
      ORDER BY id DESC LIMIT 10
    `).all(interaction.guildId, user.id);

const count = db.prepare(`
      SELECT COUNT(*) AS total FROM warnings
      WHERE guild_id = ? AND user_id = ? AND active = 1
    `).get(interaction.guildId, user.id).total;

const result = embed(
      `تحذيرات ${cleanText(user.username, 100)}`,
      `التحذيرات الفعالة: ${count}\nيُعرض آخر 10 تحذيرات.`
    );

for (const row of rows) {
      result.addFields({
        name: `تحذير #${row.id}`,
        value:
          `${cleanText(row.reason, 400)}\n` +
          `المسؤول: ${row.moderator_id}\n${timestamp(row.created_at)}`
      });
    }

await interaction.editReply({ embeds: [result] });
    return;
  }

const target = await memberById(
    interaction.guild,
    user.id,
    !['ban', 'clearwarnings'].includes(sub)
  );

await checkTarget(interaction, user, target);

if (sub === 'clearwarnings') {
    const result = db.prepare(`
      UPDATE warnings SET active = 0
      WHERE guild_id = ? AND user_id = ? AND active = 1
    `).run(interaction.guildId, user.id);

const caseId = await recordCase(
      interaction.guild,
      interaction.user.id,
      user.id,
      'CLEAR_WARNINGS',
      reason
    );

await interaction.editReply({
      content: `تم إلغاء ${result.changes} تحذير. القضية #${caseId}.`
    });
    return;
  }

if (sub === 'warn') {
    const insertWarning = db.transaction(() => {
      const warning = db.prepare(`
        INSERT INTO warnings(
          guild_id, user_id, moderator_id, reason, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        interaction.guildId,
        user.id,
        interaction.user.id,
        reason,
        Date.now()
      );

return Number(warning.lastInsertRowid);
    });

const warningId = insertWarning();

const caseId = await recordCase(
      interaction.guild,
      interaction.user.id,
      user.id,
      'WARN',
      reason
    );

await interaction.editReply({
      content: `تم إضافة التحذير #${warningId}. القضية #${caseId}.`
    });
    return;
  }

await requireBot(interaction, [required]);

const auditReason = `${reason} | Moderator: ${interaction.user.id}`;

if (sub === 'kick') {
    if (!target.kickable) {
      throw new UserError('لا أستطيع طرد العضو. راجع ترتيب الرتب.');
    }

await target.kick(auditReason);
  }

if (sub === 'ban') {
    if (target && !target.bannable) {
      throw new UserError('لا أستطيع حظر العضو. راجع ترتيب الرتب.');
    }

await interaction.guild.members.ban(user.id, {
      reason: auditReason
    });
  }

if (sub === 'timeout' || sub === 'untimeout') {
    if (!target.moderatable) {
      throw new UserError(
        'لا أستطيع تعديل تقييد العضو. راجع الرتب وصلاحياته.'
      );
    }

const duration = sub === 'timeout'
      ? interaction.options.getInteger('minutes', true) * 60000
      : null;

await target.timeout(duration, auditReason);
  }

const caseId = await recordCase(
    interaction.guild,
    interaction.user.id,
    user.id,
    sub.toUpperCase(),
    reason
  );

await interaction.editReply({
    content: `تم تنفيذ ${sub} على ${cleanText(user.tag)}. القضية #${caseId}.`
  });
}

// ============================================================
// التذاكر
// ============================================================

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel('استلام التذكرة')
      .setStyle(ButtonStyle.Primary),

new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('إغلاق التذكرة')
      .setStyle(ButtonStyle.Danger)
  );
}

async function createTicket(interaction) {
  await locked(
    `ticket-create:${interaction.guildId}:${interaction.user.id}`,
    async () => {
      await requireBot(interaction, [P.ManageChannels]);

const s = settings(interaction.guildId);

const existing = db.prepare(`
        SELECT * FROM tickets
        WHERE guild_id = ? AND owner_id = ?
        AND status IN ('open', 'closing')
      `).get(interaction.guildId, interaction.user.id);

if (existing) {
        let channel;

try {
          channel = await interaction.guild.channels.fetch(existing.channel_id);
        } catch (error) {
          if (Number(error.code) !== 10003) throw error;
        }

if (channel) {
          await interaction.editReply({
            content: `لديك تذكرة مفتوحة: <#${channel.id}>`
          });
          return;
        }

db.prepare(`
          UPDATE tickets SET status = 'closed', closed_at = ?
          WHERE channel_id = ?
        `).run(Date.now(), existing.channel_id);
      }

const allChannels = await interaction.guild.channels.fetch();
      const marker = `ADVANCED_BOT_TICKET:${interaction.user.id}`;

// استعادة قناة أُنشئت قبل توقف البرنامج أثناء حفظ السجل.
      const orphan = allChannels.find(channel =>
        channel?.type === ChannelType.GuildText &&
        channel.topic === marker
      );

if (orphan) {
        db.prepare(`
          INSERT INTO tickets(
            channel_id, guild_id, owner_id, status, created_at
          ) VALUES (?, ?, ?, 'open', ?)
          ON CONFLICT(channel_id) DO UPDATE SET
            status = 'open',
            closed_at = NULL
        `).run(
          orphan.id,
          interaction.guildId,
          interaction.user.id,
          Date.now()
        );

await interaction.editReply({
          content: `تم العثور على تذكرتك: <#${orphan.id}>`
        });
        return;
      }

let category = null;
      let support = null;

if (s.ticket_category) {
        category = allChannels.get(s.ticket_category);

if (category?.type !== ChannelType.GuildCategory) {
          throw new UserError('تصنيف التذاكر غير موجود. أعد ضبطه.');
        }

await requireBot(interaction, [P.ManageChannels], category);
      }

if (s.support_role) {
        support = await interaction.guild.roles.fetch(s.support_role);

if (!support || support.id === interaction.guildId) {
          throw new UserError('رتبة الدعم غير صالحة. أعد ضبطها.');
        }
      }

const memberPermissions = [
        P.ViewChannel,
        P.SendMessages,
        P.ReadMessageHistory,
        P.AttachFiles
      ];

const overwrites = [
        {
          id: interaction.guildId,
          deny: [P.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: memberPermissions
        },
        {
          id: client.user.id,
          allow: [
            ...memberPermissions,
            P.EmbedLinks,
            P.ManageChannels
          ]
        }
      ];

if (support) {
        overwrites.push({
          id: support.id,
          allow: memberPermissions
        });
      }

const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: category?.id,
        topic: marker,
        permissionOverwrites: overwrites,
        reason: `Ticket opened by ${interaction.user.id}`
      });

db.prepare(`
        INSERT INTO tickets(
          channel_id, guild_id, owner_id, created_at
        ) VALUES (?, ?, ?, ?)
      `).run(
        channel.id,
        interaction.guildId,
        interaction.user.id,
        Date.now()
      );

await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [
          embed(
            'تذكرتك مفتوحة',
            'اكتب طلبك بالتفصيل.\n' +
            'هذه القناة متاحة لك ولفريق الدعم والإدارة.\n\n' +
            'عند الإغلاق تُحفظ نسخة نصية من آخر 2000 رسالة كحد أقصى.'
          )
        ],
        components: [ticketButtons()],
        allowedMentions: {
          parse: [],
          users: [interaction.user.id]
        }
      });

await sendLog(
        interaction.guild,
        'فتح تذكرة',
        `العضو: ${interaction.user.id}\nالقناة: ${channel.id}`
      );

await interaction.editReply({
        content: `تم فتح تذكرتك: <#${channel.id}>`
      });
    }
  );
}

async function claimTicket(interaction) {
  requireTicketAccess(interaction, true);

const result = db.prepare(`
    UPDATE tickets SET claimed_by = ?
    WHERE channel_id = ? AND status = 'open' AND claimed_by IS NULL
  `).run(interaction.user.id, interaction.channelId);

if (!result.changes) {
    const ticket = ticketFor(
      interaction.channelId,
      interaction.guildId
    );

throw new UserError(
      ticket?.claimed_by
        ? `التذكرة مستلمة بالفعل بواسطة ${ticket.claimed_by}.`
        : 'التذكرة لم تعد مفتوحة.'
    );
  }

await interaction.editReply({ content: 'تم استلام التذكرة.' });

try {
    await interaction.channel.send({
      embeds: [
        embed('تم استلام التذكرة', `المسؤول: <@${interaction.user.id}>`)
      ]
    });
  } catch (error) {
    safeError('تعذر نشر إشعار استلام التذكرة:', error);
  }
}

async function requestClose(interaction) {
  requireTicketAccess(interaction);

const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `ticket:confirm:${interaction.channelId}:${interaction.user.id}`
      )
      .setLabel('حفظ النسخة وحذف القناة')
      .setStyle(ButtonStyle.Danger),

new ButtonBuilder()
      .setCustomId(
        `ticket:cancel:${interaction.channelId}:${interaction.user.id}`
      )
      .setLabel('إلغاء')
      .setStyle(ButtonStyle.Secondary)
  );

await interaction.editReply({
    content:
      'سيتم حفظ نسخة نصية من آخر 2000 رسالة، ثم حذف قناة التذكرة.\n' +
      'المرفقات تُحفظ كروابط فقط، وليس كملفات مضمونة البقاء.\n' +
      'هل تريد المتابعة؟',
    components: [row]
  });
}

async function buildTranscript(channel, ticket) {
  const collected = [];
  let before;
  let limited = false;

while (collected.length < 2000) {
    const batch = await channel.messages.fetch({
      limit: Math.min(100, 2000 - collected.length),
      ...(before ? { before } : {})
    });

if (!batch.size) break;

collected.push(...batch.values());
    before = batch.last().id;

if (batch.size < 100) break;
  }

if (collected.length === 2000) {
    const older = await channel.messages.fetch({
      limit: 1,
      before
    });

limited = older.size > 0;
  }

collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

const lines = [
    'DISCORD TICKET TRANSCRIPT',
    `Guild: ${ticket.guild_id}`,
    `Channel: ${channel.id}`,
    `Owner: ${ticket.owner_id}`,
    `Claimed by: ${ticket.claimed_by || 'Not claimed'}`,
    `Created: ${new Date(ticket.created_at).toISOString()}`,
    `Exported: ${new Date().toISOString()}`,
    `Messages exported: ${collected.length}`,
    `Older messages omitted: ${limited ? 'YES' : 'NO'}`,
    'Attachments are URLs, not archived files.',
    '='.repeat(60),
    ''
  ];

for (const message of collected) {
    lines.push(
      `[${new Date(message.createdTimestamp).toISOString()}] ` +
      `${message.author.tag} (${message.author.id})`
    );

lines.push(message.content || '[No text content]');

for (const attachment of message.attachments.values()) {
      lines.push(`Attachment: ${attachment.url}`);
    }

for (const item of message.embeds) {
      if (item.title) lines.push(`Embed title: ${item.title}`);
      if (item.description) lines.push(`Embed: ${item.description}`);
    }

lines.push('');
  }

const buffer = Buffer.from(lines.join('\n'), 'utf8');
  const filename = `ticket-${channel.id}.txt`;
  const filePath = path.join(TRANSCRIPT_DIR, filename);

// إذا فشل الحفظ فلن يتم حذف القناة.
  await fs.writeFile(filePath, buffer, { mode: 0o600 });

return { buffer, filename, filePath, limited };
}

async function closeTicket(interaction) {
  await locked(`ticket-close:${interaction.channelId}`, async () => {
    const ticket = requireTicketAccess(interaction);

await requireBot(
      interaction,
      [P.ManageChannels, P.ViewChannel, P.ReadMessageHistory],
      interaction.channel
    );

db.prepare(`
      UPDATE tickets SET status = 'closing'
      WHERE channel_id = ? AND status = 'open'
    `).run(interaction.channelId);

let deleted = false;

try {
      const transcript = await buildTranscript(
        interaction.channel,
        ticket
      );

db.prepare(`
        UPDATE tickets SET transcript_path = ?
        WHERE channel_id = ?
      `).run(transcript.filePath, interaction.channelId);

const uploadable = transcript.buffer.length <= 7 * 1024 * 1024;

await interaction.editReply({
        content:
          'تم حفظ النسخة النصية. جارٍ حذف القناة.' +
          (transcript.limited ? '\nالنسخة تشمل آخر 2000 رسالة فقط.' : '') +
          (!uploadable ? '\nالملف كبير؛ النسخة محفوظة على جهاز الاستضافة.' : ''),
        components: [],
        files: uploadable
          ? [new AttachmentBuilder(
              transcript.buffer,
              { name: transcript.filename }
            )]
          : []
      });

await interaction.channel.delete(
        `Ticket closed by ${interaction.user.id}`
      );

deleted = true;

db.prepare(`
        UPDATE tickets
        SET status = 'closed', closed_at = ?
        WHERE channel_id = ?
      `).run(Date.now(), interaction.channelId);

await sendLog(
        interaction.guild,
        'إغلاق تذكرة',
        `القناة: ${interaction.channelId}\n` +
        `المالك: ${ticket.owner_id}\n` +
        `المسؤول: ${interaction.user.id}\n` +
        `النسخة: ${transcript.filename}`,
        uploadable
          ? [new AttachmentBuilder(
              transcript.buffer,
              { name: transcript.filename }
            )]
          : []
      );
    } catch (error) {
      if (!deleted) {
        db.prepare(`
          UPDATE tickets SET status = 'open'
          WHERE channel_id = ?
        `).run(interaction.channelId);
      }

throw error;
    }
  });
}

async function handleTicket(interaction) {
  const sub = interaction.options.getSubcommand();

if (sub === 'panel') {
    requirePermission(interaction, P.ManageGuild);

const channel = textChannel(interaction);

await requireBot(
      interaction,
      [P.ViewChannel, P.SendMessages, P.EmbedLinks],
      channel
    );

await channel.send({
      embeds: [
        embed(
          'مركز الدعم',
          'اضغط الزر لفتح تذكرة خاصة.\n' +
          'يمكن فتح تذكرة واحدة فقط في الوقت نفسه.\n\n' +
          'تُحفظ نسخة نصية عند إغلاق التذكرة.'
        )
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket:create')
            .setLabel('فتح تذكرة')
            .setStyle(ButtonStyle.Success)
        )
      ]
    });

await interaction.editReply({ content: 'تم نشر لوحة التذاكر.' });
  }

if (sub === 'claim') await claimTicket(interaction);
  if (sub === 'close') await requestClose(interaction);
}

// ============================================================
// الاقتصاد
// ============================================================

const DAILY_REWARD = 300;

function claimDaily(guildId, userId) {
  return db.transaction(() => {
    const row = userData(guildId, userId);
    const now = Date.now();

if (now - row.last_daily < DAY) {
      throw new UserError(
        `مكافأتك القادمة ${timestamp(row.last_daily + DAY, 'R')}.`
      );
    }

db.prepare(`
      UPDATE users
      SET balance = balance + ?, last_daily = ?
      WHERE guild_id = ? AND user_id = ?
    `).run(DAILY_REWARD, now, guildId, userId);

return row.balance + DAILY_REWARD;
  })();
}

function transferMoney(guildId, senderId, recipientId, amount) {
  return db.transaction(() => {
    const sender = userData(guildId, senderId);
    userData(guildId, recipientId);

if (sender.balance < amount) {
      throw new UserError('رصيدك لا يكفي لهذا التحويل.');
    }

db.prepare(`
      UPDATE users SET balance = balance - ?
      WHERE guild_id = ? AND user_id = ?
    `).run(amount, guildId, senderId);

db.prepare(`
      UPDATE users SET balance = balance + ?
      WHERE guild_id = ? AND user_id = ?
    `).run(amount, guildId, recipientId);

return sender.balance - amount;
  })();
}

async function handleEconomy(interaction) {
  const sub = interaction.options.getSubcommand();

if (sub === 'balance') {
    const user = interaction.options.getUser('member') || interaction.user;
    const row = userData(interaction.guildId, user.id);

await interaction.editReply({
      content: `رصيد ${cleanText(user.username)}: `${row.balance}` عملة.`
    });
  }

if (sub === 'daily') {
    const balance = claimDaily(
      interaction.guildId,
      interaction.user.id
    );

await interaction.editReply({
      content:
        `حصلت على `${DAILY_REWARD}` عملة.\n` +
        `رصيدك الآن: `${balance}`.`
    });
  }

if (sub === 'transfer') {
    const recipient = interaction.options.getUser('member', true);
    const amount = interaction.options.getInteger('amount', true);

if (recipient.bot || recipient.id === interaction.user.id) {
      throw new UserError('اختر عضوًا آخر غير بوت.');
    }

await memberById(interaction.guild, recipient.id);

const balance = transferMoney(
      interaction.guildId,
      interaction.user.id,
      recipient.id,
      amount
    );

await interaction.editReply({
      content:
        `تم تحويل `${amount}` عملة إلى ${cleanText(recipient.username)}.\n` +
        `رصيدك المتبقي: `${balance}`.`
    });
  }
}

// ============================================================
// السحوبات
// ============================================================

function giveawayEmbed(row, entrants = 0) {
  return embed('سحب على جائزة', cleanText(row.prize, 200)).addFields(
    { name: 'ينتهي', value: timestamp(row.ends_at, 'R'), inline: true },
    { name: 'الفائزون', value: String(row.winner_count), inline: true },
    { name: 'المشاركون', value: String(entrants), inline: true },
    { name: 'المضيف', value: `<@${row.host_id}>` }
  );
}

async function finishGiveaway(messageId) {
  await locked(`giveaway-finish:${messageId}`, async () => {
    let row = db.prepare(`
      SELECT * FROM giveaways WHERE message_id = ?
    `).get(messageId);

if (!row) return;

const guild = client.guilds.cache.get(row.guild_id);
    if (!guild) return;

if (row.status === 'active') {
      const entries = db.prepare(`
        SELECT user_id FROM giveaway_entries WHERE message_id = ?
      `).all(messageId);

const eligible = [];

// لا يتم اختيار حسابات غادرت السيرفر أو بوتات.
      for (const entry of entries) {
        const member = await memberById(guild, entry.user_id, false);

if (member && !member.user.bot) {
          eligible.push(entry.user_id);
        }
      }

const selected = [];

while (eligible.length && selected.length < row.winner_count) {
        const index = randomInt(eligible.length);
        selected.push(eligible.splice(index, 1)[0]);
      }

db.prepare(`
        UPDATE giveaways
        SET status = 'ended', winners_json = ?
        WHERE message_id = ? AND status = 'active'
      `).run(JSON.stringify(selected), messageId);

row = db.prepare(`
        SELECT * FROM giveaways WHERE message_id = ?
      `).get(messageId);
    }

if (row.announced) return;

const winners = JSON.parse(row.winners_json || '[]');

try {
      const channel = await guild.channels.fetch(row.channel_id);

if (
        !channel?.isTextBased() ||
        !channel.messages
      ) {
        throw new UserError('قناة السحب غير متاحة.');
      }

const message = await channel.messages.fetch(row.message_id);

await message.edit({
        embeds: [
          embed('انتهى السحب', cleanText(row.prize, 200)).addFields(
            {
              name: 'الفائزون',
              value: winners.length
                ? winners.map(id => `<@${id}>`).join('\n')
                : 'لا توجد مشاركات مؤهلة.'
            },
            { name: 'المضيف', value: `<@${row.host_id}>`, inline: true },
            { name: 'انتهى', value: timestamp(Date.now()), inline: true }
          )
        ],
        components: [],
        allowedMentions: { parse: [] }
      });

db.prepare(`
        UPDATE giveaways SET announced = 1 WHERE message_id = ?
      `).run(messageId);

giveawayRetryAt.delete(messageId);

await sendLog(
        guild,
        'انتهاء سحب',
        `الجائزة: ${row.prize}\n` +
        `الرسالة: ${row.message_id}\n` +
        `الفائزون:\n${winners.join('\n') || 'لا يوجد'}`
      );
    } catch (error) {
      // إذا حُذفت الرسالة أو القناة، تبقى النتيجة محفوظة في القاعدة.
      if ([10003, 10008].includes(Number(error.code))) {
        db.prepare(`
          UPDATE giveaways SET announced = 1 WHERE message_id = ?
        `).run(messageId);

giveawayRetryAt.delete(messageId);

await sendLog(
          guild,
          'سحب انتهى لكن رسالته محذوفة',
          `الرسالة: ${messageId}\nالفائزون:\n${winners.join('\n') || 'لا يوجد'}`
        );
      } else {
        giveawayRetryAt.set(messageId, Date.now() + 60000);
        throw error;
      }
    }
  });
}

async function sweepGiveaways() {
  if (sweepRunning || shuttingDown) return;
  sweepRunning = true;

try {
    const now = Date.now();

const rows = db.prepare(`
      SELECT message_id FROM giveaways
      WHERE (status = 'active' AND ends_at <= ?)
         OR (status = 'ended' AND announced = 0)
      LIMIT 20
    `).all(now);

for (const row of rows) {
      if ((giveawayRetryAt.get(row.message_id) || 0) > now) continue;
      if (locks.has(`giveaway-finish:${row.message_id}`)) continue;

try {
        await finishGiveaway(row.message_id);
      } catch (error) {
        giveawayRetryAt.set(row.message_id, Date.now() + 60000);
        safeError('تعذر إنهاء سحب:', error);
      }
    }
  } finally {
    sweepRunning = false;
  }
}

async function handleGiveaway(interaction) {
  requirePermission(interaction, P.ManageGuild);

const sub = interaction.options.getSubcommand();

if (sub === 'end') {
    const id = interaction.options.getString('message', true);

if (!validId(id)) throw new UserError('معرّف الرسالة غير صحيح.');

const row = db.prepare(`
      SELECT * FROM giveaways WHERE message_id = ? AND guild_id = ?
    `).get(id, interaction.guildId);

if (!row) throw new UserError('السحب غير موجود في هذا السيرفر.');

if (row.status === 'active') {
      db.prepare(`
        UPDATE giveaways SET ends_at = ? WHERE message_id = ?
      `).run(Date.now(), id);
    }

await finishGiveaway(id);

const updated = db.prepare(`
      SELECT * FROM giveaways WHERE message_id = ?
    `).get(id);

const winners = JSON.parse(updated.winners_json || '[]');

await interaction.editReply({
      content:
        'تم إنهاء السحب.\n' +
        (winners.length
          ? `الفائزون:\n${winners.map(userId => `<@${userId}>`).join('\n')}`
          : 'لا توجد مشاركات مؤهلة.')
    });
    return;
  }

const channel = textChannel(interaction);

await requireBot(
    interaction,
    [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory],
    channel
  );

const row = {
    guild_id: interaction.guildId,
    channel_id: channel.id,
    host_id: interaction.user.id,
    prize: interaction.options.getString('prize', true),
    winner_count: interaction.options.getInteger('winners', true),
    ends_at:
      Date.now() + interaction.options.getInteger('minutes', true) * 60000
  };

// الزر لا يُفعّل إلا بعد حفظ السحب.
  const message = await channel.send({
    embeds: [giveawayEmbed(row)]
  });

try {
    db.prepare(`
      INSERT INTO giveaways(
        message_id, guild_id, channel_id, host_id,
        prize, winner_count, ends_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.id,
      row.guild_id,
      row.channel_id,
      row.host_id,
      row.prize,
      row.winner_count,
      row.ends_at,
      Date.now()
    );

await message.edit({
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway:join:${message.id}`)
            .setLabel('المشاركة / إلغاء المشاركة')
            .setStyle(ButtonStyle.Success)
        )
      ]
    });
  } catch (error) {
    db.prepare(`
      DELETE FROM giveaways WHERE message_id = ?
    `).run(message.id);

await message.delete().catch(() => {});
    throw error;
  }

await interaction.editReply({
    content: `تم إنشاء السحب: ${message.url}`
  });
}

async function toggleGiveawayEntry(interaction, messageId) {
  if (interaction.message.id !== messageId) {
    throw new UserError('زر السحب غير صالح.');
  }

if (locks.has(`giveaway-finish:${messageId}`)) {
    throw new UserError('السحب قيد الإنهاء.');
  }

const joined = db.transaction(() => {
    const row = db.prepare(`
      SELECT * FROM giveaways
      WHERE message_id = ? AND guild_id = ?
    `).get(messageId, interaction.guildId);

if (
      !row ||
      row.status !== 'active' ||
      row.ends_at <= Date.now()
    ) {
      throw new UserError('انتهى السحب أو لم يعد متاحًا.');
    }

const existing = db.prepare(`
      SELECT 1 FROM giveaway_entries
      WHERE message_id = ? AND user_id = ?
    `).get(messageId, interaction.user.id);

if (existing) {
      db.prepare(`
        DELETE FROM giveaway_entries
        WHERE message_id = ? AND user_id = ?
      `).run(messageId, interaction.user.id);

return false;
    }

db.prepare(`
      INSERT INTO giveaway_entries(message_id, user_id)
      VALUES (?, ?)
    `).run(messageId, interaction.user.id);

return true;
  })();

await interaction.editReply({
    content: joined ? 'تم تسجيل مشاركتك.' : 'تم إلغاء مشاركتك.'
  });

// لا نعدّل رسالة السحب عند كل ضغطة لتجنب ازدحام طلبات Discord.
}

// ============================================================
// الحماية والمستويات
// ============================================================

async function applyAutomod(message, s) {
  if (!s.automod || !message.member) return false;

if (message.member.permissions.has(P.ManageMessages)) return false;
  if (message.author.id === message.guild.ownerId) return false;

const now = Date.now();
  const key = `${message.guildId}:${message.author.id}`;

const bucket = (spamBuckets.get(key) || [])
    .filter(time => now - time < 8000);

bucket.push(now);
  spamBuckets.set(key, bucket);

const mentionCount =
    message.mentions.users.size + message.mentions.roles.size;

let reason = null;

if (
    mentionCount >= s.mention_limit ||
    message.mentions.everyone
  ) {
    reason = 'منشن زائد';
  } else if (
    s.block_links &&
    /(?:https?:\/\/|www\.|discord\.gg\/|discord(?:app)?\.com\/invite\/)/i
      .test(message.content)
  ) {
    reason = 'رابط ممنوع';
  } else if (bucket.length >= s.spam_limit) {
    reason = 'إرسال رسائل بسرعة عالية';
  }

if (!reason) return false;

let removed = false;

if (message.deletable) {
    await message.delete().catch(error => {
      safeError('تعذر حذف رسالة مخالفة:', error);
    });

removed = !message.guild.channels.cache
      .get(message.channelId)?.messages?.cache.has(message.id);

// نجاح حذف الرسالة لا يُعتمد عليه من الكاش لتقرير العقوبة.
  }

if (now - (automodCooldowns.get(key) || 0) >= 30000) {
    automodCooldowns.set(key, now);

let timedOut = false;

if (
      reason === 'إرسال رسائل بسرعة عالية' &&
      message.member.moderatable
    ) {
      try {
        await message.member.timeout(60000, `AutoMod: ${reason}`);
        timedOut = true;
      } catch (error) {
        safeError('تعذر تطبيق تايم أوت تلقائي:', error);
      }
    }

await sendLog(
      message.guild,
      'حماية تلقائية',
      `المستخدم: ${message.author.id}\n` +
      `القناة: ${message.channelId}\n` +
      `المخالفة: ${reason}\n` +
      `تايم أوت دقيقة: ${timedOut ? 'نعم' : 'لا'}`
    );
  }

// لا تمنح نقاطًا لرسالة خالفت الحماية حتى لو تعذر حذفها.
  return true;
}

function awardXp(message, s) {
  if (!s.levels || message.content.trim().length < 4) return;

const reward = db.transaction(() => {
    const row = userData(message.guildId, message.author.id);
    const now = Date.now();

if (now - row.last_xp < 60000) return null;

const newXp = row.xp + randomInt(15, 26);
    const oldLevel = levelFromXp(row.xp);
    const newLevel = levelFromXp(newXp);
    const coins = Math.max(0, newLevel - oldLevel) * 50;

db.prepare(`
      UPDATE users
      SET xp = ?, last_xp = ?, balance = balance + ?
      WHERE guild_id = ? AND user_id = ?
    `).run(
      newXp,
      now,
      coins,
      message.guildId,
      message.author.id
    );

return newLevel > oldLevel ? { level: newLevel, coins } : null;
  })();

if (reward) {
    void sendLog(
      message.guild,
      'ارتفاع مستوى',
      `العضو: ${message.author.id}\n` +
      `المستوى: ${reward.level}\n` +
      `مكافأة العملات: ${reward.coins}`
    );
  }
}

client.on(Events.MessageCreate, async message => {
  if (
    !db ||
    shuttingDown ||
    !message.inGuild() ||
    message.author.bot ||
    message.webhookId
  ) return;

try {
    const s = settings(message.guildId);
    const blocked = await applyAutomod(message, s);

if (!blocked) awardXp(message, s);
  } catch (error) {
    safeError('خطأ معالجة رسالة:', error);
  }
});

// ============================================================
// استقبال الأعضاء
// ============================================================

client.on(Events.GuildMemberAdd, async member => {
  if (!db || shuttingDown || member.user.bot) return;

const s = settings(member.guild.id);

if (s.auto_role) {
    try {
      const role = await member.guild.roles.fetch(s.auto_role);
      const bot = await botMember(member.guild);

if (
        role &&
        !role.managed &&
        role.id !== member.guild.id &&
        !role.permissions.has(P.Administrator) &&
        bot.permissions.has(P.ManageRoles) &&
        bot.roles.highest.comparePositionTo(role) > 0
      ) {
        await member.roles.add(role, 'Automatic member role');
      }
    } catch (error) {
      safeError('تعذر منح الرتبة التلقائية:', error);
    }
  }

if (!s.welcome_channel) return;

try {
    const channel = await member.guild.channels.fetch(s.welcome_channel);

if (
      !channel?.isTextBased() ||
      typeof channel.send !== 'function'
    ) return;

await channel.send({
      content: `<@${member.id}>`,
      embeds: [
        embed(
          `مرحبًا في ${cleanText(member.guild.name, 100)}`,
          'أهلًا وسهلًا! اقرأ قوانين السيرفر واستمتع بوقتك.'
        )
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `عدد الأعضاء: ${member.guild.memberCount}` })
      ],
      allowedMentions: {
        parse: [],
        users: [member.id]
      }
    });
  } catch (error) {
    safeError('تعذر إرسال الترحيب:', error);
  }
});

// إذا حُذفت تذكرة يدويًا، لا تبقى مسجلة كتذكرة مفتوحة.
client.on(Events.ChannelDelete, channel => {
  if (!db || shuttingDown || !channel.guild) return;

try {
    db.prepare(`
      UPDATE tickets SET status = 'closed', closed_at = ?
      WHERE channel_id = ? AND status IN ('open', 'closing')
    `).run(Date.now(), channel.id);
  } catch (error) {
    safeError('تعذر تحديث سجل قناة محذوفة:', error);
  }
});

// ============================================================
// المعلومات والترتيب
// ============================================================

async function handleInformation(interaction) {
  const name = interaction.commandName;

if (name === 'help') {
    await interaction.editReply({
      embeds: [
        embed(
          'مساعدة البوت',
          'كل سيرفر له إعدادات وبيانات مستقلة.\n' +
          'الأوامر الإدارية تتطلب صلاحيات مناسبة.'
        ).addFields(
          {
            name: 'الإعدادات',
            value:
              '`/config show`\n`/config welcome`\n`/config logs`\n' +
              '`/config tickets`\n`/config automod`\n`/config levels`'
          },
          {
            name: 'الإدارة',
            value:
              '`/mod kick`\n`/mod ban`\n`/mod timeout`\n' +
              '`/mod untimeout`\n`/mod warn`\n`/mod warnings`\n' +
              '`/mod clearwarnings`\n`/mod clear`\n`/mod case`'
          },
          {
            name: 'التذاكر والسحوبات',
            value:
              '`/ticket panel`\n`/ticket claim`\n`/ticket close`\n' +
              '`/giveaway start`\n`/giveaway end`'
          },
          {
            name: 'الاقتصاد والمعلومات',
            value:
              '`/economy balance`\n`/economy daily`\n' +
              '`/economy transfer`\n`/rank`\n`/leaderboard`\n' +
              '`/ping`\n`/server`\n`/user`\n`/announce`'
          }
        )
      ]
    });
    return;
  }

if (name === 'ping') {
    await interaction.editReply({
      content:
        `اتصال Discord: `${Math.max(0, Math.round(client.ws.ping))}ms`\n` +
        `مدة تشغيل العملية: `${Math.floor(process.uptime() / 60)} دقيقة``
    });
    return;
  }

if (name === 'server') {
    const guild = interaction.guild;
    const result = embed('معلومات السيرفر', cleanText(guild.name, 100))
      .addFields(
        { name: 'المعرّف', value: guild.id, inline: true },
        { name: 'الأعضاء', value: String(guild.memberCount), inline: true },
        { name: 'المالك', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'تاريخ الإنشاء', value: timestamp(guild.createdTimestamp) }
      );

const icon = guild.iconURL({ size: 256 });
    if (icon) result.setThumbnail(icon);

await interaction.editReply({ embeds: [result] });
    return;
  }

if (name === 'user') {
    const user = interaction.options.getUser('member') || interaction.user;
    const member = await memberById(interaction.guild, user.id, false);

const result = embed('معلومات المستخدم', cleanText(user.tag, 100))
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'المعرّف', value: user.id, inline: true },
        { name: 'الحساب', value: user.bot ? 'بوت' : 'عضو', inline: true },
        { name: 'إنشاء الحساب', value: timestamp(user.createdTimestamp) }
      );

if (member) {
      result.addFields(
        { name: 'أعلى رتبة', value: cleanText(member.roles.highest.name, 100) },
        {
          name: 'الانضمام',
          value: member.joinedTimestamp
            ? timestamp(member.joinedTimestamp)
            : 'غير متوفر'
        }
      );
    }

await interaction.editReply({ embeds: [result] });
    return;
  }

if (name === 'rank') {
    const user = interaction.options.getUser('member') || interaction.user;
    const row = userData(interaction.guildId, user.id);
    const level = levelFromXp(row.xp);
    const next = (level + 1) ** 2 * 100;

const place = db.prepare(`
      SELECT COUNT(*) + 1 AS rank FROM users
      WHERE guild_id = ? AND xp > ?
    `).get(interaction.guildId, row.xp).rank;

await interaction.editReply({
      embeds: [
        embed(`بطاقة ${cleanText(user.username, 100)}`)
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'المستوى', value: String(level), inline: true },
            { name: 'الترتيب', value: String(place), inline: true },
            { name: 'النقاط', value: String(row.xp), inline: true },
            { name: 'للترقية القادمة', value: String(next - row.xp), inline: true },
            { name: 'الرصيد', value: String(row.balance), inline: true }
          )
      ]
    });
    return;
  }

if (name === 'leaderboard') {
    const type = interaction.options.getString('type', true);

if (!['xp', 'balance'].includes(type)) {
      throw new UserError('نوع الترتيب غير صحيح.');
    }

// اسم العمود محصور بالقيمتين أعلاه.
    const rows = db.prepare(`
      SELECT user_id, ${type} AS value FROM users
      WHERE guild_id = ?
      ORDER BY ${type} DESC, user_id ASC LIMIT 10
    `).all(interaction.guildId);

await interaction.editReply({
      embeds: [
        embed(
          type === 'xp' ? 'ترتيب النقاط' : 'ترتيب الأرصدة',
          rows.length
            ? rows.map((row, index) =>
                ``${index + 1}.` <@${row.user_id}> — `${row.value}``
              ).join('\n')
            : 'لا توجد بيانات بعد.'
        ).setFooter({
          text: 'الترتيب يشمل الحسابات المحفوظة، بما فيها أعضاء غادروا السيرفر.'
        })
      ]
    });
  }
}

// ============================================================
// التفاعلات ومعالجة الأخطاء
// ============================================================

async function handleButton(interaction) {
  const id = interaction.customId;

if (id === 'ticket:create') return createTicket(interaction);
  if (id === 'ticket:claim') return claimTicket(interaction);
  if (id === 'ticket:close') return requestClose(interaction);

const closeMatch = id.match(
    /^ticket:(confirm|cancel):(\d{17,20}):(\d{17,20})$/
  );

if (closeMatch) {
    const [, action, channelId, userId] = closeMatch;

if (
      channelId !== interaction.channelId ||
      userId !== interaction.user.id
    ) {
      throw new UserError('هذا التأكيد ليس مخصصًا لك.');
    }

if (action === 'cancel') {
      await interaction.editReply({
        content: 'تم إلغاء الإغلاق.',
        components: []
      });
      return;
    }

await closeTicket(interaction);
    return;
  }

const giveawayMatch = id.match(/^giveaway:join:(\d{17,20})$/);

if (giveawayMatch) {
    await toggleGiveawayEntry(interaction, giveawayMatch[1]);
    return;
  }

throw new UserError('هذا الزر غير معروف أو لم يعد مدعومًا.');
}

async function handleCommand(interaction) {
  const name = interaction.commandName;

if (name === 'config') return handleConfig(interaction);
  if (name === 'mod') return handleModeration(interaction);
  if (name === 'ticket') return handleTicket(interaction);
  if (name === 'economy') return handleEconomy(interaction);
  if (name === 'giveaway') return handleGiveaway(interaction);

if (name === 'announce') {
    requirePermission(interaction, P.ManageMessages);

const channel = textChannel(interaction);

await requireBot(
      interaction,
      [P.ViewChannel, P.SendMessages, P.EmbedLinks],
      channel
    );

await channel.send({
      embeds: [
        embed(
          'إعلان',
          cleanText(interaction.options.getString('text', true), 3500)
        ).setFooter({ text: `بواسطة ${interaction.user.tag}` })
      ],
      allowedMentions: { parse: [] }
    });

await interaction.editReply({
      content: 'تم نشر الإعلان دون تنبيهات منشن.'
    });
    return;
  }

if (
    ['help', 'ping', 'server', 'user', 'rank', 'leaderboard'].includes(name)
  ) {
    return handleInformation(interaction);
  }

throw new UserError('الأمر غير معروف. استخدم /help.');
}

function errorMessage(error) {
  if (error instanceof UserError) return error.message;

switch (Number(error.code)) {
    case 50013:
      return 'الصلاحيات غير كافية أو ترتيب رتبة البوت لا يسمح بالعملية.';
    case 50001:
      return 'البوت لا يستطيع الوصول إلى القناة أو العنصر المطلوب.';
    case 10003:
      return 'القناة غير موجودة.';
    case 10007:
      return 'العضو غير موجود في السيرفر.';
    case 10008:
      return 'الرسالة غير موجودة.';
    case 30013:
      return 'السيرفر وصل إلى الحد المسموح من القنوات.';
    default:
      return 'حدث خطأ أثناء التنفيذ. راجع سجل الاستضافة قبل إعادة المحاولة.';
  }
}

async function reportInteractionError(interaction, error) {
  if (!(error instanceof UserError)) {
    safeError('خطأ تنفيذ تفاعل:', error);
  }

const payload = {
    content: errorMessage(error),
    allowedMentions: { parse: [] }
  };

try {
    if (interaction.deferred) {
      await interaction.editReply({
        ...payload,
        components: []
      });
    } else if (interaction.replied) {
      await interaction.followUp({
        ...payload,
        flags: EPHEMERAL
      });
    } else {
      await interaction.reply({
        ...payload,
        flags: EPHEMERAL
      });
    }
  } catch {
    console.error('تعذر إرسال رد الخطأ؛ ربما انتهت صلاحية التفاعل.');
  }
}

client.on(Events.InteractionCreate, async interaction => {
  if (
    !interaction.isChatInputCommand() &&
    !interaction.isButton()
  ) return;

// الأزرار يجب أن تكون على رسالة أرسلها هذا البوت.
  if (
    interaction.isButton() &&
    interaction.message.author.id !== client.user.id
  ) return;

try {
    if (!db || shuttingDown) {
      throw new UserError('البوت غير جاهز الآن.');
    }

if (!interaction.inCachedGuild()) {
      throw new UserError('استخدم البوت داخل سيرفر جاهز، وليس في الخاص.');
    }

const key = `${interaction.guildId}:${interaction.user.id}`;
    const now = Date.now();

if (now - (commandCooldowns.get(key) || 0) < 1500) {
      throw new UserError('انتظر ثانية ونصف بين الطلبات.');
    }

commandCooldowns.set(key, now);

// تأكيد استلام الطلب قبل تنفيذ عمليات الشبكة أو قاعدة البيانات.
    await interaction.deferReply({ flags: EPHEMERAL });

if (interaction.isButton()) {
      await handleButton(interaction);
    } else {
      await handleCommand(interaction);
    }
  } catch (error) {
    await reportInteractionError(interaction, error);
  }
});

// ============================================================
// الاتصال والتشغيل والإيقاف
// ============================================================

client.once(Events.ClientReady, async readyClient => {
  try {
    readyClient.user.setActivity('/help | إدارة • دعم • حماية', {
      type: ActivityType.Watching
    });

if (
      TEST_GUILD_ID &&
      !readyClient.guilds.cache.has(TEST_GUILD_ID)
    ) {
      throw new UserError('البوت ليس داخل TEST_GUILD_ID المحدد.');
    }

const rest = new REST({ version: '10' }).setToken(TOKEN);

const route = TEST_GUILD_ID
      ? Routes.applicationGuildCommands(
          readyClient.user.id,
          TEST_GUILD_ID
        )
      : Routes.applicationCommands(readyClient.user.id);

// يستبدل أوامر هذا التطبيق في النطاق المختار.
    await rest.put(route, {
      body: commands.map(item => item.toJSON())
    });

console.log(`البوت متصل: ${readyClient.user.tag}`);
    console.log(`السيرفرات: ${readyClient.guilds.cache.size}`);
    console.log(
      TEST_GUILD_ID
        ? `الأوامر مسجلة في السيرفر ${TEST_GUILD_ID}`
        : 'الأوامر مسجلة عالميًا؛ قد تحتاج وقتًا لتظهر.'
    );

giveawayTimer = setInterval(() => {
      void sweepGiveaways();
    }, 15000);

void sweepGiveaways();
  } catch (error) {
    if (error instanceof UserError) {
      console.error(error.message);
    } else {
      safeError('فشل تجهيز البوت:', error);
    }

await shutdown(1);
  }
});

client.on(Events.Error, error => {
  safeError('خطأ Discord client:', error);
});

client.on(Events.Warn, () => {
  console.warn('صدر تنبيه من Discord client.');
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();

for (const [key, time] of commandCooldowns) {
    if (now - time > 60000) commandCooldowns.delete(key);
  }

for (const [key, time] of automodCooldowns) {
    if (now - time > 120000) automodCooldowns.delete(key);
  }

for (const [key, times] of spamBuckets) {
    if (!times.length || now - times[times.length - 1] > 30000) {
      spamBuckets.delete(key);
    }
  }
}, 60000);

cleanupTimer.unref();

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

console.log('إيقاف البوت وحفظ البيانات...');
  clearInterval(giveawayTimer);
  clearInterval(cleanupTimer);
  client.destroy();

// لا نغلق القاعدة بينما عمليات معلّقة تستخدمها.
  const deadline = Date.now() + 10000;

while ((locks.size || sweepRunning) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

try {
    if (db?.open) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    }
  } catch (error) {
    safeError('تعذر إغلاق قاعدة البيانات بشكل منظم:', error);
  }

process.exit(exitCode);
}

process.once('SIGINT', () => { void shutdown(0); });
process.once('SIGTERM', () => { void shutdown(0); });

process.on('unhandledRejection', error => {
  safeError('وعد غير معالج؛ سيتم إيقاف البوت بأمان:', error);
  void shutdown(1);
});

process.on('uncaughtException', error => {
  safeError('خطأ غير معالج؛ سيتم إيقاف البوت بأمان:', error);
  void shutdown(1);
});

async function main() {
  await fs.mkdir(TRANSCRIPT_DIR, {
    recursive: true,
    mode: 0o700
  });

initializeDatabase();

await client.login(TOKEN);
}

main().catch(async error => {
  safeError('فشل بدء التشغيل. راجع التوكن وIntents:', error);
  await shutdown(1);
});
