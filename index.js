// ============================================================
// KINGDOM BOT — ROYAL CRIMSON EDITION
// Discord.js v14 • MongoDB • CommonJS
// ============================================================
// متغيرات البيئة:
// DISCORD_TOKEN
// MONGO_URL
// OWNER_ID
// PORT
//
// اجمع جميع الأجزاء في index.js قبل التشغيل.
// ============================================================

'use strict';

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType,
  Partials,
} = require('discord.js');

const {
  createCanvas,
  loadImage,
  GlobalFonts,
} = require('@napi-rs/canvas');

const express = require('express');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const port = process.env.PORT || 3000;

const TOKEN = process.env.DISCORD_TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const OWNER_ID = process.env.OWNER_ID || null;

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN غير موجود في متغيرات البيئة.');
  process.exit(1);
}

if (!MONGO_URL) {
  console.error('❌ MONGO_URL غير موجود في متغيرات البيئة.');
  process.exit(1);
}

// الاتصال بقاعدة البيانات وتسجيل دخول Discord سيكونان
// في الجزء الأخير، حتى تُجهّز جميع المعالجات أولًا.

mongoose.set('bufferCommands', false);

// ============================================================
// ========== الهوية البصرية ==========
// ============================================================
// أسماء ORANGE القديمة محفوظة لضمان توافق بقية الكود.
// اللون الفعلي أحمر ملكي، وليس برتقاليًا.
// ============================================================

const THEME = Object.freeze({
  BLACK: 0x101018,
  DARK: 0x191923,

ORANGE: 0xe32646,
  ORANGE_LIGHT: 0xff526c,
  ORANGE_DARK: 0xa81632,

ORANGE_HEX: '#e32646',
  BLACK_HEX: '#101018',
  DARK_HEX: '#191923',

SUCCESS: 0xe32646,
  ERROR: 0xff526c,
  WARN: 0xf0b35a,

WHITE: 0xf5f5fa,
  MUTED: 0xaaaaba,

BRAND: 'KINGDOM',
  FOOTER: 'KINGDOM • The Kingdom Never Falls',
});

const BTN = Object.freeze({
  MAIN: ButtonStyle.Danger,
  ALT: ButtonStyle.Secondary,
});

const LIMITS = Object.freeze({
  EMBED_TITLE: 256,
  EMBED_DESCRIPTION: 4096,
  EMBED_FIELD_NAME: 256,
  EMBED_FIELD_VALUE: 1024,
  EMBED_FIELDS: 25,
  EMBED_TOTAL: 6000,

SELECT_OPTIONS: 25,
  SELECT_LABEL: 100,
  SELECT_VALUE: 100,

MODAL_TITLE: 45,
  MODAL_FIELDS: 5,

SECTION_NAME: 50,
  NAME_COOLDOWN: 5 * 60 * 60 * 1000,

PROTECTION_TIMEOUT: 10 * 60 * 1000,
  XP_COOLDOWN: 60 * 1000,

PIGEON_COOLDOWN: 60 * 1000,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
});

// ============================================================
// ========== الخط العربي ==========
// ============================================================

const arabicFontPath = path.join(
  __dirname,
  'fonts',
  'NotoNaskhArabic-Bold.ttf'
);

try {
  if (fs.existsSync(arabicFontPath)) {
    GlobalFonts.registerFromPath(arabicFontPath, 'NotoArabic');
    console.log('🎨 تم تحميل الخط العربي.');
  } else {
    console.warn(
      '⚠️ الخط العربي غير موجود؛ سيتم استخدام خط النظام البديل.'
    );
  }
} catch (error) {
  console.warn('⚠️ تعذر تسجيل الخط العربي:', error.message);
}

const ARABIC_FONT = 'NotoArabic, Arial, sans-serif';

// ============================================================
// ========== نماذج MongoDB ==========
// ============================================================
// أسماء النماذج والحقول القديمة محفوظة.
// الحقول الجديدة إضافية ولا تحذف البيانات الموجودة.
// ============================================================

const ConfigSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      unique: true,
      required: true,
    },

logChannel: String,

welcomeChannel: String,
    welcomeMessage: {
      type: String,
      default: 'أهلاً بك في السيرفر! 🎉',
    },
    welcomeTitle: {
      type: String,
      default: '👑 مرحبًا بك في المملكة',
    },

welcomeImage: String,
    welcomeBackground: String,

muteRole: String,
    joinRole: String,

ticketPanelImage: String,
    rolesImage: String,
    rolesPanelText: String,
    bannerImage: String,
    generalImage: String,

levelChannelId: String,

ticketRatingEnabled: {
      type: Boolean,
      default: true,
    },
    ticketRatingChannel: String,
    ticketLogChannel: String,

pigeonChannel: String,
    pigeonTitle: {
      type: String,
      default: '🕊️ حمام الزاجل',
    },
    pigeonDescription: {
      type: String,
      default:
        'رسالة صغيرة قد تصنع يومًا أجمل. اضغط على الزر لكتابة زاجلك.',
    },
    pigeonImage: String,

applyPanelTitle: {
      type: String,
      default: '📋 انضم إلى فريق المملكة',
    },
    applyPanelDescription: {
      type: String,
      default:
        'اختَر القسم المناسب لمهاراتك، ثم املأ نموذج التقديم بعناية.',
    },
    applyPanelImage: String,
    applyPanelChannel: String,
    applyResultLog: String,

protectionEnabled: {
      type: Boolean,
      default: false,
    },
    antiSpamEnabled: {
      type: Boolean,
      default: false,
    },
    antiSpamMax: {
      type: Number,
      default: 5,
      min: 2,
      max: 20,
    },
    antiSpamSeconds: {
      type: Number,
      default: 5,
      min: 2,
      max: 60,
    },
    antiLinkEnabled: {
      type: Boolean,
      default: false,
    },
    antiEveryoneEnabled: {
      type: Boolean,
      default: false,
    },
    protectionAction: {
      type: String,
      enum: [
        'delete',
        'delete_warn',
        'delete_mute',
        'delete_warn_mute',
      ],
      default: 'delete_warn',
    },
    protectionBypassRoles: {
      type: [String],
      default: [],
    },

suggestionsChannel: String,
  },
  {
    timestamps: true,
  }
);

const Config = mongoose.model('Config', ConfigSchema);

const BannedWordSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  word: {
    type: String,
    required: true,
  },
  addedBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

BannedWordSchema.index(
  { guildId: 1, word: 1 },
  { unique: true }
);

const BannedWord = mongoose.model(
  'BannedWord',
  BannedWordSchema
);

const UserSchema = new mongoose.Schema(
  {
    guildId: String,
    userId: String,
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 0,
    },
    messages: {
      type: Number,
      default: 0,
    },
    lastXpAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index(
  { guildId: 1, userId: 1 },
  { unique: true }
);

const User = mongoose.model('User', UserSchema);

const WarnSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  reason: String,
  moderator: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

WarnSchema.index({ guildId: 1, userId: 1, date: -1 });

const Warn = mongoose.model('Warn', WarnSchema);

const TicketSettingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    unique: true,
    required: true,
  },

sections: [
    {
      name: String,
      roleId: String,
      emoji: {
        type: String,
        default: '📌',
      },
    },
  ],

text: {
    type: String,
    default:
      'أهلًا بك في مركز الدعم.\n' +
      'اختَر القسم المناسب من القائمة، وسنفتح لك تذكرة خاصة.\n\n' +
      '> اشرح طلبك بوضوح، وانتظر رد الفريق دون تكرار المنشن.',
  },

image: {
    type: String,
    default: null,
  },

categoryId: {
    type: String,
    default: null,
  },
});

const TicketSettings = mongoose.model(
  'TicketSettings',
  TicketSettingsSchema
);

const TicketSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: String,
    required: true,
  },

sectionName: String,

supportRoleId: {
    type: String,
    default: null,
  },

claimedBy: String,
  claimedAt: Date,

addedMembers: {
    type: [String],
    default: [],
  },

status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },

closed: {
    type: Boolean,
    default: false,
  },

closedBy: String,
  closedAt: Date,
  deletedAt: Date,

createdAt: {
    type: Date,
    default: Date.now,
  },
});

TicketSchema.index({
  guildId: 1,
  ownerId: 1,
  status: 1,
});

// لا نضيف unique index للتذاكر المفتوحة تلقائيًا.
// البيانات القديمة قد تحتوي تذاكر مكررة وتحتاج تسوية أولًا.

const Ticket = mongoose.model('Ticket', TicketSchema);

const TicketRatingSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  closedBy: String,
  section: String,

rating: {
    type: Number,
    min: 1,
    max: 5,
  },

comment: String,
  ticketId: String,

ratingLogMessageId: String,

createdAt: {
    type: Date,
    default: Date.now,
  },
});

TicketRatingSchema.index(
  { guildId: 1, ticketId: 1 },
  { unique: true }
);

const TicketRating = mongoose.model(
  'TicketRating',
  TicketRatingSchema
);

const SelfRoleSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    roleId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    emoji: {
      type: String,
      default: '🎭',
    },
    image: {
      type: String,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

SelfRoleSchema.index(
  { guildId: 1, roleId: 1 },
  { unique: true }
);

const SelfRole = mongoose.model('SelfRole', SelfRoleSchema);

const AutoLineSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  text: String,
  image: String,
  enabled: {
    type: Boolean,
    default: false,
  },
});

AutoLineSchema.index(
  { guildId: 1, channelId: 1 },
  { unique: true }
);

const AutoLine = mongoose.model('AutoLine', AutoLineSchema);

const AutoReplySchema = new mongoose.Schema({
  guildId: String,
  keyword: String,
  reply: String,
  image: String,
});

AutoReplySchema.index(
  { guildId: 1, keyword: 1 },
  { unique: true }
);

const AutoReply = mongoose.model(
  'AutoReply',
  AutoReplySchema
);

const LevelRoleSchema = new mongoose.Schema({
  guildId: String,
  level: Number,
  roleId: String,
});

LevelRoleSchema.index(
  { guildId: 1, level: 1 },
  { unique: true }
);

const LevelRole = mongoose.model(
  'LevelRole',
  LevelRoleSchema
);

const ControllerSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
});

ControllerSchema.index(
  { guildId: 1, userId: 1 },
  { unique: true }
);

const Controller = mongoose.model(
  'Controller',
  ControllerSchema
);

// النموذج القديم محفوظ.
// التوقيت هنا عالمي للمستخدم كما كان في نسختك الأصلية.

const NameCooldownSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const NameCooldown = mongoose.model(
  'NameCooldown',
  NameCooldownSchema
);

const PigeonSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  messageId: String,
  senderId: {
    type: String,
    required: true,
  },
  recipientId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

PigeonSchema.index({ guildId: 1, createdAt: -1 });
PigeonSchema.index({ guildId: 1, messageId: 1 });
PigeonSchema.index({ guildId: 1, senderId: 1, createdAt: -1 });
PigeonSchema.index({
  guildId: 1,
  recipientId: 1,
  createdAt: -1,
});

const Pigeon = mongoose.model('Pigeon', PigeonSchema);

const ApplicationSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },

answers: [
    {
      question: String,
      answer: String,
    },
  ],

status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },

reviewedBy: String,
  reviewedAt: Date,
  messageId: String,

createdAt: {
    type: Date,
    default: Date.now,
  },
});

ApplicationSchema.index({
  guildId: 1,
  userId: 1,
  type: 1,
  createdAt: -1,
});

const Application = mongoose.model(
  'Application',
  ApplicationSchema
);

const ApplySectionSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    emoji: {
      type: String,
      default: '📋',
    },
    image: {
      type: String,
      default: null,
    },
    roleId: {
      type: String,
      default: null,
    },
    logChannelId: {
      type: String,
      default: null,
    },

questions: [
      {
        label: {
          type: String,
          required: true,
        },
        style: {
          type: String,
          enum: ['SHORT', 'PARAGRAPH'],
          default: 'SHORT',
        },
        required: {
          type: Boolean,
          default: true,
        },
      },
    ],

order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ApplySectionSchema.index(
  { guildId: 1, name: 1 },
  { unique: true }
);

const ApplySection = mongoose.model(
  'ApplySection',
  ApplySectionSchema
);

// النموذج محفوظ للتوافق مع البيانات القديمة.
// التتبع السريع للسبام سيتم في الذاكرة بدل كتابة كل رسالة.

const SpamTrackerSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    messages: [
      {
        content: String,
        timestamp: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

SpamTrackerSchema.index(
  { guildId: 1, userId: 1 },
  { unique: true }
);

const SpamTracker = mongoose.model(
  'SpamTracker',
  SpamTrackerSchema
);

const SuggestionSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },

messageId: String,
  threadId: String,

yesMessageId: String,
  noMessageId: String,

yesCount: {
    type: Number,
    default: 0,
  },
  noCount: {
    type: Number,
    default: 0,
  },

yesUsers: {
    type: [String],
    default: [],
  },
  noUsers: {
    type: [String],
    default: [],
  },

status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },

createdAt: {
    type: Date,
    default: Date.now,
  },
});

SuggestionSchema.index({ guildId: 1, createdAt: -1 });
SuggestionSchema.index({ guildId: 1, messageId: 1 });

const Suggestion = mongoose.model(
  'Suggestion',
  SuggestionSchema
);

// حفظ حالة إذن إرسال الرسائل عند قفل القناة.
// يسمح بإرجاع القيمة القديمة دون حذف بقية الصلاحيات.

const ChannelLockSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  previousSendMessages: {
    type: String,
    enum: ['allow', 'deny', 'inherit'],
    required: true,
  },
  lockedBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ChannelLockSchema.index(
  { guildId: 1, channelId: 1 },
  { unique: true }
);

const ChannelLock = mongoose.model(
  'ChannelLock',
  ChannelLockSchema
);

// ============================================================
// ========== أدوات عامة ==========
// ============================================================

function truncate(value, maxLength, suffix = '…') {
  const text = String(value ?? '');

if (text.length <= maxLength) return text;

return (
    text.slice(0, Math.max(0, maxLength - suffix.length)) +
    suffix
  );
}

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function escapeCodeBlock(value) {
  return String(value ?? '').replace(/```/g, 'ˋˋˋ');
}

function escapeInlineCode(value) {
  return String(value ?? '').replace(/`/g, 'ˋ');
}

function isSnowflake(value) {
  return /^\d{17,20}$/.test(String(value || ''));
}

function parseStrictInteger(value, minimum, maximum) {
  if (!/^\d+$/.test(String(value ?? '').trim())) {
    return null;
  }

const number = Number(value);

if (
    !Number.isSafeInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    return null;
  }

return number;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase();
}

function safeHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;

try {
    const parsed = new URL(value.trim());

if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

return parsed.href;
  } catch {
    return null;
  }
}

function discordTimestamp(value, style = 'R') {
  const time = new Date(value).getTime();

if (!Number.isFinite(time)) return 'غير معروف';

return `<t:${Math.floor(time / 1000)}:${style}>`;
}

function sleep(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function reportError(scope, error) {
  // لا ننشر تفاصيل الخطأ أو إعدادات الاتصال في Discord.
  console.error(`[${scope}]`, {
    name: error?.name || 'Error',
    code: error?.code || null,
    message: truncate(error?.message || 'Unknown error', 500),
  });
}

function scheduleDelete(message, delay = 5000) {
  if (!message?.deletable) return;

const timer = setTimeout(() => {
    message.delete().catch(error => {
      // الرسالة قد تكون محذوفة أصلًا.
      if (error.code !== 10008) {
        reportError('scheduled-delete', error);
      }
    });
  }, delay);

timer.unref?.();
}

// ============================================================
// ========== قفل تسلسلي للعمليات المتزامنة ==========
// ============================================================
// حماية داخل عملية Node واحدة.
// عند تشغيل نسخ متعددة يلزم قفل موزع أو قيد قاعدة بيانات.
// ============================================================

const operationLocks = new Map();

async function withLock(key, task) {
  const previous = operationLocks.get(key) || Promise.resolve();

let release;

const current = new Promise(resolve => {
    release = resolve;
  });

const tail = previous
    .catch(() => {})
    .then(() => current);

operationLocks.set(key, tail);

await previous.catch(() => {});

try {
    return await task();
  } finally {
    release();

if (operationLocks.get(key) === tail) {
      operationLocks.delete(key);
    }
  }
}

// ============================================================
// ========== أدوات Embeds الموحدة ==========
// ============================================================

function createEmbed({
  title = null,
  description = null,
  color = THEME.ORANGE,
  footer = THEME.FOOTER,
  timestamp = false,
  thumbnail = null,
  image = null,
} = {}) {
  const embed = new EmbedBuilder().setColor(color);

if (title) {
    embed.setTitle(truncate(title, LIMITS.EMBED_TITLE));
  }

if (description) {
    embed.setDescription(
      truncate(description, LIMITS.EMBED_DESCRIPTION)
    );
  }

if (footer) {
    embed.setFooter({
      text: truncate(footer, 2048),
    });
  }

if (timestamp) {
    embed.setTimestamp();
  }

const thumbnailURL = safeHttpUrl(thumbnail);

if (thumbnailURL) {
    embed.setThumbnail(thumbnailURL);
  }

if (image?.startsWith('attachment://')) {
    embed.setImage(image);
  } else {
    const imageURL = safeHttpUrl(image);

if (imageURL) {
      embed.setImage(imageURL);
    }
  }

return embed;
}

function addSafeFields(embed, fields) {
  for (const field of fields || []) {
    const data = embed.toJSON();
    const currentFields = data.fields || [];

if (currentFields.length >= LIMITS.EMBED_FIELDS) break;

const usedCharacters =
      (data.title?.length || 0) +
      (data.description?.length || 0) +
      (data.footer?.text?.length || 0) +
      (data.author?.name?.length || 0) +
      currentFields.reduce(
        (total, item) =>
          total + item.name.length + item.value.length,
        0
      );

const name = truncate(
      field.name || 'معلومة',
      LIMITS.EMBED_FIELD_NAME
    );

const remaining =
      LIMITS.EMBED_TOTAL - usedCharacters - name.length;

if (remaining < 1) break;

const value = truncate(
      field.value || '—',
      Math.min(LIMITS.EMBED_FIELD_VALUE, remaining)
    );

embed.addFields({
      name,
      value,
      inline: Boolean(field.inline),
    });
  }

return embed;
}

function createButton(
  customId,
  label,
  emoji = null,
  style = BTN.ALT
) {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(truncate(label, 80))
    .setStyle(style);

if (emoji) {
    const parsed = parseEmoji(emoji);

if (parsed) button.setEmoji(parsed);
  }

return button;
}

function statusText(enabled) {
  return enabled ? '🟢 مفعّل' : '⚫ معطّل';
}

async function sendNotice(
  message,
  text,
  {
    title = null,
    color = THEME.ORANGE,
    reply = true,
  } = {}
) {
  const payload = {
    embeds: [
      createEmbed({
        title,
        description: text,
        color,
      }),
    ],
    allowedMentions: {
      parse: [],
      repliedUser: false,
    },
  };

return reply
    ? message.reply(payload)
    : message.channel.send(payload);
}

// ============================================================
// ========== نماذج الإنشاء الآمن ==========
// ============================================================

async function findOrCreateDocument(Model, filter) {
  try {
    return await Model.findOneAndUpdate(
      filter,
      {
        \$setOnInsert: filter,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;

const existing = await Model.findOne(filter);

if (!existing) throw error;

return existing;
  }
}

// ============================================================
// ========== الإعدادات والمستخدمون ==========
// ============================================================

async function getGuildConfig(guildId) {
  return findOrCreateDocument(Config, { guildId });
}

async function updateGuildConfig(guildId, data) {
  const changes = { ...data };

// منع تعديل هوية السجل من بيانات الإعدادات.
  delete changes._id;
  delete changes.guildId;
  delete changes.__v;

return Config.findOneAndUpdate(
    { guildId },
    {
      \$set: changes,
      \$setOnInsert: { guildId },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
}

async function getUserData(guildId, userId) {
  return findOrCreateDocument(User, { guildId, userId });
}

async function getTicketSettings(guildId) {
  return findOrCreateDocument(TicketSettings, { guildId });
}

async function saveTicketSettings(guildId, data) {
  return TicketSettings.findOneAndUpdate(
    { guildId },
    {
      \$set: {
        sections: data.sections,
        text: data.text,
        image: data.image,
        categoryId: data.categoryId || null,
      },
      \$setOnInsert: {
        guildId,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function getTicketByChannel(guildId, channelId) {
  return Ticket.findOne({ guildId, channelId });
}

// ============================================================
// ========== الأوتو لاين ==========
// ============================================================

async function setAutoLine(guildId, channelId, data) {
  return AutoLine.findOneAndUpdate(
    { guildId, channelId },
    {
      \$set: data,
      \$setOnInsert: {
        guildId,
        channelId,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function deleteAutoLine(guildId, channelId) {
  return AutoLine.deleteOne({ guildId, channelId });
}

async function sendAutoLine(channel, auto) {
  if (
    !channel?.isTextBased() ||
    !auto?.enabled ||
    (!auto.text && !auto.image)
  ) {
    return false;
  }

const image = safeHttpUrl(auto.image);

if (image) {
    await channel.send({
      embeds: [
        createEmbed({
          description: auto.text || null,
          image,
          footer: null,
        }),
      ],
      allowedMentions: {
        parse: [],
      },
    });

return true;
  }

if (auto.text) {
    await channel.send({
      content: truncate(auto.text, 2000),
      allowedMentions: {
        parse: [],
      },
    });

return true;
  }

return false;
}

// ============================================================
// ========== الردود التلقائية ==========
// ============================================================

async function getAutoReplies(guildId) {
  return AutoReply.find({ guildId });
}

async function addAutoReply(
  guildId,
  keyword,
  reply,
  image = null
) {
  const cleanKeyword = String(keyword || '').trim();

if (!cleanKeyword) {
    throw new Error('الكلمة المفتاحية لا يمكن أن تكون فارغة.');
  }

return withLock(
    `auto-reply:${guildId}:${normalizeText(cleanKeyword)}`,
    async () => {
      const existing = await AutoReply.findOne({
        guildId,
        keyword: {
          \$regex: new RegExp(
            `^${escapeRegex(cleanKeyword)}$`,
            'i'
          ),
        },
      });

if (existing) {
        existing.reply = reply;
        existing.image = image;
        await existing.save();

return false;
      }

await AutoReply.create({
        guildId,
        keyword: cleanKeyword,
        reply,
        image,
      });

return true;
    }
  );
}

async function removeAutoReply(guildId, keyword) {
  const result = await AutoReply.deleteOne({
    guildId,
    keyword: {
      \$regex: new RegExp(
        `^${escapeRegex(String(keyword).trim())}$`,
        'i'
      ),
    },
  });

return result.deletedCount > 0;
}

async function findAutoReply(guildId, content) {
  const replies = await getAutoReplies(guildId);
  const normalized = normalizeText(content);

return replies.find(reply => {
    const keyword = normalizeText(reply.keyword);

return keyword && normalized.includes(keyword);
  });
}

// ============================================================
// ========== التحذيرات ==========
// ============================================================

async function addWarn(
  guildId,
  userId,
  reason,
  moderator
) {
  await Warn.create({
    guildId,
    userId,
    reason,
    moderator,
  });

return Warn.countDocuments({ guildId, userId });
}

async function clearWarns(guildId, userId) {
  return Warn.deleteMany({ guildId, userId });
}

// ============================================================
// ========== المتحكمون والصلاحيات ==========
// ============================================================

async function isController(userId, guildId) {
  if (OWNER_ID && userId === OWNER_ID) {
    return true;
  }

return Boolean(
    await Controller.exists({
      guildId,
      userId,
    })
  );
}

async function addController(guildId, userId) {
  const result = await Controller.updateOne(
    { guildId, userId },
    {
      \$setOnInsert: {
        guildId,
        userId,
      },
    },
    {
      upsert: true,
      runValidators: true,
    }
  );

return result.upsertedCount > 0;
}

async function removeController(guildId, userId) {
  const result = await Controller.deleteOne({
    guildId,
    userId,
  });

return result.deletedCount > 0;
}

async function getControllers(guildId) {
  const documents = await Controller.find({ guildId })
    .select('userId')
    .lean();

return documents.map(document => document.userId);
}

async function hasPermission(member, guildId) {
  if (!member || !guildId) {
    return false;
  }

const userId = member.id || member.user?.id;

if (!userId) return false;

if (OWNER_ID && userId === OWNER_ID) {
    return true;
  }

// الأدمن لا يصبح متحكمًا تلقائيًا.
  // هذا يحافظ على نظام التحكم الأصلي.
  return isController(userId, guildId);
}

async function resolveInteractionMember(interaction) {
  if (!interaction.guild) return null;

if (interaction.member?.roles?.cache) {
    return interaction.member;
  }

return interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);
}

function canManageRole(guild, role) {
  const me = guild.members.me;

return Boolean(
    me &&
    role &&
    !role.managed &&
    role.id !== guild.id &&
    me.permissions.has(
      PermissionsBitField.Flags.ManageRoles
    ) &&
    role.position < me.roles.highest.position
  );
}

function isSensitiveSelfRole(role) {
  if (!role) return true;

const sensitivePermissions = [
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageWebhooks,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.MentionEveryone,
  ];

return sensitivePermissions.some(permission => {
    return role.permissions.has(permission, false);
  });
}

async function canModerateTarget(actor, target, guildId) {
  if (!actor || !target) return false;

if (
    target.id === actor.id ||
    target.id === target.guild.ownerId ||
    target.id === client.user?.id ||
    target.id === OWNER_ID
  ) {
    return false;
  }

if (await isController(target.id, guildId)) {
    return false;
  }

if (
    actor.id === OWNER_ID ||
    actor.id === target.guild.ownerId
  ) {
    return true;
  }

return (
    actor.roles.highest.position >
    target.roles.highest.position
  );
}

// ============================================================
// ========== تغيير الاسم ==========
// ============================================================

async function setNameCooldown(userId) {
  return NameCooldown.findOneAndUpdate(
    { userId },
    {
      $set: {
        timestamp: new Date(),
      },
      $setOnInsert: {
        userId,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );
}

async function getNameCooldown(userId) {
  const cooldown = await NameCooldown.findOne({ userId });

return cooldown?.timestamp || null;
}

function getNameAvailableAt(lastChange) {
  if (!(lastChange instanceof Date)) return null;

const availableAt =
    lastChange.getTime() + LIMITS.NAME_COOLDOWN;

return availableAt > Date.now()
    ? new Date(availableAt)
    : null;
}

// ============================================================
// ========== الصور وأسماء القنوات ==========
// ============================================================

function getGeneralImage(guild, config) {
  const configured =
    safeHttpUrl(config?.generalImage) ||
    safeHttpUrl(config?.bannerImage);

if (configured) return configured;

return (
    guild?.iconURL({
      extension: 'png',
      size: 1024,
    }) || null
  );
}

function sanitizeChannelName(name) {
  return (
    String(name || '')
      .normalize('NFKC')
      .replace(
        /[^a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s-]/g,
        ''
      )
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-\$/g, '')
      .slice(0, 90) || 'ticket'
  );
}

// ============================================================
// ========== التقديمات ==========
// ============================================================

async function getApplySections(guildId) {
  return ApplySection.find({ guildId }).sort({
    order: 1,
    createdAt: 1,
  });
}

async function getApplySectionByName(guildId, name) {
  return ApplySection.findOne({
    guildId,
    name,
  });
}

async function addApplySection(
  guildId,
  name,
  emoji = '📋'
) {
  const cleanName = String(name || '').trim();

if (
    !cleanName ||
    cleanName.length > LIMITS.SECTION_NAME
  ) {
    throw new Error('اسم القسم يجب أن يكون بين 1 و50 حرفًا.');
  }

if (
    ['APPLY_RESET', 'TICKET_RESET', 'SELF_ROLES_RESET']
      .includes(cleanName)
  ) {
    throw new Error('هذا الاسم محجوز للنظام.');
  }

return withLock(`apply-sections:${guildId}`, async () => {
    const existing = await ApplySection.exists({
      guildId,
      name: cleanName,
    });

if (existing) return false;

const maxOrder = await ApplySection.findOne({
      guildId,
    }).sort({
      order: -1,
    });

await ApplySection.create({
      guildId,
      name: cleanName,
      emoji: parseEmoji(emoji) ? emoji : '📋',
      order: maxOrder ? maxOrder.order + 1 : 0,
      questions: [],
    });

return true;
  });
}

async function removeApplySection(guildId, name) {
  const result = await ApplySection.deleteOne({
    guildId,
    name,
  });

return result.deletedCount > 0;
}

// ============================================================
// ========== الكلمات المحظورة ==========
// ============================================================

async function getBannedWords(guildId) {
  return BannedWord.find({ guildId }).sort({
    createdAt: -1,
  });
}

async function addBannedWord(
  guildId,
  word,
  addedBy = null
) {
  const normalized = normalizeText(word);

if (!normalized || normalized.length > 100) {
    throw new Error('الكلمة يجب أن تكون بين 1 و100 حرف.');
  }

try {
    const result = await BannedWord.updateOne(
      {
        guildId,
        word: normalized,
      },
      {
        \$setOnInsert: {
          guildId,
          word: normalized,
          addedBy,
        },
      },
      {
        upsert: true,
        runValidators: true,
      }
    );

return result.upsertedCount > 0;
  } catch (error) {
    if (error.code === 11000) return false;

throw error;
  }
}

async function removeBannedWord(guildId, word) {
  const result = await BannedWord.deleteOne({
    guildId,
    word: normalizeText(word),
  });

return result.deletedCount > 0;
}

async function containsBannedWord(guildId, content) {
  const words = await getBannedWords(guildId);
  const normalized = normalizeText(content);

return words.find(item => {
    const word = normalizeText(item.word);

return word && normalized.includes(word);
  });
}

// ============================================================
// ========== منع التكرار ==========
// ============================================================

const spamMemory = new Map();
const pigeonCooldowns = new Map();
const autoReplyCooldowns = new Map();

const memoryCleanupTimer = setInterval(() => {
  const now = Date.now();

for (const [key, record] of spamMemory) {
    if (now - record.lastSeen > 120000) {
      spamMemory.delete(key);
    }
  }

for (const [key, expiresAt] of pigeonCooldowns) {
    if (expiresAt <= now) {
      pigeonCooldowns.delete(key);
    }
  }

for (const [key, expiresAt] of autoReplyCooldowns) {
    if (expiresAt <= now) {
      autoReplyCooldowns.delete(key);
    }
  }
}, 60000);

memoryCleanupTimer.unref();

async function checkSpam(
  guildId,
  userId,
  content,
  max,
  seconds
) {
  const threshold = Math.min(
    20,
    Math.max(2, Number(max) || 5)
  );

const windowMilliseconds =
    Math.min(60, Math.max(2, Number(seconds) || 5)) * 1000;

const key = `${guildId}:${userId}`;
  const now = Date.now();

const tracker = spamMemory.get(key) || {
    entries: [],
    lastSeen: now,
  };

tracker.entries = tracker.entries.filter(entry => {
    return now - entry.timestamp < windowMilliseconds;
  });

const normalized = normalizeText(
    truncate(content, 4000)
  );

tracker.entries.push({
    content: normalized,
    timestamp: now,
  });

tracker.entries = tracker.entries.slice(-100);
  tracker.lastSeen = now;

spamMemory.set(key, tracker);

const repeatedMessages = tracker.entries.filter(entry => {
    return entry.content === normalized;
  }).length;

return repeatedMessages >= threshold;
}

function containsLink(content) {
  return /(?:https?:\/\/|www\.|discord(?:app)?\.com\/invite\/|discord\.gg\/)\S+/i
    .test(String(content || ''));
}

// ============================================================
// ========== إجراء الحماية ==========
// ============================================================

async function applyProtectionAction(
  interactionOrMessage,
  member,
  guildId,
  config,
  reason
) {
  const action = config.protectionAction || 'delete_warn';

let deleted = false;
  let dmSent = false;
  let muted = false;

if (typeof interactionOrMessage.delete === 'function') {
    try {
      await interactionOrMessage.delete();
      deleted = true;
    } catch (error) {
      reportError('protection-delete', error);
    }
  }

if (
    action === 'delete_warn' ||
    action === 'delete_warn_mute'
  ) {
    try {
      await member.send({
        embeds: [
          createEmbed({
            title: '⚠️ تنبيه من إدارة المملكة',
            description:
              ``السيرفر:` ${member.guild.name}\n` +
              ``السبب:` ${reason}\n\n` +
              '> نرجو الالتزام بقوانين المجتمع.',
            color: THEME.WARN,
            footer: 'KINGDOM • SECURITY CENTER',
            timestamp: true,
          }),
        ],
        allowedMentions: {
          parse: [],
        },
      });

dmSent = true;
    } catch {
      // تعطيل الخاص لدى المستخدم حالة متوقعة.
      dmSent = false;
    }
  }

if (
    action === 'delete_mute' ||
    action === 'delete_warn_mute'
  ) {
    try {
      const freshMember = await member.guild.members.fetch(
        member.id
      );

const botMember =
        member.guild.members.me ||
        await member.guild.members.fetchMe();

if (
        botMember.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        ) &&
        freshMember.moderatable
      ) {
        const remainingTimeout = Math.max(
          0,
          (
            freshMember.communicationDisabledUntilTimestamp ||
            0
          ) - Date.now()
        );

// لا نختصر Timeout أطول مفروض مسبقًا.
        const duration = Math.min(
          28 * 24 * 60 * 60 * 1000,
          Math.max(
            LIMITS.PROTECTION_TIMEOUT,
            remainingTimeout
          )
        );

await freshMember.timeout(
          duration,
          truncate(`حماية: ${reason}`, 512)
        );

muted = true;
      } else {
        console.warn(
          '⚠️ تعذر Timeout: تحقق من ModerateMembers وتسلسل الرتب.'
        );
      }
    } catch (error) {
      reportError('protection-timeout', error);
    }
  }

return {
    deleted,
    dmSent,
    muted,
  };
}

// ============================================================
// ========== الإيموجي ==========
// ============================================================

function isValidEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return false;

if (/^<a?:\w{2,32}:\d{17,20}>\$/.test(emoji)) {
    return true;
  }

if (emoji.length > 32) return false;

try {
    const pictograph =
      '(?:\\p{Extended_Pictographic}' +
      '(?:\\uFE0F)?' +
      '(?:\\p{Emoji_Modifier})?)';

const expression = new RegExp(
      `^(?:` +
      `${pictograph}(?:\\u200D${pictograph})*` +
      `|\\p{Regional_Indicator}{2}` +
      `|[0-9#*]\\uFE0F?\\u20E3` +
      `)$`,
      'u'
    );

return expression.test(emoji);
  } catch {
    return false;
  }
}

function parseEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return null;

const custom = emoji.match(
    /^<(a?):(\w{2,32}):(\d{17,20})>\$/
  );

if (custom) {
    return {
      animated: custom[1] === 'a',
      name: custom[2],
      id: custom[3],
    };
  }

return isValidEmoji(emoji) ? emoji : null;
}

// ============================================================
// ========== الرتب الذاتية ==========
// ============================================================

async function getSelfRoles(guildId) {
  return SelfRole.find({ guildId }).sort({
    order: 1,
    createdAt: 1,
  });
}

async function addSelfRole(
  guildId,
  roleId,
  label,
  emoji = '🎭',
  image = null,
  description = ''
) {
  const finalEmoji = parseEmoji(emoji) ? emoji : '🎭';

return withLock(`self-roles:${guildId}`, async () => {
    const existing = await SelfRole.findOne({
      guildId,
      roleId,
    });

if (existing) {
      existing.label = label;
      existing.emoji = finalEmoji;
      existing.image = image;
      existing.description = description;

await existing.save();

return false;
    }

const maxOrder = await SelfRole.findOne({
      guildId,
    }).sort({
      order: -1,
    });

await SelfRole.create({
      guildId,
      roleId,
      label,
      emoji: finalEmoji,
      image,
      description,
      order: maxOrder ? maxOrder.order + 1 : 0,
    });

return true;
  });
}

async function removeSelfRole(guildId, roleId) {
  const result = await SelfRole.deleteOne({
    guildId,
    roleId,
  });

return result.deletedCount > 0;
}

async function updateSelfRole(guildId, roleId, data) {
  const changes = { ...data };

delete changes._id;
  delete changes.guildId;
  delete changes.roleId;
  delete changes.__v;

if (
    changes.emoji !== undefined &&
    !parseEmoji(changes.emoji)
  ) {
    changes.emoji = '🎭';
  }

return SelfRole.findOneAndUpdate(
    { guildId, roleId },
    {
      $set: changes,
    },
    {
      new: true,
      runValidators: true,
    }
  );
}

// ============================================================
// ========== البحث الآمن عن عضو ==========
// ============================================================
// لا نختار أول تطابق جزئي عند وجود أكثر من عضو.
// في الحالات الملتبسة يجب استخدام الآيدي أو المنشن.
// ============================================================

async function findMemberByName(guild, query) {
  if (!guild || !query) return null;

const raw = String(query).trim();

const mention = raw.match(/^<@!?(\d{17,20})>$/);
  const userId = mention?.[1] || (
    isSnowflake(raw) ? raw : null
  );

if (userId) {
    return guild.members.fetch(userId).catch(() => null);
  }

const cleaned = raw.replace(/^@/, '').trim();
  const lower = cleaned.toLowerCase();

if (!lower) return null;

const memberNames = member => {
    return [
      member.user.username,
      member.user.globalName,
      member.user.tag,
      member.displayName,
    ]
      .filter(Boolean)
      .map(value => value.toLowerCase());
  };

// البحث من Discord لتقليل الاعتماد على الكاش.
  let searched;

try {
    searched = await guild.members.search({
      query: cleaned,
      limit: 100,
    });
  } catch {
    searched = null;
  }

const candidates = new Map();

for (const member of guild.members.cache.values()) {
    if (
      memberNames(member).some(name => name.includes(lower))
    ) {
      candidates.set(member.id, member);
    }
  }

if (searched) {
    for (const member of searched.values()) {
      candidates.set(member.id, member);
    }
  }

const matches = [...candidates.values()];

const exactMatches = matches.filter(member => {
    return memberNames(member).some(name => name === lower);
  });

if (exactMatches.length === 1) {
    return exactMatches[0];
  }

if (exactMatches.length > 1) {
    return null;
  }

const partialMatches = matches.filter(member => {
    return memberNames(member).some(name => {
      return name.includes(lower);
    });
  });

// تطابق جزئي غير مضمون على مستوى السيرفر كله.
  // اطلب معرفًا دقيقًا بدل إرسال رسالة إلى شخص خطأ.
  if (partialMatches.length > 0) {
    return null;
  }

return null;
}

// ============================================================
// ========== عميل Discord ==========
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],

partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
    Partials.Reaction,
  ],

allowedMentions: {
    parse: [],
    repliedUser: false,
  },
});

client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👑 KINGDOM ONLINE • ${client.user.tag}`);
  console.log(`🏰 السيرفرات: ${client.guilds.cache.size}`);

if (OWNER_ID) {
    console.log(`👑 مالك البوت: ${OWNER_ID}`);
  }

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

client.user.setPresence({
    status: 'online',
    activities: [
      {
        name: 'The Kingdom Never Falls.',
        type: ActivityType.Watching,
      },
    ],
  });
});

client.on('error', error => {
  reportError('discord-client', error);
});

client.on('warn', warning => {
  console.warn(
    '[Discord warning]',
    truncate(warning, 500)
  );
});

mongoose.connection.on('error', error => {
  reportError('mongodb', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ اتصال MongoDB غير متاح حاليًا.');
});

// ============================================================
// ========== خادم الحالة ==========
// ============================================================

app.disable('x-powered-by');

app.get('/', (req, res) => {
  const discordReady = client.isReady();
  const databaseReady = mongoose.connection.readyState === 1;
  const healthy = discordReady && databaseReady;

res.status(healthy ? 200 : 503).json({
    service: 'KINGDOM BOT',
    status: healthy ? 'online' : 'starting_or_degraded',
    discord: discordReady ? 'ready' : 'not_ready',
    database: databaseReady ? 'connected' : 'not_connected',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

const webServer = app.listen(port, () => {
  console.log(`🌐 خادم الحالة يعمل على المنفذ ${port}`);
});

webServer.on('error', error => {
  reportError('web-server', error);
});

// ============================================================
// نهاية الجزء الأول.
// الجزء التالي يبدأ بلوحات التحكم واللوق والترحيب.
// لا تضف client.login هنا؛ التشغيل سيكون في الجزء الأخير.
// ============================================================
// ============================================================
// ========== أدوات الصفحات والقوائم ==========
// ============================================================

function paginateItems(items, requestedPage = 0, pageSize = 24) {
  const pageCount = Math.max(
    1,
    Math.ceil(items.length / pageSize)
  );

const numericPage = Number(requestedPage);

const page = Math.min(
    pageCount - 1,
    Math.max(
      0,
      Number.isInteger(numericPage) ? numericPage : 0
    )
  );

return {
    page,
    pageCount,
    total: items.length,
    items: items.slice(
      page * pageSize,
      (page + 1) * pageSize
    ),
  };
}

function buildPaginationRow(prefix, page, pageCount) {
  if (pageCount <= 1) return null;

const previousButton = createButton(
    `${prefix}:${Math.max(0, page - 1)}`,
    'السابق',
    '◀️'
  ).setDisabled(page === 0);

const indicatorButton = createButton(
    `${prefix}:info`,
    `${page + 1} / ${pageCount}`
  ).setDisabled(true);

const nextButton = createButton(
    `${prefix}:${Math.min(pageCount - 1, page + 1)}`,
    'التالي',
    '▶️'
  ).setDisabled(page >= pageCount - 1);

return new ActionRowBuilder().addComponents(
    previousButton,
    indicatorButton,
    nextButton
  );
}

function buildPanelComponents(row, navigation = null) {
  return [row, navigation].filter(Boolean);
}

function sectionOptionValue(sectionName) {
  return truncate(sectionName, LIMITS.SELECT_VALUE, '');
}

function extractCustomIdSuffix(customId, prefix) {
  if (
    typeof customId !== 'string' ||
    !customId.startsWith(prefix)
  ) {
    return null;
  }

return customId.slice(prefix.length);
}

// ============================================================
// ========== لوحة تحكم الحماية ==========
// ============================================================

async function buildProtectionPanel(guildId) {
  const [config, bannedWordCount] = await Promise.all([
    getGuildConfig(guildId),
    BannedWord.countDocuments({ guildId }),
  ]);

const actionLabels = {
    delete: '🗑️ حذف الرسالة',
    delete_warn: '🗑️ حذف + 📩 تنبيه خاص',
    delete_mute: '🗑️ حذف + 🔇 Timeout',
    delete_warn_mute: '🗑️ حذف + 📩 تنبيه + 🔇 Timeout',
  };

const embed = createEmbed({
    title: '🛡️ KINGDOM | مركز الحماية',
    description:
      `**درع المملكة ${
        config.protectionEnabled ? 'نشط' : 'غير نشط'
      }**\n` +
      'إدارة الفلاتر وإجراءات المخالفات من مكان واحد.\n\n' +
      '> المتحكمون والأدمن والرتب المستثناة لا تُفحص رسائلهم.\n' +
      '> الكتم الوقائي يستخدم Timeout لمدة 10 دقائق.',
    footer: 'KINGDOM • SECURITY CENTER',
    timestamp: true,
  });

addSafeFields(embed, [
    {
      name: '🔁 منع التكرار',
      value:
        `${statusText(config.antiSpamEnabled)}\n` +
        `${config.antiSpamMax} رسائل متطابقة / ` +
        `${config.antiSpamSeconds} ثوانٍ`,
      inline: true,
    },
    {
      name: '🔗 منع الروابط',
      value: statusText(config.antiLinkEnabled),
      inline: true,
    },
    {
      name: '📢 المنشن الجماعي',
      value: statusText(config.antiEveryoneEnabled),
      inline: true,
    },
    {
      name: '🚫 الكلمات المحظورة',
      value: `${bannedWordCount} كلمة`,
      inline: true,
    },
    {
      name: '🎭 الرتب المستثناة',
      value:
        `${config.protectionBypassRoles?.length || 0} رتبة`,
      inline: true,
    },
    {
      name: '⚖️ إجراء المخالفة',
      value:
        actionLabels[config.protectionAction] ||
        actionLabels.delete_warn,
      inline: true,
    },
  ]);

const row1 = new ActionRowBuilder().addComponents(
    createButton(
      'prot_toggle_main',
      config.protectionEnabled
        ? 'تعطيل الدرع'
        : 'تفعيل الدرع',
      '🛡️',
      BTN.MAIN
    ),
    createButton(
      'prot_toggle_spam',
      'التكرار',
      '🔁'
    ),
    createButton(
      'prot_toggle_link',
      'الروابط',
      '🔗'
    ),
    createButton(
      'prot_toggle_everyone',
      'المنشن',
      '📢'
    )
  );

const row2 = new ActionRowBuilder().addComponents(
    createButton(
      'prot_banned_words',
      'الكلمات',
      '🚫'
    ),
    createButton(
      'prot_action',
      'الإجراءات',
      '⚖️'
    ),
    createButton(
      'prot_bypass_roles',
      'الاستثناءات',
      '🎭'
    ),
    createButton(
      'prot_settings',
      'الإعدادات',
      '⚙️'
    ),
    createButton(
      'prot_refresh',
      'تحديث',
      '🔄'
    )
  );

return {
    embed,
    rows: [row1, row2],
  };
}

// ============================================================
// ========== لوحة الرتب الذاتية ==========
// ============================================================

async function buildSelfRolesPanel(
  guildId,
  guild,
  config,
  requestedPage = 0
) {
  const selfRoles = await getSelfRoles(guildId);

if (!selfRoles.length) return null;

const pagination = paginateItems(
    selfRoles,
    requestedPage,
    24
  );

const generalImage = getGeneralImage(guild, config);

const embed = createEmbed({
    title: '🎭 KINGDOM | هويتك في المجتمع',
    description:
      config.rolesPanelText ||
      '`اختَر ما يمثّلك.`\n' +
      'خصّص رتبك واهتماماتك من القائمة أدناه.\n\n' +
      '> اختيار الرتبة يضيفها إلى حسابك.\n' +
      '> اختيارها مرة ثانية يزيلها.',
    image: config.rolesImage,
    thumbnail: config.rolesImage ? null : generalImage,
    footer:
      'KINGDOM • ROLE LOUNGE' +
      ` • ${selfRoles.length} رتبة` +
      ` • صفحة ${pagination.page + 1}/${pagination.pageCount}`,
  });

const options = pagination.items.map(role => {
    const option = {
      label: truncate(
        role.label || 'رتبة',
        LIMITS.SELECT_LABEL
      ),
      value: role.roleId,
      emoji: parseEmoji(role.emoji) || '🎭',
      description: truncate(
        role.description || 'اضغط للإضافة أو الإزالة',
        100
      ),
    };

return option;
  });

options.push({
    label: 'تحديث القائمة',
    value: 'SELF_ROLES_RESET',
    emoji: '🔄',
    description: 'إعادة تعيين الاختيار وتحديث الرتب',
  });

const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('self_roles_toggle')
      .setPlaceholder('اختر هويتك • إضافة / إزالة')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options)
  );

const navigation = buildPaginationRow(
    'self_roles_page',
    pagination.page,
    pagination.pageCount
  );

return {
    embed,
    row,
    rows: buildPanelComponents(row, navigation),
    page: pagination.page,
    pageCount: pagination.pageCount,
  };
}

// ============================================================
// ========== لوحة الحمام الزاجل ==========
// ============================================================

async function buildPigeonPanel(config) {
  const embed = createEmbed({
    title: config.pigeonTitle || '🕊️ البريد السري',
    description:
      (
        config.pigeonDescription ||
        'رسالة صغيرة قد تصنع يومًا أجمل. اكتب زاجلك من هنا.'
      ) +
      '\n\n' +
      '> 🔒 هوية المرسل مخفية عن المستلم، ' +
      'لكنها محفوظة وقابلة للاطلاع من المتحكمين.\n' +
      '> يُمنع الإزعاج والتهديد ومشاركة المعلومات الخاصة.',
    image: config.pigeonImage,
    footer: 'KINGDOM • PRIVATE MAIL',
  });

const row = new ActionRowBuilder().addComponents(
    createButton(
      'pigeon_send',
      'اكتب زاجلك',
      '🕊️',
      BTN.MAIN
    ),
    createButton(
      'pigeon_myhistory',
      'سجل الرسائل',
      '📬'
    )
  );

return {
    embed,
    row,
    rows: [row],
  };
}

// ============================================================
// ========== لوحة التقديمات العامة ==========
// ============================================================

async function buildApplyPanel(
  guildId,
  config,
  requestedPage = 0
) {
  const sections = await getApplySections(guildId);

const embed = createEmbed({
    title:
      config.applyPanelTitle ||
      '📋 KINGDOM | انضم إلى الفريق',
    description:
      (
        config.applyPanelDescription ||
        'موهبتك تستحق فرصة. اختَر القسم المناسب لمهاراتك.'
      ) +
      '\n\n' +
      '`اختيار القسم ← تعبئة النموذج ← مراجعة الفريق`\n\n' +
      '> أجب بوضوح وصدق، وستصلك النتيجة بعد المراجعة.',
    image: config.applyPanelImage,
    footer: 'KINGDOM • RECRUITMENT',
  });

if (!sections.length) {
    addSafeFields(embed, [
      {
        name: 'التقديمات غير متاحة حاليًا',
        value: 'لم تتم إضافة أقسام تقديم بعد.',
      },
    ]);

return {
      embed,
      row: null,
      rows: [],
      empty: true,
      page: 0,
      pageCount: 1,
    };
  }

const pagination = paginateItems(
    sections,
    requestedPage,
    24
  );

embed.setFooter({
    text:
      'KINGDOM • RECRUITMENT' +
      ` • ${sections.length} قسم` +
      ` • صفحة ${pagination.page + 1}/${pagination.pageCount}`,
  });

const options = pagination.items.map(section => ({
    label: truncate(
      section.name,
      LIMITS.SELECT_LABEL
    ),
    value: sectionOptionValue(section.name),
    emoji: parseEmoji(section.emoji) || '📋',
    description: truncate(
      `${section.questions?.length || 0} أسئلة` +
      (
        section.roleId
          ? ' • رتبة عند القبول'
          : ' • مراجعة إدارية'
      ),
      100
    ),
  }));

options.push({
    label: 'تحديث القائمة',
    value: 'APPLY_RESET',
    emoji: '🔄',
    description: 'تحديث الأقسام وإعادة تعيين الاختيار',
  });

const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('apply_section_select')
      .setPlaceholder('أي قسم يناسب مهاراتك؟')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options)
  );

const navigation = buildPaginationRow(
    'apply_public_page',
    pagination.page,
    pagination.pageCount
  );

return {
    embed,
    row,
    rows: buildPanelComponents(row, navigation),
    empty: false,
    page: pagination.page,
    pageCount: pagination.pageCount,
  };
}

// ============================================================
// ========== لوحة إدارة التقديمات ==========
// ============================================================

async function buildApplyAdminPanel(
  guildId,
  requestedPage = 0
) {
  const sections = await getApplySections(guildId);

const pagination = paginateItems(
    sections,
    requestedPage,
    24
  );

const embed = createEmbed({
    title: '📋 KINGDOM | إدارة التقديمات',
    description:
      '`ابنِ فريقك من مكان واحد.`\n' +
      'اختَر قسمًا لتعديل أسئلته وصورته ورتبة القبول ' +
      'وقناة المراجعة، أو أضف قسمًا جديدًا.',
    footer:
      'KINGDOM • RECRUITMENT CONTROL' +
      ` • ${sections.length} قسم` +
      ` • صفحة ${pagination.page + 1}/${pagination.pageCount}`,
    timestamp: true,
  });

const sectionList = pagination.items.length
    ? pagination.items.map((section, index) => {
        const position =
          pagination.page * 24 + index + 1;

return (
          ``${position}.` ${section.emoji || '📋'} ` +
          ``${section.name}` — ` +
          `${section.questions?.length || 0}/5 أسئلة`
        );
      }).join('\n')
    : 'لا توجد أقسام بعد. أضف أول قسم من القائمة.';

addSafeFields(embed, [
    {
      name: '📌 الأقسام في هذه الصفحة',
      value: sectionList,
    },
  ]);

const options = pagination.items.map(section => ({
    label: truncate(section.name, 100),
    value: `section_id:${section._id}`,
    emoji: parseEmoji(section.emoji) || '📋',
    description: truncate(
      `${section.questions?.length || 0}/5 أسئلة` +
      `${section.roleId ? ' • رتبة قبول' : ''}` +
      `${section.logChannelId ? ' • قناة مراجعة' : ''}`,
      100
    ),
  }));

options.push({
    label: 'إضافة قسم جديد',
    value: 'apply_add_section',
    emoji: '➕',
    description: 'إنشاء قسم تقديم جديد',
  });

const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('apply_admin_select')
      .setPlaceholder('اختر قسمًا لإدارته أو أضف جديدًا')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options)
  );

const navigation = buildPaginationRow(
    'apply_admin_page',
    pagination.page,
    pagination.pageCount
  );

return {
    embed,
    row,
    rows: buildPanelComponents(row, navigation),
    page: pagination.page,
  };
}

async function buildApplySectionAdminPanel(guild, section) {
  const role = section.roleId
    ? guild.roles.cache.get(section.roleId)
    : null;

const logChannel = section.logChannelId
    ? guild.channels.cache.get(section.logChannelId)
    : null;

const embed = createEmbed({
    title: `📋 إدارة قسم: ${section.name}`,
    description:
      'عدّل إعدادات القسم من الأزرار أدناه.\n\n' +
      '> الحد الأقصى للنموذج هو 5 أسئلة.',
    image: section.image,
    footer: 'KINGDOM • SECTION SETTINGS',
    timestamp: true,
  });

addSafeFields(embed, [
    {
      name: '📝 الأسئلة',
      value: `${section.questions?.length || 0}/5`,
      inline: true,
    },
    {
      name: '🎭 رتبة القبول',
      value: role ? role.toString() : 'غير محددة',
      inline: true,
    },
    {
      name: '📥 قناة المراجعة',
      value: logChannel
        ? logChannel.toString()
        : 'غير محددة',
      inline: true,
    },
    {
      name: '📋 أسئلة النموذج',
      value: section.questions?.length
        ? section.questions.map((question, index) => {
            return (
              ``${index + 1}.` ${question.label}\n` +
              `↳ ${
                question.style === 'PARAGRAPH'
                  ? 'إجابة مطولة'
                  : 'إجابة قصيرة'
              } • ${
                question.required !== false
                  ? 'إلزامي'
                  : 'اختياري'
              }`
            );
          }).join('\n\n')
        : 'لم تتم إضافة أسئلة بعد.',
    },
  ]);

const sectionId = section._id.toString();

const row1 = new ActionRowBuilder().addComponents(
    createButton(
      `apply_section_addq_id:${sectionId}`,
      'إضافة سؤال',
      '➕',
      BTN.MAIN
    ).setDisabled(section.questions.length >= 5),
    createButton(
      `apply_section_delq_id:${sectionId}`,
      'حذف سؤال',
      '🗑️'
    ).setDisabled(section.questions.length === 0)
  );

const row2 = new ActionRowBuilder().addComponents(
    createButton(
      `apply_section_img_id:${sectionId}`,
      'صورة القسم',
      '🖼️'
    ),
    createButton(
      `apply_section_role_id:${sectionId}`,
      'رتبة القبول',
      '🎭'
    ),
    createButton(
      `apply_section_log_id:${sectionId}`,
      'قناة المراجعة',
      '📥'
    )
  );

const row3 = new ActionRowBuilder().addComponents(
    createButton(
      `apply_section_delete_id:${sectionId}`,
      'حذف القسم',
      '🗑️',
      BTN.MAIN
    ),
    createButton(
      'apply_admin_back',
      'رجوع للأقسام',
      '↩️'
    )
  );

return {
    embed,
    rows: [row1, row2, row3],
  };
}

async function getApplySectionById(guildId, sectionId) {
  if (!mongoose.isValidObjectId(sectionId)) {
    return null;
  }

return ApplySection.findOne({
    _id: sectionId,
    guildId,
  });
}

// ============================================================
// ========== لوحة التذاكر ==========
// ============================================================

async function buildTicketPanel(
  guild,
  config,
  requestedPage = 0
) {
  const settings = await getTicketSettings(guild.id);

const embed = createEmbed({
    title: '🎫 KINGDOM | مركز الدعم',
    description:
      settings.text ||
      'اختَر القسم المناسب لطلبك، وسنفتح لك تذكرة خاصة.',
    image:
      config.ticketPanelImage ||
      settings.image ||
      null,
    thumbnail: getGeneralImage(guild, config),
    footer: 'KINGDOM • SUPPORT CENTER',
  });

if (!settings.sections.length) {
    addSafeFields(embed, [
      {
        name: 'الدعم غير متاح حاليًا',
        value: 'لم تتم إضافة أقسام تذاكر بعد.',
      },
    ]);

return {
      embed,
      row: null,
      rows: [],
      empty: true,
      page: 0,
    };
  }

const pagination = paginateItems(
    settings.sections,
    requestedPage,
    24
  );

embed.setFooter({
    text:
      'KINGDOM • SUPPORT CENTER' +
      ' • قناة خاصة لطلبك' +
      ` • صفحة ${pagination.page + 1}/${pagination.pageCount}`,
  });

const options = pagination.items.map(section => ({
    label: truncate(section.name, 100),
    value: sectionOptionValue(section.name),
    emoji: parseEmoji(section.emoji) || '📌',
    description: truncate(
      `فتح تذكرة في قسم ${section.name}`,
      100
    ),
  }));

options.push({
    label: 'تحديث القائمة',
    value: 'TICKET_RESET',
    emoji: '🔄',
    description: 'تحديث الأقسام وإعادة تعيين الاختيار',
  });

const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_menu')
      .setPlaceholder('كيف يمكننا مساعدتك؟')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options)
  );

const navigation = buildPaginationRow(
    'ticket_panel_page',
    pagination.page,
    pagination.pageCount
  );

return {
    embed,
    row,
    rows: buildPanelComponents(row, navigation),
    empty: false,
    page: pagination.page,
  };
}

function buildTicketControlRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_control')
    .setPlaceholder('إدارة التذكرة • اختر إجراءً')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      {
        label: 'استلام التذكرة',
        description: 'تسجيل نفسك كمسؤول عن متابعة الطلب',
        value: 'claim',
        emoji: '✋',
      },
      {
        label: 'إلغاء الاستلام',
        description: 'إلغاء استلام التذكرة',
        value: 'unclaim',
        emoji: '📌',
      },
      {
        label: 'إضافة عضو',
        description: 'السماح لعضو آخر بالمشاركة في التذكرة',
        value: 'add_member',
        emoji: '👤',
      },
      {
        label: 'تغيير اسم التذكرة',
        description: 'تعديل اسم قناة التذكرة',
        value: 'rename',
        emoji: '✏️',
      },
      {
        label: 'حذف التذكرة',
        description: 'حذف نهائي بعد التأكيد',
        value: 'delete',
        emoji: '🗑️',
      },
    ]);

return new ActionRowBuilder().addComponents(menu);
}

function buildTicketCloseRow() {
  return new ActionRowBuilder().addComponents(
    createButton(
      'close_ticket',
      'إغلاق التذكرة',
      '🔒',
      BTN.MAIN
    )
  );
}

function buildTicketWelcomeEmbed(
  guild,
  ticketData,
  config
) {
  return addSafeFields(
    createEmbed({
      title: `🎫 تذكرة | ${ticketData.sectionName}`,
      description:
        `أهلًا <@${ticketData.ownerId}>، ` +
        'وصلت إلى مركز الدعم.\n\n' +
        '`اكتب تفاصيل طلبك هنا، وسيتابعك الفريق.`\n' +
        '> لا تشارك كلمات المرور أو التوكنات أو أي معلومات حساسة.',
      thumbnail: getGeneralImage(guild, config),
      footer: 'KINGDOM • الإغلاق والإدارة للمتحكمين',
      timestamp: true,
    }),
    [
      {
        name: '👤 صاحب التذكرة',
        value: `<@${ticketData.ownerId}>`,
        inline: true,
      },
      {
        name: '📌 القسم',
        value: ticketData.sectionName || 'غير محدد',
        inline: true,
      },
      {
        name: '📅 تاريخ الفتح',
        value: discordTimestamp(ticketData.createdAt, 'F'),
        inline: true,
      },
    ]
  );
}

async function buildTicketPermissionOverwrites(
  guild,
  member,
  section
) {
  const access = new Map();

access.set(guild.id, {
    id: guild.id,
    deny: [
      PermissionsBitField.Flags.ViewChannel,
    ],
  });

const participantPermissions = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.EmbedLinks,
  ];

access.set(member.id, {
    id: member.id,
    allow: participantPermissions,
  });

access.set(client.user.id, {
    id: client.user.id,
    allow: [
      ...participantPermissions,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.ManageMessages,
    ],
  });

const controllerIds = new Set(
    await getControllers(guild.id)
  );

if (OWNER_ID) {
    controllerIds.add(OWNER_ID);
  }

// نفحص الآيديات قبل إضافتها، فلا تُستخدم سجلات أعضاء غادروا.
  for (const userId of controllerIds) {
    if (
      !isSnowflake(userId) ||
      access.has(userId)
    ) {
      continue;
    }

const controllerMember = await guild.members
      .fetch(userId)
      .catch(() => null);

if (!controllerMember) continue;

access.set(userId, {
      id: userId,
      allow: participantPermissions,
    });
  }

const supportRole = section.roleId
    ? await guild.roles.fetch(section.roleId).catch(() => null)
    : null;

if (
    supportRole &&
    supportRole.id !== guild.id
  ) {
    access.set(supportRole.id, {
      id: supportRole.id,
      allow: participantPermissions,
    });
  }

return [...access.values()];
}

// ============================================================
// ========== إرسال رد آمن للتفاعلات ==========
// ============================================================

async function respondToInteraction(
  interaction,
  payload,
  { ephemeral = true } = {}
) {
  const body = typeof payload === 'string'
    ? { content: payload }
    : { ...payload };

body.allowedMentions ??= {
    parse: [],
    repliedUser: false,
  };

if (interaction.deferred) {
    // editReply لا يحتاج ephemeral؛ تحددت عند deferReply.
    delete body.ephemeral;
    return interaction.editReply(body);
  }

if (interaction.replied) {
    return interaction.followUp({
      ...body,
      ephemeral,
    });
  }

return interaction.reply({
    ...body,
    ephemeral,
  });
}

async function requireControllerInteraction(interaction) {
  if (!interaction.guild) {
    await respondToInteraction(
      interaction,
      '❌ هذا الإجراء متاح داخل السيرفر فقط.'
    );

return false;
  }

const member = await resolveInteractionMember(interaction);

if (
    !member ||
    !(await hasPermission(member, interaction.guild.id))
  ) {
    await respondToInteraction(
      interaction,
      {
        embeds: [
          createEmbed({
            title: '🔒 إجراء إداري',
            description: 'هذه الميزة متاحة للمتحكمين فقط.',
            color: THEME.ERROR,
          }),
        ],
      }
    );

return false;
  }

return true;
}

// ============================================================
// ========== نظام اللوق ==========
// ============================================================

const logQueue = [];
const MAX_LOG_QUEUE_SIZE = 500;

let logProcessing = false;
let droppedLogTasks = 0;

async function processLogQueue() {
  if (logProcessing) return;

logProcessing = true;

try {
    while (logQueue.length > 0) {
      const task = logQueue.shift();

try {
        await task();
      } catch (error) {
        reportError('log-queue', error);
      }

await sleep(250);
    }
  } finally {
    logProcessing = false;

// حماية لو أُضيفت مهمة عند نهاية دورة المعالجة.
    if (logQueue.length > 0) {
      void processLogQueue();
    }
  }
}

function logToChannel(guildId, data) {
  if (!guildId) return false;

if (logQueue.length >= MAX_LOG_QUEUE_SIZE) {
    droppedLogTasks += 1;

if (
      droppedLogTasks === 1 ||
      droppedLogTasks % 50 === 0
    ) {
      console.warn(
        `⚠️ ازدحام اللوق: لم تُضف ${droppedLogTasks} مهمة إلى الطابور.`
      );
    }

return false;
  }

logQueue.push(async () => {
    const config = await getGuildConfig(guildId);

if (!config.logChannel) return;

const guild =
      client.guilds.cache.get(guildId) ||
      await client.guilds.fetch(guildId).catch(() => null);

if (!guild) return;

const channel = await guild.channels
      .fetch(config.logChannel)
      .catch(() => null);

if (
      !channel ||
      typeof channel.send !== 'function'
    ) {
      console.warn(
        `⚠️ قناة اللوق غير متاحة للسيرفر ${guildId}.`
      );

return;
    }

const botMember =
      guild.members.me ||
      await guild.members.fetchMe();

const permissions = channel.permissionsFor(botMember);

if (
      !permissions?.has([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks,
      ])
    ) {
      console.warn(
        `⚠️ صلاحيات إرسال اللوق غير كافية في ${channel.id}.`
      );

return;
    }

const embed = createEmbed({
      title: data.title || '📋 سجل المملكة',
      description: data.description || null,
      color: data.color ?? THEME.ORANGE,
      footer: data.footer
        ? `KINGDOM • ${data.footer}`
        : 'KINGDOM • AUDIT LOG',
      thumbnail: data.thumbnail,
      image: data.image,
      timestamp: true,
    });

addSafeFields(embed, data.fields || []);

await channel.send({
      embeds: [embed],
      allowedMentions: {
        parse: [],
      },
    });
  });

void processLogQueue();

return true;
}

// ============================================================
// ========== تحميل الصور المسموح بها للـ Canvas ==========
// ============================================================
// لا نحمل روابط عشوائية على الخادم.
// يُسمح بصور CDN المعروفة فقط، دون تحويلات redirects.
// ============================================================

const CANVAS_IMAGE_HOSTS = new Set([
  'cdn.discordapp.com',
  'media.discordapp.net',
  'i.imgur.com',
]);

async function loadTrustedCanvasImage(
  source,
  maxBytes = LIMITS.MAX_IMAGE_BYTES
) {
  const safeURL = safeHttpUrl(source);

if (!safeURL) {
    throw new Error('رابط الصورة غير صالح.');
  }

const url = new URL(safeURL);

if (
    url.protocol !== 'https:' ||
    !CANVAS_IMAGE_HOSTS.has(url.hostname) ||
    url.port
  ) {
    throw new Error(
      'مصدر الصورة غير مسموح للتحميل على الخادم.'
    );
  }

const response = await fetch(url.href, {
    signal: AbortSignal.timeout(7000),
    redirect: 'error',
  });

if (!response.ok) {
    throw new Error(`Image HTTP ${response.status}`);
  }

const contentType =
    response.headers.get('content-type') || '';

if (!contentType.toLowerCase().startsWith('image/')) {
    await response.body?.cancel().catch(() => {});

throw new Error('الرابط لا يعيد ملف صورة.');
  }

const contentLength = Number(
    response.headers.get('content-length')
  );

if (
    Number.isFinite(contentLength) &&
    contentLength > maxBytes
  ) {
    await response.body?.cancel().catch(() => {});

throw new Error('حجم الصورة يتجاوز الحد المسموح.');
  }

if (!response.body) {
    throw new Error('استجابة الصورة فارغة.');
  }

const reader = response.body.getReader();
  const chunks = [];

let receivedBytes = 0;

try {
    while (true) {
      const { done, value } = await reader.read();

if (done) break;

receivedBytes += value.byteLength;

if (receivedBytes > maxBytes) {
        await reader.cancel();

throw new Error('حجم الصورة يتجاوز الحد المسموح.');
      }

chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

const image = await loadImage(Buffer.concat(chunks));

// هذا الفحص بعد فك الصورة وليس ضمانًا كاملًا
  // ضد الملفات المصممة لاستنزاف ذاكرة فك الترميز.
  if (
    !image.width ||
    !image.height ||
    image.width * image.height > 24000000
  ) {
    throw new Error('أبعاد الصورة غير مدعومة.');
  }

return image;
}

// ============================================================
// ========== أدوات الرسم ==========
// ============================================================

function drawRoundedRectangle(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {
  const safeRadius = Math.min(
    radius,
    width / 2,
    height / 2
  );

ctx.beginPath();

ctx.moveTo(x + safeRadius, y);

ctx.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    safeRadius
  );

ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    safeRadius
  );

ctx.arcTo(
    x,
    y + height,
    x,
    y,
    safeRadius
  );

ctx.arcTo(
    x,
    y,
    x + width,
    y,
    safeRadius
  );

ctx.closePath();
}

function drawDefaultBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    width,
    height
  );

gradient.addColorStop(0, '#080a12');
  gradient.addColorStop(0.5, '#20101c');
  gradient.addColorStop(1, '#510d23');

ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

const glow = ctx.createRadialGradient(
    width * 0.83,
    height * 0.3,
    10,
    width * 0.83,
    height * 0.3,
    width * 0.55
  );

glow.addColorStop(0, 'rgba(227,38,70,0.22)');
  glow.addColorStop(1, 'rgba(227,38,70,0)');

ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawCoverImage(ctx, image, width, height) {
  const scale = Math.max(
    width / image.width,
    height / image.height
  );

const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;

ctx.drawImage(
    image,
    (width - drawnWidth) / 2,
    (height - drawnHeight) / 2,
    drawnWidth,
    drawnHeight
  );
}

function fitCanvasText(
  ctx,
  text,
  maxWidth,
  {
    maximumSize = 46,
    minimumSize = 18,
    weight = 'bold',
    fontFamily = ARABIC_FONT,
  } = {}
) {
  let size = maximumSize;

while (size > minimumSize) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;

if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

size -= 1;
  }

ctx.font = `${weight} ${minimumSize}px ${fontFamily}`;

let shortened = text;

while (
    shortened.length > 0 &&
    ctx.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }

return shortened === text
    ? text
    : `${shortened}…`;
}

// ============================================================
// ========== بطاقة الترحيب ==========
// ============================================================

async function generateWelcomeImage(
  member,
  memberCount,
  background = null
) {
  const width = 1200;
  const height = 600;

const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

drawDefaultBackground(ctx, width, height);

if (
    background &&
    /^#[0-9a-f]{6}$/i.test(background)
  ) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  } else if (background) {
    try {
      const backgroundImage =
        await loadTrustedCanvasImage(background);

drawCoverImage(
        ctx,
        backgroundImage,
        width,
        height
      );
    } catch (error) {
      reportError('welcome-background', error);
      // تبقى الخلفية الافتراضية.
    }
  }

ctx.fillStyle = 'rgba(5,7,14,0.60)';
  ctx.fillRect(0, 0, width, height);

// زخرفة هندسية خفيفة.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;

for (let x = -height; x < width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }

// اللوحة الأساسية.
  drawRoundedRectangle(
    ctx,
    36,
    36,
    width - 72,
    height - 72,
    28
  );

ctx.fillStyle = 'rgba(16,16,24,0.87)';
  ctx.fill();

ctx.strokeStyle = 'rgba(227,38,70,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

// شريط جانبي.
  drawRoundedRectangle(ctx, 1138, 90, 5, 420, 2);

ctx.fillStyle = THEME.ORANGE_HEX;
  ctx.fill();

// عنوان الهوية.
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 23px Arial';
  ctx.fillStyle = '#ff526c';

ctx.fillText('K I N G D O M', 1080, 110);

// الصورة الشخصية.
  const centerX = 240;
  const centerY = 294;
  const radius = 126;

ctx.save();

ctx.shadowColor = THEME.ORANGE_HEX;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = THEME.ORANGE_HEX;
  ctx.lineWidth = 4;

ctx.beginPath();
  ctx.arc(
    centerX,
    centerY,
    radius + 12,
    0,
    Math.PI * 2
  );
  ctx.stroke();

ctx.restore();

ctx.fillStyle = '#24212d';

ctx.beginPath();
  ctx.arc(
    centerX,
    centerY,
    radius,
    0,
    Math.PI * 2
  );
  ctx.fill();

try {
    const avatarURL = member.user.displayAvatarURL({
      extension: 'png',
      size: 256,
    });

const avatar = await loadTrustedCanvasImage(
      avatarURL,
      2 * 1024 * 1024
    );

ctx.save();

ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius,
      0,
      Math.PI * 2
    );
    ctx.clip();

ctx.drawImage(
      avatar,
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2
    );

ctx.restore();
  } catch (error) {
    reportError('welcome-avatar', error);

ctx.textAlign = 'center';
    ctx.font = 'bold 82px Arial';
    ctx.fillStyle = '#ff526c';

ctx.fillText(
      (member.user.username || 'K').slice(0, 1).toUpperCase(),
      centerX,
      centerY + 28
    );
  }

// النص العربي.
  ctx.textAlign = 'right';

const welcomeTitle = fitCanvasText(
    ctx,
    'مرحبًا بك في المملكة',
    650,
    {
      maximumSize: 50,
      minimumSize: 32,
    }
  );

ctx.fillStyle = '#ffffff';
  ctx.fillText(welcomeTitle, 1080, 220);

const displayName = truncate(
    member.displayName || member.user.username,
    100
  );

const fittedName = fitCanvasText(
    ctx,
    displayName,
    650,
    {
      maximumSize: 44,
      minimumSize: 18,
    }
  );

ctx.fillStyle = '#ff526c';
  ctx.fillText(fittedName, 1080, 304);

ctx.font = `26px ${ARABIC_FONT}`;
  ctx.fillStyle = '#bcbccc';

ctx.fillText(
    'مكانك بيننا • بداية حكاية جديدة',
    1080,
    366
  );

// بطاقة رقم العضو.
  drawRoundedRectangle(
    ctx,
    792,
    405,
    288,
    66,
    16
  );

ctx.fillStyle = '#24212d';
  ctx.fill();

ctx.font = `24px ${ARABIC_FONT}`;
  ctx.fillStyle = '#ffffff';

ctx.fillText(
    `العضو #${memberCount}`,
    1056,
    448
  );

// توقيع بصري.
  ctx.textAlign = 'left';
  ctx.font = '18px Arial';
  ctx.fillStyle = '#aaaaba';

ctx.fillText(
    'THE KINGDOM NEVER FALLS',
    94,
    522
  );

return canvas.toBuffer('image/png');
}

// ============================================================
// ========== استبدال متغيرات رسالة الترحيب ==========
// ============================================================

function formatWelcomeMessage(template, member) {
  const text = String(
    template || 'أهلًا {member} في {server}!'
  );

return text.replace(
    /\{(member|username|server|count)\}/g,
    (match, key) => {
      const replacements = {
        member: `<@${member.id}>`,
        username: member.user.username,
        server: member.guild.name,
        count: String(member.guild.memberCount),
      };

return replacements[key] ?? match;
    }
  );
}

// ============================================================
// ========== منح رتبة الدخول ==========
// ============================================================

async function assignJoinRole(member, config) {
  if (!config.joinRole) return false;

const role = await member.guild.roles
    .fetch(config.joinRole)
    .catch(() => null);

if (!role) {
    console.warn(
      `⚠️ رتبة الدخول غير موجودة في ${member.guild.id}.`
    );

return false;
  }

const botMember =
    member.guild.members.me ||
    await member.guild.members.fetchMe();

if (
    !botMember.permissions.has(
      PermissionsBitField.Flags.ManageRoles
    ) ||
    role.managed ||
    role.id === member.guild.id ||
    role.position >= botMember.roles.highest.position
  ) {
    console.warn(
      `⚠️ لا يمكن منح رتبة الدخول ${role.id}: تحقق من الصلاحيات وتسلسل الرتب.`
    );

return false;
  }

if (member.roles.cache.has(role.id)) {
    return true;
  }

await member.roles.add(
    role,
    'KINGDOM • رتبة دخول تلقائية'
  );

return true;
}

// ============================================================
// ========== أحداث انضمام وخروج الأعضاء ==========
// ============================================================

client.on('guildMemberAdd', async member => {
  try {
    const config = await getGuildConfig(member.guild.id);

// رتبة الدخول لا تعتمد على وجود قناة ترحيب.
    try {
      await assignJoinRole(member, config);
    } catch (error) {
      reportError('join-role', error);
    }

logToChannel(member.guild.id, {
      title: '👋 عضو جديد في المملكة',
      color: THEME.ORANGE,
      description:
        ``المستخدم:` ${member.user.tag}\n` +
        ``المعرف:` \`${member.id}\`\n` +
        ``تاريخ الحساب:` ${
          discordTimestamp(member.user.createdAt, 'F')
        }`,
      fields: [
        {
          name: '👥 عدد الأعضاء',
          value: String(member.guild.memberCount),
          inline: true,
        },
      ],
      thumbnail: member.user.displayAvatarURL({
        extension: 'png',
        size: 256,
      }),
      footer: 'MEMBER JOIN',
    });

if (!config.welcomeChannel) return;

const channel = await member.guild.channels
      .fetch(config.welcomeChannel)
      .catch(() => null);

if (
      !channel ||
      typeof channel.send !== 'function'
    ) {
      console.warn(
        `⚠️ قناة الترحيب غير متاحة في ${member.guild.id}.`
      );

return;
    }

const embed = createEmbed({
      title:
        config.welcomeTitle ||
        '👑 مرحبًا بك في المملكة',
      description: formatWelcomeMessage(
        config.welcomeMessage,
        member
      ),
      thumbnail:
        config.welcomeImage ||
        member.user.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
      footer:
        `KINGDOM • أنت العضو ${member.guild.memberCount}`,
      timestamp: true,
    });

addSafeFields(embed, [
      {
        name: '🏰 المجتمع',
        value: member.guild.name,
        inline: true,
      },
      {
        name: '👤 العضو',
        value: `<@${member.id}>`,
        inline: true,
      },
    ]);

const payload = {
      content: `<@${member.id}>`,
      embeds: [embed],
      allowedMentions: {
        parse: [],
        users: [member.id],
      },
    };

try {
      const imageBuffer = await generateWelcomeImage(
        member,
        member.guild.memberCount,
        config.welcomeBackground
      );

embed.setImage('attachment://welcome.png');

payload.files = [
        {
          attachment: imageBuffer,
          name: 'welcome.png',
        },
      ];
    } catch (error) {
      reportError('welcome-render', error);
      // يرسل الترحيب النصي إذا تعذر توليد البطاقة.
    }

await channel.send(payload);
  } catch (error) {
    reportError('guildMemberAdd', error);
  }
});

client.on('guildMemberRemove', async member => {
  try {
    const username =
      member.user?.tag ||
      member.user?.username ||
      'مستخدم غير معروف';

logToChannel(member.guild.id, {
      title: '🚪 عضو غادر المملكة',
      color: THEME.DARK,
      description:
        ``المستخدم:` ${username}\n` +
        ``المعرف:` \`${member.id}\``,
      fields: [
        {
          name: '👥 عدد الأعضاء',
          value: String(member.guild.memberCount),
          inline: true,
        },
      ],
      thumbnail: member.user?.displayAvatarURL({
        extension: 'png',
        size: 256,
      }),
      footer: 'MEMBER LEAVE',
    });
  } catch (error) {
    reportError('guildMemberRemove', error);
  }
});

// ============================================================
// ========== سجلات حذف الرسائل ==========
// ============================================================

client.on('messageDelete', async message => {
  if (
    !message.guild ||
    message.author?.bot
  ) {
    return;
  }

try {
    // الرسالة المحذوفة لا يمكن استرجاعها من Discord.
    // نعرض المحتوى المتاح في الكاش فقط.
    const content = message.content
      ? truncate(message.content, 3000)
      : 'غير متاح في الكاش.';

const attachmentList = message.attachments?.size
      ? [...message.attachments.values()]
          .map(attachment => {
            return (
              attachment.name ||
              attachment.id ||
              'مرفق'
            );
          })
          .join('\n')
      : null;

const fields = [];

if (attachmentList) {
      fields.push({
        name: '📎 أسماء المرفقات',
        value: attachmentList,
      });
    }

logToChannel(message.guild.id, {
      title: '🗑️ حذف رسالة',
      color: THEME.DARK,
      description:
        ``المستخدم:` ${
          message.author?.tag || 'غير معروف'
        }\n` +
        ``القناة:` <#${message.channelId}>\n` +
        ``معرف الرسالة:` \`${message.id}\`\n\n` +
        ``المحتوى المتاح:`\n${content}`,
      fields,
      thumbnail: message.author?.displayAvatarURL({
        extension: 'png',
        size: 128,
      }),
      footer: 'MESSAGE DELETE',
    });
  } catch (error) {
    reportError('messageDelete', error);
  }
});

// ============================================================
// ========== سجلات تعديل الرسائل ==========
// ============================================================

client.on('messageUpdate', async (oldMessage, newMessage) => {
  const guild = newMessage.guild || oldMessage.guild;

if (!guild) return;

try {
    // لا نجلب oldMessage؛ جلبه سيعيد المحتوى الجديد،
    // وليس نسخة النص قبل التعديل.
    const oldContent = oldMessage.partial
      ? null
      : oldMessage.content;

let updatedMessage = newMessage;

if (updatedMessage.partial) {
      updatedMessage = await updatedMessage
        .fetch()
        .catch(() => null);
    }

if (!updatedMessage) return;

const author = updatedMessage.author || oldMessage.author;

if (author?.bot) return;

const newContent = updatedMessage.content;

if (
      oldContent !== null &&
      oldContent === newContent
    ) {
      return;
    }

logToChannel(guild.id, {
      title: '✏️ تعديل رسالة',
      color: THEME.ORANGE,
      description:
        ``المستخدم:` ${author?.tag || 'غير معروف'}\n` +
        ``القناة:` <#${updatedMessage.channelId}>\n` +
        ``الرسالة:` [انتقل إلى الرسالة](${updatedMessage.url})`,
      fields: [
        {
          name: '📜 النص السابق',
          value:
            oldContent === null
              ? 'غير متاح في الكاش.'
              : oldContent || 'فارغ',
        },
        {
          name: '📝 النص الجديد',
          value: newContent || 'فارغ',
        },
      ],
      thumbnail: author?.displayAvatarURL({
        extension: 'png',
        size: 128,
      }),
      footer: 'MESSAGE UPDATE',
    });
  } catch (error) {
    reportError('messageUpdate', error);
  }
});

// ============================================================
// ========== سجلات حذف مجموعة رسائل ==========
// ============================================================

client.on('messageDeleteBulk', async (messages, channel) => {
  if (!channel.guild) return;

try {
    logToChannel(channel.guild.id, {
      title: '🧹 حذف مجموعة رسائل',
      color: THEME.DARK,
      description:
        ``القناة:` <#${channel.id}>\n` +
        ``عدد الرسائل في الحدث:` ${messages.size}\n\n` +
        '> لا يعني هذا السجل أن منفذ الحذف معروف.',
      footer: 'BULK MESSAGE DELETE',
    });
  } catch (error) {
    reportError('messageDeleteBulk', error);
  }
});

// ============================================================
// ========== تحديث حالة التذكرة عند حذف قناتها ==========
// ============================================================

client.on('channelDelete', async channel => {
  if (!channel.guild) return;

try {
    const ticket = await Ticket.findOneAndUpdate(
      {
        guildId: channel.guild.id,
        channelId: channel.id,
      },
      {
        $set: {
          status: 'closed',
          closed: true,
          deletedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

if (ticket) {
      logToChannel(channel.guild.id, {
        title: '🗑️ حُذفت قناة تذكرة',
        color: THEME.DARK,
        description:
          ``القناة:` ${channel.name}\n` +
          ``المعرف:` \`${channel.id}\`\n` +
          ``صاحب التذكرة:` <@${ticket.ownerId}>\n` +
          ``القسم:` ${ticket.sectionName || 'غير محدد'}`,
        footer: 'TICKET CHANNEL DELETE',
      });
    }

await ChannelLock.deleteOne({
      guildId: channel.guild.id,
      channelId: channel.id,
    });
  } catch (error) {
    reportError('channelDelete', error);
  }
});

// ============================================================
// ========== أدوات الأوامر النصية ==========
// ============================================================

function isAdminCommand(cmd) {
  const adminCommands = [
    'حظر',
    'طرد',
    'كتم',
    'فك_كتم',
    'تحذير',
    'ابطال_تحذيرات',
    'مسح',
    'قفل',
    'فتح',
    'نقل_كل',
    'حذف_قناة',
    'تغيير_اسم_قناة',
  ];

return adminCommands.includes(cmd);
}

function parseMessageCommand(content) {
  if (
    typeof content !== 'string' ||
    !content.startsWith('!')
  ) {
    return null;
  }

const body = content.slice(1).trim();

if (!body) return null;

const parts = body.split(/\s+/);

return {
    cmd: parts.shift().toLowerCase(),
    args: parts,
  };
}

function createCommandReplyCleanup(message, cmd) {
  const delay = isAdminCommand(cmd) ? 5000 : 0;

return replyMessage => {
    if (!delay) return;

scheduleDelete(message, delay);

if (replyMessage) {
      scheduleDelete(replyMessage, delay);
    }
  };
}

function getArgumentsWithoutRoleMention(args, roleId) {
  const mention = `<@&${roleId}>`;

return args.filter(argument => {
    return argument !== mention;
  });
}

function getArgumentsWithoutMemberMention(args, memberId) {
  const mentions = new Set([
    `<@${memberId}>`,
    `<@!${memberId}>`,
  ]);

return args.filter(argument => {
    return !mentions.has(argument);
  });
}

async function getTextChannel(guild, channelId) {
  if (!guild || !isSnowflake(channelId)) {
    return null;
  }

const channel = await guild.channels
    .fetch(channelId)
    .catch(() => null);

return channel && typeof channel.send === 'function'
    ? channel
    : null;
}

// ============================================================
// نهاية الجزء الثاني.
// الجزء الثالث: معالجة الرسائل والأوامر العامة والإعدادات.
// معالجات أزرار الصفحات ستأتي ضمن جزء التفاعلات.
// لا تضف client.login بعد.
// ============================================================
// ============================================================
// ========== فحص الحماية قبل تنفيذ الأوامر ==========
// ============================================================
// لا نستثني كل رسالة تبدأ بـ ! من الحماية.
// ============================================================

async function enforceMessageProtection(message, config) {
  if (!config.protectionEnabled) return false;

const member = message.member;

if (!member) return false;

const controller = await hasPermission(
    member,
    message.guild.id
  );

const administrator = member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

const bypassRole = (
    config.protectionBypassRoles || []
  ).some(roleId => member.roles.cache.has(roleId));

if (controller || administrator || bypassRole) {
    return false;
  }

let violationReason = null;

if (
    config.antiLinkEnabled &&
    containsLink(message.content)
  ) {
    violationReason = 'إرسال روابط ممنوعة';
  }

if (!violationReason) {
    const bannedWord = await containsBannedWord(
      message.guild.id,
      message.content
    );

if (bannedWord) {
      violationReason =
        'استخدام كلمة محظورة: ' +
        `\`${escapeInlineCode(bannedWord.word)}\``;
    }
  }

if (
    !violationReason &&
    config.antiEveryoneEnabled &&
    /@(everyone|here)\b/i.test(message.content)
  ) {
    violationReason = 'استخدام منشن جماعي ممنوع';
  }

if (
    !violationReason &&
    config.antiSpamEnabled
  ) {
    const spamDetected = await checkSpam(
      message.guild.id,
      message.author.id,
      message.content,
      config.antiSpamMax,
      config.antiSpamSeconds
    );

if (spamDetected) {
      violationReason =
        `تكرار رسالة ${config.antiSpamMax} مرات ` +
        `خلال ${config.antiSpamSeconds} ثوانٍ`;
    }
  }

if (!violationReason) return false;

const result = await applyProtectionAction(
    message,
    member,
    message.guild.id,
    config,
    violationReason
  );

try {
    const warning = await message.channel.send({
      content:
        `<@${member.id}> ⚠️ ${violationReason}`,
      allowedMentions: {
        parse: [],
        users: [member.id],
      },
    });

scheduleDelete(warning, 5000);
  } catch (error) {
    reportError('protection-channel-warning', error);
  }

logToChannel(message.guild.id, {
    title: '🛡️ رُصدت مخالفة حماية',
    color: THEME.WARN,
    description:
      ``العضو:` ${member.user.tag}\n` +
      ``المعرف:` \`${member.id}\`\n` +
      ``القناة:` <#${message.channel.id}>\n` +
      ``السبب:` ${violationReason}`,
    fields: [
      {
        name: '🗑️ حذف الرسالة',
        value: result.deleted ? 'نجح' : 'لم ينجح',
        inline: true,
      },
      {
        name: '📩 التنبيه الخاص',
        value: result.dmSent ? 'أُرسل' : 'لم يُرسل',
        inline: true,
      },
      {
        name: '🔇 Timeout',
        value: result.muted ? 'طُبّق' : 'لم يُطبّق',
        inline: true,
      },
      {
        name: '⚖️ الإجراء المحدد',
        value: config.protectionAction,
      },
    ],
    footer: 'SECURITY CENTER',
  });

return true;
}

// ============================================================
// ========== تحويل الرسائل إلى اقتراحات ==========
// ============================================================

async function processSuggestionMessage(message, config) {
  if (
    !config.suggestionsChannel ||
    message.channel.id !== config.suggestionsChannel
  ) {
    return false;
  }

const content = message.content.trim();

// الرسائل التي تحتوي مرفقات فقط تبقى دون حذف.
  if (!content) return true;

const suggestion = await Suggestion.create({
    guildId: message.guild.id,
    userId: message.author.id,
    content: truncate(content, 2000),
    status: 'pending',
  });

const embed = createEmbed({
    title: '💡 KINGDOM | اقتراح جديد',
    description: suggestion.content,
    footer: 'KINGDOM • شارك رأيك في نقاش الاقتراح',
    timestamp: true,
  });

embed.setAuthor({
    name: truncate(
      message.member?.displayName ||
      message.author.username,
      256
    ),
    iconURL: message.author.displayAvatarURL({
      extension: 'png',
      size: 128,
    }),
  });

addSafeFields(embed, [
    {
      name: '👤 صاحب الاقتراح',
      value: `<@${message.author.id}>`,
      inline: true,
    },
    {
      name: '📅 التاريخ',
      value: discordTimestamp(suggestion.createdAt, 'F'),
      inline: true,
    },
    {
      name: '📋 الحالة',
      value: '⏳ بانتظار المراجعة',
      inline: true,
    },
  ]);

let sentMessage;

try {
    sentMessage = await message.channel.send({
      embeds: [embed],
      allowedMentions: {
        parse: [],
      },
    });
  } catch (error) {
    await Suggestion.deleteOne({
      _id: suggestion._id,
      messageId: { $exists: false },
    }).catch(cleanupError => {
      reportError('suggestion-cleanup', cleanupError);
    });

throw error;
  }

try {
    suggestion.messageId = sentMessage.id;
    await suggestion.save();
  } catch (error) {
    // لا نحذف رسالة المستخدم عند تعذر ربط الاقتراح.
    await sentMessage.delete().catch(() => {});
    throw error;
  }

// حذف الأصل بعد نشر الاقتراح وحفظ رابطه.
  try {
    await message.delete();
  } catch (error) {
    reportError('suggestion-original-delete', error);
  }

let thread = null;

try {
    thread = await sentMessage.startThread({
      name: truncate(
        `نقاش • ${message.member?.displayName || message.author.username}`,
        100
      ),
      autoArchiveDuration: 1440,
      reason: 'KINGDOM • نقاش اقتراح',
    });

suggestion.threadId = thread.id;
    await suggestion.save();

const yesMessage = await thread.send({
      content: '`✅ موافق` — تفاعل بالموافقة على الاقتراح.',
      allowedMentions: { parse: [] },
    });

const noMessage = await thread.send({
      content: '`❌ غير موافق` — تفاعل بالرفض.',
      allowedMentions: { parse: [] },
    });

suggestion.yesMessageId = yesMessage.id;
    suggestion.noMessageId = noMessage.id;

await suggestion.save();

await yesMessage.react('✅');
    await noMessage.react('❌');
  } catch (error) {
    reportError('suggestion-thread-voting', error);

// بديل إذا تعذر إنشاء Thread.
    if (!thread) {
      try {
        suggestion.yesMessageId = sentMessage.id;
        suggestion.noMessageId = sentMessage.id;

await suggestion.save();

await sentMessage.react('✅');
        await sentMessage.react('❌');

embed.setFooter({
          text: 'KINGDOM • صوّت على الاقتراح بالتفاعلات ✅ / ❌',
        });

await sentMessage.edit({
          embeds: [embed],
        });
      } catch (fallbackError) {
        reportError(
          'suggestion-voting-fallback',
          fallbackError
        );
      }
    }
  }

logToChannel(message.guild.id, {
    title: '💡 اقتراح جديد',
    color: THEME.ORANGE,
    description:
      ``صاحب الاقتراح:` ${message.author.tag}\n` +
      ``المعرف:` \`${message.author.id}\`\n` +
      ``الرابط:` ${sentMessage.url}\n\n` +
      truncate(suggestion.content, 1000),
    footer: 'SUGGESTIONS',
  });

return true;
}

// ============================================================
// ========== اكتساب XP ==========
// ============================================================
// عداد الرسائل ذري.
// منح XP محمي بفلتر lastXpAt في MongoDB.
// التسلسل المحلي يمنع تعارض معالجة مستوى المستخدم
// داخل عملية Node واحدة.
// ============================================================

async function grantMessageExperience(message, config) {
  if (
    config.levelChannelId &&
    message.channel.id === config.levelChannelId
  ) {
    return null;
  }

const guildId = message.guild.id;
  const userId = message.author.id;

return withLock(`xp:${guildId}:${userId}`, async () => {
    await getUserData(guildId, userId);

await User.updateOne(
      { guildId, userId },
      {
        $inc: {
          messages: 1,
        },
      }
    );

const now = new Date();
    const cutoff = new Date(
      now.getTime() - LIMITS.XP_COOLDOWN
    );

const gain = Math.floor(Math.random() * 15) + 5;

let data = await User.findOneAndUpdate(
      {
        guildId,
        userId,
        $or: [
          { lastXpAt: null },
          { lastXpAt: { $exists: false } },
          { lastXpAt: { $lte: cutoff } },
        ],
      },
      {
        $inc: {
          xp: gain,
        },
        $set: {
          lastXpAt: now,
        },
      },
      {
        new: true,
      }
    );

if (!data) return null;

let leveledUp = false;

// يحتفظ بالـ XP الزائد بدل تصفيره.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const requiredXP = (data.level + 1) * 100;

if (data.xp < requiredXP) break;

const promoted = await User.findOneAndUpdate(
        {
          _id: data._id,
          level: data.level,
          xp: { $gte: requiredXP },
        },
        {
          $inc: {
            xp: -requiredXP,
            level: 1,
          },
        },
        {
          new: true,
        }
      );

if (!promoted) {
        data = await User.findById(data._id);

if (!data) return null;

continue;
      }

data = promoted;
      leveledUp = true;
    }

if (!leveledUp) return null;

const levelChannelId =
      config.levelChannelId || message.channel.id;

const levelChannel = await getTextChannel(
      message.guild,
      levelChannelId
    );

if (levelChannel) {
      const embed = createEmbed({
        title: '👑 مستوى جديد في المملكة',
        description:
          `<@${userId}> وصل إلى المستوى ` +
          ``${data.level}`!\n\n` +
          '> حضورك يصنع الفرق. استمر بالمشاركة المفيدة.',
        thumbnail: message.author.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
        footer: 'KINGDOM • LEVEL UP',
        timestamp: true,
      });

addSafeFields(embed, [
        {
          name: '📊 المستوى',
          value: String(data.level),
          inline: true,
        },
        {
          name: '✨ التقدم التالي',
          value:
            `${data.xp} / ${(data.level + 1) * 100} XP`,
          inline: true,
        },
      ]);

try {
        await levelChannel.send({
          content: `<@${userId}>`,
          embeds: [embed],
          allowedMentions: {
            parse: [],
            users: [userId],
          },
        });

if (levelChannelId !== message.channel.id) {
          const levelAutoLine = await AutoLine.findOne({
            guildId,
            channelId: levelChannelId,
          });

await sendAutoLine(
            levelChannel,
            levelAutoLine
          );
        }
      } catch (error) {
        reportError('level-announcement', error);
      }
    }

const levelRoles = await LevelRole.find({
      guildId,
      level: { $lte: data.level },
    }).sort({
      level: 1,
    });

for (const levelRole of levelRoles) {
      const role = await message.guild.roles
        .fetch(levelRole.roleId)
        .catch(() => null);

if (
        !role ||
        !canManageRole(message.guild, role) ||
        message.member.roles.cache.has(role.id)
      ) {
        continue;
      }

try {
        await message.member.roles.add(
          role,
          `KINGDOM • بلوغ المستوى ${data.level}`
        );
      } catch (error) {
        reportError('level-role', error);
      }
    }

return data;
  });
}

// ============================================================
// ========== الرد التلقائي على الرسالة ==========
// ============================================================

async function processAutoReplyMessage(message) {
  const key =
    `${message.guild.id}:` +
    `${message.channel.id}:` +
    `${message.author.id}`;

const cooldown = autoReplyCooldowns.get(key);

if (cooldown && cooldown > Date.now()) {
    return false;
  }

const autoReply = await findAutoReply(
    message.guild.id,
    message.content
  );

if (!autoReply) return false;

autoReplyCooldowns.set(key, Date.now() + 3000);

const image = safeHttpUrl(autoReply.image);

const payload = image
    ? {
        embeds: [
          createEmbed({
            description: autoReply.reply,
            image,
            footer: null,
          }),
        ],
      }
    : {
        content: truncate(autoReply.reply, 2000),
      };

payload.allowedMentions = {
    parse: [],
    repliedUser: false,
  };

try {
    await message.reply(payload);
  } catch (error) {
    reportError('auto-reply', error);

await message.channel.send(payload);
  }

return true;
}

// ============================================================
// ========== المعالج الرئيسي الموحد ==========
// ============================================================
// الدوال handleSettingsCommands وhandleModerationCommands
// وhandleCommunityCommands ستأتي في الأجزاء التالية.
// ============================================================

client.on('messageCreate', async message => {
  if (
    message.author.bot ||
    !message.guild
  ) {
    return;
  }

try {
    const guildId = message.guild.id;
    const config = await getGuildConfig(guildId);

const blocked = await enforceMessageProtection(
      message,
      config
    );

if (blocked) return;

const command = parseMessageCommand(message.content);

if (command) {
      const { cmd, args } = command;

const context = {
        message,
        guildId,
        userId: message.author.id,
        config,
        generalImage: getGeneralImage(
          message.guild,
          config
        ),
        cmd,
        args,
        deleteAfter: createCommandReplyCleanup(
          message,
          cmd
        ),
      };

// كل مجموعة تعيد true عند معالجة الأمر.
      const handlers = [
        handlePublicCommands,
        handleControllerCommands,
        handleSettingsCommands,
        handleCommunityCommands,
        handleModerationCommands,
      ];

for (const handler of handlers) {
        if (await handler(context)) {
          return;
        }
      }

// نحافظ على سلوك الأصل: تجاهل الأمر غير المعروف.
      return;
    }

if (
      await processSuggestionMessage(message, config)
    ) {
      return;
    }

try {
      await grantMessageExperience(message, config);
    } catch (error) {
      reportError('message-xp', error);
    }

// الأوتو لاين لا يمنع الرد التلقائي من العمل.
    try {
      const autoLine = await AutoLine.findOne({
        guildId,
        channelId: message.channel.id,
      });

await sendAutoLine(message.channel, autoLine);
    } catch (error) {
      reportError('message-auto-line', error);
    }

try {
      await processAutoReplyMessage(message);
    } catch (error) {
      reportError('message-auto-reply', error);
    }
  } catch (error) {
    reportError('messageCreate', error);

if (parseMessageCommand(message.content)) {
      await sendNotice(
        message,
        'تعذر تنفيذ الأمر. تحقق من صلاحيات البوت وسجل الأخطاء.',
        {
          title: '⚠️ لم يكتمل الإجراء',
          color: THEME.ERROR,
        }
      ).catch(() => {});
    }
  }
});

// ============================================================
// ========== المساعدة ==========
// ============================================================

function buildHelpEmbed(guild, generalImage) {
  const embed = createEmbed({
    title: '📖 KINGDOM | دليل الأوامر',
    description:
      '`كل أدوات المملكة بين يديك.`\n' +
      'استخدم البادئة `!` قبل أي أمر.\n\n' +
      '> أوامر الإدارة والإعدادات تحتاج صلاحية متحكم.',
    thumbnail: guild.iconURL({
      extension: 'png',
      size: 256,
    }),
    image: generalImage,
    footer: 'KINGDOM • البادئة !',
  });

addSafeFields(embed, [
    {
      name: '👑 نظام التحكم',
      value:
        '`متحكم` • `الغاء_متحكم` • `قائمة_المتحكمين`',
    },
    {
      name: '🛡️ الإشراف',
      value:
        '`حظر` • `طرد` • `كتم` • `فك_كتم` • ' +
        '`تحذير` • `ابطال_تحذيرات` • `مسح` • `قفل` • `فتح`',
    },
    {
      name: '🎭 إدارة الرتب',
      value:
        '`اعطاء_رتبة` • `سحب_رتبة` • `عرض_رتب` • `اصلاح_رتب`',
    },
    {
      name: '📁 القنوات',
      value:
        '`انشاء_قناة` • `حذف_قناة` • `تغيير_اسم_قناة`',
    },
    {
      name: '🔊 الصوت',
      value: '`نقل_كل #من #إلى`',
    },
    {
      name: '📌 الرسائل',
      value:
        '`تثبيت` • `الغاء_تثبيت` • `قول` • `ايمبد` • `اعلان`',
    },
    {
      name: '📊 المستويات',
      value:
        '`مستوى` • `ترتيب` • `تعيين روم_ليفل #قناة`',
    },
    {
      name: '👋 الترحيب',
      value:
        '`تعيين ترحيب` • `تعيين رسالة_ترحيب` • ' +
        '`تعيين عنوان_ترحيب` • `تعيين صورة_ترحيب` • ' +
        '`تعيين خلفية_ترحيب` • `تعيين دور_دخول`',
    },
    {
      name: '📋 اللوق',
      value: '`تعيين سجلات #قناة` • `اختبار_لوق`',
    },
    {
      name: '🤖 الأوتو لاين',
      value:
        '`تعيين اوتر_لاين` • `تعيين صورة_اوترلاين` • ' +
        '`تعيين تفعيل_اوترلاين` • `تعيين تعطيل_اوترلاين` • ' +
        '`تعيين حذف_اوترلاين`',
    },
    {
      name: '💬 الردود التلقائية',
      value:
        '`رد_تلقائي` • `رد_تلقائي_صورة` • ' +
        '`حذف_رد_تلقائي` • `عرض_الردود`',
    },
    {
      name: '💡 الاقتراحات',
      value: '`تعيين روم_اقتراحات #قناة`',
    },
    {
      name: '🎫 التذاكر',
      value:
        '`بانل` • `عرض_تذكرة` • `تعيين تذكرة` • ' +
        '`تعيين تكت_لوق #قناة`',
    },
    {
      name: '⭐ التقييمات',
      value:
        '`تقييمات` • `عرض_التقييمات` • ' +
        '`تعيين تقييم on/off` • `تعيين قناة_تقييم #قناة`',
    },
    {
      name: '🎭 الرتب الذاتية',
      value: '`تعيين رتب`',
    },
    {
      name: '🕊️ الزاجل',
      value:
        '`بانل_زاجل` • `تعيين روم_زاجل` • ' +
        '`تعيين عنوان_زاجل` • `تعيين نص_زاجل` • `تعيين صورة_زاجل`',
    },
    {
      name: '📋 التقديمات',
      value:
        '`بانل_تقديم` • `تعيين_تقديمات` • ' +
        '`تعيين_التقديمات` • `نتيجة` • `تعيين تقديم`',
    },
    {
      name: '🛡️ الحماية',
      value: '`حماية`',
    },
    {
      name: '✏️ الاسم',
      value: '`تغيير_اسم`',
    },
    {
      name: 'ℹ️ المعلومات',
      value: '`معلومات` • `سيرفر` • `بينق`',
    },
    {
      name: '⚙️ الإعدادات والصور',
      value:
        '`تعيين` • `تعيين صورة_بانل` • ' +
        '`تعيين صورة_رتب` • `تعيين صورة_بنر` • `تعيين صورة_عامة`',
    },
    {
      name: '📸 إنستغرام',
      value: '`ig رابط_الريلز`',
    },
    {
      name: '🛑 المالك',
      value: '`إيقاف`',
    },
  ]);

return embed;
}

// ============================================================
// ========== الأوامر العامة ==========
// ============================================================

async function handlePublicCommands(context) {
  const {
    message,
    guildId,
    config,
    generalImage,
    cmd,
    args,
  } = context;

if (cmd === 'مساعدة') {
    await message.channel.send({
      embeds: [
        buildHelpEmbed(message.guild, generalImage),
      ],
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'بينق') {
    const gatewayPing = client.ws.ping;

await message.channel.send({
      embeds: [
        createEmbed({
          title: '🏓 KINGDOM | الاتصال',
          description:
            ``زمن Gateway:` ${
              gatewayPing >= 0
                ? `${gatewayPing}ms`
                : 'لم يُقَس بعد'
            }\n` +
            ``قاعدة البيانات:` ${
              mongoose.connection.readyState === 1
                ? 'متصلة'
                : 'غير متصلة'
            }`,
          thumbnail: generalImage,
        }),
      ],
    });

return true;
  }

if (cmd === 'مستوى') {
    const member =
      message.mentions.members.first() ||
      message.member;

const data = await getUserData(guildId, member.id);
    const requiredXP = (data.level + 1) * 100;

const ratio = Math.min(
      1,
      Math.max(0, data.xp / requiredXP)
    );

const filled = Math.round(ratio * 12);

const progress =
      '▰'.repeat(filled) +
      '▱'.repeat(12 - filled);

const embed = createEmbed({
      title: `📊 مستوى ${member.displayName}`,
      description:
        `${progress}\n` +
        ``${Math.floor(ratio * 100)}%` إلى المستوى التالي`,
      thumbnail: member.user.displayAvatarURL({
        extension: 'png',
        size: 256,
      }),
      footer: 'KINGDOM • MEMBER PROGRESS',
    });

addSafeFields(embed, [
      {
        name: '👑 المستوى',
        value: String(data.level),
        inline: true,
      },
      {
        name: '✨ XP',
        value: `${data.xp} / ${requiredXP}`,
        inline: true,
      },
      {
        name: '💬 الرسائل',
        value: String(data.messages),
        inline: true,
      },
    ]);

await message.channel.send({
      embeds: [embed],
    });

return true;
  }

if (cmd === 'ترتيب') {
    const top = await User.find({ guildId })
      .sort({ level: -1, xp: -1, userId: 1 })
      .limit(10)
      .lean();

if (!top.length) {
      await sendNotice(message, 'لا توجد بيانات مستويات بعد.');
      return true;
    }

const medals = ['🥇', '🥈', '🥉'];

const description = top.map((entry, index) => {
      return (
        `${medals[index] || ``#${index + 1}``} ` +
        `<@${entry.userId}>\n` +
        `↳ المستوى `${entry.level}` • ${entry.xp} XP`
      );
    }).join('\n\n');

await message.channel.send({
      embeds: [
        createEmbed({
          title: '🏆 KINGDOM | لوحة الشرف',
          description,
          thumbnail: generalImage,
          footer: `KINGDOM • أعلى ${top.length} أعضاء`,
        }),
      ],
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'معلومات') {
    const member =
      message.mentions.members.first() ||
      message.member;

const embed = createEmbed({
      title: `ℹ️ ${member.displayName}`,
      thumbnail: member.user.displayAvatarURL({
        extension: 'png',
        size: 256,
      }),
      footer: 'KINGDOM • MEMBER PROFILE',
    });

addSafeFields(embed, [
      {
        name: '🆔 المعرف',
        value: member.id,
        inline: true,
      },
      {
        name: '📅 دخول السيرفر',
        value: member.joinedAt
          ? discordTimestamp(member.joinedAt, 'F')
          : 'غير معروف',
        inline: true,
      },
      {
        name: '🗓️ إنشاء الحساب',
        value: discordTimestamp(member.user.createdAt, 'F'),
        inline: true,
      },
      {
        name: '🎭 أعلى رتبة',
        value: member.roles.highest.toString(),
        inline: true,
      },
      {
        name: '🔊 القناة الصوتية',
        value: member.voice.channel
          ? member.voice.channel.toString()
          : 'غير متصل',
        inline: true,
      },
      {
        name: '🤖 نوع الحساب',
        value: member.user.bot ? 'بوت' : 'عضو',
        inline: true,
      },
    ]);

await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'سيرفر') {
    const embed = createEmbed({
      title: `🏰 ${message.guild.name}`,
      description:
        message.guild.description ||
        'The Kingdom Never Falls.',
      thumbnail: message.guild.iconURL({
        extension: 'png',
        size: 256,
      }),
      footer: 'KINGDOM • SERVER PROFILE',
    });

addSafeFields(embed, [
      {
        name: '👥 الأعضاء',
        value: String(message.guild.memberCount),
        inline: true,
      },
      {
        name: '💬 القنوات في الكاش',
        value: String(message.guild.channels.cache.size),
        inline: true,
      },
      {
        name: '🎭 الرتب في الكاش',
        value: String(message.guild.roles.cache.size),
        inline: true,
      },
      {
        name: '👑 المالك',
        value: `<@${message.guild.ownerId}>`,
        inline: true,
      },
      {
        name: '✨ التعزيزات',
        value: String(
          message.guild.premiumSubscriptionCount || 0
        ),
        inline: true,
      },
      {
        name: '📅 الإنشاء',
        value: discordTimestamp(message.guild.createdAt, 'F'),
        inline: true,
      },
    ]);

await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'عرض_رتب') {
    const member =
      message.mentions.members.first() ||
      message.member;

const roles = [...member.roles.cache.values()]
      .filter(role => role.id !== message.guild.id)
      .sort((a, b) => b.position - a.position);

await sendLongEmbedText(
      message.channel,
      `🎭 رتب ${member.displayName}`,
      roles.length
        ? roles.map(role => role.toString()).join('\n')
        : 'لا توجد رتب.',
      `KINGDOM • ${roles.length} رتبة`
    );

return true;
  }

if (cmd === 'تغيير_اسم') {
    const last = await getNameCooldown(message.author.id);
    const availableAt = getNameAvailableAt(last);

if (availableAt) {
      await sendNotice(
        message,
        `يمكنك تغيير اسمك ${discordTimestamp(availableAt, 'R')}.`
      );

return true;
    }

await message.channel.send({
      embeds: [
        createEmbed({
          title: '✏️ KINGDOM | تغيير الاسم',
          description:
            'اضغط الزر لكتابة اسمك الجديد.\n\n' +
            '> يمكنك تغيير اسمك مرة كل 5 ساعات.',
          thumbnail: generalImage,
        }),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          createButton(
            'open_name_modal',
            'تغيير الاسم',
            '✏️',
            BTN.MAIN
          )
        ),
      ],
    });

return true;
  }

if (cmd === 'قائمة_المتحكمين') {
    const controllers = await getControllers(guildId);

await sendLongEmbedText(
      message.channel,
      '👑 متحكمو المملكة',
      controllers.length
        ? controllers.map(id => `<@${id}>`).join('\n')
        : 'لا يوجد متحكمون مسجلون.',
      `KINGDOM • ${controllers.length} متحكم مسجل`
    );

return true;
  }

if (cmd === 'عرض_الردود') {
    const replies = await getAutoReplies(guildId);

const text = replies.length
      ? replies.map((reply, index) => {
          return (
            ``${index + 1}. ${reply.keyword}`\n` +
            truncate(reply.reply, 800) +
            (reply.image ? '\n🖼️ يحتوي صورة' : '')
          );
        }).join('\n\n')
      : 'لا توجد ردود تلقائية.';

await sendLongEmbedText(
      message.channel,
      '💬 الردود التلقائية',
      text,
      `KINGDOM • ${replies.length} رد`
    );

return true;
  }

if (cmd === 'عرض_تذكرة') {
    const settings = await getTicketSettings(guildId);

await message.channel.send({
      embeds: [
        createEmbed({
          title: '🎫 إعدادات التذاكر',
          description: settings.text,
          thumbnail: generalImage,
        }),
      ],
    });

const sections = settings.sections.map((section, index) => {
      return (
        ``${index + 1}.` ${section.emoji || '📌'} ` +
        ``${section.name}`\n` +
        `↳ ${
          section.roleId
            ? `<@&${section.roleId}>`
            : 'بدون رتبة دعم'
        }`
      );
    }).join('\n\n');

await sendLongEmbedText(
      message.channel,
      '📌 أقسام التذاكر',
      sections || 'لا توجد أقسام.',
      `KINGDOM • ${settings.sections.length} قسم`
    );

await message.channel.send({
      embeds: [
        addSafeFields(
          createEmbed({
            title: '⚙️ ربط قنوات التذاكر',
          }),
          [
            {
              name: '📥 قناة اللوق',
              value: config.ticketLogChannel
                ? `<#${config.ticketLogChannel}>`
                : 'غير محددة',
            },
            {
              name: '🖼️ الصورة',
              value: safeHttpUrl(settings.image)
                ? `[فتح الصورة](${safeHttpUrl(settings.image)})`
                : 'غير محددة',
            },
          ]
        ),
      ],
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'قول') {
    const text = args.join(' ');

if (!text) {
      await sendNotice(message, 'اكتب النص بعد `!قول`.');
      return true;
    }

await message.channel.send({
      content: truncate(text, 2000),
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'ايمبد') {
    const fullText = args.join(' ');

if (!fullText) {
      await sendNotice(
        message,
        'الصيغة: `!ايمبد العنوان ، الوصف`'
      );

return true;
    }

const parts = fullText
      .split(/[،,]\s*/)
      .map(value => value.trim());

const title = parts.length >= 2
      ? parts.shift()
      : 'رسالة من المجتمع';

let description = parts.length
      ? parts.join(' ، ')
      : fullText;

const imageMatch = description.match(
      /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s]*)?/i
    );

const image = imageMatch
      ? safeHttpUrl(imageMatch[0])
      : null;

if (imageMatch) {
      description = description
        .replace(imageMatch[0], '')
        .trim();
    }

await message.channel.send({
      embeds: [
        createEmbed({
          title,
          description: description || '—',
          image,
          thumbnail: generalImage,
          timestamp: true,
        }),
      ],
      allowedMentions: { parse: [] },
    });

return true;
  }

if (cmd === 'ig') {
    // تعريف التحميل الآمن يأتي في جزء أوامر المجتمع.
    await handleInstagramCommand(context);
    return true;
  }

return false;
}

// ============================================================
// ========== تقسيم النصوص الطويلة على Embeds ==========
// ============================================================

async function sendLongEmbedText(
  channel,
  title,
  text,
  footer = THEME.FOOTER
) {
  const source = String(text || '—');
  const chunks = [];

let remaining = source;

while (remaining.length > 3500) {
    const lastBreak = remaining.lastIndexOf('\n', 3500);

const splitAt = lastBreak > 1200
      ? lastBreak
      : 3500;

chunks.push(remaining.slice(0, splitAt));

remaining = remaining.slice(splitAt);

if (remaining.startsWith('\n')) {
      remaining = remaining.slice(1);
    }
  }

if (remaining.length || !chunks.length) {
    chunks.push(remaining || '—');
  }

for (let index = 0; index < chunks.length; index += 1) {
    await channel.send({
      embeds: [
        createEmbed({
          title: chunks.length > 1
            ? `${title} • ${index + 1}/${chunks.length}`
            : title,
          description: chunks[index],
          footer,
        }),
      ],
      allowedMentions: { parse: [] },
    });

if (index < chunks.length - 1) {
      await sleep(250);
    }
  }
}

// ============================================================
// ========== أوامر المتحكمين الخاصة بالمالك ==========
// ============================================================

async function handleControllerCommands(context) {
  const {
    message,
    guildId,
    cmd,
    deleteAfter,
  } = context;

if (
    ![
      'متحكم',
      'الغاء_متحكم',
      'اصلاح_رتب',
      'إيقاف',
    ].includes(cmd)
  ) {
    return false;
  }

if (
    !OWNER_ID ||
    message.author.id !== OWNER_ID
  ) {
    const reply = await sendNotice(
      message,
      'هذا الأمر متاح لمالك البوت فقط.',
      { color: THEME.ERROR }
    );

deleteAfter(reply);
    return true;
  }

if (cmd === 'إيقاف') {
    await sendNotice(
      message,
      'جارٍ إيقاف البوت وإغلاق الاتصالات...',
      { title: '🛑 إيقاف المملكة' }
    );

// تُعرّف دالة الإيقاف في الجزء الأخير.
    await shutdownBot('owner-command');

return true;
  }

if (cmd === 'اصلاح_رتب') {
    const roles = await SelfRole.find({ guildId });

let fixed = 0;
    let valid = 0;

for (const role of roles) {
      if (!parseEmoji(role.emoji)) {
        role.emoji = '🎭';
        await role.save();
        fixed += 1;
      } else {
        valid += 1;
      }
    }

await sendNotice(
      message,
      `تم إصلاح `${fixed}` رتبة.\n` +
      `الرتب ذات الإيموجي الصحيح: `${valid}`.`,
      { title: '🎭 اكتمل فحص الإيموجي' }
    );

return true;
  }

const member = message.mentions.members.first();

if (!member) {
    await sendNotice(message, 'منشن العضو المطلوب.');
    return true;
  }

if (member.id === OWNER_ID) {
    await sendNotice(
      message,
      'مالك البوت يمتلك التحكم أصلًا ولا تُلغى صلاحيته بهذا الأمر.'
    );

return true;
  }

if (cmd === 'متحكم') {
    if (member.user.bot) {
      await sendNotice(
        message,
        'لا يمكن تعيين بوت كمتحكم.'
      );

return true;
    }

const added = await addController(guildId, member.id);

await sendNotice(
      message,
      added
        ? `تم تعيين ${member} متحكمًا.`
        : `${member} متحكم بالفعل.`,
      { title: '👑 نظام التحكم' }
    );

if (added) {
      logToChannel(guildId, {
        title: '👑 تعيين متحكم',
        description:
          ``المنفذ:` ${message.author.tag}\n` +
          ``المتحكم الجديد:` ${member.user.tag}\n` +
          ``المعرف:` \`${member.id}\``,
        footer: 'CONTROLLERS',
      });
    }

return true;
  }

const removed = await removeController(
    guildId,
    member.id
  );

await sendNotice(
    message,
    removed
      ? `تم إلغاء التحكم عن ${member}.`
      : `${member} ليس متحكمًا مسجلًا.`,
    { title: '👑 نظام التحكم' }
  );

if (removed) {
    logToChannel(guildId, {
      title: '🔒 إلغاء متحكم',
      color: THEME.DARK,
      description:
        ``المنفذ:` ${message.author.tag}\n` +
        ``العضو:` ${member.user.tag}\n` +
        ``المعرف:` \`${member.id}\``,
      footer: 'CONTROLLERS',
    });
  }

return true;
}

// ============================================================
// نهاية الجزء الثالث.
// الجزء الرابع: أمر تعيين، إعدادات الترحيب والصور والقنوات
// والأوتو لاين وإدارة أقسام التذاكر والرتب الذاتية.
// ============================================================
// ============================================================
// ========== معالجات التذاكر ==========
// ============================================================

async function handleTicketCreate(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const selected = interaction.values[0];
  const guildId = interaction.guild.id;

  // ===== إعادة تعيين =====
  if (selected === 'TICKET_RESET') {
    const config = await getGuildConfig(guildId);

    const panel = await buildTicketPanel(
      interaction.guild,
      config,
      0
    );

    if (panel.empty || !panel.row) {
      return interaction.editReply({
        embeds: [
          createEmbed({
            title: '⚠️ لا توجد أقسام',
            color: THEME.WARN,
          }),
        ],
      });
    }

    await interaction.message
      .edit({ components: panel.rows })
      .catch(() => {});

    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '🔄 تم التحديث',
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  const settings = await getTicketSettings(guildId);

  const section = settings.sections.find(
    item => item.name === selected
  );

  if (!section) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ القسم غير موجود',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  const member = interaction.member;

  // ===== منع تذاكر متعددة مفتوحة =====
  const existingTicket = await Ticket.findOne({
    guildId,
    ownerId: member.id,
    status: 'open',
    closed: false,
  });

  if (existingTicket) {
    const existingChannel = await interaction.guild.channels
      .fetch(existingTicket.channelId)
      .catch(() => null);

    if (existingChannel) {
      return interaction.editReply({
        embeds: [
          createEmbed({
            title: '⚠️ لديك تذكرة مفتوحة',
            description:
              `لديك تذكرة مفتوحة بالفعل: ${existingChannel}\n\n` +
              '> يرجى إغلاقها قبل فتح تذكرة جديدة.',
            color: THEME.WARN,
          }),
        ],
      });
    }

    // قناة محذوفة، نحدّث السجل
    existingTicket.status = 'closed';
    existingTicket.closed = true;
    existingTicket.deletedAt = new Date();
    await existingTicket.save().catch(() => {});
  }

  // ===== إنشاء قناة التذكرة =====
  const ticketName = sanitizeChannelName(
    `تذكرة-${member.user.username}`
  );

  const permissionOverwrites =
    await buildTicketPermissionOverwrites(
      interaction.guild,
      member,
      section
    );

  let channel;

  try {
    channel = await interaction.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: settings.categoryId || null,
      permissionOverwrites,
      reason: `KINGDOM • تذكرة ${section.name}`,
    });
  } catch (error) {
    reportError('ticket-create', error);

    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ فشل إنشاء التذكرة',
          description:
            'تحقق من صلاحيات البوت وتسلسل الرتب.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  const ticketData = await Ticket.create({
    guildId,
    channelId: channel.id,
    ownerId: member.id,
    sectionName: section.name,
    supportRoleId: section.roleId || null,
    status: 'open',
    closed: false,
  });

  const config = await getGuildConfig(guildId);
  const welcomeEmbed = buildTicketWelcomeEmbed(
    interaction.guild,
    ticketData,
    config
  );

  const mentionParts = [`<@${member.id}>`];

  if (section.roleId) {
    mentionParts.push(`<@&${section.roleId}>`);
  }

  try {
    await channel.send({
      content: mentionParts.join(' '),
      embeds: [welcomeEmbed],
      components: [
        buildTicketCloseRow(),
        buildTicketControlRow(),
      ],
      allowedMentions: {
        parse: [],
        users: [member.id],
        roles: section.roleId ? [section.roleId] : [],
      },
    });
  } catch (error) {
    reportError('ticket-welcome', error);
  }

  // ===== لوق استلام التذاكر =====
  if (config.ticketLogChannel) {
    const logChannel = await getTextChannel(
      interaction.guild,
      config.ticketLogChannel
    );

    if (logChannel) {
      const logEmbed = createEmbed({
        title: '📥 تذكرة جديدة',
        thumbnail: member.user.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
        footer: 'KINGDOM • TICKET INTAKE',
        timestamp: true,
      });

      addSafeFields(logEmbed, [
        {
          name: '👤 صاحب التذكرة',
          value: `${member} (\`${member.user.tag}\`)`,
          inline: true,
        },
        {
          name: '📌 القسم',
          value: section.name,
          inline: true,
        },
        {
          name: '📅 الوقت',
          value: discordTimestamp(new Date(), 'F'),
          inline: true,
        },
        {
          name: '🔗 الرابط',
          value: `${channel}`,
          inline: false,
        },
      ]);

      await logChannel
        .send({
          embeds: [logEmbed],
          allowedMentions: { parse: [] },
        })
        .catch(error => reportError('ticket-log', error));
    }
  }

  logToChannel(guildId, {
    title: '🎫 فتح تذكرة',
    description:
      `**${member.user.tag}** فتح تذكرة في قسم **${section.name}**\n` +
      `**القناة:** ${channel}`,
    color: THEME.ORANGE,
    footer: 'TICKETS',
  });

  return interaction.editReply({
    embeds: [
      createEmbed({
        title: '✅ تم إنشاء تذكرتك',
        description: `تذكرة في ${channel}`,
        color: THEME.ORANGE,
      }),
    ],
  });
}

async function handleTicketControl(interaction) {
  if (!(await requireControllerInteraction(interaction))) {
    return;
  }

  const action = interaction.values[0];
  const channel = interaction.channel;

  const ticketData = await getTicketByChannel(
    interaction.guild.id,
    channel.id
  );

  if (!ticketData) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ ليست تذكرة',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  // ===== استلام =====
  if (action === 'claim') {
    if (ticketData.claimedBy) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '⚠️ مستلمة مسبقًا',
            description: `من <@${ticketData.claimedBy}>`,
            color: THEME.WARN,
          }),
        ],
      });
    }

    ticketData.claimedBy = interaction.user.id;
    ticketData.claimedAt = new Date();
    await ticketData.save();

    await channel
      .send({
        embeds: [
          createEmbed({
            title: '✋ استلام',
            description: `${interaction.user} استلم التذكرة.`,
            color: THEME.ORANGE,
            timestamp: true,
          }),
        ],
      })
      .catch(() => {});

    logToChannel(interaction.guild.id, {
      title: '✋ استلام تذكرة',
      description:
        `**المتحكم:** ${interaction.user.tag}\n` +
        `**التذكرة:** ${channel.name}`,
      color: THEME.ORANGE,
      footer: 'TICKETS',
    });

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم الاستلام',
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  // ===== إلغاء الاستلام =====
  if (action === 'unclaim') {
    if (!ticketData.claimedBy) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '⚠️ غير مستلمة',
            color: THEME.WARN,
          }),
        ],
      });
    }

    const previous = ticketData.claimedBy;
    ticketData.claimedBy = null;
    ticketData.claimedAt = null;
    await ticketData.save();

    await channel
      .send({
        embeds: [
          createEmbed({
            title: '📌 إلغاء الاستلام',
            description: `${interaction.user} ألغى استلام <@${previous}>.`,
            color: THEME.DARK,
            timestamp: true,
          }),
        ],
      })
      .catch(() => {});

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم الإلغاء',
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  // ===== إضافة عضو =====
  if (action === 'add_member') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_add_member_modal')
      .setTitle('إضافة عضو للتذكرة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('member_query')
            .setLabel('اسم المستخدم أو الآيدي')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50)
        )
      );

    return interaction.showModal(modal);
  }

  // ===== تغيير الاسم =====
  if (action === 'rename') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_rename_modal')
      .setTitle('تغيير اسم التذكرة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('new_name')
            .setLabel('الاسم الجديد')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(90)
            .setValue(channel.name.slice(0, 90))
        )
      );

    return interaction.showModal(modal);
  }

  // ===== حذف =====
  if (action === 'delete') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_delete_confirm_modal')
      .setTitle('تأكيد حذف التذكرة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('confirm_text')
            .setLabel('اكتب "حذف" للتأكيد')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(10)
            .setPlaceholder('حذف')
        )
      );

    return interaction.showModal(modal);
  }
}

async function handleTicketModal(interaction) {
  const id = interaction.customId;

  if (!(await requireControllerInteraction(interaction))) {
    return;
  }

  // ===== إضافة عضو =====
  if (id === 'ticket_add_member_modal') {
    const query = interaction.fields
      .getTextInputValue('member_query')
      .trim();

    const target = await findMemberByName(
      interaction.guild,
      query
    );

    if (!target) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ لم أجد العضو',
            description:
              'استخدم آيدي العضو أو الاسم الكامل.',
            color: THEME.ERROR,
          }),
        ],
      });
    }

    if (target.user.bot) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ بوت',
            description: 'لا يمكن إضافة بوت للتذكرة.',
            color: THEME.ERROR,
          }),
        ],
      });
    }

    try {
      await interaction.channel.permissionOverwrites.edit(
        target.id,
        {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          EmbedLinks: true,
        }
      );

      const ticketData = await getTicketByChannel(
        interaction.guild.id,
        interaction.channel.id
      );

      if (
        ticketData &&
        !ticketData.addedMembers.includes(target.id)
      ) {
        ticketData.addedMembers.push(target.id);
        await ticketData.save();
      }

      await interaction.channel
        .send({
          embeds: [
            createEmbed({
              title: '👤 عضو جديد',
              description: `${interaction.user} أضاف ${target} للتذكرة.`,
              color: THEME.ORANGE,
              timestamp: true,
            }),
          ],
        })
        .catch(() => {});

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '✅ تم الإضافة',
            description: `**${target.user.tag}** أضيف للتذكرة.`,
            color: THEME.ORANGE,
          }),
        ],
      });
    } catch (error) {
      reportError('ticket-add-member', error);

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ فشل',
            description: error.message,
            color: THEME.ERROR,
          }),
        ],
      });
    }
  }

  // ===== تغيير الاسم =====
  if (id === 'ticket_rename_modal') {
    const newName = interaction.fields
      .getTextInputValue('new_name')
      .trim();

    const safeName = sanitizeChannelName(newName);
    const oldName = interaction.channel.name;

    try {
      await interaction.channel.setName(
        safeName,
        `بواسطة ${interaction.user.tag}`
      );

      await interaction.channel
        .send({
          embeds: [
            createEmbed({
              title: '✏️ تغيير اسم',
              description:
                `${interaction.user} غيّر الاسم من **${oldName}** إلى **${safeName}**.`,
              color: THEME.ORANGE,
              timestamp: true,
            }),
          ],
        })
        .catch(() => {});

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '✅ تم التغيير',
            description: `الاسم الجديد: **${safeName}**`,
            color: THEME.ORANGE,
          }),
        ],
      });
    } catch (error) {
      reportError('ticket-rename', error);

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ فشل',
            description: error.message,
            color: THEME.ERROR,
          }),
        ],
      });
    }
  }

  // ===== حذف التذكرة =====
  if (id === 'ticket_delete_confirm_modal') {
    const confirmText = interaction.fields
      .getTextInputValue('confirm_text')
      .trim();

    if (confirmText !== 'حذف') {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '⚠️ تأكيد خاطئ',
            description: 'يجب كتابة **حذف** بالضبط.',
            color: THEME.WARN,
          }),
        ],
      });
    }

    const channelName = interaction.channel.name;

    const ticketData = await getTicketByChannel(
      interaction.guild.id,
      interaction.channel.id
    );

    if (ticketData) {
      ticketData.status = 'closed';
      ticketData.closed = true;
      ticketData.closedBy = interaction.user.id;
      ticketData.closedAt = new Date();
      await ticketData.save().catch(() => {});
    }

    logToChannel(interaction.guild.id, {
      title: '🗑️ حذف تذكرة',
      description:
        `**المنفذ:** ${interaction.user.tag}\n` +
        `**التذكرة:** ${channelName}`,
      color: THEME.DARK,
      footer: 'TICKETS',
    });

    await respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '🗑️ جاري الحذف',
          color: THEME.DARK,
        }),
      ],
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
}

async function handleTicketClose(interaction) {
  if (interaction.replied || interaction.deferred) return;

  if (!(await requireControllerInteraction(interaction))) {
    return;
  }

  const channel = interaction.channel;

  if (!channel.name.startsWith('تذكرة-')) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '⚠️ ليست تذكرة',
          color: THEME.WARN,
        }),
      ],
    });
  }

  const config = await getGuildConfig(interaction.guild.id);

  const ticketData = await getTicketByChannel(
    interaction.guild.id,
    channel.id
  );

  if (ticketData?.closed) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '⚠️ مغلقة مسبقًا',
          color: THEME.WARN,
        }),
      ],
    });
  }

  if (ticketData) {
    ticketData.closed = true;
    ticketData.status = 'closed';
    ticketData.closedBy = interaction.user.id;
    ticketData.closedAt = new Date();
    await ticketData.save().catch(() => {});
  }

  const ticketOwnerId = ticketData?.ownerId || null;

  const sectionName =
    ticketData?.sectionName ||
    channel.name.replace('تذكرة-', '').split('-')[0] ||
    'غير معروف';

  // ===== إنشاء سجل التقييم =====
  if (ticketOwnerId && config.ticketRatingEnabled !== false) {
    try {
      await TicketRating.findOneAndUpdate(
        {
          guildId: interaction.guild.id,
          ticketId: channel.id,
        },
        {
          $setOnInsert: {
            guildId: interaction.guild.id,
            userId: ticketOwnerId,
            closedBy: interaction.user.id,
            section: sectionName,
            ticketId: channel.id,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
    } catch (error) {
      reportError('ticket-rating-init', error);
    }

    // ===== إرسال استبيان التقييم =====
    try {
      const owner = await interaction.guild.members
        .fetch(ticketOwnerId)
        .catch(() => null);

      if (owner) {
        const ratingEmbed = createEmbed({
          title: '⭐ قيّم تجربتك',
          description:
            `مرحبًا ${owner}!\n\n` +
            `تم إغلاق تذكرتك في قسم **${sectionName}**.\n` +
            'نرجو منك تقييم جودة الخدمة.\n\n' +
            '**⭐ = سيئ جدًا**\n' +
            '**⭐⭐⭐⭐⭐ = ممتاز**',
          thumbnail: interaction.guild.iconURL({
            extension: 'png',
            size: 256,
          }),
          footer: `KINGDOM • ${interaction.guild.name}`,
          timestamp: true,
        });

        const ratingRow = new ActionRowBuilder().addComponents(
          ...[1, 2, 3, 4, 5].map(value =>
            createButton(
              `rate_ticket_${value}_${ticketOwnerId}_${channel.id}_${interaction.guild.id}`,
              '⭐'.repeat(value),
              null,
              BTN.MAIN
            )
          )
        );

        const commentRow = new ActionRowBuilder().addComponents(
          createButton(
            `rate_ticket_comment_${ticketOwnerId}_${channel.id}_${interaction.guild.id}`,
            'إضافة تعليق',
            '💬'
          )
        );

        await owner
          .send({
            embeds: [ratingEmbed],
            components: [ratingRow, commentRow],
          })
          .catch(() => {});
      }
    } catch (error) {
      reportError('ticket-rating-dm', error);
    }
  }

  logToChannel(interaction.guild.id, {
    title: '🔒 إغلاق تذكرة',
    description:
      `**المستخدم:** ${interaction.user}\n` +
      `**القناة:** ${channel.name}\n` +
      `**صاحب التذكرة:** ${
        ticketOwnerId ? `<@${ticketOwnerId}>` : 'غير معروف'
      }`,
    color: THEME.DARK,
    footer: 'TICKETS',
  });

  await respondToInteraction(interaction, {
    embeds: [
      createEmbed({
        title: '🔒 جاري الإغلاق',
        description: 'سيتم حذف القناة خلال 3 ثوان.',
        color: THEME.DARK,
      }),
    ],
  });

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 3000);
}

async function handleTicketRating(interaction) {
  const id = interaction.customId;
  const parts = id.split('_');

  const isComment = parts[2] === 'comment';

  if (isComment) {
    const ownerId = parts[3];
    const channelId = parts[4];
    const guildId = parts[5];

    if (interaction.user.id !== ownerId) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ ليس لك',
            color: THEME.ERROR,
          }),
        ],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(
        `ticket_comment_modal_${ownerId}_${channelId}_${guildId}`
      )
      .setTitle('إضافة تعليق')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ticket_comment_text')
            .setLabel('تعليقك')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(500)
        )
      );

    return interaction.showModal(modal);
  }

  const rating = parseInt(parts[2]);
  const ownerId = parts[3];
  const channelId = parts[4];
  const guildId = parts[5];

  if (interaction.user.id !== ownerId) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ ليس لك',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ تقييم غير صالح',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  await TicketRating.findOneAndUpdate(
    { guildId, ticketId: channelId },
    {
      $set: {
        guildId,
        userId: ownerId,
        ticketId: channelId,
        rating,
      },
    },
    { upsert: true, new: true }
  );

  try {
    const config = await getGuildConfig(guildId);

    if (config.ticketRatingChannel) {
      const ratingChannel = await getTextChannel(
        interaction.guild,
        config.ticketRatingChannel
      );

      if (ratingChannel) {
        const ratingData = await TicketRating.findOne({
          guildId,
          ticketId: channelId,
        });

        const member = await interaction.guild.members
          .fetch(ownerId)
          .catch(() => null);

        const closedByMember = ratingData?.closedBy
          ? await interaction.guild.members
              .fetch(ratingData.closedBy)
              .catch(() => null)
          : null;

        const logEmbed = createEmbed({
          title: '⭐ تقييم جديد',
          thumbnail: member?.user.displayAvatarURL({
            extension: 'png',
            size: 256,
          }),
          footer: `KINGDOM • ${interaction.guild.name}`,
          timestamp: true,
        });

        addSafeFields(logEmbed, [
          {
            name: '👤 صاحب التذكرة',
            value: member
              ? member.user.tag
              : `<@${ownerId}>`,
            inline: true,
          },
          {
            name: '🎯 التقييم',
            value: `${'⭐'.repeat(rating)} (${rating}/5)`,
            inline: true,
          },
          {
            name: '📌 القسم',
            value: ratingData?.section || 'غير معروف',
            inline: true,
          },
          {
            name: '🔒 أغلق بواسطة',
            value: closedByMember
              ? closedByMember.user.tag
              : 'غير معروف',
            inline: true,
          },
          {
            name: '🆔 التذكرة',
            value: `\`${channelId}\``,
            inline: true,
          },
          {
            name: '📅 التاريخ',
            value: discordTimestamp(new Date(), 'F'),
            inline: true,
          },
        ]);

        if (ratingData?.comment) {
          logEmbed.addFields({
            name: '💬 التعليق',
            value: ratingData.comment,
            inline: false,
          });
        }

        await ratingChannel
          .send({
            embeds: [logEmbed],
            allowedMentions: { parse: [] },
          })
          .catch(error =>
            reportError('ticket-rating-log', error)
          );
      }
    }
  } catch (error) {
    reportError('ticket-rating', error);
  }

  return interaction.update({
    embeds: [
      createEmbed({
        title: '✅ شكرًا لتقييمك!',
        description:
          `${'⭐'.repeat(rating)} (${rating}/5)\n\n` +
          'نقدّر وقتك. 💙',
        color: THEME.ORANGE,
        timestamp: true,
      }),
    ],
    components: [],
  });
}

async function handleTicketCommentModal(interaction) {
  const id = interaction.customId;

  if (!id.startsWith('ticket_comment_modal_')) return;

  const parts = id.split('_');
  const ownerId = parts[3];
  const channelId = parts[4];
  const guildId = parts[5];

  if (interaction.user.id !== ownerId) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ ليس لك',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  const comment = interaction.fields
    .getTextInputValue('ticket_comment_text')
    .trim();

  await TicketRating.findOneAndUpdate(
    { guildId, ticketId: channelId },
    {
      $set: {
        guildId,
        userId: ownerId,
        ticketId: channelId,
        comment,
      },
    },
    { upsert: true, new: true }
  );

  try {
    const config = await getGuildConfig(guildId);

    if (config.ticketRatingChannel) {
      const ratingChannel = await getTextChannel(
        interaction.guild,
        config.ticketRatingChannel
      );

      if (ratingChannel) {
        const ratingData = await TicketRating.findOne({
          guildId,
          ticketId: channelId,
        });

        const member = await interaction.guild.members
          .fetch(ownerId)
          .catch(() => null);

        const commentEmbed = createEmbed({
          title: '💬 تعليق جديد',
          thumbnail: member?.user.displayAvatarURL({
            extension: 'png',
            size: 256,
          }),
          footer: `KINGDOM • ${interaction.guild.name}`,
          timestamp: true,
        });

        addSafeFields(commentEmbed, [
          {
            name: '👤 صاحب التذكرة',
            value: member
              ? member.user.tag
              : `<@${ownerId}>`,
            inline: true,
          },
          {
            name: '🎯 التقييم',
            value: ratingData?.rating
              ? `${'⭐'.repeat(ratingData.rating)} (${ratingData.rating}/5)`
              : 'لم يقيّم بعد',
            inline: true,
          },
          {
            name: '💬 التعليق',
            value: comment,
            inline: false,
          },
        ]);

        await ratingChannel
          .send({
            embeds: [commentEmbed],
            allowedMentions: { parse: [] },
          })
          .catch(error =>
            reportError('ticket-comment-log', error)
          );
      }
    }
  } catch (error) {
    reportError('ticket-comment', error);
  }

  return respondToInteraction(interaction, {
    embeds: [
      createEmbed({
        title: '✅ تم استلام تعليقك',
        description: `شكرًا لك:\n> ${comment}`,
        color: THEME.ORANGE,
        timestamp: true,
      }),
    ],
  });
}

async function handleTicketPanelPage(interaction) {
  const page = parseInt(
    interaction.customId.split(':')[1]
  );

  if (!Number.isInteger(page) || page < 0) {
    return interaction.deferUpdate();
  }

  const config = await getGuildConfig(interaction.guild.id);

  const panel = await buildTicketPanel(
    interaction.guild,
    config,
    page
  );

  if (panel.empty || !panel.row) {
    return interaction.deferUpdate();
  }

  return interaction.update({
    embeds: [panel.embed],
    components: panel.rows,
  });
}

// ============================================================
// ========== معالجات تغيير الاسم ==========
// ============================================================

async function handleNameModalOpen(interaction) {
  const last = await getNameCooldown(interaction.user.id);
  const availableAt = getNameAvailableAt(last);

  if (availableAt) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '⏳ انتظر',
          description: `يمكنك تغيير اسمك ${discordTimestamp(availableAt, 'R')}.`,
          color: THEME.WARN,
        }),
      ],
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('name_change_modal')
    .setTitle('تغيير اسمك')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('new_name')
          .setLabel('الاسم الجديد (2-32 حرفًا)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(32)
      )
    );

  return interaction.showModal(modal);
}

async function handleNameModalSubmit(interaction) {
  const newName = interaction.fields
    .getTextInputValue('new_name')
    .trim();

  if (newName.length < 2 || newName.length > 32) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '⚠️ طول غير صالح',
          description: 'يجب أن يكون بين 2 و 32 حرفًا.',
          color: THEME.WARN,
        }),
      ],
    });
  }

  // فحص الكلمات المحظورة في الاسم
  const bannedWord = await containsBannedWord(
    interaction.guild.id,
    newName
  );

  if (bannedWord) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ اسم غير مسموح',
          description: 'الاسم يحتوي كلمة محظورة.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  try {
    await interaction.member.setNickname(
      newName,
      `KINGDOM • تغيير ذاتي`
    );

    await setNameCooldown(interaction.user.id);

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم تغيير اسمك',
          description: `اسمك الجديد: **${newName}**`,
          color: THEME.ORANGE,
          timestamp: true,
        }),
      ],
    });
  } catch (error) {
    reportError('name-change', error);

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ فشل',
          description:
            'لا يمكنني تغيير اسمك. تحقق من صلاحياتي وتسلسل الرتب.',
          color: THEME.ERROR,
        }),
      ],
    });
  }
}

// ============================================================
// ========== رتب الإشعارات القديمة ==========
// ============================================================

async function handleLegacyRoleToggle(interaction) {
  const roleMap = {
    role_game: 'Game Notice',
    role_event: 'Event Notice',
    role_ajr: 'Ajr Notice',
  };

  const roleName = roleMap[interaction.customId];

  const role = interaction.guild.roles.cache.find(
    item => item.name === roleName
  );

  if (!role) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ الرتبة غير موجودة',
          description: `رتبة **${roleName}** غير موجودة.`,
          color: THEME.ERROR,
        }),
      ],
    });
  }

  if (!canManageRole(interaction.guild, role)) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ لا يمكن إدارتها',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  const member = interaction.member;

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '🗑️ تم إزالة الرتبة',
            description: `${role}`,
            color: THEME.DARK,
          }),
        ],
      });
    }

    await member.roles.add(role);

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم إضافة الرتبة',
          description: `${role}`,
          color: THEME.ORANGE,
        }),
      ],
    });
  } catch (error) {
    reportError('legacy-role-toggle', error);

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '❌ فشل',
          description: error.message,
          color: THEME.ERROR,
        }),
      ],
    });
  }
}

// ============================================================
// ========== تفاعلات السجل والاقتراحات ==========
// ============================================================

// التفاعلات على رسائل الاقتراحات (Reactions).
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }

    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const suggestion = await Suggestion.findOne({
      guildId,
      $or: [
        { messageId: reaction.message.id },
        { yesMessageId: reaction.message.id },
        { noMessageId: reaction.message.id },
      ],
    });

    if (!suggestion) return;

    const userId = user.id;

    if (reaction.message.id === suggestion.yesMessageId) {
      if (reaction.emoji.name === '✅') {
        if (!suggestion.yesUsers.includes(userId)) {
          suggestion.yesUsers.push(userId);

          const noIndex = suggestion.noUsers.indexOf(userId);
          if (noIndex !== -1) {
            suggestion.noUsers.splice(noIndex, 1);
          }

          await suggestion.save();
        }
      } else {
        await reaction.users.remove(userId).catch(() => {});
      }
    }

    if (reaction.message.id === suggestion.noMessageId) {
      if (reaction.emoji.name === '❌') {
        if (!suggestion.noUsers.includes(userId)) {
          suggestion.noUsers.push(userId);

          const yesIndex = suggestion.yesUsers.indexOf(userId);
          if (yesIndex !== -1) {
            suggestion.yesUsers.splice(yesIndex, 1);
          }

          await suggestion.save();
        }
      } else {
        await reaction.users.remove(userId).catch(() => {});
      }
    }

    // دعم الاقتراحات القديمة (Reactions على الرسالة الأصلية)
    if (reaction.message.id === suggestion.messageId) {
      const emoji = reaction.emoji.name;

      if (emoji === '✅') {
        if (!suggestion.yesUsers.includes(userId)) {
          suggestion.yesUsers.push(userId);

          const noIndex = suggestion.noUsers.indexOf(userId);
          if (noIndex !== -1) {
            suggestion.noUsers.splice(noIndex, 1);
          }

          await suggestion.save();
        }
      } else if (emoji === '❌') {
        if (!suggestion.noUsers.includes(userId)) {
          suggestion.noUsers.push(userId);

          const yesIndex = suggestion.yesUsers.indexOf(userId);
          if (yesIndex !== -1) {
            suggestion.yesUsers.splice(yesIndex, 1);
          }

          await suggestion.save();
        }
      }
    }
  } catch (error) {
    reportError('reaction-add', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }

    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const suggestion = await Suggestion.findOne({
      guildId,
      $or: [
        { messageId: reaction.message.id },
        { yesMessageId: reaction.message.id },
        { noMessageId: reaction.message.id },
      ],
    });

    if (!suggestion) return;

    const userId = user.id;
    const emoji = reaction.emoji.name;

    if (emoji === '✅') {
      const index = suggestion.yesUsers.indexOf(userId);
      if (index !== -1) {
        suggestion.yesUsers.splice(index, 1);
        await suggestion.save();
      }
    } else if (emoji === '❌') {
      const index = suggestion.noUsers.indexOf(userId);
      if (index !== -1) {
        suggestion.noUsers.splice(index, 1);
        await suggestion.save();
      }
    }
  } catch (error) {
    reportError('reaction-remove', error);
  }
});

// ============================================================
// ========== مودال تعليق التذكرة (تسجيل منفصل) ==========
// ============================================================

client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;

  if (
    interaction.customId.startsWith('ticket_comment_modal_')
  ) {
    try {
      await handleTicketCommentModal(interaction);
    } catch (error) {
      reportError('ticket-comment-modal', error);
    }
  }
});

// ============================================================
// ========== أوامر المالك ==========
// ============================================================

async function handleOwnerCommands(context) {
  const { message, cmd, deleteAfter } = context;

  if (cmd !== 'إيقاف') return false;

  if (!OWNER_ID || message.author.id !== OWNER_ID) {
    const reply = await sendNotice(
      message,
      'هذا الأمر لمالك البوت فقط.',
      { color: THEME.ERROR }
    );
    deleteAfter(reply);
    return true;
  }

  await sendNotice(
    message,
    'جارٍ إيقاف البوت...',
    { title: '🛑 إيقاف' }
  );

  await shutdownBot('owner-command');

  return true;
}

// ============================================================
// ========== الإيقاف الآمن ==========
// ============================================================

let shuttingDown = false;

async function shutdownBot(reason = 'unknown') {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`🛑 بدء الإيقاف الآمن • السبب: ${reason}`);

  try {
    webServer.close();

    if (client.isReady()) {
      client.destroy();
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.log('✅ تم الإيقاف الآمن.');
  } catch (error) {
    reportError('shutdown', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdownBot('SIGINT'));
process.on('SIGTERM', () => shutdownBot('SIGTERM'));

process.on('unhandledRejection', error => {
  reportError('unhandledRejection', error);
});

process.on('uncaughtException', error => {
  reportError('uncaughtException', error);
});

// ============================================================
// ========== تشغيل البوت ==========
// ============================================================

async function start() {
  try {
    console.log('⏳ الاتصال بقاعدة البيانات...');

    await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log('✅ MongoDB متصل.');

    console.log('⏳ تسجيل دخول البوت...');

    await client.login(TOKEN);
  } catch (error) {
    reportError('startup', error);
    process.exit(1);
  }
}

start();
