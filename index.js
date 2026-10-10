// ============================================================
// KINGDOM BOT — ROYAL CRIMSON EDITION
// Discord.js v14 • MongoDB • CommonJS
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
  console.error('❌ DISCORD_TOKEN غير موجود.');
  process.exit(1);
}

if (!MONGO_URL) {
  console.error('❌ MONGO_URL غير موجود.');
  process.exit(1);
}

mongoose.set('bufferCommands', false);

// ============================================================
// ========== الهوية البصرية ==========
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
    console.warn('⚠️ الخط العربي غير موجود.');
  }
} catch (error) {
  console.warn('⚠️ تعذر تسجيل الخط العربي:', error.message);
}

const ARABIC_FONT = 'NotoArabic, Arial, sans-serif';

// ============================================================
// ========== نماذج MongoDB ==========
// ============================================================

const ConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, unique: true, required: true },
    logChannel: String,
    welcomeChannel: String,
    welcomeMessage: { type: String, default: 'أهلاً بك في السيرفر! 🎉' },
    welcomeTitle: { type: String, default: '👑 مرحبًا بك في المملكة' },
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
    ticketRatingEnabled: { type: Boolean, default: true },
    ticketRatingChannel: String,
    ticketLogChannel: String,
    pigeonChannel: String,
    pigeonTitle: { type: String, default: '🕊️ حمام الزاجل' },
    pigeonDescription: {
      type: String,
      default: 'رسالة صغيرة قد تصنع يومًا أجمل. اضغط على الزر لكتابة زاجلك.',
    },
    pigeonImage: String,
    applyPanelTitle: { type: String, default: '📋 انضم إلى فريق المملكة' },
    applyPanelDescription: {
      type: String,
      default: 'اختَر القسم المناسب لمهاراتك، ثم املأ نموذج التقديم بعناية.',
    },
    applyPanelImage: String,
    applyPanelChannel: String,
    applyResultLog: String,
    protectionEnabled: { type: Boolean, default: false },
    antiSpamEnabled: { type: Boolean, default: false },
    antiSpamMax: { type: Number, default: 5, min: 2, max: 20 },
    antiSpamSeconds: { type: Number, default: 5, min: 2, max: 60 },
    antiLinkEnabled: { type: Boolean, default: false },
    antiEveryoneEnabled: { type: Boolean, default: false },
    protectionAction: {
      type: String,
      enum: ['delete', 'delete_warn', 'delete_mute', 'delete_warn_mute'],
      default: 'delete_warn',
    },
    protectionBypassRoles: { type: [String], default: [] },
    suggestionsChannel: String,
  },
  { timestamps: true }
);

const Config = mongoose.model('Config', ConfigSchema);

const BannedWordSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  word: { type: String, required: true },
  addedBy: String,
  createdAt: { type: Date, default: Date.now },
});

BannedWordSchema.index({ guildId: 1, word: 1 }, { unique: true });
const BannedWord = mongoose.model('BannedWord', BannedWordSchema);

const UserSchema = new mongoose.Schema(
  {
    guildId: String,
    userId: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    lastXpAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const User = mongoose.model('User', UserSchema);

const WarnSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  reason: String,
  moderator: String,
  date: { type: Date, default: Date.now },
});

WarnSchema.index({ guildId: 1, userId: 1, date: -1 });
const Warn = mongoose.model('Warn', WarnSchema);

const TicketSettingsSchema = new mongoose.Schema({
  guildId: { type: String, unique: true, required: true },
  sections: [
    {
      name: String,
      roleId: String,
      emoji: { type: String, default: '📌' },
    },
  ],
  text: {
    type: String,
    default:
      'أهلًا بك في مركز الدعم.\n' +
      'اختَر القسم المناسب من القائمة، وسنفتح لك تذكرة خاصة.\n\n' +
      '> اشرح طلبك بوضوح، وانتظر رد الفريق دون تكرار المنشن.',
  },
  image: { type: String, default: null },
  categoryId: { type: String, default: null },
});

const TicketSettings = mongoose.model('TicketSettings', TicketSettingsSchema);

const TicketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  sectionName: String,
  supportRoleId: { type: String, default: null },
  claimedBy: String,
  claimedAt: Date,
  addedMembers: { type: [String], default: [] },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closed: { type: Boolean, default: false },
  closedBy: String,
  closedAt: Date,
  deletedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

TicketSchema.index({ guildId: 1, ownerId: 1, status: 1 });
const Ticket = mongoose.model('Ticket', TicketSchema);

const TicketRatingSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  closedBy: String,
  section: String,
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  ticketId: String,
  ratingLogMessageId: String,
  createdAt: { type: Date, default: Date.now },
});

TicketRatingSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });
const TicketRating = mongoose.model('TicketRating', TicketRatingSchema);

const SelfRoleSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    roleId: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    emoji: { type: String, default: '🎭' },
    image: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SelfRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });
const SelfRole = mongoose.model('SelfRole', SelfRoleSchema);

const AutoLineSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  text: String,
  image: String,
  enabled: { type: Boolean, default: false },
});

AutoLineSchema.index({ guildId: 1, channelId: 1 }, { unique: true });
const AutoLine = mongoose.model('AutoLine', AutoLineSchema);

const AutoReplySchema = new mongoose.Schema({
  guildId: String,
  keyword: String,
  reply: String,
  image: String,
});

AutoReplySchema.index({ guildId: 1, keyword: 1 }, { unique: true });
const AutoReply = mongoose.model('AutoReply', AutoReplySchema);

const LevelRoleSchema = new mongoose.Schema({
  guildId: String,
  level: Number,
  roleId: String,
});

LevelRoleSchema.index({ guildId: 1, level: 1 }, { unique: true });
const LevelRole = mongoose.model('LevelRole', LevelRoleSchema);

const ControllerSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
});

ControllerSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const Controller = mongoose.model('Controller', ControllerSchema);

const NameCooldownSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  timestamp: { type: Date, default: Date.now },
});

const NameCooldown = mongoose.model('NameCooldown', NameCooldownSchema);

const PigeonSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  messageId: String,
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now },
});

PigeonSchema.index({ guildId: 1, createdAt: -1 });
PigeonSchema.index({ guildId: 1, messageId: 1 });
PigeonSchema.index({ guildId: 1, senderId: 1, createdAt: -1 });
PigeonSchema.index({ guildId: 1, recipientId: 1, createdAt: -1 });
const Pigeon = mongoose.model('Pigeon', PigeonSchema);

const ApplicationSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  answers: [{ question: String, answer: String }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  reviewedBy: String,
  reviewedAt: Date,
  messageId: String,
  createdAt: { type: Date, default: Date.now },
});

ApplicationSchema.index({ guildId: 1, userId: 1, type: 1, createdAt: -1 });
const Application = mongoose.model('Application', ApplicationSchema);

const ApplySectionSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    emoji: { type: String, default: '📋' },
    image: { type: String, default: null },
    roleId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    questions: [
      {
        label: { type: String, required: true },
        style: {
          type: String,
          enum: ['SHORT', 'PARAGRAPH'],
          default: 'SHORT',
        },
        required: { type: Boolean, default: true },
      },
    ],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ApplySectionSchema.index({ guildId: 1, name: 1 }, { unique: true });
const ApplySection = mongoose.model('ApplySection', ApplySectionSchema);

const SpamTrackerSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    messages: [{ content: String, timestamp: Date }],
  },
  { timestamps: true }
);

SpamTrackerSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const SpamTracker = mongoose.model('SpamTracker', SpamTrackerSchema);

const SuggestionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  content: { type: String, required: true },
  messageId: String,
  threadId: String,
  yesMessageId: String,
  noMessageId: String,
  yesCount: { type: Number, default: 0 },
  noCount: { type: Number, default: 0 },
  yesUsers: { type: [String], default: [] },
  noUsers: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

SuggestionSchema.index({ guildId: 1, createdAt: -1 });
SuggestionSchema.index({ guildId: 1, messageId: 1 });
const Suggestion = mongoose.model('Suggestion', SuggestionSchema);

const ChannelLockSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  previousSendMessages: {
    type: String,
    enum: ['allow', 'deny', 'inherit'],
    required: true,
  },
  lockedBy: String,
  createdAt: { type: Date, default: Date.now },
});

ChannelLockSchema.index({ guildId: 1, channelId: 1 }, { unique: true });
const ChannelLock = mongoose.model('ChannelLock', ChannelLockSchema);

// ============================================================
// ========== أدوات عامة ==========
// ============================================================

function truncate(value, maxLength, suffix = '…') {
  const text = String(value ?? '');
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - suffix.length)) + suffix;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  if (!/^\d+$/.test(String(value ?? '').trim())) return null;
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
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
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
      if (error.code !== 10008) {
        reportError('scheduled-delete', error);
      }
    });
  }, delay);
  timer.unref?.();
}

// ============================================================
// ========== قفل تسلسلي ==========
// ============================================================

const operationLocks = new Map();

async function withLock(key, task) {
  const previous = operationLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise(resolve => {
    release = resolve;
  });
  const tail = previous.catch(() => {}).then(() => current);
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
// ========== أدوات Embeds ==========
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
    embed.setDescription(truncate(description, LIMITS.EMBED_DESCRIPTION));
  }

  if (footer) {
    embed.setFooter({ text: truncate(footer, 2048) });
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
        (total, item) => total + item.name.length + item.value.length,
        0
      );

    const name = truncate(field.name || 'معلومة', LIMITS.EMBED_FIELD_NAME);
    const remaining = LIMITS.EMBED_TOTAL - usedCharacters - name.length;
    if (remaining < 1) break;

    const value = truncate(
      field.value || '—',
      Math.min(LIMITS.EMBED_FIELD_VALUE, remaining)
    );

    embed.addFields({ name, value, inline: Boolean(field.inline) });
  }
  return embed;
}

function createButton(customId, label, emoji = null, style = BTN.ALT) {
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
  { title = null, color = THEME.ORANGE, reply = true } = {}
) {
  const payload = {
    embeds: [createEmbed({ title, description: text, color })],
    allowedMentions: { parse: [], repliedUser: false },
  };

  return reply ? message.reply(payload) : message.channel.send(payload);
}

// ============================================================
// ========== نماذج الإنشاء الآمن ==========
// ============================================================

async function findOrCreateDocument(Model, filter) {
  try {
    return await Model.findOneAndUpdate(
      filter,
      { $setOnInsert: filter },
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
  delete changes._id;
  delete changes.guildId;
  delete changes.__v;

  return Config.findOneAndUpdate(
    { guildId },
    { $set: changes, $setOnInsert: { guildId } },
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
      $set: {
        sections: data.sections,
        text: data.text,
        image: data.image,
        categoryId: data.categoryId || null,
      },
      $setOnInsert: { guildId },
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
    { $set: data, $setOnInsert: { guildId, channelId } },
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
      allowedMentions: { parse: [] },
    });
    return true;
  }

  if (auto.text) {
    await channel.send({
      content: truncate(auto.text, 2000),
      allowedMentions: { parse: [] },
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

async function addAutoReply(guildId, keyword, reply, image = null) {
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
          $regex: new RegExp(`^${escapeRegex(cleanKeyword)}$`, 'i'),
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
      $regex: new RegExp(`^${escapeRegex(String(keyword).trim())}$`, 'i'),
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

async function addWarn(guildId, userId, reason, moderator) {
  await Warn.create({ guildId, userId, reason, moderator });
  return Warn.countDocuments({ guildId, userId });
}

async function clearWarns(guildId, userId) {
  return Warn.deleteMany({ guildId, userId });
}

// ============================================================
// ========== المتحكمون والصلاحيات ==========
// ============================================================

async function isController(userId, guildId) {
  if (OWNER_ID && userId === OWNER_ID) return true;
  return Boolean(await Controller.exists({ guildId, userId }));
}

async function addController(guildId, userId) {
  const result = await Controller.updateOne(
    { guildId, userId },
    { $setOnInsert: { guildId, userId } },
    { upsert: true, runValidators: true }
  );
  return result.upsertedCount > 0;
}

async function removeController(guildId, userId) {
  const result = await Controller.deleteOne({ guildId, userId });
  return result.deletedCount > 0;
}

async function getControllers(guildId) {
  const documents = await Controller.find({ guildId })
    .select('userId')
    .lean();
  return documents.map(document => document.userId);
}

async function hasPermission(member, guildId) {
  if (!member || !guildId) return false;
  const userId = member.id || member.user?.id;
  if (!userId) return false;
  if (OWNER_ID && userId === OWNER_ID) return true;
  return isController(userId, guildId);
}

async function resolveInteractionMember(interaction) {
  if (!interaction.guild) return null;
  if (interaction.member?.roles?.cache) return interaction.member;
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
      me.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
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
  if (await isController(target.id, guildId)) return false;
  if (actor.id === OWNER_ID || actor.id === target.guild.ownerId) {
    return true;
  }
  return actor.roles.highest.position > target.roles.highest.position;
}

// ============================================================
// ========== تغيير الاسم ==========
// ============================================================

async function setNameCooldown(userId) {
  return NameCooldown.findOneAndUpdate(
    { userId },
    { $set: { timestamp: new Date() }, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true }
  );
}

async function getNameCooldown(userId) {
  const cooldown = await NameCooldown.findOne({ userId });
  return cooldown?.timestamp || null;
}

function getNameAvailableAt(lastChange) {
  if (!(lastChange instanceof Date)) return null;
  const availableAt = lastChange.getTime() + LIMITS.NAME_COOLDOWN;
  return availableAt > Date.now() ? new Date(availableAt) : null;
}

// ============================================================
// ========== الصور وأسماء القنوات ==========
// ============================================================

function getGeneralImage(guild, config) {
  const configured =
    safeHttpUrl(config?.generalImage) || safeHttpUrl(config?.bannerImage);
  if (configured) return configured;
  return guild?.iconURL({ extension: 'png', size: 1024 }) || null;
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
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'ticket'
  );
}

// ============================================================
// ========== التقديمات ==========
// ============================================================

async function getApplySections(guildId) {
  return ApplySection.find({ guildId }).sort({ order: 1, createdAt: 1 });
}

async function getApplySectionByName(guildId, name) {
  return ApplySection.findOne({ guildId, name });
}

async function addApplySection(guildId, name, emoji = '📋') {
  const cleanName = String(name || '').trim();
  if (!cleanName || cleanName.length > LIMITS.SECTION_NAME) {
    throw new Error('اسم القسم يجب أن يكون بين 1 و50 حرفًا.');
  }
  if (
    ['APPLY_RESET', 'TICKET_RESET', 'SELF_ROLES_RESET'].includes(cleanName)
  ) {
    throw new Error('هذا الاسم محجوز للنظام.');
  }

  return withLock(`apply-sections:${guildId}`, async () => {
    const existing = await ApplySection.exists({ guildId, name: cleanName });
    if (existing) return false;

    const maxOrder = await ApplySection.findOne({ guildId }).sort({ order: -1 });

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
  const result = await ApplySection.deleteOne({ guildId, name });
  return result.deletedCount > 0;
}

async function getApplySectionById(guildId, sectionId) {
  if (!mongoose.isValidObjectId(sectionId)) return null;
  return ApplySection.findOne({ _id: sectionId, guildId });
}

// ============================================================
// ========== الكلمات المحظورة ==========
// ============================================================

async function getBannedWords(guildId) {
  return BannedWord.find({ guildId }).sort({ createdAt: -1 });
}

async function addBannedWord(guildId, word, addedBy = null) {
  const normalized = normalizeText(word);
  if (!normalized || normalized.length > 100) {
    throw new Error('الكلمة يجب أن تكون بين 1 و100 حرف.');
  }
  try {
    const result = await BannedWord.updateOne(
      { guildId, word: normalized },
      { $setOnInsert: { guildId, word: normalized, addedBy } },
      { upsert: true, runValidators: true }
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
    if (now - record.lastSeen > 120000) spamMemory.delete(key);
  }
  for (const [key, expiresAt] of pigeonCooldowns) {
    if (expiresAt <= now) pigeonCooldowns.delete(key);
  }
  for (const [key, expiresAt] of autoReplyCooldowns) {
    if (expiresAt <= now) autoReplyCooldowns.delete(key);
  }
}, 60000);

memoryCleanupTimer.unref();

async function checkSpam(guildId, userId, content, max, seconds) {
  const threshold = Math.min(20, Math.max(2, Number(max) || 5));
  const windowMilliseconds =
    Math.min(60, Math.max(2, Number(seconds) || 5)) * 1000;
  const key = `${guildId}:${userId}`;
  const now = Date.now();

  const tracker = spamMemory.get(key) || { entries: [], lastSeen: now };

  tracker.entries = tracker.entries.filter(entry => {
    return now - entry.timestamp < windowMilliseconds;
  });

  const normalized = normalizeText(truncate(content, 4000));
  tracker.entries.push({ content: normalized, timestamp: now });
  tracker.entries = tracker.entries.slice(-100);
  tracker.lastSeen = now;

  spamMemory.set(key, tracker);

  const repeatedMessages = tracker.entries.filter(entry => {
    return entry.content === normalized;
  }).length;

  return repeatedMessages >= threshold;
}

function containsLink(content) {
  return /(?:https?:\/\/|www\.|discord(?:app)?\.com\/invite\/|discord\.gg\/)\S+/i.test(
    String(content || '')
  );
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

  if (action === 'delete_warn' || action === 'delete_warn_mute') {
    try {
      await member.send({
        embeds: [
          createEmbed({
            title: '⚠️ تنبيه من إدارة المملكة',
            description:
              `**السيرفر:** ${member.guild.name}\n` +
              `**السبب:** ${reason}\n\n` +
              '> نرجو الالتزام بقوانين المجتمع.',
            color: THEME.WARN,
            footer: 'KINGDOM • SECURITY CENTER',
            timestamp: true,
          }),
        ],
        allowedMentions: { parse: [] },
      });
      dmSent = true;
    } catch {
      dmSent = false;
    }
  }

  if (action === 'delete_mute' || action === 'delete_warn_mute') {
    try {
      const freshMember = await member.guild.members.fetch(member.id);
      const botMember =
        member.guild.members.me || (await member.guild.members.fetchMe());

      if (
        botMember.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        ) &&
        freshMember.moderatable
      ) {
        const remainingTimeout = Math.max(
          0,
          (freshMember.communicationDisabledUntilTimestamp || 0) - Date.now()
        );
        const duration = Math.min(
          28 * 24 * 60 * 60 * 1000,
          Math.max(LIMITS.PROTECTION_TIMEOUT, remainingTimeout)
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

  return { deleted, dmSent, muted };
}

// ============================================================
// ========== الإيموجي ==========
// ============================================================

function isValidEmoji(emoji) {
  if (!emoji || typeof emoji !== 'string') return false;
  if (/^<a?:\w{2,32}:\d{17,20}>$/.test(emoji)) return true;
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

  const custom = emoji.match(/^<(a?):(\w{2,32}):(\d{17,20})>$/);
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
  return SelfRole.find({ guildId }).sort({ order: 1, createdAt: 1 });
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
    const existing = await SelfRole.findOne({ guildId, roleId });

    if (existing) {
      existing.label = label;
      existing.emoji = finalEmoji;
      existing.image = image;
      existing.description = description;
      await existing.save();
      return false;
    }

    const maxOrder = await SelfRole.findOne({ guildId }).sort({ order: -1 });

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
  const result = await SelfRole.deleteOne({ guildId, roleId });
  return result.deletedCount > 0;
}

async function updateSelfRole(guildId, roleId, data) {
  const changes = { ...data };
  delete changes._id;
  delete changes.guildId;
  delete changes.roleId;
  delete changes.__v;

  if (changes.emoji !== undefined && !parseEmoji(changes.emoji)) {
    changes.emoji = '🎭';
  }

  return SelfRole.findOneAndUpdate(
    { guildId, roleId },
    { $set: changes },
    { new: true, runValidators: true }
  );
}

// ============================================================
// ========== البحث عن عضو ==========
// ============================================================

async function findMemberByName(guild, query) {
  if (!guild || !query) return null;

  const raw = String(query).trim();
  const mention = raw.match(/^<@!?(\d{17,20})>$/);
  const userId = mention?.[1] || (isSnowflake(raw) ? raw : null);

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

  let searched;
  try {
    searched = await guild.members.search({ query: cleaned, limit: 100 });
  } catch {
    searched = null;
  }

  const candidates = new Map();

  for (const member of guild.members.cache.values()) {
    if (memberNames(member).some(name => name.includes(lower))) {
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

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return null;

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
  allowedMentions: { parse: [], repliedUser: false },
});

client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👑 KINGDOM ONLINE • ${client.user.tag}`);
  console.log(`🏰 السيرفرات: ${client.guilds.cache.size}`);
  if (OWNER_ID) console.log(`👑 مالك البوت: ${OWNER_ID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  client.user.setPresence({
    status: 'online',
    activities: [
      { name: 'The Kingdom Never Falls.', type: ActivityType.Watching },
    ],
  });
});

client.on('error', error => reportError('discord-client', error));
client.on('warn', warning => {
  console.warn('[Discord warning]', truncate(warning, 500));
});

mongoose.connection.on('error', error => reportError('mongodb', error));
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

webServer.on('error', error => reportError('web-server', error));

// ============================================================
// ========== أدوات الصفحات ==========
// ============================================================

function paginateItems(items, requestedPage = 0, pageSize = 24) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const numericPage = Number(requestedPage);
  const page = Math.min(
    pageCount - 1,
    Math.max(0, Number.isInteger(numericPage) ? numericPage : 0)
  );

  return {
    page,
    pageCount,
    total: items.length,
    items: items.slice(page * pageSize, (page + 1) * pageSize),
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

// ============================================================
// ========== لوحة الحماية ==========
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
      value: `${config.protectionBypassRoles?.length || 0} رتبة`,
      inline: true,
    },
    {
      name: '⚖️ إجراء المخالفة',
      value:
        actionLabels[config.protectionAction] || actionLabels.delete_warn,
      inline: true,
    },
  ]);

  const row1 = new ActionRowBuilder().addComponents(
    createButton(
      'prot_toggle_main',
      config.protectionEnabled ? 'تعطيل الدرع' : 'تفعيل الدرع',
      '🛡️',
      BTN.MAIN
    ),
    createButton('prot_toggle_spam', 'التكرار', '🔁'),
    createButton('prot_toggle_link', 'الروابط', '🔗'),
    createButton('prot_toggle_everyone', 'المنشن', '📢')
  );

  const row2 = new ActionRowBuilder().addComponents(
    createButton('prot_banned_words', 'الكلمات', '🚫'),
    createButton('prot_action', 'الإجراءات', '⚖️'),
    createButton('prot_bypass_roles', 'الاستثناءات', '🎭'),
    createButton('prot_settings', 'الإعدادات', '⚙️'),
    createButton('prot_refresh', 'تحديث', '🔄')
  );

  return { embed, rows: [row1, row2] };
}

// ============================================================
// ========== لوحة الرتب الذاتية ==========
// ============================================================

async function buildSelfRolesPanel(guildId, guild, config, requestedPage = 0) {
  const selfRoles = await getSelfRoles(guildId);
  if (!selfRoles.length) return null;

  const pagination = paginateItems(selfRoles, requestedPage, 24);
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

  const options = pagination.items.map(role => ({
    label: truncate(role.label || 'رتبة', LIMITS.SELECT_LABEL),
    value: role.roleId,
    emoji: parseEmoji(role.emoji) || '🎭',
    description: truncate(
      role.description || 'اضغط للإضافة أو الإزالة',
      100
    ),
  }));

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
// ========== لوحة الزاجل ==========
// ============================================================

async function buildPigeonPanel(config) {
  const embed = createEmbed({
    title: config.pigeonTitle || '🕊️ البريد السري',
    description:
      (config.pigeonDescription ||
        'رسالة صغيرة قد تصنع يومًا أجمل. اكتب زاجلك من هنا.') +
      '\n\n' +
      '> 🔒 هوية المرسل مخفية عن المستلم، ' +
      'لكنها محفوظة وقابلة للاطلاع من المتحكمين.\n' +
      '> يُمنع الإزعاج والتهديد ومشاركة المعلومات الخاصة.',
    image: config.pigeonImage,
    footer: 'KINGDOM • PRIVATE MAIL',
  });

  const row = new ActionRowBuilder().addComponents(
    createButton('pigeon_send', 'اكتب زاجلك', '🕊️', BTN.MAIN),
    createButton('pigeon_myhistory', 'سجل الرسائل', '📬')
  );

  return { embed, row, rows: [row] };
}

// ============================================================
// ========== لوحة التقديمات ==========
// ============================================================

async function buildApplyPanel(guildId, config, requestedPage = 0) {
  const sections = await getApplySections(guildId);

  const embed = createEmbed({
    title: config.applyPanelTitle || '📋 KINGDOM | انضم إلى الفريق',
    description:
      (config.applyPanelDescription ||
        'موهبتك تستحق فرصة. اختَر القسم المناسب لمهاراتك.') +
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

  const pagination = paginateItems(sections, requestedPage, 24);

  embed.setFooter({
    text:
      'KINGDOM • RECRUITMENT' +
      ` • ${sections.length} قسم` +
      ` • صفحة ${pagination.page + 1}/${pagination.pageCount}`,
  });

  const options = pagination.items.map(section => ({
    label: truncate(section.name, LIMITS.SELECT_LABEL),
    value: sectionOptionValue(section.name),
    emoji: parseEmoji(section.emoji) || '📋',
    description: truncate(
      `${section.questions?.length || 0} أسئلة` +
        (section.roleId ? ' • رتبة عند القبول' : ' • مراجعة إدارية'),
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

async function buildApplyAdminPanel(guildId, requestedPage = 0) {
  const sections = await getApplySections(guildId);
  const pagination = paginateItems(sections, requestedPage, 24);

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
    ? pagination.items
        .map((section, index) => {
          const position = pagination.page * 24 + index + 1;
          return (
            `\`${position}.\` ${section.emoji || '📋'} ` +
            `**${section.name}** — ` +
            `${section.questions?.length || 0}/5 أسئلة`
          );
        })
        .join('\n')
    : 'لا توجد أقسام بعد. أضف أول قسم من القائمة.';

  addSafeFields(embed, [
    { name: '📌 الأقسام في هذه الصفحة', value: sectionList },
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
  const role = section.roleId ? guild.roles.cache.get(section.roleId) : null;
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
      value: logChannel ? logChannel.toString() : 'غير محددة',
      inline: true,
    },
    {
      name: '📋 أسئلة النموذج',
      value: section.questions?.length
        ? section.questions
            .map(
              (q, i) =>
                `\`${i + 1}.\` ${q.label}\n` +
                `↳ ${
                  q.style === 'PARAGRAPH' ? 'إجابة مطولة' : 'إجابة قصيرة'
                } • ${q.required !== false ? 'إلزامي' : 'اختياري'}`
            )
            .join('\n\n')
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
    createButton(`apply_section_img_id:${sectionId}`, 'صورة القسم', '🖼️'),
    createButton(`apply_section_role_id:${sectionId}`, 'رتبة القبول', '🎭'),
    createButton(`apply_section_log_id:${sectionId}`, 'قناة المراجعة', '📥')
  );

  const row3 = new ActionRowBuilder().addComponents(
    createButton(
      `apply_section_delete_id:${sectionId}`,
      'حذف القسم',
      '🗑️',
      BTN.MAIN
    ),
    createButton('apply_admin_back', 'رجوع للأقسام', '↩️')
  );

  return { embed, rows: [row1, row2, row3] };
}

// ============================================================
// ========== لوحة التذاكر ==========
// ============================================================

async function buildTicketPanel(guild, config, requestedPage = 0) {
  const settings = await getTicketSettings(guild.id);

  const embed = createEmbed({
    title: '🎫 KINGDOM | مركز الدعم',
    description:
      settings.text || 'اختَر القسم المناسب لطلبك، وسنفتح لك تذكرة خاصة.',
    image: config.ticketPanelImage || settings.image || null,
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
    return { embed, row: null, rows: [], empty: true, page: 0 };
  }

  const pagination = paginateItems(settings.sections, requestedPage, 24);

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
    description: truncate(`فتح تذكرة في قسم ${section.name}`, 100),
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
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
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
      ])
  );
}

function buildTicketCloseRow() {
  return new ActionRowBuilder().addComponents(
    createButton('close_ticket', 'إغلاق التذكرة', '🔒', BTN.MAIN)
  );
}

function buildTicketWelcomeEmbed(guild, ticketData, config) {
  return addSafeFields(
    createEmbed({
      title: `🎫 تذكرة | ${ticketData.sectionName}`,
      description:
        `أهلًا <@${ticketData.ownerId}>، وصلت إلى مركز الدعم.\n\n` +
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

async function buildTicketPermissionOverwrites(guild, member, section) {
  const access = new Map();

  access.set(guild.id, {
    id: guild.id,
    deny: [PermissionsBitField.Flags.ViewChannel],
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

  const controllerIds = new Set(await getControllers(guild.id));
  if (OWNER_ID) controllerIds.add(OWNER_ID);

  for (const userId of controllerIds) {
    if (!isSnowflake(userId) || access.has(userId)) continue;
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

  if (supportRole && supportRole.id !== guild.id) {
    access.set(supportRole.id, {
      id: supportRole.id,
      allow: participantPermissions,
    });
  }

  return [...access.values()];
}

// ============================================================
// ========== رد آمن للتفاعلات ==========
// ============================================================

async function respondToInteraction(interaction, payload, { ephemeral = true } = {}) {
  const body = typeof payload === 'string' ? { content: payload } : { ...payload };
  body.allowedMentions ??= { parse: [], repliedUser: false };

  if (interaction.deferred) {
    delete body.ephemeral;
    return interaction.editReply(body);
  }

  if (interaction.replied) {
    return interaction.followUp({ ...body, ephemeral });
  }

  return interaction.reply({ ...body, ephemeral });
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

  if (!member || !(await hasPermission(member, interaction.guild.id))) {
    await respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '🔒 إجراء إداري',
          description: 'هذه الميزة متاحة للمتحكمين فقط.',
          color: THEME.ERROR,
        }),
      ],
    });
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
    if (logQueue.length > 0) {
      void processLogQueue();
    }
  }
}

function logToChannel(guildId, data) {
  if (!guildId) return false;

  if (logQueue.length >= MAX_LOG_QUEUE_SIZE) {
    droppedLogTasks += 1;
    if (droppedLogTasks === 1 || droppedLogTasks % 50 === 0) {
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
      (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return;

    const channel = await guild.channels
      .fetch(config.logChannel)
      .catch(() => null);

    if (!channel || typeof channel.send !== 'function') {
      console.warn(`⚠️ قناة اللوق غير متاحة للسيرفر ${guildId}.`);
      return;
    }

    const botMember =
      guild.members.me || (await guild.members.fetchMe());

    const permissions = channel.permissionsFor(botMember);

    if (
      !permissions?.has([
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks,
      ])
    ) {
      console.warn(`⚠️ صلاحيات إرسال اللوق غير كافية في ${channel.id}.`);
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
      allowedMentions: { parse: [] },
    });
  });

  void processLogQueue();
  return true;
}

// ============================================================
// ========== تحميل الصور الآمن ==========
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
  if (!safeURL) throw new Error('رابط الصورة غير صالح.');

  const url = new URL(safeURL);
  if (
    url.protocol !== 'https:' ||
    !CANVAS_IMAGE_HOSTS.has(url.hostname) ||
    url.port
  ) {
    throw new Error('مصدر الصورة غير مسموح.');
  }

  const response = await fetch(url.href, {
    signal: AbortSignal.timeout(7000),
    redirect: 'error',
  });

  if (!response.ok) throw new Error(`Image HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    await response.body?.cancel().catch(() => {});
    throw new Error('الرابط لا يعيد ملف صورة.');
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error('حجم الصورة يتجاوز الحد المسموح.');
  }

  if (!response.body) throw new Error('استجابة الصورة فارغة.');

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

function drawRoundedRectangle(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function drawDefaultBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
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
  const scale = Math.max(width / image.width, height / image.height);
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
    if (ctx.measureText(text).width <= maxWidth) return text;
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

  return shortened === text ? text : `${shortened}…`;
}

// ============================================================
// ========== بطاقة الترحيب ==========
// ============================================================

async function generateWelcomeImage(member, memberCount, background = null) {
  const width = 1200;
  const height = 600;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  drawDefaultBackground(ctx, width, height);

  if (background && /^#[0-9a-f]{6}$/i.test(background)) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  } else if (background) {
    try {
      const backgroundImage = await loadTrustedCanvasImage(background);
      drawCoverImage(ctx, backgroundImage, width, height);
    } catch (error) {
      reportError('welcome-background', error);
    }
  }

  ctx.fillStyle = 'rgba(5,7,14,0.60)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = -height; x < width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }

  drawRoundedRectangle(ctx, 36, 36, width - 72, height - 72, 28);
  ctx.fillStyle = 'rgba(16,16,24,0.87)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,38,70,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawRoundedRectangle(ctx, 1138, 90, 5, 420, 2);
  ctx.fillStyle = THEME.ORANGE_HEX;
  ctx.fill();

  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 23px Arial';
  ctx.fillStyle = '#ff526c';
  ctx.fillText('K I N G D O M', 1080, 110);

  const centerX = 240;
  const centerY = 294;
  const radius = 126;

  ctx.save();
  ctx.shadowColor = THEME.ORANGE_HEX;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = THEME.ORANGE_HEX;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#24212d';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  try {
    const avatarURL = member.user.displayAvatarURL({
      extension: 'png',
      size: 256,
    });
    const avatar = await loadTrustedCanvasImage(avatarURL, 2 * 1024 * 1024);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
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

  ctx.textAlign = 'right';

  const welcomeTitle = fitCanvasText(ctx, 'مرحبًا بك في المملكة', 650, {
    maximumSize: 50,
    minimumSize: 32,
  });
  ctx.fillStyle = '#ffffff';
  ctx.fillText(welcomeTitle, 1080, 220);

  const displayName = truncate(
    member.displayName || member.user.username,
    100
  );
  const fittedName = fitCanvasText(ctx, displayName, 650, {
    maximumSize: 44,
    minimumSize: 18,
  });
  ctx.fillStyle = '#ff526c';
  ctx.fillText(fittedName, 1080, 304);

  ctx.font = `26px ${ARABIC_FONT}`;
  ctx.fillStyle = '#bcbccc';
  ctx.fillText('مكانك بيننا • بداية حكاية جديدة', 1080, 366);

  drawRoundedRectangle(ctx, 792, 405, 288, 66, 16);
  ctx.fillStyle = '#24212d';
  ctx.fill();

  ctx.font = `24px ${ARABIC_FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`العضو #${memberCount}`, 1056, 448);

  ctx.textAlign = 'left';
  ctx.font = '18px Arial';
  ctx.fillStyle = '#aaaaba';
  ctx.fillText('THE KINGDOM NEVER FALLS', 94, 522);

  return canvas.toBuffer('image/png');
}

function formatWelcomeMessage(template, member) {
  const text = String(template || 'أهلًا {member} في {server}!');
  return text.replace(/\{(member|username|server|count)\}/g, (match, key) => {
    const replacements = {
      member: `<@${member.id}>`,
      username: member.user.username,
      server: member.guild.name,
      count: String(member.guild.memberCount),
    };
    return replacements[key] ?? match;
  });
}

async function assignJoinRole(member, config) {
  if (!config.joinRole) return false;

  const role = await member.guild.roles
    .fetch(config.joinRole)
    .catch(() => null);

  if (!role) {
    console.warn(`⚠️ رتبة الدخول غير موجودة في ${member.guild.id}.`);
    return false;
  }

  const botMember =
    member.guild.members.me || (await member.guild.members.fetchMe());

  if (
    !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
    role.managed ||
    role.id === member.guild.id ||
    role.position >= botMember.roles.highest.position
  ) {
    console.warn(
      `⚠️ لا يمكن منح رتبة الدخول ${role.id}: تحقق من الصلاحيات.`
    );
    return false;
  }

  if (member.roles.cache.has(role.id)) return true;

  await member.roles.add(role, 'KINGDOM • رتبة دخول تلقائية');
  return true;
}

// ============================================================
// ========== أحداث الأعضاء ==========
// ============================================================

client.on('guildMemberAdd', async member => {
  try {
    const config = await getGuildConfig(member.guild.id);

    try {
      await assignJoinRole(member, config);
    } catch (error) {
      reportError('join-role', error);
    }

    logToChannel(member.guild.id, {
      title: '👋 عضو جديد في المملكة',
      color: THEME.ORANGE,
      description:
        `**المستخدم:** ${member.user.tag}\n` +
        `**المعرف:** \`${member.id}\`\n` +
        `**تاريخ الحساب:** ${discordTimestamp(
          member.user.createdAt,
          'F'
        )}`,
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

    if (!channel || typeof channel.send !== 'function') {
      console.warn(`⚠️ قناة الترحيب غير متاحة في ${member.guild.id}.`);
      return;
    }

    const embed = createEmbed({
      title: config.welcomeTitle || '👑 مرحبًا بك في المملكة',
      description: formatWelcomeMessage(config.welcomeMessage, member),
      thumbnail:
        config.welcomeImage ||
        member.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: `KINGDOM • أنت العضو ${member.guild.memberCount}`,
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
      allowedMentions: { parse: [], users: [member.id] },
    };

    try {
      const imageBuffer = await generateWelcomeImage(
        member,
        member.guild.memberCount,
        config.welcomeBackground
      );
      embed.setImage('attachment://welcome.png');
      payload.files = [{ attachment: imageBuffer, name: 'welcome.png' }];
    } catch (error) {
      reportError('welcome-render', error);
    }

    await channel.send(payload);
  } catch (error) {
    reportError('guildMemberAdd', error);
  }
});

client.on('guildMemberRemove', async member => {
  try {
    const username =
      member.user?.tag || member.user?.username || 'مستخدم غير معروف';

    logToChannel(member.guild.id, {
      title: '🚪 عضو غادر المملكة',
      color: THEME.DARK,
      description: `**المستخدم:** ${username}\n**المعرف:** \`${member.id}\``,
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
// ========== سجلات الرسائل ==========
// ============================================================

client.on('messageDelete', async message => {
  if (!message.guild || message.author?.bot) return;

  try {
    const content = message.content
      ? truncate(message.content, 3000)
      : 'غير متاح في الكاش.';

    const attachmentList = message.attachments?.size
      ? [...message.attachments.values()]
          .map(a => a.name || a.id || 'مرفق')
          .join('\n')
      : null;

    const fields = [];
    if (attachmentList) {
      fields.push({ name: '📎 أسماء المرفقات', value: attachmentList });
    }

    logToChannel(message.guild.id, {
      title: '🗑️ حذف رسالة',
      color: THEME.DARK,
      description:
        `**المستخدم:** ${message.author?.tag || 'غير معروف'}\n` +
        `**القناة:** <#${message.channelId}>\n` +
        `**معرف الرسالة:** \`${message.id}\`\n\n` +
        `**المحتوى المتاح:**\n${content}`,
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

client.on('messageUpdate', async (oldMessage, newMessage) => {
  const guild = newMessage.guild || oldMessage.guild;
  if (!guild) return;

  try {
    const oldContent = oldMessage.partial ? null : oldMessage.content;
    let updatedMessage = newMessage;

    if (updatedMessage.partial) {
      updatedMessage = await updatedMessage.fetch().catch(() => null);
    }

    if (!updatedMessage) return;

    const author = updatedMessage.author || oldMessage.author;
    if (author?.bot) return;

    const newContent = updatedMessage.content;

    if (oldContent !== null && oldContent === newContent) return;

    logToChannel(guild.id, {
      title: '✏️ تعديل رسالة',
      color: THEME.ORANGE,
      description:
        `**المستخدم:** ${author?.tag || 'غير معروف'}\n` +
        `**القناة:** <#${updatedMessage.channelId}>\n` +
        `**الرسالة:** [انتقل إلى الرسالة](${updatedMessage.url})`,
      fields: [
        {
          name: '📜 النص السابق',
          value: oldContent === null ? 'غير متاح في الكاش.' : oldContent || 'فارغ',
        },
        {
          name: '📝 النص الجديد',
          value: newContent || 'فارغ',
        },
      ],
      thumbnail: author?.displayAvatarURL({ extension: 'png', size: 128 }),
      footer: 'MESSAGE UPDATE',
    });
  } catch (error) {
    reportError('messageUpdate', error);
  }
});

client.on('messageDeleteBulk', async (messages, channel) => {
  if (!channel.guild) return;

  try {
    logToChannel(channel.guild.id, {
      title: '🧹 حذف مجموعة رسائل',
      color: THEME.DARK,
      description:
        `**القناة:** <#${channel.id}>\n` +
        `**عدد الرسائل في الحدث:** ${messages.size}\n\n` +
        '> لا يعني هذا السجل أن منفذ الحذف معروف.',
      footer: 'BULK MESSAGE DELETE',
    });
  } catch (error) {
    reportError('messageDeleteBulk', error);
  }
});

client.on('channelDelete', async channel => {
  if (!channel.guild) return;

  try {
    const ticket = await Ticket.findOneAndUpdate(
      { guildId: channel.guild.id, channelId: channel.id },
      {
        $set: {
          status: 'closed',
          closed: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (ticket) {
      logToChannel(channel.guild.id, {
        title: '🗑️ حُذفت قناة تذكرة',
        color: THEME.DARK,
        description:
          `**القناة:** ${channel.name}\n` +
          `**المعرف:** \`${channel.id}\`\n` +
          `**صاحب التذكرة:** <@${ticket.ownerId}>\n` +
          `**القسم:** ${ticket.sectionName || 'غير محدد'}`,
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
  if (typeof content !== 'string' || !content.startsWith('!')) return null;
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
    if (replyMessage) scheduleDelete(replyMessage, delay);
  };
}

async function getTextChannel(guild, channelId) {
  if (!guild || !isSnowflake(channelId)) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return channel && typeof channel.send === 'function' ? channel : null;
}

console.log('✅ الجزء 1/3 تم تحميله.');
// ============================================================
// ========== فحص الحماية ==========
// ============================================================

async function enforceMessageProtection(message, config) {
  if (!config.protectionEnabled) return false;

  const member = message.member;
  if (!member) return false;

  const controller = await hasPermission(member, message.guild.id);
  const administrator = member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
  const bypassRole = (config.protectionBypassRoles || []).some(roleId =>
    member.roles.cache.has(roleId)
  );

  if (controller || administrator || bypassRole) return false;

  let violationReason = null;

  if (config.antiLinkEnabled && containsLink(message.content)) {
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

  if (!violationReason && config.antiSpamEnabled) {
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
      content: `<@${member.id}> ⚠️ ${violationReason}`,
      allowedMentions: { parse: [], users: [member.id] },
    });
    scheduleDelete(warning, 5000);
  } catch (error) {
    reportError('protection-channel-warning', error);
  }

  logToChannel(message.guild.id, {
    title: '🛡️ رُصدت مخالفة حماية',
    color: THEME.WARN,
    description:
      `**العضو:** ${member.user.tag}\n` +
      `**المعرف:** \`${member.id}\`\n` +
      `**القناة:** <#${message.channel.id}>\n` +
      `**السبب:** ${violationReason}`,
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
// ========== الاقتراحات ==========
// ============================================================

async function processSuggestionMessage(message, config) {
  if (
    !config.suggestionsChannel ||
    message.channel.id !== config.suggestionsChannel
  ) {
    return false;
  }

  const content = message.content.trim();
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
      message.member?.displayName || message.author.username,
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
      allowedMentions: { parse: [] },
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
    await sentMessage.delete().catch(() => {});
    throw error;
  }

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

        await sentMessage.edit({ embeds: [embed] });
      } catch (fallbackError) {
        reportError('suggestion-voting-fallback', fallbackError);
      }
    }
  }

  logToChannel(message.guild.id, {
    title: '💡 اقتراح جديد',
    color: THEME.ORANGE,
    description:
      `**صاحب الاقتراح:** ${message.author.tag}\n` +
      `**المعرف:** \`${message.author.id}\`\n` +
      `**الرابط:** ${sentMessage.url}\n\n` +
      truncate(suggestion.content, 1000),
    footer: 'SUGGESTIONS',
  });

  return true;
}

// ============================================================
// ========== XP والمستويات ==========
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

    await User.updateOne({ guildId, userId }, { $inc: { messages: 1 } });

    const now = new Date();
    const cutoff = new Date(now.getTime() - LIMITS.XP_COOLDOWN);
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
        $inc: { xp: gain },
        $set: { lastXpAt: now },
      },
      { new: true }
    );

    if (!data) return null;

    let leveledUp = false;

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const requiredXP = (data.level + 1) * 100;
      if (data.xp < requiredXP) break;

      const promoted = await User.findOneAndUpdate(
        {
          _id: data._id,
          level: data.level,
          xp: { $gte: requiredXP },
        },
        { $inc: { xp: -requiredXP, level: 1 } },
        { new: true }
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

    const levelChannelId = config.levelChannelId || message.channel.id;
    const levelChannel = await getTextChannel(message.guild, levelChannelId);

    if (levelChannel) {
      const embed = createEmbed({
        title: '👑 مستوى جديد في المملكة',
        description:
          `<@${userId}> وصل إلى المستوى **${data.level}**!\n\n` +
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
          value: `${data.xp} / ${(data.level + 1) * 100} XP`,
          inline: true,
        },
      ]);

      try {
        await levelChannel.send({
          content: `<@${userId}>`,
          embeds: [embed],
          allowedMentions: { parse: [], users: [userId] },
        });

        if (levelChannelId !== message.channel.id) {
          const levelAutoLine = await AutoLine.findOne({
            guildId,
            channelId: levelChannelId,
          });
          await sendAutoLine(levelChannel, levelAutoLine);
        }
      } catch (error) {
        reportError('level-announcement', error);
      }
    }

    const levelRoles = await LevelRole.find({
      guildId,
      level: { $lte: data.level },
    }).sort({ level: 1 });

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
// ========== الرد التلقائي ==========
// ============================================================

async function processAutoReplyMessage(message) {
  const key =
    `${message.guild.id}:` +
    `${message.channel.id}:` +
    `${message.author.id}`;

  const cooldown = autoReplyCooldowns.get(key);
  if (cooldown && cooldown > Date.now()) return false;

  const autoReply = await findAutoReply(message.guild.id, message.content);
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

  payload.allowedMentions = { parse: [], repliedUser: false };

  try {
    await message.reply(payload);
  } catch (error) {
    reportError('auto-reply', error);
    await message.channel.send(payload);
  }

  return true;
}

// ============================================================
// ========== المعالج الرئيسي ==========
// ============================================================

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  try {
    const guildId = message.guild.id;
    const config = await getGuildConfig(guildId);

    const blocked = await enforceMessageProtection(message, config);
    if (blocked) return;

    const command = parseMessageCommand(message.content);

    if (command) {
      const { cmd, args } = command;

      const context = {
        message,
        guildId,
        userId: message.author.id,
        config,
        generalImage: getGeneralImage(message.guild, config),
        cmd,
        args,
        deleteAfter: createCommandReplyCleanup(message, cmd),
      };

      const handlers = [
        handlePublicCommands,
        handleControllerCommands,
        handleSettingsCommands,
        handleCommunityCommands,
        handleModerationCommands,
      ];

      for (const handler of handlers) {
        if (await handler(context)) return;
      }

      return;
    }

    if (await processSuggestionMessage(message, config)) return;

    try {
      await grantMessageExperience(message, config);
    } catch (error) {
      reportError('message-xp', error);
    }

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
        { title: '⚠️ لم يكتمل الإجراء', color: THEME.ERROR }
      ).catch(() => {});
    }
  }
});

// ============================================================
// ========== تقسيم النصوص الطويلة ==========
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
    const splitAt = lastBreak > 1200 ? lastBreak : 3500;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
    if (remaining.startsWith('\n')) remaining = remaining.slice(1);
  }

  if (remaining.length || !chunks.length) chunks.push(remaining || '—');

  for (let index = 0; index < chunks.length; index += 1) {
    await channel.send({
      embeds: [
        createEmbed({
          title:
            chunks.length > 1
              ? `${title} • ${index + 1}/${chunks.length}`
              : title,
          description: chunks[index],
          footer,
        }),
      ],
      allowedMentions: { parse: [] },
    });

    if (index < chunks.length - 1) await sleep(250);
  }
}

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
    thumbnail: guild.iconURL({ extension: 'png', size: 256 }),
    image: generalImage,
    footer: 'KINGDOM • البادئة !',
  });

  addSafeFields(embed, [
    {
      name: '👑 نظام التحكم',
      value: '`متحكم` • `الغاء_متحكم` • `قائمة_المتحكمين`',
    },
    {
      name: '🛡️ الإشراف',
      value:
        '`حظر` • `طرد` • `كتم` • `فك_كتم` • ' +
        '`تحذير` • `ابطال_تحذيرات` • `مسح` • `قفل` • `فتح`',
    },
    {
      name: '🎭 إدارة الرتب',
      value: '`اعطاء_رتبة` • `سحب_رتبة` • `عرض_رتب` • `اصلاح_رتب`',
    },
    {
      name: '📁 القنوات',
      value: '`انشاء_قناة` • `حذف_قناة` • `تغيير_اسم_قناة`',
    },
    { name: '🔊 الصوت', value: '`نقل_كل #من #إلى`' },
    {
      name: '📌 الرسائل',
      value: '`تثبيت` • `الغاء_تثبيت` • `قول` • `ايمبد` • `اعلان`',
    },
    {
      name: '📊 المستويات',
      value: '`مستوى` • `ترتيب` • `تعيين روم_ليفل #قناة`',
    },
    {
      name: '👋 الترحيب',
      value:
        '`تعيين ترحيب` • `تعيين رسالة_ترحيب` • ' +
        '`تعيين عنوان_ترحيب` • `تعيين صورة_ترحيب` • ' +
        '`تعيين خلفية_ترحيب` • `تعيين دور_دخول`',
    },
    { name: '📋 اللوق', value: '`تعيين سجلات #قناة` • `اختبار_لوق`' },
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
    { name: '💡 الاقتراحات', value: '`تعيين روم_اقتراحات #قناة`' },
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
    { name: '🎭 الرتب الذاتية', value: '`تعيين رتب`' },
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
    { name: '🛡️ الحماية', value: '`حماية`' },
    { name: '✏️ الاسم', value: '`تغيير_اسم`' },
    { name: 'ℹ️ المعلومات', value: '`معلومات` • `سيرفر` • `بينق`' },
    {
      name: '⚙️ الإعدادات والصور',
      value:
        '`تعيين` • `تعيين صورة_بانل` • ' +
        '`تعيين صورة_رتب` • `تعيين صورة_بنر` • `تعيين صورة_عامة`',
    },
    { name: '📸 إنستغرام', value: '`ig رابط_الريلز`' },
    { name: '🛑 المالك', value: '`إيقاف`' },
  ]);

  return embed;
}

// ============================================================
// ========== الأوامر العامة ==========
// ============================================================

async function handlePublicCommands(context) {
  const { message, guildId, config, generalImage, cmd, args } = context;

  if (cmd === 'مساعدة') {
    await message.channel.send({
      embeds: [buildHelpEmbed(message.guild, generalImage)],
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
            `**زمن Gateway:** ${
              gatewayPing >= 0 ? `${gatewayPing}ms` : 'لم يُقَس بعد'
            }\n` +
            `**قاعدة البيانات:** ${
              mongoose.connection.readyState === 1 ? 'متصلة' : 'غير متصلة'
            }`,
          thumbnail: generalImage,
        }),
      ],
    });

    return true;
  }

  if (cmd === 'مستوى') {
    const member = message.mentions.members.first() || message.member;
    const data = await getUserData(guildId, member.id);
    const requiredXP = (data.level + 1) * 100;
    const ratio = Math.min(1, Math.max(0, data.xp / requiredXP));
    const filled = Math.round(ratio * 12);
    const progress = '▰'.repeat(filled) + '▱'.repeat(12 - filled);

    const embed = createEmbed({
      title: `📊 مستوى ${member.displayName}`,
      description:
        `${progress}\n` +
        `\`${Math.floor(ratio * 100)}%\` إلى المستوى التالي`,
      thumbnail: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: 'KINGDOM • MEMBER PROGRESS',
    });

    addSafeFields(embed, [
      { name: '👑 المستوى', value: String(data.level), inline: true },
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

    await message.channel.send({ embeds: [embed] });
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

    const description = top
      .map((entry, index) => {
        return (
          `${medals[index] || `\`#${index + 1}\``} ` +
          `<@${entry.userId}>\n` +
          `↳ المستوى \`${entry.level}\` • ${entry.xp} XP`
        );
      })
      .join('\n\n');

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
    const member = message.mentions.members.first() || message.member;

    const embed = createEmbed({
      title: `ℹ️ ${member.displayName}`,
      thumbnail: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: 'KINGDOM • MEMBER PROFILE',
    });

    addSafeFields(embed, [
      { name: '🆔 المعرف', value: member.id, inline: true },
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
      description: message.guild.description || 'The Kingdom Never Falls.',
      thumbnail: message.guild.iconURL({ extension: 'png', size: 256 }),
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
        value: String(message.guild.premiumSubscriptionCount || 0),
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
    const member = message.mentions.members.first() || message.member;

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
          createButton('open_name_modal', 'تغيير الاسم', '✏️', BTN.MAIN)
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
      ? replies
          .map((reply, index) => {
            return (
              `\`${index + 1}. ${reply.keyword}\`\n` +
              truncate(reply.reply, 800) +
              (reply.image ? '\n🖼️ يحتوي صورة' : '')
            );
          })
          .join('\n\n')
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

    const sections = settings.sections
      .map((section, index) => {
        return (
          `\`${index + 1}.\` ${section.emoji || '📌'} ` +
          `**${section.name}**\n` +
          `↳ ${
            section.roleId ? `<@&${section.roleId}>` : 'بدون رتبة دعم'
          }`
        );
      })
      .join('\n\n');

    await sendLongEmbedText(
      message.channel,
      '📌 أقسام التذاكر',
      sections || 'لا توجد أقسام.',
      `KINGDOM • ${settings.sections.length} قسم`
    );

    await message.channel.send({
      embeds: [
        addSafeFields(createEmbed({ title: '⚙️ ربط قنوات التذاكر' }), [
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
        ]),
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
      await sendNotice(message, 'الصيغة: `!ايمبد العنوان ، الوصف`');
      return true;
    }

    const parts = fullText.split(/[،,]\s*/).map(value => value.trim());
    const title = parts.length >= 2 ? parts.shift() : 'رسالة من المجتمع';
    let description = parts.length ? parts.join(' ، ') : fullText;

    const imageMatch = description.match(
      /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s]*)?/i
    );
    const image = imageMatch ? safeHttpUrl(imageMatch[0]) : null;

    if (imageMatch) {
      description = description.replace(imageMatch[0], '').trim();
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
    await handleInstagramCommand(context);
    return true;
  }

  return false;
}

// ============================================================
// ========== أوامر المالك (المتحكمون) ==========
// ============================================================

async function handleControllerCommands(context) {
  const { message, guildId, cmd, deleteAfter } = context;

  if (
    !['متحكم', 'الغاء_متحكم', 'اصلاح_رتب', 'إيقاف'].includes(cmd)
  ) {
    return false;
  }

  if (!OWNER_ID || message.author.id !== OWNER_ID) {
    const reply = await sendNotice(
      message,
      'هذا الأمر متاح لمالك البوت فقط.',
      { color: THEME.ERROR }
    );
    deleteAfter(reply);
    return true;
  }

  if (cmd === 'إيقاف') {
    await sendNotice(message, 'جارٍ إيقاف البوت وإغلاق الاتصالات...', {
      title: '🛑 إيقاف المملكة',
    });
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
      `تم إصلاح \`${fixed}\` رتبة.\n` +
        `الرتب ذات الإيموجي الصحيح: \`${valid}\`.`,
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
      await sendNotice(message, 'لا يمكن تعيين بوت كمتحكم.');
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
          `**المنفذ:** ${message.author.tag}\n` +
          `**المتحكم الجديد:** ${member.user.tag}\n` +
          `**المعرف:** \`${member.id}\``,
        footer: 'CONTROLLERS',
      });
    }

    return true;
  }

  const removed = await removeController(guildId, member.id);

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
        `**المنفذ:** ${message.author.tag}\n` +
        `**العضو:** ${member.user.tag}\n` +
        `**المعرف:** \`${member.id}\``,
      footer: 'CONTROLLERS',
    });
  }

  return true;
}

// ============================================================
// ========== أوامر الإعدادات (تعيين) ==========
// ============================================================

async function handleSettingsCommands(context) {
  const { message, guildId, config, generalImage, cmd, args, deleteAfter } =
    context;

  if (cmd !== 'تعيين') return false;

  if (!(await hasPermission(message.member, guildId))) {
    const reply = await sendNotice(message, 'هذا الأمر متاح للمتحكمين فقط.', {
      color: THEME.ERROR,
      title: '🔒 إجراء إداري',
    });
    deleteAfter(reply);
    return true;
  }

  const sub = args[0]?.toLowerCase();
  const rest = args.slice(1);
  const value = rest.join(' ');

  // ===== قائمة الإعدادات =====
  if (!sub) {
    const embed = createEmbed({
      title: '⚙️ KINGDOM | مركز الإعدادات',
      description:
        '`تحكم كامل في المملكة من مكان واحد.`\n' +
        'الصيغة: `!تعيين [الخيار] [القيمة]`',
      thumbnail: generalImage,
      footer: 'KINGDOM • SETTINGS HUB',
      timestamp: true,
    });

    addSafeFields(embed, [
      {
        name: '👋 الترحيب',
        value:
          '`ترحيب #قناة` • `رسالة_ترحيب نص` • ' +
          '`عنوان_ترحيب نص` • `صورة_ترحيب رابط` • ' +
          '`خلفية_ترحيب لون/رابط` • `دور_دخول @رتبة`',
      },
      { name: '📋 اللوق', value: '`سجلات #قناة`' },
      { name: '📊 المستويات', value: '`روم_ليفل #قناة`' },
      {
        name: '🤖 الأوتو لاين',
        value:
          '`اوتر_لاين #روم نص` • `صورة_اوترلاين #روم رابط` • ' +
          '`تفعيل_اوترلاين #روم` • `تعطيل_اوترلاين #روم` • ' +
          '`حذف_اوترلاين #روم`',
      },
      {
        name: '🎫 التذاكر',
        value:
          '`تذكرة إضافة` • `تذكرة حذف` • `تذكرة نص` • ' +
          '`تذكرة صورة` • `تذكرة إيموجي` • `تكت_لوق #قناة`',
      },
      {
        name: '🎭 الرتب الذاتية',
        value: '`رتب اضافة/حذف/عرض/بانل`',
      },
      {
        name: '⭐ التقييمات',
        value: '`تقييم on/off` • `قناة_تقييم #قناة`',
      },
      {
        name: '🕊️ الزاجل',
        value:
          '`روم_زاجل #قناة` • `عنوان_زاجل نص` • ' +
          '`نص_زاجل نص` • `صورة_زاجل رابط`',
      },
      {
        name: '📋 التقديمات',
        value:
          '`تقديم بانل_عنوان` • `تقديم بانل_وصف` • ' +
          '`تقديم بانل_صورة` • `تقديم بانل_روم` • ' +
          '`تقديم لوق_نتائج`',
      },
      { name: '💡 الاقتراحات', value: '`روم_اقتراحات #قناة`' },
      {
        name: '🖼️ الصور العامة',
        value: '`صورة_بنر` • `صورة_عامة` • `صورة_بانل` • `صورة_رتب`',
      },
    ]);

    await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    return true;
  }

  // ===== روم الاقتراحات =====
  if (sub === 'روم_اقتراحات') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { suggestionsChannel: null });
      const reply = await sendNotice(message, 'تم إلغاء تعيين روم الاقتراحات.');
      deleteAfter(reply);
      return true;
    }

    if (!channel.isTextBased()) {
      const reply = await sendNotice(message, 'القناة يجب أن تكون نصية.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { suggestionsChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين روم الاقتراحات إلى ${channel}.\n\n` +
        '> أي رسالة في هذا الروم ستتحول تلقائيًا إلى اقتراح.\n' +
        '> تأكد من صلاحيات: `Manage Messages` • `Create Public Threads` • `Send Messages in Threads`.',
      { title: '💡 الاقتراحات' }
    );

    deleteAfter(reply);
    return true;
  }

  // ===== تكت لوق =====
  if (sub === 'تكت_لوق' || sub === 'تيكت_لوق') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { ticketLogChannel: null });
      const reply = await sendNotice(
        message,
        'تم إلغاء تعيين قناة استلام التذاكر.'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { ticketLogChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين قناة استلام التذاكر إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  // ===== التقديمات =====
  if (sub === 'تقديم') {
    return handleApplySettings(context);
  }

  // ===== الزاجل =====
  if (sub === 'روم_زاجل') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { pigeonChannel: null });
      const reply = await sendNotice(message, 'تم إلغاء تعيين روم الزاجل.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { pigeonChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين روم الزاجل إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'عنوان_زاجل') {
    if (!value) {
      const reply = await sendNotice(message, 'اكتب العنوان بعد الأمر.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      pigeonTitle: truncate(value, 256),
    });

    const reply = await sendNotice(
      message,
      `تم تعيين عنوان الزاجل:\n\`${value}\``
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'نص_زاجل') {
    if (!value) {
      const reply = await sendNotice(message, 'اكتب النص بعد الأمر.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      pigeonDescription: truncate(value, 4000),
    });

    const reply = await sendNotice(message, `تم تعيين نص الزاجل.`);
    deleteAfter(reply);
    return true;
  }

  if (sub === 'صورة_زاجل') {
    const url = safeHttpUrl(value);

    if (!value) {
      await updateGuildConfig(guildId, { pigeonImage: null });
      const reply = await sendNotice(message, 'تم إلغاء صورة الزاجل.');
      deleteAfter(reply);
      return true;
    }

    if (!url) {
      const reply = await sendNotice(
        message,
        'الرابط غير صالح. أرسل رابط صورة http/https صحيح.'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { pigeonImage: url });

    const reply = await sendNotice(
      message,
      `تم تعيين صورة الزاجل.\n${url}`
    );
    deleteAfter(reply);
    return true;
  }

  // ===== الرتب الذاتية =====
  if (sub === 'رتب') {
    return handleSelfRolesSettings(context, rest);
  }

  // ===== الترحيب =====
  if (sub === 'ترحيب') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { welcomeChannel: null });
      const reply = await sendNotice(message, 'تم إلغاء قناة الترحيب.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { welcomeChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين قناة الترحيب إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'رسالة_ترحيب') {
    if (!value) {
      const reply = await sendNotice(
        message,
        'اكتب النص بعد الأمر.\n' +
          '> يمكنك استخدام: `{member}` • `{username}` • `{server}` • `{count}`'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      welcomeMessage: truncate(value, 2000),
    });

    const reply = await sendNotice(
      message,
      `تم تعيين رسالة الترحيب:\n\`\`\`\n${value}\n\`\`\``
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'عنوان_ترحيب') {
    if (!value) {
      const reply = await sendNotice(message, 'اكتب العنوان بعد الأمر.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      welcomeTitle: truncate(value, 256),
    });

    const reply = await sendNotice(
      message,
      `تم تعيين عنوان الترحيب:\n\`${value}\``
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'صورة_ترحيب') {
    const url = safeHttpUrl(value);

    if (!value) {
      await updateGuildConfig(guildId, { welcomeImage: null });
      const reply = await sendNotice(message, 'تم إلغاء صورة الترحيب.');
      deleteAfter(reply);
      return true;
    }

    if (!url) {
      const reply = await sendNotice(message, 'الرابط غير صالح.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { welcomeImage: url });

    const reply = await sendNotice(
      message,
      `تم تعيين صورة الترحيب.\n${url}`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'خلفية_ترحيب') {
    if (!value) {
      await updateGuildConfig(guildId, { welcomeBackground: null });
      const reply = await sendNotice(message, 'تم إلغاء خلفية الترحيب.');
      deleteAfter(reply);
      return true;
    }

    const isHex = /^#[0-9a-f]{6}$/i.test(value.trim());
    const isUrl = safeHttpUrl(value);

    if (!isHex && !isUrl) {
      const reply = await sendNotice(
        message,
        'أرسل لون Hex مثل `#e32646` أو رابط صورة صالح.'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      welcomeBackground: isHex ? value.trim() : isUrl,
    });

    const reply = await sendNotice(message, `تم تعيين خلفية الترحيب.`);
    deleteAfter(reply);
    return true;
  }

  if (sub === 'دور_دخول') {
    const role = message.mentions.roles.first();

    if (!role) {
      await updateGuildConfig(guildId, { joinRole: null });
      const reply = await sendNotice(message, 'تم إلغاء رتبة الدخول.');
      deleteAfter(reply);
      return true;
    }

    if (role.managed) {
      const reply = await sendNotice(
        message,
        'لا يمكن استخدام رتبة يديرها تكامل خارجي.'
      );
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (
      !me.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
      role.position >= me.roles.highest.position
    ) {
      const reply = await sendNotice(
        message,
        'لا يمكن إدارة هذه الرتبة. تحقق من تسلسل الرتب.'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { joinRole: role.id });

    const reply = await sendNotice(
      message,
      `تم تعيين رتبة الدخول: ${role}`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'سجلات') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { logChannel: null });
      const reply = await sendNotice(message, 'تم إلغاء قناة السجلات.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { logChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين قناة السجلات إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'روم_ليفل') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { levelChannelId: null });
      const reply = await sendNotice(message, 'تم إلغاء قناة الليفل.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { levelChannelId: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين قناة الليفل إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  // ===== الأوتو لاين =====
  if (sub === 'اوتر_لاين') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن الروم بعد الأمر.');
      deleteAfter(reply);
      return true;
    }

    const text = rest.slice(1).join(' ') || null;

    await setAutoLine(guildId, channel.id, {
      text: text ? truncate(text, 2000) : null,
      enabled: true,
    });

    const reply = await sendNotice(
      message,
      `تم تعيين الأوتو لاين في ${channel}.` +
        (text ? `\n**النص:** ${text}` : ''),
      { title: '🤖 الأوتو لاين', thumbnail: generalImage }
    );

    deleteAfter(reply);
    return true;
  }

  if (sub === 'صورة_اوترلاين') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن الروم بعد الأمر.');
      deleteAfter(reply);
      return true;
    }

    const rawUrl = rest.slice(1).join(' ');

    if (!rawUrl) {
      await setAutoLine(guildId, channel.id, { image: null });
      const reply = await sendNotice(
        message,
        `تم إزالة صورة الأوتو لاين من ${channel}.`
      );
      deleteAfter(reply);
      return true;
    }

    const url = safeHttpUrl(rawUrl);

    if (!url) {
      const reply = await sendNotice(message, 'الرابط غير صالح.');
      deleteAfter(reply);
      return true;
    }

    await setAutoLine(guildId, channel.id, { image: url });

    const reply = await sendNotice(
      message,
      `تم تعيين صورة الأوتو لاين لـ ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'تفعيل_اوترلاين') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن الروم.');
      deleteAfter(reply);
      return true;
    }

    const auto = await AutoLine.findOne({ guildId, channelId: channel.id });

    if (!auto || (!auto.text && !auto.image)) {
      const reply = await sendNotice(
        message,
        'لم يتم تعيين نص أو صورة لهذا الروم بعد.'
      );
      deleteAfter(reply);
      return true;
    }

    await setAutoLine(guildId, channel.id, { enabled: true });

    const reply = await sendNotice(
      message,
      `تم تفعيل الأوتو لاين في ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'تعطيل_اوترلاين') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن الروم.');
      deleteAfter(reply);
      return true;
    }

    await setAutoLine(guildId, channel.id, { enabled: false });

    const reply = await sendNotice(
      message,
      `تم تعطيل الأوتو لاين في ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'حذف_اوترلاين' || sub === 'حذف_اوتر_لاين') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن الروم.');
      deleteAfter(reply);
      return true;
    }

    await deleteAutoLine(guildId, channel.id);

    const reply = await sendNotice(
      message,
      `تم حذف الأوتو لاين من ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  // ===== التذاكر =====
  if (sub === 'تذكرة') {
    return handleTicketSettings(context, rest);
  }

  // ===== التقييمات =====
  if (sub === 'تقييم') {
    const option = rest[0]?.toLowerCase();

    if (!option || !['on', 'off'].includes(option)) {
      const reply = await sendNotice(
        message,
        'الصيغة: `!تعيين تقييم on/off`'
      );
      deleteAfter(reply);
      return true;
    }

    const enabled = option === 'on';
    await updateGuildConfig(guildId, { ticketRatingEnabled: enabled });

    const reply = await sendNotice(
      message,
      `تم ${enabled ? 'تفعيل' : 'تعطيل'} نظام تقييم التذاكر.`
    );
    deleteAfter(reply);
    return true;
  }

  if (sub === 'قناة_تقييم') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { ticketRatingChannel: null });
      const reply = await sendNotice(message, 'تم إلغاء قناة عرض التقييمات.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { ticketRatingChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين قناة عرض التقييمات إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  // ===== الصور العامة =====
  const imageSettings = {
    صورة_بنر: 'bannerImage',
    صورة_عامة: 'generalImage',
    صورة_بانل: 'ticketPanelImage',
    صورة_رتب: 'rolesImage',
  };

  if (sub in imageSettings) {
    const key = imageSettings[sub];

    if (!value) {
      await updateGuildConfig(guildId, { [key]: null });
      const reply = await sendNotice(
        message,
        `تم إلغاء ${sub.replace('_', ' ')}.`
      );
      deleteAfter(reply);
      return true;
    }

    const url = safeHttpUrl(value);

    if (!url) {
      const reply = await sendNotice(message, 'الرابط غير صالح.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { [key]: url });

    const reply = await sendNotice(
      message,
      `تم تعيين ${sub.replace('_', ' ')}.\n${url}`
    );
    deleteAfter(reply);
    return true;
  }

  const reply = await sendNotice(
    message,
    'خيار غير معروف. استخدم `!تعيين` لعرض القائمة.'
  );
  deleteAfter(reply);
  return true;
}

// ============================================================
// ========== إعدادات التقديمات ==========
// ============================================================

async function handleApplySettings(context) {
  const { message, guildId, rest, deleteAfter } = context;
  const option = rest[0]?.toLowerCase();
  const optionValue = rest.slice(1).join(' ');

  if (!option) {
    const reply = await sendNotice(
      message,
      'الخيارات: `بانل_عنوان` • `بانل_وصف` • `بانل_صورة` • ' +
        '`بانل_روم` • `لوق_نتائج`'
    );
    deleteAfter(reply);
    return true;
  }

  if (option === 'بانل_عنوان') {
    if (!optionValue) {
      const reply = await sendNotice(message, 'اكتب العنوان.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      applyPanelTitle: truncate(optionValue, 256),
    });

    const reply = await sendNotice(
      message,
      `تم تعيين عنوان بانل التقديمات:\n\`${optionValue}\``
    );
    deleteAfter(reply);
    return true;
  }

  if (option === 'بانل_وصف') {
    if (!optionValue) {
      const reply = await sendNotice(message, 'اكتب الوصف.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      applyPanelDescription: truncate(optionValue, 4000),
    });

    const reply = await sendNotice(
      message,
      `تم تعيين وصف بانل التقديمات.`
    );
    deleteAfter(reply);
    return true;
  }

  if (option === 'بانل_صورة') {
    if (!optionValue) {
      await updateGuildConfig(guildId, { applyPanelImage: null });
      const reply = await sendNotice(
        message,
        'تم إلغاء صورة بانل التقديمات.'
      );
      deleteAfter(reply);
      return true;
    }

    const url = safeHttpUrl(optionValue);

    if (!url) {
      const reply = await sendNotice(message, 'الرابط غير صالح.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { applyPanelImage: url });

    const reply = await sendNotice(
      message,
      `تم تعيين صورة بانل التقديمات.`
    );
    deleteAfter(reply);
    return true;
  }

  if (option === 'بانل_روم') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { applyPanelChannel: null });
      const reply = await sendNotice(
        message,
        'تم إلغاء روم بانل التقديمات.'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { applyPanelChannel: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين روم بانل التقديمات إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  if (option === 'لوق_نتائج') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      await updateGuildConfig(guildId, { applyResultLog: null });
      const reply = await sendNotice(
        message,
        'تم إلغاء روم لوق النتائج.'
      );
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { applyResultLog: channel.id });

    const reply = await sendNotice(
      message,
      `تم تعيين روم لوق النتائج إلى ${channel}.`
    );
    deleteAfter(reply);
    return true;
  }

  const reply = await sendNotice(message, 'خيار غير معروف.');
  deleteAfter(reply);
  return true;
}

// ============================================================
// ========== إعدادات الرتب الذاتية ==========
// ============================================================

async function handleSelfRolesSettings(context, rest) {
  const { message, guildId, config, generalImage, deleteAfter } = context;

  const action = rest[0]?.toLowerCase();
  const args = rest.slice(1);

  if (!action) {
    const selfRoles = await getSelfRoles(guildId);

    const listText = selfRoles.length
      ? selfRoles
          .map((role, index) => {
            const discordRole = message.guild.roles.cache.get(role.roleId);
            return (
              `**${index + 1}.** ${role.emoji} **${role.label}** ` +
              (discordRole ? `→ ${discordRole}` : '⚠️ (رتبة محذوفة)')
            );
          })
          .join('\n')
      : 'لا توجد رتب مسجلة بعد.';

    const embed = createEmbed({
      title: '🎭 KINGDOM | إدارة الرتب الذاتية',
      description:
        '`نظام يعطي الأعضاء حرية اختيار هويتهم.`\n\n' +
        '**الأوامر:**\n' +
        '`!تعيين رتب اضافة @رتبة [اسم] [إيموجي] [صورة]`\n' +
        '`!تعيين رتب تعديل @رتبة [الاسم/الايموجي/الصورة/الوصف] [القيمة]`\n' +
        '`!تعيين رتب حذف @رتبة`\n' +
        '`!تعيين رتب عرض`\n' +
        '`!تعيين رتب بانل [#قناة]`\n' +
        '`!تعيين رتب صورة_بانل [رابط]`\n' +
        '`!تعيين رتب نص_بانل [نص]`\n' +
        '`!تعيين رتب ترتيب @رتبة [رقم]`',
      thumbnail: generalImage,
      footer: `KINGDOM • ${selfRoles.length} رتبة مسجلة`,
      timestamp: true,
    });

    addSafeFields(embed, [
      {
        name: '📌 الرتب المسجلة',
        value: truncate(listText, 1000),
      },
    ]);

    await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    return true;
  }

  if (action === 'اضافة' || action === 'إضافة') {
    const role = message.mentions.roles.first();

    if (!role) {
      const reply = await sendNotice(
        message,
        'منشن الرتبة.\nالصيغة: `!تعيين رتب اضافة @رتبة [اسم] [إيموجي] [رابط_صورة]`'
      );
      deleteAfter(reply);
      return true;
    }

    if (!canManageRole(message.guild, role)) {
      const reply = await sendNotice(
        message,
        'لا يمكن إدارة هذه الرتبة. تحقق من الصلاحيات وتسلسل الرتب.'
      );
      deleteAfter(reply);
      return true;
    }

    if (isSensitiveSelfRole(role)) {
      const reply = await sendNotice(
        message,
        'هذه الرتبة تحتوي صلاحيات حساسة، لا يمكن إضافتها كنظام اختيار ذاتي.'
      );
      deleteAfter(reply);
      return true;
    }

    const label = truncate(args[0] || role.name, 100);
    let emoji = args[1] || '🎭';
    if (!parseEmoji(emoji)) emoji = '🎭';

    const rawImage = args[2];
    const imageUrl = rawImage ? safeHttpUrl(rawImage) : null;

    if (rawImage && !imageUrl) {
      const reply = await sendNotice(message, 'رابط الصورة غير صالح.');
      deleteAfter(reply);
      return true;
    }

    const description = args
      .slice(imageUrl ? 3 : 2)
      .join(' ')
      .slice(0, 100);

    const created = await addSelfRole(
      guildId,
      role.id,
      label,
      emoji,
      imageUrl,
      description
    );

    const embed = createEmbed({
      title: created ? '✅ تم إضافة الرتبة' : '🔄 تم تحديث الرتبة',
      color: THEME.ORANGE,
      footer: 'KINGDOM • ROLE SYSTEM',
      timestamp: true,
    });

    addSafeFields(embed, [
      { name: '🎭 الرتبة', value: `${role}`, inline: true },
      { name: '📝 الاسم', value: label, inline: true },
      { name: '😀 الإيموجي', value: emoji, inline: true },
    ]);

    if (description) {
      embed.addFields({
        name: '📄 الوصف',
        value: description,
        inline: false,
      });
    }

    if (imageUrl) embed.setImage(imageUrl);

    const reply = await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    logToChannel(guildId, {
      title: '🎭 إضافة رتبة ذاتية',
      description: `**${message.author.tag}** أضاف رتبة **${label}**`,
      footer: 'ROLE SYSTEM',
    });

    deleteAfter(reply);
    return true;
  }

  if (action === 'تعديل') {
    const role = message.mentions.roles.first();

    if (!role) {
      const reply = await sendNotice(message, 'منشن الرتبة.');
      deleteAfter(reply);
      return true;
    }

    const existing = await SelfRole.findOne({ guildId, roleId: role.id });

    if (!existing) {
      const reply = await sendNotice(
        message,
        'هذه الرتبة غير مسجلة في النظام.'
      );
      deleteAfter(reply);
      return true;
    }

    const option = args[0]?.toLowerCase();
    const newValue = args.slice(1).join(' ');

    if (!option || !newValue) {
      const reply = await sendNotice(
        message,
        'الصيغة: `!تعيين رتب تعديل @رتبة [الاسم/الايموجي/الصورة/الوصف] [القيمة]`'
      );
      deleteAfter(reply);
      return true;
    }

    const changes = {};

    if (option === 'الاسم') {
      changes.label = truncate(newValue, 100);
    } else if (option === 'الايموجي') {
      if (!parseEmoji(newValue)) {
        const reply = await sendNotice(message, 'الإيموجي غير صالح.');
        deleteAfter(reply);
        return true;
      }
      changes.emoji = newValue;
    } else if (option === 'الصورة') {
      const url = safeHttpUrl(newValue);
      if (!url) {
        const reply = await sendNotice(message, 'الرابط غير صالح.');
        deleteAfter(reply);
        return true;
      }
      changes.image = url;
    } else if (option === 'الوصف') {
      changes.description = truncate(newValue, 100);
    } else {
      const reply = await sendNotice(message, 'خيار غير معروف.');
      deleteAfter(reply);
      return true;
    }

    await updateSelfRole(guildId, role.id, changes);

    const reply = await sendNotice(
      message,
      `تم تعديل **${role.name}**.`,
      { title: '✅ تعديل الرتبة' }
    );

    deleteAfter(reply);
    return true;
  }

  if (action === 'حذف') {
    const role = message.mentions.roles.first();

    if (!role) {
      const reply = await sendNotice(message, 'منشن الرتبة.');
      deleteAfter(reply);
      return true;
    }

    const removed = await removeSelfRole(guildId, role.id);

    if (!removed) {
      const reply = await sendNotice(message, 'هذه الرتبة غير مسجلة.');
      deleteAfter(reply);
      return true;
    }

    const reply = await sendNotice(
      message,
      `تم حذف **${role.name}** من قائمة الاختيار الذاتي.`,
      { title: '🗑️ حذف الرتبة' }
    );

    logToChannel(guildId, {
      title: '🗑️ حذف رتبة ذاتية',
      color: THEME.DARK,
      description: `**${message.author.tag}** حذف رتبة **${role.name}**`,
      footer: 'ROLE SYSTEM',
    });

    deleteAfter(reply);
    return true;
  }

  if (action === 'عرض') {
    const selfRoles = await getSelfRoles(guildId);

    if (!selfRoles.length) {
      const reply = await sendNotice(message, 'لا توجد رتب مسجلة.');
      deleteAfter(reply);
      return true;
    }

    const embed = createEmbed({
      title: '📋 قائمة الرتب الذاتية',
      footer: `KINGDOM • ${selfRoles.length} رتبة`,
    });

    for (const role of selfRoles) {
      const discordRole = message.guild.roles.cache.get(role.roleId);

      let value =
        `**الاسم:** ${role.label}\n` +
        `**الإيموجي:** ${role.emoji}\n` +
        `**الرتبة:** ${
          discordRole ? discordRole.toString() : '⚠️ محذوفة'
        }`;

      if (role.description) {
        value += `\n**الوصف:** ${role.description}`;
      }
      if (role.image) {
        value += `\n**الصورة:** [رابط](${role.image})`;
      }

      embed.addFields({
        name: `${role.emoji} ${role.label}`,
        value: truncate(value, 1000),
        inline: false,
      });
    }

    await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    return true;
  }

  if (action === 'صورة_بانل') {
    const rawUrl = args.join(' ');

    if (!rawUrl) {
      await updateGuildConfig(guildId, { rolesImage: null });
      const reply = await sendNotice(message, 'تم إلغاء صورة البانل.');
      deleteAfter(reply);
      return true;
    }

    const url = safeHttpUrl(rawUrl);

    if (!url) {
      const reply = await sendNotice(message, 'الرابط غير صالح.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, { rolesImage: url });

    const reply = await sendNotice(
      message,
      `تم تعيين صورة البانل.\n${url}`
    );
    deleteAfter(reply);
    return true;
  }

  if (action === 'نص_بانل') {
    const text = args.join(' ');

    if (!text) {
      const reply = await sendNotice(message, 'اكتب النص.');
      deleteAfter(reply);
      return true;
    }

    await updateGuildConfig(guildId, {
      rolesPanelText: truncate(text, 2000),
    });

    const reply = await sendNotice(message, `تم تعيين نص البانل.`);
    deleteAfter(reply);
    return true;
  }

  if (action === 'ترتيب') {
    const role = message.mentions.roles.first();
    const order = parseStrictInteger(args[0], 0, 9999);

    if (!role || order === null) {
      const reply = await sendNotice(
        message,
        'الصيغة: `!تعيين رتب ترتيب @رتبة [رقم]`'
      );
      deleteAfter(reply);
      return true;
    }

    const existing = await SelfRole.findOne({ guildId, roleId: role.id });

    if (!existing) {
      const reply = await sendNotice(message, 'هذه الرتبة غير مسجلة.');
      deleteAfter(reply);
      return true;
    }

    await updateSelfRole(guildId, role.id, { order });

    const reply = await sendNotice(
      message,
      `تم تعيين ترتيب **${role.name}** إلى **${order}**.`
    );
    deleteAfter(reply);
    return true;
  }

  if (action === 'بانل') {
    const panel = await buildSelfRolesPanel(guildId, message.guild, config);

    if (!panel) {
      const reply = await sendNotice(message, 'لا توجد رتب مسجلة.');
      deleteAfter(reply);
      return true;
    }

    const targetChannel = message.mentions.channels.first() || message.channel;

    try {
      await targetChannel.send({
        embeds: [panel.embed],
        components: panel.rows,
      });

      logToChannel(guildId, {
        title: '📢 إرسال بانل الرتب',
        description: `**${message.author.tag}** أرسل بانل الرتب في ${targetChannel}`,
        footer: 'ROLE SYSTEM',
      });

      const reply = await sendNotice(
        message,
        `تم إرسال البانل في ${targetChannel}.`
      );

      deleteAfter(reply);
    } catch (error) {
      reportError('self-roles-panel', error);
      const reply = await sendNotice(
        message,
        'فشل إرسال البانل. تحقق من الصلاحيات.',
        { color: THEME.ERROR }
      );
      deleteAfter(reply);
    }

    return true;
  }

  const reply = await sendNotice(
    message,
    'خيار غير معروف. استخدم `!تعيين رتب` لعرض المساعدة.'
  );
  deleteAfter(reply);
  return true;
}

// ============================================================
// ========== إعدادات التذاكر ==========
// ============================================================

async function handleTicketSettings(context, rest) {
  const { message, guildId, generalImage, deleteAfter } = context;

  const settings = await getTicketSettings(guildId);
  const action = rest[0]?.toLowerCase();
  const args = rest.slice(1);
  const actionValue = args.join(' ');

  if (!action) {
    const embed = createEmbed({
      title: '🎫 KINGDOM | إدارة التذاكر',
      description:
        '**الأوامر:**\n' +
        '`!تعيين تذكرة إضافة [اسم] @رتبة :إيموجي:`\n' +
        '`!تعيين تذكرة تعيين_ايموجي [اسم] :إيموجي:`\n' +
        '`!تعيين تذكرة حذف [اسم]`\n' +
        '`!تعيين تذكرة نص [النص الجديد]`\n' +
        '`!تعيين تذكرة صورة [رابط]`\n' +
        '`!تعيين تذكرة فئة [آيدي الفئة]`',
      thumbnail: generalImage,
      footer:
        `KINGDOM • ${settings.sections.length} قسم • ` +
        `الفئة: ${settings.categoryId ? 'محددة' : 'غير محددة'}`,
      timestamp: true,
    });

    if (settings.sections.length) {
      const sectionsText = settings.sections
        .map(
          (section, index) =>
            `**${index + 1}.** ${section.emoji || '📌'} **${section.name}** ` +
            `→ ${section.roleId ? `<@&${section.roleId}>` : 'بدون رتبة'}`
        )
        .join('\n');

      addSafeFields(embed, [
        {
          name: '📌 الأقسام الحالية',
          value: truncate(sectionsText, 1000),
        },
      ]);
    }

    await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    return true;
  }

  if (action === 'إضافة') {
    const match = actionValue.match(/^(.+?)\s+<@&(\d{17,20})>\s*(\S+)?$/);

    if (!match) {
      const reply = await sendNotice(
        message,
        'الصيغة: `!تعيين تذكرة إضافة [اسم] @رتبة :إيموجي:`'
      );
      deleteAfter(reply);
      return true;
    }

    const sectionName = truncate(match[1].trim(), 100);
    const roleId = match[2];
    let emoji = match[3] || '📌';

    if (!parseEmoji(emoji)) emoji = '📌';

    if (settings.sections.some(section => section.name === sectionName)) {
      const reply = await sendNotice(
        message,
        `قسم "${sectionName}" موجود بالفعل.`
      );
      deleteAfter(reply);
      return true;
    }

    if (settings.sections.length >= 24) {
      const reply = await sendNotice(message, 'الحد الأقصى 24 قسم.');
      deleteAfter(reply);
      return true;
    }

    settings.sections.push({ name: sectionName, roleId, emoji });
    await saveTicketSettings(guildId, settings);

    const reply = await sendNotice(
      message,
      `تم إضافة قسم **${sectionName}**.`,
      { title: '✅ قسم جديد' }
    );

    logToChannel(guildId, {
      title: '🎫 إضافة قسم تذاكر',
      description: `**${message.author.tag}** أضاف قسم **${sectionName}**`,
      footer: 'TICKETS',
    });

    deleteAfter(reply);
    return true;
  }

  if (action === 'تعيين_ايموجي') {
    const match = actionValue.match(/^(.+?)\s+(\S+)$/);

    if (!match) {
      const reply = await sendNotice(
        message,
        'الصيغة: `!تعيين تذكرة تعيين_ايموجي [اسم] :إيموجي:`'
      );
      deleteAfter(reply);
      return true;
    }

    const sectionName = match[1].trim();
    let emoji = match[2];

    if (!parseEmoji(emoji)) emoji = '📌';

    const section = settings.sections.find(
      item => item.name === sectionName
    );

    if (!section) {
      const reply = await sendNotice(
        message,
        `قسم "${sectionName}" غير موجود.`
      );
      deleteAfter(reply);
      return true;
    }

    section.emoji = emoji;
    await saveTicketSettings(guildId, settings);

    const reply = await sendNotice(
      message,
      `تم تعيين الإيموجي ${emoji} لقسم **${sectionName}**.`
    );
    deleteAfter(reply);
    return true;
  }

  if (action === 'حذف') {
    const sectionName = actionValue.trim();
    const index = settings.sections.findIndex(
      item => item.name === sectionName
    );

    if (index === -1) {
      const reply = await sendNotice(
        message,
        `قسم "${sectionName}" غير موجود.`
      );
      deleteAfter(reply);
      return true;
    }

    settings.sections.splice(index, 1);
    await saveTicketSettings(guildId, settings);

    const reply = await sendNotice(
      message,
      `تم حذف قسم **${sectionName}**.`,
      { title: '🗑️ حذف قسم' }
    );
    deleteAfter(reply);
    return true;
  }

  if (action === 'نص') {
    if (!actionValue) {
      const reply = await sendNotice(message, 'اكتب النص الجديد.');
      deleteAfter(reply);
      return true;
    }

    settings.text = truncate(actionValue, 4000);
    await saveTicketSettings(guildId, settings);

    const reply = await sendNotice(message, 'تم تغيير نص التذاكر.');
    deleteAfter(reply);
    return true;
  }

  if (action === 'صورة') {
    if (!actionValue) {
      settings.image = null;
      await saveTicketSettings(guildId, settings);

      const reply = await sendNotice(message, 'تم إلغاء صورة التذاكر.');
      deleteAfter(reply);
      return true;
    }

    const url = safeHttpUrl(actionValue);

    if (!url) {
      const reply = await sendNotice(message, 'الرابط غير صالح.');
      deleteAfter(reply);
      return true;
    }

    settings.image = url;
    await saveTicketSettings(guildId, settings);

    const reply = await sendNotice(
      message,
      `تم تعيين صورة التذاكر.\n${url}`
    );
    deleteAfter(reply);
    return true;
  }

  if (action === 'فئة') {
    const categoryId = actionValue.trim();

    if (!categoryId) {
      settings.categoryId = null;
      await saveTicketSettings(guildId, settings);

      const reply = await sendNotice(message, 'تم إلغاء فئة التذاكر.');
      deleteAfter(reply);
      return true;
    }

    if (!isSnowflake(categoryId)) {
      const reply = await sendNotice(message, 'آيدي الفئة غير صالح.');
      deleteAfter(reply);
      return true;
    }

    const category = await message.guild.channels
      .fetch(categoryId)
      .catch(() => null);

    if (!category || category.type !== ChannelType.GuildCategory) {
      const reply = await sendNotice(message, 'لم أجد فئة بهذا الآيدي.');
      deleteAfter(reply);
      return true;
    }

    settings.categoryId = category.id;
    await saveTicketSettings(guildId, settings);

    const reply = await sendNotice(
      message,
      `تم تعيين فئة التذاكر إلى **${category.name}**.`
    );
    deleteAfter(reply);
    return true;
  }

  const reply = await sendNotice(message, 'خيار غير معروف.');
  deleteAfter(reply);
  return true;
}

// ============================================================
// نهاية الجزء 2/3
// ============================================================
console.log('✅ الجزء 2/3 تم تحميله.');
// ============================================================
// ========== أوامر المجتمع ==========
// ============================================================

async function handleCommunityCommands(context) {
  const { message, guildId, config, generalImage, cmd, args, deleteAfter } =
    context;

  // ===== بانل التذاكر =====
  if (cmd === 'بانل') {
    if (!(await hasPermission(message.member, guildId))) {
      const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
      return true;
    }

    const panel = await buildTicketPanel(message.guild, config);

    if (panel.empty) {
      const reply = await sendNotice(
        message,
        'لا توجد أقسام مضافة. أضف قسمًا أولاً.'
      );
      deleteAfter(reply);
      return true;
    }

    try {
      await message.channel.send({
        embeds: [panel.embed],
        components: panel.rows,
      });

      logToChannel(guildId, {
        title: '🎫 إنشاء لوحة تذاكر',
        description: `**${message.author.tag}** أنشأ لوحة تذاكر.`,
        footer: 'TICKETS',
      });

      const reply = await sendNotice(message, 'تم إنشاء لوحة التذاكر.');
      deleteAfter(reply);
    } catch (error) {
      reportError('ticket-panel', error);
      const reply = await sendNotice(message, 'فشل إنشاء اللوحة.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
    }

    return true;
  }

  // ===== بانل الزاجل =====
  if (cmd === 'بانل_زاجل') {
    if (!(await hasPermission(message.member, guildId))) {
      const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
      return true;
    }

    const panel = await buildPigeonPanel(config);

    let targetChannel = message.channel;

    if (config.pigeonChannel) {
      const pigeonChannel = message.guild.channels.cache.get(
        config.pigeonChannel
      );
      if (pigeonChannel) targetChannel = pigeonChannel;
    }

    try {
      await targetChannel.send({
        embeds: [panel.embed],
        components: panel.rows,
      });

      logToChannel(guildId, {
        title: '🕊️ إنشاء بانل الزاجل',
        description: `**${message.author.tag}** أنشأ بانل الزاجل في ${targetChannel}`,
        footer: 'PIGEON',
      });

      const reply = await sendNotice(
        message,
        `تم إنشاء بانل الزاجل في ${targetChannel}.` +
          (config.pigeonChannel ? '' : '\n\n⚠️ لم يتم تعيين روم للزاجل.')
      );
      deleteAfter(reply);
    } catch (error) {
      reportError('pigeon-panel', error);
      const reply = await sendNotice(message, 'فشل إنشاء البانل.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
    }

    return true;
  }

  // ===== بانل التقديمات =====
  if (cmd === 'بانل_تقديم') {
    if (!(await hasPermission(message.member, guildId))) {
      const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
      return true;
    }

    const panel = await buildApplyPanel(guildId, config);

    if (panel.empty) {
      const reply = await sendNotice(
        message,
        'لا توجد أقسام تقديم. استخدم `!تعيين_تقديمات` أولاً.'
      );
      deleteAfter(reply);
      return true;
    }

    let targetChannel = message.channel;

    if (config.applyPanelChannel) {
      const channel = message.guild.channels.cache.get(
        config.applyPanelChannel
      );
      if (channel) targetChannel = channel;
    }

    try {
      await targetChannel.send({
        embeds: [panel.embed],
        components: panel.rows,
      });

      logToChannel(guildId, {
        title: '📋 إنشاء بانل التقديمات',
        description: `**${message.author.tag}** أنشأ بانل التقديمات في ${targetChannel}`,
        footer: 'APPLICATIONS',
      });

      const reply = await sendNotice(
        message,
        `تم إنشاء بانل التقديمات في ${targetChannel}.`
      );
      deleteAfter(reply);
    } catch (error) {
      reportError('apply-panel', error);
      const reply = await sendNotice(message, 'فشل إنشاء البانل.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
    }

    return true;
  }

  // ===== لوحة إدارة التقديمات =====
  if (cmd === 'تعيين_تقديمات' || cmd === 'تعيين_التقديمات') {
    if (!(await hasPermission(message.member, guildId))) {
      const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
      return true;
    }

    const panel = await buildApplyAdminPanel(guildId);

    await message.channel.send({
      embeds: [panel.embed],
      components: panel.rows,
    });

    return true;
  }

  // ===== أمر النتيجة =====
  if (cmd === 'نتيجة') {
    return handleApplicationResult(context);
  }

  // ===== لوحة الحماية =====
  if (cmd === 'حماية') {
    if (!(await hasPermission(message.member, guildId))) {
      const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
      return true;
    }

    const panel = await buildProtectionPanel(guildId);

    await message.channel.send({
      embeds: [panel.embed],
      components: panel.rows,
    });

    return true;
  }

  // ===== اختبار اللوق =====
  if (cmd === 'اختبار_لوق') {
    if (!(await hasPermission(message.member, guildId))) {
      const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
      return true;
    }

    if (!config.logChannel) {
      const reply = await sendNotice(message, 'لم يتم تعيين قناة السجلات.');
      deleteAfter(reply);
      return true;
    }

    logToChannel(guildId, {
      title: '🧪 اختبار اللوق',
      color: THEME.ORANGE,
      description: `✅ اللوق يعمل بنجاح.\n**المنفذ:** ${message.author}`,
      footer: 'TEST',
    });

    const reply = await sendNotice(message, 'تم إرسال رسالة اختبار.');
    deleteAfter(reply);
    return true;
  }

  // ===== التقييمات =====
  if (cmd === 'تقييمات' || cmd === 'عرض_التقييمات') {
    return handleRatingsView(context);
  }

  // ===== الردود التلقائية =====
  if (cmd === 'رد_تلقائي') {
    return handleAutoReplyAdd(context, false);
  }

  if (cmd === 'رد_تلقائي_صورة') {
    return handleAutoReplyAdd(context, true);
  }

  if (cmd === 'حذف_رد_تلقائي') {
    return handleAutoReplyDelete(context);
  }

  // ===== إنستغرام =====
  if (cmd === 'ig') {
    return handleInstagramCommand(context);
  }

  return false;
}

// ============================================================
// ========== أمر النتيجة ==========
// ============================================================

async function handleApplicationResult(context) {
  const { message, guildId, config, args, deleteAfter } = context;

  if (!(await hasPermission(message.member, guildId))) {
    const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
      color: THEME.ERROR,
    });
    deleteAfter(reply);
    return true;
  }

  const target = message.mentions.members.first();
  const sectionName = args[1];
  const rawResult = args[2]?.toLowerCase();

  if (!target || !sectionName || !rawResult) {
    const reply = await sendNotice(
      message,
      'الصيغة: `!نتيجة @عضو [اسم_القسم] [قبول/رفض]`'
    );
    deleteAfter(reply);
    return true;
  }

  const isAccepted = ['قبول', 'accept'].includes(rawResult);
  const isRejected = ['رفض', 'reject'].includes(rawResult);

  if (!isAccepted && !isRejected) {
    const reply = await sendNotice(
      message,
      'النتيجة يجب أن تكون `قبول` أو `رفض`.'
    );
    deleteAfter(reply);
    return true;
  }

  const section = await getApplySectionByName(guildId, sectionName);

  if (!section) {
    const reply = await sendNotice(
      message,
      `قسم "${sectionName}" غير موجود.`
    );
    deleteAfter(reply);
    return true;
  }

  const role = section.roleId
    ? await message.guild.roles.fetch(section.roleId).catch(() => null)
    : null;

  const logChannel = section.logChannelId
    ? await getTextChannel(message.guild, section.logChannelId)
    : null;

  const resultLog = config.applyResultLog
    ? await getTextChannel(message.guild, config.applyResultLog)
    : null;

  if (isAccepted) {
    if (role && canManageRole(message.guild, role)) {
      await target.roles
        .add(role, 'KINGDOM • قبول التقديم')
        .catch(error => reportError('apply-accept-role', error));
    }

    const embed = createEmbed({
      title: `✅ ${target.user.username} | مقبول`,
      description:
        `**تم قبولك في قسم ${section.name}**\n` +
        `**في سيرفر:** ${message.guild.name}\n\n` +
        '> حياك الله، بالتوفيق في مهامك.',
      thumbnail: message.guild.iconURL({ extension: 'png', size: 256 }),
      footer: 'KINGDOM • RECRUITMENT',
      timestamp: true,
    });

    if (logChannel) {
      await logChannel
        .send({ embeds: [embed] })
        .catch(error => reportError('apply-log', error));
    }

    if (resultLog) {
      await resultLog
        .send({ embeds: [embed] })
        .catch(error => reportError('apply-result-log', error));
    }

    await target
      .send({
        embeds: [
          createEmbed({
            title: '🎉 مبروك القبول',
            description:
              `تم قبولك في قسم **${section.name}** ` +
              `في سيرفر **${message.guild.name}**.`,
            footer: 'KINGDOM',
            timestamp: true,
          }),
        ],
      })
      .catch(() => {});

    await Application.findOneAndUpdate(
      {
        guildId,
        userId: target.id,
        type: section.name,
        status: 'pending',
      },
      {
        $set: {
          status: 'accepted',
          reviewedBy: message.author.id,
          reviewedAt: new Date(),
        },
      },
      { sort: { createdAt: -1 }, new: true }
    ).catch(error => reportError('apply-db', error));

    const reply = await sendNotice(
      message,
      `تم قبول ${target} في قسم **${section.name}**.`,
      { title: '✅ نتيجة التقديم' }
    );

    deleteAfter(reply);
  } else {
    const embed = createEmbed({
      title: `❌ ${target.user.username} | مرفوض`,
      description:
        `**تم رفض طلبك في قسم ${section.name}**\n` +
        `**في سيرفر:** ${message.guild.name}\n\n` +
        '> نقدّر مشاركتك، ويمكنك التقديم مجددًا لاحقًا.',
      thumbnail: message.guild.iconURL({ extension: 'png', size: 256 }),
      footer: 'KINGDOM • RECRUITMENT',
      timestamp: true,
    });

    if (logChannel) {
      await logChannel
        .send({ embeds: [embed] })
        .catch(error => reportError('apply-log', error));
    }

    if (resultLog) {
      await resultLog
        .send({ embeds: [embed] })
        .catch(error => reportError('apply-result-log', error));
    }

    await target
      .send({
        embeds: [
          createEmbed({
            title: '📩 نتيجة التقديم',
            description:
              `تم رفض طلبك في قسم **${section.name}** ` +
              `في سيرفر **${message.guild.name}**.`,
            footer: 'KINGDOM',
            timestamp: true,
          }),
        ],
      })
      .catch(() => {});

    await Application.findOneAndUpdate(
      {
        guildId,
        userId: target.id,
        type: section.name,
        status: 'pending',
      },
      {
        $set: {
          status: 'rejected',
          reviewedBy: message.author.id,
          reviewedAt: new Date(),
        },
      },
      { sort: { createdAt: -1 }, new: true }
    ).catch(error => reportError('apply-db', error));

    const reply = await sendNotice(
      message,
      `تم رفض ${target} في قسم **${section.name}**.`,
      { title: '❌ نتيجة التقديم' }
    );

    deleteAfter(reply);
  }

  logToChannel(guildId, {
    title: '📋 نتيجة تقديم',
    description:
      `**العضو:** ${target.user.tag}\n` +
      `**القسم:** ${section.name}\n` +
      `**النتيجة:** ${isAccepted ? '✅ قبول' : '❌ رفض'}\n` +
      `**بواسطة:** ${message.author}`,
    footer: 'APPLICATIONS',
  });

  return true;
}

// ============================================================
// ========== عرض التقييمات ==========
// ============================================================

async function handleRatingsView(context) {
  const { message, guildId, generalImage, deleteAfter } = context;

  if (!(await hasPermission(message.member, guildId))) {
    const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
      color: THEME.ERROR,
    });
    deleteAfter(reply);
    return true;
  }

  const allRatings = await TicketRating.find({
    guildId,
    rating: { $exists: true, $ne: null },
  });

  const recentRatings = await TicketRating.find({ guildId })
    .sort({ createdAt: -1 })
    .limit(10);

  if (!allRatings.length && !recentRatings.length) {
    const reply = await sendNotice(message, 'لا توجد تقييمات حتى الآن.');
    deleteAfter(reply);
    return true;
  }

  const average = allRatings.length
    ? (
        allRatings.reduce((sum, item) => sum + item.rating, 0) /
        allRatings.length
      ).toFixed(2)
    : '0';

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const rating of allRatings) {
    if (rating.rating >= 1 && rating.rating <= 5) {
      distribution[rating.rating] += 1;
    }
  }

  let description =
    `**📊 متوسط التقييم:** ${average} / 5 ⭐\n` +
    `**📈 إجمالي التقييمات:** ${allRatings.length}\n\n` +
    '**توزيع التقييمات:**\n';

  for (let index = 5; index >= 1; index -= 1) {
    const count = distribution[index];
    const bar = '█'.repeat(Math.min(count, 20));
    description += `${'⭐'.repeat(index)} (${count}) ${bar}\n`;
  }

  description += '\n**آخر 10 تقييمات:**\n\n';

  for (const rating of recentRatings) {
    const stars = rating.rating ? '⭐'.repeat(rating.rating) : '—';

    const user = await client.users
      .fetch(rating.userId)
      .catch(() => null);

    const name = user ? user.username : `مستخدم ${rating.userId}`;

    description += `**${name}** — ${stars}`;

    if (rating.rating) {
      description += ` (${rating.rating}/5)`;
    }

    description += '\n';

    if (rating.section) {
      description += `> 📌 القسم: ${rating.section}\n`;
    }

    if (rating.comment) {
      description += `> 💬 ${truncate(rating.comment, 200)}\n`;
    }

    description += `> 📅 ${discordTimestamp(rating.createdAt, 'R')}\n\n`;
  }

  const embed = createEmbed({
    title: '⭐ KINGDOM | تقييمات التذاكر',
    description: truncate(description, 4000),
    thumbnail: generalImage,
    footer: `KINGDOM • ${allRatings.length} تقييم`,
    timestamp: true,
  });

  await message.channel.send({ embeds: [embed] });

  return true;
}

// ============================================================
// ========== الردود التلقائية (إضافة / حذف) ==========
// ============================================================

async function handleAutoReplyAdd(context, withImage) {
  const { message, guildId, args, deleteAfter } = context;

  if (!(await hasPermission(message.member, guildId))) {
    const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
      color: THEME.ERROR,
    });
    deleteAfter(reply);
    return true;
  }

  const keyword = args[0];
  let imageUrl = null;
  let replyText;

  if (withImage) {
    const rawImage = args[args.length - 1];
    replyText = args.slice(1, -1).join(' ');
    imageUrl = safeHttpUrl(rawImage);
  } else {
    replyText = args.slice(1).join(' ');
  }

  if (!keyword || !replyText) {
    const reply = await sendNotice(
      message,
      withImage
        ? 'الصيغة: `!رد_تلقائي_صورة [كلمة] [رد] [رابط_صورة]`'
        : 'الصيغة: `!رد_تلقائي [كلمة] [رد]`'
    );
    deleteAfter(reply);
    return true;
  }

  if (withImage && !imageUrl) {
    const reply = await sendNotice(message, 'رابط الصورة غير صالح.');
    deleteAfter(reply);
    return true;
  }

  try {
    const created = await addAutoReply(
      guildId,
      keyword,
      truncate(replyText, 2000),
      imageUrl
    );

    const embed = createEmbed({
      title: created ? '✅ تم إضافة رد تلقائي' : '🔄 تم تحديث رد تلقائي',
      description:
        `**الكلمة:** ${keyword}\n` +
        `**الرد:** ${truncate(replyText, 300)}`,
      image: imageUrl,
      footer: 'KINGDOM • AUTO REPLY',
      timestamp: true,
    });

    const reply = await message.channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });

    deleteAfter(reply);
  } catch (error) {
    reportError('auto-reply-add', error);
    const reply = await sendNotice(message, 'فشل حفظ الرد التلقائي.', {
      color: THEME.ERROR,
    });
    deleteAfter(reply);
  }

  return true;
}

async function handleAutoReplyDelete(context) {
  const { message, guildId, args, deleteAfter } = context;

  if (!(await hasPermission(message.member, guildId))) {
    const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
      color: THEME.ERROR,
    });
    deleteAfter(reply);
    return true;
  }

  const keyword = args.join(' ').trim();

  if (!keyword) {
    const reply = await sendNotice(message, 'اكتب الكلمة المفتاحية.');
    deleteAfter(reply);
    return true;
  }

  const removed = await removeAutoReply(guildId, keyword);

  const reply = await sendNotice(
    message,
    removed
      ? `تم حذف الرد التلقائي للكلمة **${keyword}**.`
      : `لا يوجد رد تلقائي للكلمة **${keyword}**.`,
    { title: removed ? '🗑️ حذف رد' : '⚠️ غير موجود' }
  );

  deleteAfter(reply);
  return true;
}

// ============================================================
// ========== إنستغرام ==========
// ============================================================

let instagramModule = null;

async function loadInstagramModule() {
  if (instagramModule !== null) return instagramModule;

  try {
    instagramModule = require('instagram-url-direct');
  } catch {
    instagramModule = false;
  }

  return instagramModule;
}

async function handleInstagramCommand(context) {
  const { message, args } = context;
  const url = args[0];

  if (!url) {
    await sendNotice(message, 'الصيغة: `!ig رابط_الريلز`');
    return true;
  }

  const safeUrl = safeHttpUrl(url);

  if (!safeUrl || !/(?:instagram\.com|instagr\.am)\//i.test(safeUrl)) {
    await sendNotice(message, 'الرابط يجب أن يكون من إنستغرام.');
    return true;
  }

  const instagram = await loadInstagramModule();

  if (!instagram) {
    await sendNotice(message, 'مكتبة إنستغرام غير مثبتة على الخادم.');
    return true;
  }

  const loadingMsg = await message.reply({
    content: '⏳ جاري تحميل الفيديو...',
    allowedMentions: { parse: [], repliedUser: false },
  });

  try {
    const result = await instagram(safeUrl);

    const videoUrl = Array.isArray(result) ? result[0]?.url : result?.url;
    const safeVideoUrl = safeHttpUrl(videoUrl);

    if (!safeVideoUrl) {
      throw new Error('تعذر استخراج رابط الفيديو.');
    }

    const response = await fetch(safeVideoUrl, {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get('content-length'));
    const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

    if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
      throw new Error('حجم الفيديو يتجاوز الحد المسموح.');
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_VIDEO_BYTES) {
      throw new Error('حجم الفيديو يتجاوز الحد المسموح.');
    }

    await message.reply({
      files: [{ attachment: buffer, name: 'reel.mp4' }],
      allowedMentions: { parse: [], repliedUser: false },
    });

    await loadingMsg.delete().catch(() => {});
  } catch (error) {
    reportError('instagram', error);

    await loadingMsg
      .edit({
        content: '❌ فشل تحميل الفيديو. تأكد من الرابط.',
        allowedMentions: { parse: [], repliedUser: false },
      })
      .catch(() => {});
  }

  return true;
}

// ============================================================
// ========== أوامر الإشراف ==========
// ============================================================

async function handleModerationCommands(context) {
  const {
    message,
    guildId,
    config,
    generalImage,
    cmd,
    args,
    deleteAfter,
  } = context;

  const moderationCommands = [
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
    'انشاء_قناة',
    'تثبيت',
    'الغاء_تثبيت',
    'اعطاء_رتبة',
    'سحب_رتبة',
    'اعلان',
  ];

  if (!moderationCommands.includes(cmd)) return false;

  if (!(await hasPermission(message.member, guildId))) {
    const reply = await sendNotice(message, 'هذا الأمر للمتحكمين فقط.', {
      color: THEME.ERROR,
    });
    deleteAfter(reply);
    return true;
  }

  // ===== حظر =====
  if (cmd === 'حظر') {
    const target = message.mentions.members.first();

    if (!target) {
      const reply = await sendNotice(message, 'منشن العضو.');
      deleteAfter(reply);
      return true;
    }

    if (!(await canModerateTarget(message.member, target, guildId))) {
      const reply = await sendNotice(message, 'لا يمكنك استهداف هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (
      !me.permissions.has(PermissionsBitField.Flags.BanMembers) ||
      !target.bannable
    ) {
      const reply = await sendNotice(message, 'لا يمكنني حظر هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const reason =
      args.filter(arg => !arg.startsWith('<@')).join(' ').slice(0, 500) ||
      'بدون سبب';

    await target.ban({
      reason: truncate(`${reason} | بواسطة ${message.author.tag}`, 512),
    });

    logToChannel(guildId, {
      title: '🔨 حظر عضو',
      color: THEME.ERROR,
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}\n` +
        `**السبب:** ${reason}`,
      thumbnail: target.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: 'MODERATION',
    });

    const reply = await sendNotice(
      message,
      `تم حظر **${target.user.tag}**.\n**السبب:** ${reason}`,
      { title: '🔨 حظر' }
    );
    deleteAfter(reply);
    return true;
  }

  // ===== طرد =====
  if (cmd === 'طرد') {
    const target = message.mentions.members.first();

    if (!target) {
      const reply = await sendNotice(message, 'منشن العضو.');
      deleteAfter(reply);
      return true;
    }

    if (!(await canModerateTarget(message.member, target, guildId))) {
      const reply = await sendNotice(message, 'لا يمكنك استهداف هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (
      !me.permissions.has(PermissionsBitField.Flags.KickMembers) ||
      !target.kickable
    ) {
      const reply = await sendNotice(message, 'لا يمكنني طرد هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const reason =
      args.filter(arg => !arg.startsWith('<@')).join(' ').slice(0, 500) ||
      'بدون سبب';

    await target.kick(
      truncate(`${reason} | بواسطة ${message.author.tag}`, 512)
    );

    logToChannel(guildId, {
      title: '🚪 طرد عضو',
      color: THEME.ERROR,
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}\n` +
        `**السبب:** ${reason}`,
      thumbnail: target.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: 'MODERATION',
    });

    const reply = await sendNotice(
      message,
      `تم طرد **${target.user.tag}**.\n**السبب:** ${reason}`,
      { title: '🚪 طرد' }
    );
    deleteAfter(reply);
    return true;
  }

  // ===== كتم =====
  if (cmd === 'كتم') {
    const target = message.mentions.members.first();

    if (!target) {
      const reply = await sendNotice(message, 'منشن العضو.');
      deleteAfter(reply);
      return true;
    }

    if (!(await canModerateTarget(message.member, target, guildId))) {
      const reply = await sendNotice(message, 'لا يمكنك استهداف هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (
      !me.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
      !target.moderatable
    ) {
      const reply = await sendNotice(message, 'لا يمكنني كتم هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const reason =
      args.filter(arg => !arg.startsWith('<@')).join(' ').slice(0, 500) ||
      'بدون سبب';

    await target.timeout(
      LIMITS.PROTECTION_TIMEOUT,
      truncate(`${reason} | بواسطة ${message.author.tag}`, 512)
    );

    logToChannel(guildId, {
      title: '🔇 كتم عضو',
      color: THEME.ERROR,
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}\n` +
        `**السبب:** ${reason}\n` +
        `**المدة:** 10 دقائق`,
      thumbnail: target.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: 'MODERATION',
    });

    const reply = await sendNotice(
      message,
      `تم كتم **${target.user.tag}** لمدة 10 دقائق.`,
      { title: '🔇 كتم' }
    );
    deleteAfter(reply);
    return true;
  }

  // ===== فك كتم =====
  if (cmd === 'فك_كتم') {
    const target = message.mentions.members.first();

    if (!target) {
      const reply = await sendNotice(message, 'منشن العضو.');
      deleteAfter(reply);
      return true;
    }

    if (!target.isCommunicationDisabled()) {
      const reply = await sendNotice(message, 'هذا العضو غير مكتوم.');
      deleteAfter(reply);
      return true;
    }

    await target.timeout(
      null,
      truncate(`فك بواسطة ${message.author.tag}`, 512)
    );

    const reply = await sendNotice(
      message,
      `تم فك الكتم عن **${target.user.tag}**.`,
      { title: '🔊 فك كتم' }
    );

    logToChannel(guildId, {
      title: '🔊 فك كتم',
      color: THEME.ORANGE,
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}`,
      footer: 'MODERATION',
    });

    deleteAfter(reply);
    return true;
  }

  // ===== تحذير =====
  if (cmd === 'تحذير') {
    const target = message.mentions.members.first();

    if (!target) {
      const reply = await sendNotice(message, 'منشن العضو.');
      deleteAfter(reply);
      return true;
    }

    if (!(await canModerateTarget(message.member, target, guildId))) {
      const reply = await sendNotice(message, 'لا يمكنك استهداف هذا العضو.');
      deleteAfter(reply);
      return true;
    }

    const reason =
      args.filter(arg => !arg.startsWith('<@')).join(' ').slice(0, 500) ||
      'بدون سبب';

    const count = await addWarn(guildId, target.id, reason, message.author.id);

    logToChannel(guildId, {
      title: '⚠️ تحذير عضو',
      color: THEME.WARN,
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}\n` +
        `**السبب:** ${reason}\n` +
        `**الإجمالي:** ${count}`,
      thumbnail: target.user.displayAvatarURL({ extension: 'png', size: 256 }),
      footer: 'MODERATION',
    });

    await target
      .send({
        embeds: [
          createEmbed({
            title: '⚠️ تنبيه إداري',
            description:
              `**السيرفر:** ${message.guild.name}\n` +
              `**السبب:** ${reason}\n` +
              `**إجمالي تحذيراتك:** ${count}`,
            color: THEME.WARN,
            footer: 'KINGDOM',
            timestamp: true,
          }),
        ],
      })
      .catch(() => {});

    const reply = await sendNotice(
      message,
      `تم تحذير **${target.user.tag}**.\n**الإجمالي:** ${count}`,
      { title: '⚠️ تحذير' }
    );
    deleteAfter(reply);
    return true;
  }

  // ===== إبطال تحذيرات =====
  if (cmd === 'ابطال_تحذيرات') {
    const target = message.mentions.members.first();

    if (!target) {
      const reply = await sendNotice(message, 'منشن العضو.');
      deleteAfter(reply);
      return true;
    }

    await clearWarns(guildId, target.id);

    const reply = await sendNotice(
      message,
      `تم إلغاء كل تحذيرات **${target.user.tag}**.`,
      { title: '✅ إبطال التحذيرات' }
    );

    logToChannel(guildId, {
      title: '✅ إبطال تحذيرات',
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}`,
      footer: 'MODERATION',
    });

    deleteAfter(reply);
    return true;
  }

  // ===== مسح =====
  if (cmd === 'مسح') {
    const amount = parseStrictInteger(args[0], 1, 100) || 10;

    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية إدارة الرسائل.');
      deleteAfter(reply);
      return true;
    }

    try {
      const deleted = await message.channel.bulkDelete(amount, true);

      const reply = await sendNotice(message, `تم مسح **${deleted.size}** رسالة.`, {
        title: '🧹 مسح رسائل',
      });

      scheduleDelete(reply, 4000);
    } catch (error) {
      reportError('bulk-delete', error);
      const reply = await sendNotice(
        message,
        'فشل المسح. تأكد من عمر الرسائل.',
        { color: THEME.ERROR }
      );
      deleteAfter(reply);
    }

    return true;
  }

  // ===== قفل =====
  if (cmd === 'قفل') {
    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية إدارة القنوات.');
      deleteAfter(reply);
      return true;
    }

    const everyone = message.guild.roles.everyone;
    const existing = message.channel.permissionOverwrites.cache.get(
      everyone.id
    );

    let previousState = 'inherit';
    if (existing?.allow.has(PermissionsBitField.Flags.SendMessages)) {
      previousState = 'allow';
    } else if (existing?.deny.has(PermissionsBitField.Flags.SendMessages)) {
      previousState = 'deny';
    }

    await ChannelLock.findOneAndUpdate(
      { guildId, channelId: message.channel.id },
      {
        $set: {
          previousSendMessages: previousState,
          lockedBy: message.author.id,
        },
        $setOnInsert: { guildId, channelId: message.channel.id },
      },
      { upsert: true, new: true }
    );

    await message.channel.permissionOverwrites.edit(everyone.id, {
      SendMessages: false,
    });

    const reply = await sendNotice(message, `تم قفل ${message.channel}.`, {
      title: '🔒 قفل القناة',
    });
    deleteAfter(reply);
    return true;
  }

  // ===== فتح =====
  if (cmd === 'فتح') {
    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية إدارة القنوات.');
      deleteAfter(reply);
      return true;
    }

    const everyone = message.guild.roles.everyone;
    const lockData = await ChannelLock.findOne({
      guildId,
      channelId: message.channel.id,
    });

    const targetState = lockData ? lockData.previousSendMessages : 'inherit';

    if (targetState === 'inherit') {
      await message.channel.permissionOverwrites
        .delete(everyone.id)
        .catch(() => {});
    } else {
      await message.channel.permissionOverwrites.edit(everyone.id, {
        SendMessages: targetState === 'allow',
      });
    }

    await ChannelLock.deleteOne({
      guildId,
      channelId: message.channel.id,
    });

    const reply = await sendNotice(message, `تم فتح ${message.channel}.`, {
      title: '🔓 فتح القناة',
    });
    deleteAfter(reply);
    return true;
  }

  // ===== نقل الكل =====
  if (cmd === 'نقل_كل') {
    const voiceChannels = message.mentions.channels.filter(
      channel => channel.type === ChannelType.GuildVoice
    );

    if (voiceChannels.size < 2) {
      const reply = await sendNotice(
        message,
        'منشن قناتين صوتيتين: `!نقل_كل #من #إلى`'
      );
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية نقل الأعضاء.');
      deleteAfter(reply);
      return true;
    }

    const channels = [...voiceChannels.values()];
    const from = channels[0];
    const to = channels[1];

    const targetMembers = [...from.members.values()].filter(
      target => !target.user.bot
    );

    let moved = 0;

    for (const target of targetMembers) {
      try {
        await target.voice.setChannel(
          to,
          `نقل جماعي بواسطة ${message.author.tag}`
        );
        moved += 1;
      } catch (error) {
        reportError('voice-move', error);
      }
    }

    const reply = await sendNotice(
      message,
      `تم نقل **${moved}** عضو من ${from} إلى ${to}.`,
      { title: '🔊 نقل جماعي' }
    );
    deleteAfter(reply);
    return true;
  }

  // ===== إنشاء قناة =====
  if (cmd === 'انشاء_قناة') {
    const name = args.join(' ').trim();

    if (!name) {
      const reply = await sendNotice(message, 'اكتب اسم القناة.');
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية إدارة القنوات.');
      deleteAfter(reply);
      return true;
    }

    const safeName = sanitizeChannelName(name);

    const channel = await message.guild.channels.create({
      name: safeName,
      type: ChannelType.GuildText,
      reason: `بواسطة ${message.author.tag}`,
    });

    const reply = await sendNotice(message, `تم إنشاء ${channel}.`, {
      title: '✅ إنشاء قناة',
    });
    deleteAfter(reply);
    return true;
  }

  // ===== حذف قناة =====
  if (cmd === 'حذف_قناة') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن القناة.');
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية إدارة القنوات.');
      deleteAfter(reply);
      return true;
    }

    const channelName = channel.name;

    await channel.delete(`بواسطة ${message.author.tag}`);

    const reply = await sendNotice(message, `تم حذف **${channelName}**.`, {
      title: '🗑️ حذف قناة',
    });
    deleteAfter(reply);
    return true;
  }

  // ===== تغيير اسم قناة =====
  if (cmd === 'تغيير_اسم_قناة') {
    const channel = message.mentions.channels.first();

    if (!channel) {
      const reply = await sendNotice(message, 'منشن القناة.');
      deleteAfter(reply);
      return true;
    }

    const newName = args
      .filter(arg => !arg.startsWith('<#'))
      .join(' ')
      .trim();

    if (!newName) {
      const reply = await sendNotice(message, 'اكتب الاسم الجديد.');
      deleteAfter(reply);
      return true;
    }

    const me = message.guild.members.me;

    if (!me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      const reply = await sendNotice(message, 'لا أملك صلاحية إدارة القنوات.');
      deleteAfter(reply);
      return true;
    }

    const safeName = sanitizeChannelName(newName);

    await channel.setName(safeName, `بواسطة ${message.author.tag}`);

    const reply = await sendNotice(
      message,
      `تم تغيير الاسم إلى **${safeName}**.`,
      { title: '✏️ تغيير اسم القناة' }
    );
    deleteAfter(reply);
    return true;
  }

  // ===== تثبيت / إلغاء تثبيت =====
  if (cmd === 'تثبيت' || cmd === 'الغاء_تثبيت') {
    const messageId = args[0];

    if (!messageId || !isSnowflake(messageId)) {
      const reply = await sendNotice(message, 'أدخل معرف الرسالة.');
      deleteAfter(reply);
      return true;
    }

    try {
      const target = await message.channel.messages.fetch(messageId);
      const me = message.guild.members.me;

      if (!me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const reply = await sendNotice(message, 'لا أملك صلاحية إدارة الرسائل.');
        deleteAfter(reply);
        return true;
      }

      if (cmd === 'تثبيت') {
        await target.pin();
      } else {
        await target.unpin();
      }

      const reply = await sendNotice(message, `[اضغط للانتقال](${target.url})`, {
        title:
          cmd === 'تثبيت' ? '📌 تم التثبيت' : '📌 تم إلغاء التثبيت',
      });

      deleteAfter(reply);
    } catch (error) {
      reportError('pin-message', error);
      const reply = await sendNotice(message, 'تأكد من معرف الرسالة.', {
        color: THEME.ERROR,
      });
      deleteAfter(reply);
    }

    return true;
  }

  // ===== إعطاء رتبة =====
  if (cmd === 'اعطاء_رتبة') {
    const target = message.mentions.members.first();
    const role = message.mentions.roles.first();

    if (!target || !role) {
      const reply = await sendNotice(message, 'منشن العضو والرتبة.');
      deleteAfter(reply);
      return true;
    }

    if (!canManageRole(message.guild, role)) {
      const reply = await sendNotice(message, 'لا يمكن إدارة هذه الرتبة.');
      deleteAfter(reply);
      return true;
    }

    if (target.roles.cache.has(role.id)) {
      const reply = await sendNotice(
        message,
        `${target} يمتلك هذه الرتبة بالفعل.`
      );
      deleteAfter(reply);
      return true;
    }

    await target.roles.add(role, `بواسطة ${message.author.tag}`);

    const reply = await sendNotice(message, `تم إعطاء ${role} لـ ${target}.`, {
      title: '✅ إعطاء رتبة',
    });

    logToChannel(guildId, {
      title: '🎭 إعطاء رتبة',
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}\n` +
        `**الرتبة:** ${role.name}`,
      footer: 'MODERATION',
    });

    deleteAfter(reply);
    return true;
  }

  // ===== سحب رتبة =====
  if (cmd === 'سحب_رتبة') {
    const target = message.mentions.members.first();
    const role = message.mentions.roles.first();

    if (!target || !role) {
      const reply = await sendNotice(message, 'منشن العضو والرتبة.');
      deleteAfter(reply);
      return true;
    }

    if (!canManageRole(message.guild, role)) {
      const reply = await sendNotice(message, 'لا يمكن إدارة هذه الرتبة.');
      deleteAfter(reply);
      return true;
    }

    if (!target.roles.cache.has(role.id)) {
      const reply = await sendNotice(
        message,
        `${target} لا يمتلك هذه الرتبة.`
      );
      deleteAfter(reply);
      return true;
    }

    await target.roles.remove(role, `بواسطة ${message.author.tag}`);

    const reply = await sendNotice(
      message,
      `تم سحب ${role} من ${target}.`,
      { title: '✅ سحب رتبة' }
    );

    logToChannel(guildId, {
      title: '🎭 سحب رتبة',
      color: THEME.DARK,
      description:
        `**المنفذ:** ${message.author.tag}\n` +
        `**المستهدف:** ${target.user.tag}\n` +
        `**الرتبة:** ${role.name}`,
      footer: 'MODERATION',
    });

    deleteAfter(reply);
    return true;
  }

  // ===== إعلان =====
  if (cmd === 'اعلان') {
    let mentionType = 'everyone';
    let text = args.join(' ');

    if (args[0]?.toLowerCase() === 'here') {
      mentionType = 'here';
      text = args.slice(1).join(' ');
    }

    if (!text) {
      const reply = await sendNotice(message, 'اكتب نص الإعلان.');
      deleteAfter(reply);
      return true;
    }

    const embed = createEmbed({
      title: '📢 إعلان رسمي',
      description: truncate(text, 4000),
      thumbnail: generalImage,
      footer: `KINGDOM • ${message.author.tag}`,
      timestamp: true,
    });

    await message.channel.send({
      content: mentionType === 'everyone' ? '@everyone' : '@here',
      embeds: [embed],
      allowedMentions: { parse: [mentionType] },
    });

    return true;
  }

  return false;
}

// ============================================================
// ========== معالج التفاعلات الرئيسي ==========
// ============================================================

client.on('interactionCreate', async interaction => {
  try {
    const id = interaction.customId;
    if (!id) return;

    // ===== لوحة الحماية =====
    if (interaction.isButton() && id.startsWith('prot_')) {
      return handleProtectionInteraction(interaction);
    }

    if (
      interaction.isStringSelectMenu() &&
      id === 'prot_action_select'
    ) {
      return handleProtectionInteraction(interaction);
    }

    // ===== مودالات الحماية =====
    if (interaction.isModalSubmit() && id.startsWith('prot_')) {
      return handleProtectionModal(interaction);
    }

    // ===== الرتب الذاتية =====
    if (
      interaction.isStringSelectMenu() &&
      id === 'self_roles_toggle'
    ) {
      return handleSelfRolesSelect(interaction);
    }

    if (interaction.isButton() && id.startsWith('self_roles_page')) {
      return handleSelfRolesPage(interaction);
    }

    // ===== الزاجل =====
    if (interaction.isButton() && id.startsWith('pigeon_')) {
      return handlePigeonInteraction(interaction);
    }

    if (interaction.isModalSubmit() && id === 'pigeon_send_modal') {
      return handlePigeonSendModal(interaction);
    }

    // ===== التقديمات العامة =====
    if (
      interaction.isStringSelectMenu() &&
      id === 'apply_section_select'
    ) {
      return handleApplyPublicSelect(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      id.startsWith('apply_modal_')
    ) {
      return handleApplyPublicModal(interaction);
    }

    if (
      interaction.isButton() &&
      id.startsWith('apply_public_page')
    ) {
      return handleApplyPublicPage(interaction);
    }

    // ===== التقديمات الإدارية =====
    if (
      interaction.isStringSelectMenu() &&
      id === 'apply_admin_select'
    ) {
      return handleApplyAdminSelect(interaction);
    }

    if (interaction.isButton() && id.startsWith('apply_')) {
      return handleApplyAdminButton(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      id.startsWith('apply_') &&
      !id.startsWith('apply_modal_')
    ) {
      return handleApplyAdminModal(interaction);
    }

    if (
      interaction.isButton() &&
      id.startsWith('apply_admin_page')
    ) {
      return handleApplyAdminPage(interaction);
    }

    // ===== التذاكر =====
    if (interaction.isStringSelectMenu() && id === 'ticket_menu') {
      return handleTicketCreate(interaction);
    }

    if (
      interaction.isStringSelectMenu() &&
      id === 'ticket_control'
    ) {
      return handleTicketControl(interaction);
    }

    if (interaction.isButton() && id === 'close_ticket') {
      return handleTicketClose(interaction);
    }

    if (interaction.isButton() && id.startsWith('rate_ticket_')) {
      return handleTicketRating(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      id.startsWith('ticket_comment_modal_')
    ) {
      return handleTicketCommentModal(interaction);
    }

    if (
      interaction.isModalSubmit() &&
      id.startsWith('ticket_') &&
      !id.startsWith('ticket_comment_modal_')
    ) {
      return handleTicketModal(interaction);
    }

    if (
      interaction.isButton() &&
      id.startsWith('ticket_panel_page')
    ) {
      return handleTicketPanelPage(interaction);
    }

    // ===== تغيير الاسم =====
    if (interaction.isButton() && id === 'open_name_modal') {
      return handleNameModalOpen(interaction);
    }

    if (interaction.isModalSubmit() && id === 'name_change_modal') {
      return handleNameModalSubmit(interaction);
    }

    // ===== رتب الإشعارات القديمة =====
    if (
      interaction.isButton() &&
      ['role_game', 'role_event', 'role_ajr'].includes(id)
    ) {
      return handleLegacyRoleToggle(interaction);
    }
  } catch (error) {
    reportError('interactionCreate', error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ حدث خطأ غير متوقع.',
          ephemeral: true,
        });
      }
    } catch {}
  }
});

// ============================================================
// ========== معالج لوحة الحماية ==========
// ============================================================

async function handleProtectionInteraction(interaction) {
  if (!(await requireControllerInteraction(interaction))) return;

  const id = interaction.customId;
  const guildId = interaction.guild.id;

  // ===== تحديث =====
  if (id === 'prot_refresh') {
    const panel = await buildProtectionPanel(guildId);
    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  // ===== تبديلات =====
  if (id === 'prot_toggle_main') {
    const config = await getGuildConfig(guildId);
    await updateGuildConfig(guildId, {
      protectionEnabled: !config.protectionEnabled,
    });
    const panel = await buildProtectionPanel(guildId);
    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  if (id === 'prot_toggle_spam') {
    const config = await getGuildConfig(guildId);
    await updateGuildConfig(guildId, {
      antiSpamEnabled: !config.antiSpamEnabled,
    });
    const panel = await buildProtectionPanel(guildId);
    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  if (id === 'prot_toggle_link') {
    const config = await getGuildConfig(guildId);
    await updateGuildConfig(guildId, {
      antiLinkEnabled: !config.antiLinkEnabled,
    });
    const panel = await buildProtectionPanel(guildId);
    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  if (id === 'prot_toggle_everyone') {
    const config = await getGuildConfig(guildId);
    await updateGuildConfig(guildId, {
      antiEveryoneEnabled: !config.antiEveryoneEnabled,
    });
    const panel = await buildProtectionPanel(guildId);
    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  // ===== قائمة الإجراء =====
  if (interaction.isStringSelectMenu() && id === 'prot_action_select') {
    await updateGuildConfig(guildId, {
      protectionAction: interaction.values[0],
    });
    const panel = await buildProtectionPanel(guildId);
    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  // ===== الكلمات =====
  if (id === 'prot_banned_words') {
    const words = await getBannedWords(guildId);

    const listText = words.length
      ? words
          .slice(0, 30)
          .map((word, index) => `${index + 1}. \`${word.word}\``)
          .join('\n')
      : 'لا توجد كلمات محظورة.';

    const embed = createEmbed({
      title: '🚫 KINGDOM | الكلمات المحظورة',
      description: `**الإجمالي:** ${words.length}\n\n**القائمة:**\n${listText}`,
      footer: 'KINGDOM • WORD FILTER',
      timestamp: true,
    });

    const row = new ActionRowBuilder().addComponents(
      createButton('prot_word_add', 'إضافة', '➕', BTN.MAIN),
      createButton('prot_word_remove', 'حذف', '🗑️'),
      createButton('prot_word_clear', 'مسح الكل', '🧹'),
      createButton('prot_refresh', 'رجوع', '↩️')
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (id === 'prot_word_add') {
    const modal = new ModalBuilder()
      .setCustomId('prot_word_add_modal')
      .setTitle('إضافة كلمة محظورة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('word_input')
            .setLabel('الكلمة')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        )
      );
    return interaction.showModal(modal);
  }

  if (id === 'prot_word_remove') {
    const modal = new ModalBuilder()
      .setCustomId('prot_word_remove_modal')
      .setTitle('حذف كلمة محظورة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('word_input')
            .setLabel('الكلمة')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        )
      );
    return interaction.showModal(modal);
  }

  if (id === 'prot_word_clear') {
    await BannedWord.deleteMany({ guildId });
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '🧹 تم المسح',
          description: 'تم حذف كل الكلمات المحظورة.',
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  // ===== الإجراءات =====
  if (id === 'prot_action') {
    const embed = createEmbed({
      title: '⚖️ الإجراء عند المخالفة',
      description:
        '`اختَر كيف تتعامل المملكة مع المخالفين.`\n\n' +
        '**الخيارات:**\n' +
        '🗑️ حذف فقط\n' +
        '🗑️ + 📩 تنبيه خاص\n' +
        '🗑️ + 🔇 Timeout 10 دقائق\n' +
        '🗑️ + 📩 + 🔇 كل الإجراءات',
      footer: 'KINGDOM • SECURITY',
      timestamp: true,
    });

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('prot_action_select')
        .setPlaceholder('اختَر الإجراء')
        .addOptions([
          { label: 'حذف فقط', value: 'delete', emoji: '🗑️' },
          { label: 'حذف + تنبيه خاص', value: 'delete_warn', emoji: '📩' },
          { label: 'حذف + Timeout', value: 'delete_mute', emoji: '🔇' },
          { label: 'كل الإجراءات', value: 'delete_warn_mute', emoji: '⚡' },
        ])
    );

    const back = new ActionRowBuilder().addComponents(
      createButton('prot_refresh', 'رجوع', '↩️')
    );

    return interaction.update({ embeds: [embed], components: [select, back] });
  }

  // ===== الاستثناءات =====
  if (id === 'prot_bypass_roles') {
    const config = await getGuildConfig(guildId);
    const bypassRoles = config.protectionBypassRoles || [];

    const listText = bypassRoles.length
      ? bypassRoles
          .map(roleId => {
            const role = interaction.guild.roles.cache.get(roleId);
            return role
              ? `• ${role.toString()}`
              : `• \`${roleId}\` (محذوفة)`;
          })
          .join('\n')
      : 'لا توجد رتب مستثناة.';

    const embed = createEmbed({
      title: '🎭 الرتب المستثناة',
      description:
        `**العدد:** ${bypassRoles.length}\n\n` +
        'الرتب المستثناة + المتحكمون + الأدمن لا تُفحص رسائلهم.\n\n' +
        `**القائمة:**\n${listText}`,
      footer: 'KINGDOM • EXEMPTIONS',
      timestamp: true,
    });

    const row = new ActionRowBuilder().addComponents(
      createButton('prot_bypass_add', 'إضافة', '➕', BTN.MAIN),
      createButton('prot_bypass_remove', 'حذف', '🗑️'),
      createButton('prot_refresh', 'رجوع', '↩️')
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (id === 'prot_bypass_add') {
    const modal = new ModalBuilder()
      .setCustomId('prot_bypass_add_modal')
      .setTitle('إضافة رتبة مستثناة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_input')
            .setLabel('آيدي الرتبة')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(25)
            .setPlaceholder('123456789012345678')
        )
      );
    return interaction.showModal(modal);
  }

  if (id === 'prot_bypass_remove') {
    const modal = new ModalBuilder()
      .setCustomId('prot_bypass_remove_modal')
      .setTitle('حذف رتبة مستثناة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_input')
            .setLabel('آيدي الرتبة')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(25)
        )
      );
    return interaction.showModal(modal);
  }

  // ===== إعدادات منع التكرار =====
  if (id === 'prot_settings') {
    const config = await getGuildConfig(guildId);

    const embed = createEmbed({
      title: '⚙️ إعدادات منع التكرار',
      description:
        `**الحد الأقصى:** ${config.antiSpamMax} رسائل\n` +
        `**المدة:** ${config.antiSpamSeconds} ثانية\n\n` +
        `> مثال: تكرار نفس الرسالة ${config.antiSpamMax} مرات في ${config.antiSpamSeconds} ثواني.`,
      footer: 'KINGDOM • ANTI-SPAM',
      timestamp: true,
    });

    const row = new ActionRowBuilder().addComponents(
      createButton('prot_settings_edit', 'تعديل', '✏️', BTN.MAIN),
      createButton('prot_refresh', 'رجوع', '↩️')
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (id === 'prot_settings_edit') {
    const config = await getGuildConfig(guildId);

    const modal = new ModalBuilder()
      .setCustomId('prot_settings_modal')
      .setTitle('تعديل إعدادات منع التكرار')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('max_input')
            .setLabel('الحد الأقصى (2-20)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(config.antiSpamMax))
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('seconds_input')
            .setLabel('المدة بالثواني (2-60)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(config.antiSpamSeconds))
        )
      );
    return interaction.showModal(modal);
  }
}

// ============================================================
// ========== مودالات الحماية ==========
// ============================================================

async function handleProtectionModal(interaction) {
  if (!(await requireControllerInteraction(interaction))) return;

  const id = interaction.customId;
  const guildId = interaction.guild.id;

  if (id === 'prot_word_add_modal') {
    const word = interaction.fields.getTextInputValue('word_input').trim();

    try {
      const added = await addBannedWord(guildId, word, interaction.user.id);

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: added ? '✅ تم إضافة الكلمة' : '⚠️ مضافة مسبقًا',
            description: added
              ? `تم إضافة \`${word}\`.`
              : `الكلمة \`${word}\` موجودة بالفعل.`,
            color: added ? THEME.ORANGE : THEME.WARN,
          }),
        ],
      });
    } catch (error) {
      reportError('word-add', error);
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ فشل',
            description: 'تعذر إضافة الكلمة.',
            color: THEME.ERROR,
          }),
        ],
      });
    }
  }

  if (id === 'prot_word_remove_modal') {
    const word = interaction.fields.getTextInputValue('word_input').trim();
    const removed = await removeBannedWord(guildId, word);

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: removed ? '🗑️ تم الحذف' : '⚠️ غير موجودة',
          description: removed
            ? `تم حذف \`${word}\`.`
            : `الكلمة \`${word}\` غير موجودة.`,
          color: removed ? THEME.ORANGE : THEME.WARN,
        }),
      ],
    });
  }

  if (id === 'prot_bypass_add_modal') {
    const roleId = interaction.fields.getTextInputValue('role_input').trim();

    if (!isSnowflake(roleId)) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '❌ آيدي غير صالح', color: THEME.ERROR }),
        ],
      });
    }

    const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '❌ الرتبة غير موجودة', color: THEME.ERROR }),
        ],
      });
    }

    const config = await getGuildConfig(guildId);

    if (!config.protectionBypassRoles.includes(roleId)) {
      config.protectionBypassRoles.push(roleId);
      await config.save();
    }

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم الإضافة',
          description: `تم استثناء ${role}.`,
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  if (id === 'prot_bypass_remove_modal') {
    const roleId = interaction.fields.getTextInputValue('role_input').trim();
    const config = await getGuildConfig(guildId);
    const index = config.protectionBypassRoles.indexOf(roleId);

    if (index === -1) {
      return respondToInteraction(interaction, {
        embeds: [createEmbed({ title: '⚠️ غير موجودة', color: THEME.WARN })],
      });
    }

    config.protectionBypassRoles.splice(index, 1);
    await config.save();

    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '✅ تم الحذف', color: THEME.ORANGE })],
    });
  }

  if (id === 'prot_settings_modal') {
    const max = parseStrictInteger(
      interaction.fields.getTextInputValue('max_input'),
      2,
      20
    );
    const seconds = parseStrictInteger(
      interaction.fields.getTextInputValue('seconds_input'),
      2,
      60
    );

    if (max === null || seconds === null) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '⚠️ قيم غير صحيحة',
            description: 'الحد الأقصى: 2-20 • المدة: 2-60',
            color: THEME.WARN,
          }),
        ],
      });
    }

    await updateGuildConfig(guildId, {
      antiSpamMax: max,
      antiSpamSeconds: seconds,
    });

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم التحديث',
          description: `${max} رسائل / ${seconds} ثانية`,
          color: THEME.ORANGE,
        }),
      ],
    });
  }
}

// ============================================================
// ========== الرتب الذاتية ==========
// ============================================================

async function handleSelfRolesSelect(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const selectedValue = interaction.values[0];
  const guildId = interaction.guild.id;

  if (selectedValue === 'SELF_ROLES_RESET') {
    try {
      const config = await getGuildConfig(guildId);
      const panel = await buildSelfRolesPanel(
        guildId,
        interaction.guild,
        config,
        0
      );

      if (!panel) {
        return interaction.editReply({
          embeds: [
            createEmbed({ title: '⚠️ لا توجد رتب', color: THEME.WARN }),
          ],
        });
      }

      await interaction.message
        .edit({ components: panel.rows })
        .catch(() => {});

      return interaction.editReply({
        embeds: [
          createEmbed({ title: '🔄 تم إعادة التعيين', color: THEME.ORANGE }),
        ],
      });
    } catch (error) {
      reportError('self-roles-reset', error);
      return interaction.editReply({
        embeds: [createEmbed({ title: '❌ فشل', color: THEME.ERROR })],
      });
    }
  }

  const role = await interaction.guild.roles
    .fetch(selectedValue)
    .catch(() => null);

  if (!role) {
    return interaction.editReply({
      embeds: [
        createEmbed({ title: '❌ الرتبة غير موجودة', color: THEME.ERROR }),
      ],
    });
  }

  const selfRole = await SelfRole.findOne({ guildId, roleId: role.id });

  if (!selfRole) {
    return interaction.editReply({
      embeds: [
        createEmbed({ title: '❌ الرتبة غير مسجلة', color: THEME.ERROR }),
      ],
    });
  }

  if (isSensitiveSelfRole(role)) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '🔒 رتبة حساسة',
          description: 'هذه الرتبة تحتوي صلاحيات حساسة.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  if (!canManageRole(interaction.guild, role)) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ لا يمكن إدارتها',
          description: 'تحقق من تسلسل الرتب.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  const member = interaction.member;

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, 'KINGDOM • إزالة ذاتية');

      return interaction.editReply({
        embeds: [
          createEmbed({
            title: '🗑️ تم إزالة الرتبة',
            description: `${selfRole.emoji} **${selfRole.label}**`,
            color: THEME.DARK,
            timestamp: true,
          }),
        ],
      });
    }

    await member.roles.add(role, 'KINGDOM • اختيار ذاتي');

    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '✅ تم إضافة الرتبة',
          description: `${selfRole.emoji} **${selfRole.label}**`,
          color: THEME.ORANGE,
          timestamp: true,
        }),
      ],
    });
  } catch (error) {
    reportError('self-roles-toggle', error);
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ فشل التعديل',
          description: error.message,
          color: THEME.ERROR,
        }),
      ],
    });
  }
}

async function handleSelfRolesPage(interaction) {
  const page = parseInt(interaction.customId.split(':')[1]);

  if (!Number.isInteger(page) || page < 0) {
    return interaction.deferUpdate();
  }

  const config = await getGuildConfig(interaction.guild.id);
  const panel = await buildSelfRolesPanel(
    interaction.guild.id,
    interaction.guild,
    config,
    page
  );

  if (!panel) return interaction.deferUpdate();

  return interaction.update({
    embeds: [panel.embed],
    components: panel.rows,
  });
}

// ============================================================
// ========== الزاجل ==========
// ============================================================

async function handlePigeonInteraction(interaction) {
  const id = interaction.customId;

  if (id === 'pigeon_send') {
    const modal = new ModalBuilder()
      .setCustomId('pigeon_send_modal')
      .setTitle('🕊️ إرسال زاجل')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('pigeon_target')
            .setLabel('اسم المستخدم أو الآيدي')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(50)
            .setPlaceholder('مثال: ahmed_2001')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('pigeon_message')
            .setLabel('نص الرسالة')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(1500)
        )
      );

    return interaction.showModal(modal);
  }

  if (id === 'pigeon_myhistory') {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const [sent, received] = await Promise.all([
      Pigeon.find({ guildId, senderId: userId })
        .sort({ createdAt: -1 })
        .limit(10),
      Pigeon.find({ guildId, recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    if (!sent.length && !received.length) {
      return interaction.editReply({
        embeds: [
          createEmbed({
            title: '📭 لا سجل',
            description: 'لا توجد زاجلات سابقة.',
            color: THEME.WARN,
          }),
        ],
      });
    }

    let description = '';

    if (received.length) {
      description += '**📥 المُستلمة (آخر 10):**\n';
      for (const item of received) {
        const status = item.read ? '✅' : '🆕';
        description += `${status} من **مجهول** — ${discordTimestamp(
          item.createdAt,
          'R'
        )}\n`;
      }
      description += '\n';
    }

    if (sent.length) {
      description += '**📤 المُرسَلة (آخر 10):**\n';
      for (const item of sent) {
        const recipient = await client.users
          .fetch(item.recipientId)
          .catch(() => null);
        const name = recipient ? recipient.tag : `<@${item.recipientId}>`;
        const status = item.read ? '✅ قُرئت' : '⏳ لم تُقرأ';
        description += `${status} إلى **${name}** — ${discordTimestamp(
          item.createdAt,
          'R'
        )}\n`;
      }
    }

    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '📜 KINGDOM | سجل الزاجل',
          description: truncate(description, 4000),
          footer: 'KINGDOM • PIGEON MAIL',
          timestamp: true,
        }),
      ],
    });
  }

  if (id.startsWith('pigeon_read_')) {
    const recipientId = id.replace('pigeon_read_', '');
    const isRecipient = interaction.user.id === recipientId;
    const member = await resolveInteractionMember(interaction);

    const isController = member
      ? await hasPermission(member, interaction.guild.id)
      : false;

    if (!isRecipient && !isController) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ ليست لك',
            description: 'هذه الرسالة ليست موجهة إليك.',
            color: THEME.ERROR,
          }),
        ],
      });
    }

    let pigeonData = await Pigeon.findOne({
      guildId: interaction.guild.id,
      messageId: interaction.message.id,
    });

    if (!pigeonData) {
      pigeonData = await Pigeon.findOne({
        guildId: interaction.guild.id,
        recipientId,
      }).sort({ createdAt: -1 });
    }

    if (!pigeonData) {
      return respondToInteraction(interaction, {
        embeds: [createEmbed({ title: '⚠️ غير متاح', color: THEME.WARN })],
      });
    }

    const sender = await client.users
      .fetch(pigeonData.senderId)
      .catch(() => null);
    const recipient = await client.users
      .fetch(pigeonData.recipientId)
      .catch(() => null);

    let readEmbed;

    if (isController && !isRecipient) {
      readEmbed = createEmbed({
        title: '📖 قراءة زاجل • عرض إداري',
        description:
          `**📤 المُرسِل:** ${
            sender
              ? `${sender.tag} (\`${sender.id}\`)`
              : `<@${pigeonData.senderId}>`
          }\n` +
          `**📥 المُرسَل إليه:** ${
            recipient ? recipient.tag : `<@${pigeonData.recipientId}>`
          }\n` +
          `**📅 التاريخ:** ${discordTimestamp(pigeonData.createdAt, 'F')}\n` +
          `**📖 القراءة:** ${pigeonData.read ? '✅' : '🆕'}\n\n` +
          `**📜 المحتوى:**\n\`\`\`\n${escapeCodeBlock(
            pigeonData.content
          )}\n\`\`\``,
        thumbnail: sender?.displayAvatarURL({ extension: 'png', size: 256 }),
        footer: 'KINGDOM • ADMIN VIEW',
        timestamp: true,
      });
    } else {
      readEmbed = createEmbed({
        title: '📖 قراءة زاجل',
        description:
          `**📤 المُرسِل:** 🕵️ مجهول\n` +
          `**📥 المُرسَل إليه:** ${
            recipient ? recipient.tag : `<@${pigeonData.recipientId}>`
          }\n` +
          `**📅 التاريخ:** ${discordTimestamp(pigeonData.createdAt, 'F')}\n\n` +
          `**📜 المحتوى:**\n\`\`\`\n${escapeCodeBlock(
            pigeonData.content
          )}\n\`\`\``,
        footer: 'KINGDOM • PIGEON MAIL',
        timestamp: true,
      });
    }

    if (isRecipient && !pigeonData.read) {
      pigeonData.read = true;
      pigeonData.readAt = new Date();
      await pigeonData.save().catch(() => {});
    }

    return respondToInteraction(interaction, { embeds: [readEmbed] });
  }
}

async function handlePigeonSendModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const targetQuery = interaction.fields
    .getTextInputValue('pigeon_target')
    .trim();
  const content = interaction.fields
    .getTextInputValue('pigeon_message')
    .trim();

  const guild = interaction.guild;
  const guildId = guild.id;

  // كولداون
  const cooldownKey = `${guildId}:${interaction.user.id}`;
  const now = Date.now();
  const existingCooldown = pigeonCooldowns.get(cooldownKey);

  if (existingCooldown && existingCooldown > now) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '⏳ انتظر قليلًا',
          description: `يمكنك إرسال زاجل جديد ${discordTimestamp(
            new Date(existingCooldown),
            'R'
          )}.`,
          color: THEME.WARN,
        }),
      ],
    });
  }

  const config = await getGuildConfig(guildId);

  if (!config.pigeonChannel) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '⚠️ غير مُفعّل',
          description: 'لم يتم تعيين روم الزاجل.',
          color: THEME.WARN,
        }),
      ],
    });
  }

  const pigeonChannel = await getTextChannel(guild, config.pigeonChannel);

  if (!pigeonChannel) {
    return interaction.editReply({
      embeds: [
        createEmbed({ title: '❌ الروم غير متاح', color: THEME.ERROR }),
      ],
    });
  }

  const target = await findMemberByName(guild, targetQuery);

  if (!target) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ لم أجد العضو',
          description:
            'استخدم آيدي العضو أو الاسم الكامل.\n' +
            '> لا أختار تلقائيًا عند وجود أكثر من تطابق.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  if (target.user.bot) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ لا يمكن',
          description: 'لا يمكن إرسال زاجل للبوتات.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  if (target.id === interaction.user.id) {
    return interaction.editReply({
      embeds: [
        createEmbed({
          title: '❌ لا يمكن',
          description: 'لا يمكنك إرسال زاجل لنفسك.',
          color: THEME.ERROR,
        }),
      ],
    });
  }

  const pigeonEmbed = createEmbed({
    title: '🕊️ وصلتك رسالة زاجل',
    description:
      `**📤 المُرسِل:** 🕵️ مجهول\n` +
      `**📥 المُرسَل إليه:** ${target}\n` +
      `**📅 التاريخ:** ${discordTimestamp(new Date(), 'F')}\n\n` +
      '> اضغط الزر لقراءة المحتوى.',
    image: config.pigeonImage,
    footer: 'KINGDOM • PRIVATE MAIL',
    timestamp: true,
  });

  const readRow = new ActionRowBuilder().addComponents(
    createButton(
      `pigeon_read_${target.id}`,
      'قراءة الزاجل',
      '🕊️',
      BTN.MAIN
    )
  );

  let sentMessage;

  try {
    sentMessage = await pigeonChannel.send({
      content: `📩 ${target}، وصلتك رسالة زاجل.`,
      embeds: [pigeonEmbed],
      components: [readRow],
      allowedMentions: { parse: [], users: [target.id] },
    });
  } catch (error) {
    reportError('pigeon-send', error);
    return interaction.editReply({
      embeds: [createEmbed({ title: '❌ فشل الإرسال', color: THEME.ERROR })],
    });
  }

  try {
    await Pigeon.create({
      guildId,
      messageId: sentMessage.id,
      senderId: interaction.user.id,
      recipientId: target.id,
      content: truncate(content, 1500),
    });
  } catch (error) {
    reportError('pigeon-db', error);
  }

  try {
    await target.send({
      embeds: [
        createEmbed({
          title: '🕊️ وصلتك رسالة زاجل',
          description:
            `**السيرفر:** ${guild.name}\n\n` +
            `> اذهب إلى <#${pigeonChannel.id}> لقراءتها.`,
          color: THEME.ORANGE,
          footer: 'KINGDOM • PIGEON',
          timestamp: true,
        }),
      ],
    });
  } catch {}

  pigeonCooldowns.set(cooldownKey, now + LIMITS.PIGEON_COOLDOWN);

  logToChannel(guildId, {
    title: '🕊️ زاجل جديد',
    color: THEME.ORANGE,
    description:
      `**من:** ${interaction.user.tag}\n` +
      `**إلى:** ${target.user.tag}\n` +
      `**الرابط:** ${sentMessage.url}`,
    footer: 'PIGEON',
  });

  return interaction.editReply({
    embeds: [
      createEmbed({
        title: '✅ تم إرسال الزاجل',
        description:
          `تم إرسال زاجلك إلى **${target.user.tag}**.\n` +
          `📬 في ${pigeonChannel}\n` +
          '📩 وأُرسل تنبيه في الخاص.',
        color: THEME.ORANGE,
        timestamp: true,
      }),
    ],
  });
}

// ============================================================
// ========== التقديمات العامة ==========
// ============================================================

async function handleApplyPublicSelect(interaction) {
  const selected = interaction.values[0];

  if (selected === 'APPLY_RESET') {
    const config = await getGuildConfig(interaction.guild.id);
    const panel = await buildApplyPanel(interaction.guild.id, config, 0);

    if (panel.empty || !panel.row) return interaction.deferUpdate();

    await interaction.message.edit({ components: panel.rows }).catch(() => {});

    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '🔄 تم التحديث', color: THEME.ORANGE })],
    });
  }

  const section = await getApplySectionByName(interaction.guild.id, selected);

  if (!section) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({ title: '❌ القسم غير موجود', color: THEME.ERROR }),
      ],
    });
  }

  if (!section.questions.length) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '⚠️ لا توجد أسئلة',
          description: `قسم **${section.name}** بدون أسئلة بعد.`,
          color: THEME.WARN,
        }),
      ],
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`apply_modal_${section._id}`)
    .setTitle(truncate(`تقديم: ${section.name}`, LIMITS.MODAL_TITLE));

  const rows = [];

  for (
    let index = 0;
    index < Math.min(section.questions.length, LIMITS.MODAL_FIELDS);
    index += 1
  ) {
    const question = section.questions[index];

    rows.push(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`q_${index}`)
          .setLabel(truncate(question.label, 45))
          .setStyle(
            question.style === 'PARAGRAPH'
              ? TextInputStyle.Paragraph
              : TextInputStyle.Short
          )
          .setRequired(question.required !== false)
          .setMaxLength(question.style === 'PARAGRAPH' ? 1000 : 200)
      )
    );
  }

  modal.addComponents(...rows);

  return interaction.showModal(modal);
}

async function handleApplyPublicModal(interaction) {
  const sectionId = interaction.customId.replace('apply_modal_', '');
  const section = await getApplySectionById(interaction.guild.id, sectionId);

  if (!section) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({ title: '❌ القسم غير موجود', color: THEME.ERROR }),
      ],
    });
  }

  const answers = [];

  for (
    let index = 0;
    index < Math.min(section.questions.length, LIMITS.MODAL_FIELDS);
    index += 1
  ) {
    const question = section.questions[index];

    try {
      const answer = interaction.fields.getTextInputValue(`q_${index}`);
      answers.push({ question: question.label, answer });
    } catch {}
  }

  await Application.create({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    type: section.name,
    answers,
    status: 'pending',
  });

  if (section.logChannelId) {
    const logChannel = await getTextChannel(
      interaction.guild,
      section.logChannelId
    );

    if (logChannel) {
      const logEmbed = createEmbed({
        title: `📋 تقديم جديد • ${section.name}`,
        thumbnail: interaction.user.displayAvatarURL({
          extension: 'png',
          size: 256,
        }),
        footer: `KINGDOM • ${interaction.user.tag}`,
        timestamp: true,
      });

      logEmbed.setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({
          extension: 'png',
          size: 128,
        }),
      });

      const fields = answers.map(item => ({
        name: truncate(item.question, 250),
        value: truncate(item.answer || '—', 1000),
        inline: false,
      }));

      fields.push({
        name: '👤 المتقدم',
        value: `${interaction.user} (\`${interaction.user.id}\`)`,
        inline: false,
      });

      addSafeFields(logEmbed, fields);

      await logChannel
        .send({
          embeds: [logEmbed],
          allowedMentions: { parse: [] },
        })
        .catch(error => reportError('apply-log', error));
    }
  }

  return respondToInteraction(interaction, {
    embeds: [
      createEmbed({
        title: '✅ تم إرسال تقديمك',
        description:
          `مرحبًا ${interaction.user}!\n\n` +
          `تم استلام تقديمك لقسم **${section.emoji} ${section.name}**.\n\n` +
          `> عدد الأسئلة: ${answers.length}\n` +
          '> الحالة: ⏳ بانتظار المراجعة',
        color: THEME.ORANGE,
        footer: 'KINGDOM • RECRUITMENT',
        timestamp: true,
      }),
    ],
  });
}

async function handleApplyPublicPage(interaction) {
  const page = parseInt(interaction.customId.split(':')[1]);

  if (!Number.isInteger(page) || page < 0) return interaction.deferUpdate();

  const config = await getGuildConfig(interaction.guild.id);
  const panel = await buildApplyPanel(interaction.guild.id, config, page);

  if (panel.empty) return interaction.deferUpdate();

  return interaction.update({
    embeds: [panel.embed],
    components: panel.rows,
  });
}

// ============================================================
// ========== التقديمات الإدارية ==========
// ============================================================

async function handleApplyAdminSelect(interaction) {
  if (!(await requireControllerInteraction(interaction))) return;

  const selected = interaction.values[0];

  if (selected === 'apply_add_section') {
    const modal = new ModalBuilder()
      .setCustomId('apply_add_section_modal')
      .setTitle('إضافة قسم تقديم')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name_input')
            .setLabel('اسم القسم')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('emoji_input')
            .setLabel('الإيموجي (اختياري)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(10)
            .setValue('📋')
        )
      );

    return interaction.showModal(modal);
  }

  if (selected.startsWith('section_id:')) {
    const sectionId = selected.replace('section_id:', '');
    const section = await getApplySectionById(interaction.guild.id, sectionId);

    if (!section) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '❌ القسم غير موجود', color: THEME.ERROR }),
        ],
      });
    }

    const panel = await buildApplySectionAdminPanel(interaction.guild, section);

    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }
}

async function handleApplyAdminButton(interaction) {
  const id = interaction.customId;

  if (id === 'apply_admin_back') {
    if (!(await requireControllerInteraction(interaction))) return;

    const panel = await buildApplyAdminPanel(interaction.guild.id, 0);

    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }

  if (!(await requireControllerInteraction(interaction))) return;

  const match = id.match(/^([a-z_]+)_id:(.+)$/);
  if (!match) return;

  const [, action, sectionId] = match;
  const section = await getApplySectionById(interaction.guild.id, sectionId);

  if (!section) {
    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '❌ القسم غير موجود', color: THEME.ERROR })],
    });
  }

  if (action === 'apply_section_addq') {
    if (section.questions.length >= LIMITS.MODAL_FIELDS) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '⚠️ الحد الأقصى',
            description: '5 أسئلة كحد أقصى.',
            color: THEME.WARN,
          }),
        ],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`apply_addq_modal_${section._id}`)
      .setTitle('إضافة سؤال')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q_label')
            .setLabel('نص السؤال')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(45)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q_style')
            .setLabel('النمط (SHORT أو PARAGRAPH)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(20)
            .setValue('SHORT')
        )
      );

    return interaction.showModal(modal);
  }

  if (action === 'apply_section_delq') {
    if (!section.questions.length) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '⚠️ لا توجد أسئلة', color: THEME.WARN }),
        ],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`apply_delq_modal_${section._id}`)
      .setTitle('حذف سؤال')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q_index')
            .setLabel(`رقم السؤال (1-${section.questions.length})`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2)
        )
      );

    return interaction.showModal(modal);
  }

  if (action === 'apply_section_img') {
    const modal = new ModalBuilder()
      .setCustomId(`apply_img_modal_${section._id}`)
      .setTitle('صورة القسم')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('img_url')
            .setLabel('رابط الصورة (فارغ للحذف)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(500)
        )
      );

    return interaction.showModal(modal);
  }

  if (action === 'apply_section_role') {
    const modal = new ModalBuilder()
      .setCustomId(`apply_role_modal_${section._id}`)
      .setTitle('رتبة القبول')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('آيدي الرتبة (فارغ للحذف)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(25)
        )
      );

    return interaction.showModal(modal);
  }

  if (action === 'apply_section_log') {
    const modal = new ModalBuilder()
      .setCustomId(`apply_log_modal_${section._id}`)
      .setTitle('قناة المراجعة')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('log_id')
            .setLabel('آيدي القناة (فارغ للحذف)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(25)
        )
      );

    return interaction.showModal(modal);
  }

  if (action === 'apply_section_delete') {
    await ApplySection.deleteOne({
      _id: section._id,
      guildId: interaction.guild.id,
    });

    logToChannel(interaction.guild.id, {
      title: '🗑️ حذف قسم تقديم',
      description:
        `**المنفذ:** ${interaction.user.tag}\n` + `**القسم:** ${section.name}`,
      color: THEME.DARK,
      footer: 'APPLICATIONS',
    });

    const panel = await buildApplyAdminPanel(interaction.guild.id, 0);

    return interaction.update({
      embeds: [panel.embed],
      components: panel.rows,
    });
  }
}

async function handleApplyAdminModal(interaction) {
  if (!(await requireControllerInteraction(interaction))) return;

  const id = interaction.customId;

  // ===== إضافة قسم =====
  if (id === 'apply_add_section_modal') {
    const name = interaction.fields.getTextInputValue('name_input').trim();
    const emoji =
      interaction.fields.getTextInputValue('emoji_input')?.trim() || '📋';

    try {
      const created = await addApplySection(interaction.guild.id, name, emoji);

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: created ? '✅ تم إضافة القسم' : '⚠️ موجود مسبقًا',
            description: created
              ? `القسم **${name}** أضيف.\nافتح اللوحة لإدارته.`
              : `قسم **${name}** موجود بالفعل.`,
            color: created ? THEME.ORANGE : THEME.WARN,
          }),
        ],
      });
    } catch (error) {
      reportError('apply-add-section', error);
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

  // ===== مودالات الإدارة =====
  const sectionMatch = id.match(
    /^apply_(addq|delq|img|role|log)_modal_(.+)$/
  );

  if (!sectionMatch) return;

  const [, action, sectionId] = sectionMatch;
  const section = await getApplySectionById(interaction.guild.id, sectionId);

  if (!section) {
    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '❌ القسم غير موجود', color: THEME.ERROR })],
    });
  }

  if (action === 'addq') {
    const label = interaction.fields.getTextInputValue('q_label').trim();
    const styleInput = (
      interaction.fields.getTextInputValue('q_style') || 'SHORT'
    )
      .trim()
      .toUpperCase();
    const style = styleInput === 'PARAGRAPH' ? 'PARAGRAPH' : 'SHORT';

    section.questions.push({
      label: truncate(label, 45),
      style,
      required: true,
    });

    await section.save();

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم إضافة السؤال',
          description: `رقم ${section.questions.length}: \`${label}\``,
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  if (action === 'delq') {
    const index = parseStrictInteger(
      interaction.fields.getTextInputValue('q_index'),
      1,
      section.questions.length
    );

    if (index === null) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '⚠️ رقم غير صحيح',
            description: `القسم يحتوي ${section.questions.length} سؤال.`,
            color: THEME.WARN,
          }),
        ],
      });
    }

    const removed = section.questions.splice(index - 1, 1)[0];
    await section.save();

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '🗑️ تم الحذف',
          description: `حُذف السؤال: \`${removed.label}\``,
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  if (action === 'img') {
    const rawUrl = interaction.fields.getTextInputValue('img_url')?.trim();

    if (!rawUrl) {
      section.image = null;
      await section.save();

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '✅ تم حذف الصورة', color: THEME.ORANGE }),
        ],
      });
    }

    const url = safeHttpUrl(rawUrl);

    if (!url) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '⚠️ رابط غير صالح', color: THEME.WARN }),
        ],
      });
    }

    section.image = url;
    await section.save();

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم تعيين الصورة',
          image: url,
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  if (action === 'role') {
    const roleId = interaction.fields.getTextInputValue('role_id')?.trim();

    if (!roleId) {
      section.roleId = null;
      await section.save();

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '✅ تم حذف رتبة القبول', color: THEME.ORANGE }),
        ],
      });
    }

    if (!isSnowflake(roleId)) {
      return respondToInteraction(interaction, {
        embeds: [createEmbed({ title: '⚠️ آيدي غير صالح', color: THEME.WARN })],
      });
    }

    const role = await interaction.guild.roles
      .fetch(roleId)
      .catch(() => null);

    if (!role) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '❌ الرتبة غير موجودة', color: THEME.ERROR }),
        ],
      });
    }

    section.roleId = role.id;
    await section.save();

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم تعيين الرتبة',
          description: `${role}`,
          color: THEME.ORANGE,
        }),
      ],
    });
  }

  if (action === 'log') {
    const logId = interaction.fields.getTextInputValue('log_id')?.trim();

    if (!logId) {
      section.logChannelId = null;
      await section.save();

      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '✅ تم حذف قناة المراجعة',
            color: THEME.ORANGE,
          }),
        ],
      });
    }

    if (!isSnowflake(logId)) {
      return respondToInteraction(interaction, {
        embeds: [createEmbed({ title: '⚠️ آيدي غير صالح', color: THEME.WARN })],
      });
    }

    const channel = await getTextChannel(interaction.guild, logId);

    if (!channel) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '❌ القناة غير موجودة', color: THEME.ERROR }),
        ],
      });
    }

    section.logChannelId = channel.id;
    await section.save();

    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({
          title: '✅ تم تعيين قناة المراجعة',
          description: `${channel}`,
          color: THEME.ORANGE,
        }),
      ],
    });
  }
}

async function handleApplyAdminPage(interaction) {
  if (!(await requireControllerInteraction(interaction))) return;

  const page = parseInt(interaction.customId.split(':')[1]);

  if (!Number.isInteger(page) || page < 0) return interaction.deferUpdate();

  const panel = await buildApplyAdminPanel(interaction.guild.id, page);

  return interaction.update({
    embeds: [panel.embed],
    components: panel.rows,
  });
}

// ============================================================
// ========== التذاكر ==========
// ============================================================

async function handleTicketCreate(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const selected = interaction.values[0];
  const guildId = interaction.guild.id;

  if (selected === 'TICKET_RESET') {
    const config = await getGuildConfig(guildId);
    const panel = await buildTicketPanel(interaction.guild, config, 0);

    if (panel.empty || !panel.row) {
      return interaction.editReply({
        embeds: [
          createEmbed({ title: '⚠️ لا توجد أقسام', color: THEME.WARN }),
        ],
      });
    }

    await interaction.message.edit({ components: panel.rows }).catch(() => {});

    return interaction.editReply({
      embeds: [createEmbed({ title: '🔄 تم التحديث', color: THEME.ORANGE })],
    });
  }

  const settings = await getTicketSettings(guildId);
  const section = settings.sections.find(item => item.name === selected);

  if (!section) {
    return interaction.editReply({
      embeds: [createEmbed({ title: '❌ القسم غير موجود', color: THEME.ERROR })],
    });
  }

  const member = interaction.member;

  // منع تذاكر متعددة
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

    existingTicket.status = 'closed';
    existingTicket.closed = true;
    existingTicket.deletedAt = new Date();
    await existingTicket.save().catch(() => {});
  }

  const ticketName = sanitizeChannelName(`تذكرة-${member.user.username}`);

  const permissionOverwrites = await buildTicketPermissionOverwrites(
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
          description: 'تحقق من صلاحيات البوت وتسلسل الرتب.',
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
  if (section.roleId) mentionParts.push(`<@&${section.roleId}>`);

  try {
    await channel.send({
      content: mentionParts.join(' '),
      embeds: [welcomeEmbed],
      components: [buildTicketCloseRow(), buildTicketControlRow()],
      allowedMentions: {
        parse: [],
        users: [member.id],
        roles: section.roleId ? [section.roleId] : [],
      },
    });
  } catch (error) {
    reportError('ticket-welcome', error);
  }

  // لوق
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
        { name: '📌 القسم', value: section.name, inline: true },
        {
          name: '📅 الوقت',
          value: discordTimestamp(new Date(), 'F'),
          inline: true,
        },
        { name: '🔗 الرابط', value: `${channel}`, inline: false },
      ]);

      await logChannel
        .send({ embeds: [logEmbed], allowedMentions: { parse: [] } })
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
  if (!(await requireControllerInteraction(interaction))) return;

  const action = interaction.values[0];
  const channel = interaction.channel;

  const ticketData = await getTicketByChannel(
    interaction.guild.id,
    channel.id
  );

  if (!ticketData) {
    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '❌ ليست تذكرة', color: THEME.ERROR })],
    });
  }

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
        `**المتحكم:** ${interaction.user.tag}\n` + `**التذكرة:** ${channel.name}`,
      color: THEME.ORANGE,
      footer: 'TICKETS',
    });

    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '✅ تم الاستلام', color: THEME.ORANGE })],
    });
  }

  if (action === 'unclaim') {
    if (!ticketData.claimedBy) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({ title: '⚠️ غير مستلمة', color: THEME.WARN }),
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
      embeds: [createEmbed({ title: '✅ تم الإلغاء', color: THEME.ORANGE })],
    });
  }

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
  if (!(await requireControllerInteraction(interaction))) return;

  const id = interaction.customId;

  if (id === 'ticket_add_member_modal') {
    const query = interaction.fields
      .getTextInputValue('member_query')
      .trim();

    const target = await findMemberByName(interaction.guild, query);

    if (!target) {
      return respondToInteraction(interaction, {
        embeds: [
          createEmbed({
            title: '❌ لم أجد العضو',
            description: 'استخدم آيدي العضو أو الاسم الكامل.',
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
      await interaction.channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      });

      const ticketData = await getTicketByChannel(
        interaction.guild.id,
        interaction.channel.id
      );

      if (ticketData && !ticketData.addedMembers.includes(target.id)) {
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

  if (id === 'ticket_rename_modal') {
    const newName = interaction.fields.getTextInputValue('new_name').trim();
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
        `**المنفذ:** ${interaction.user.tag}\n` + `**التذكرة:** ${channelName}`,
      color: THEME.DARK,
      footer: 'TICKETS',
    });

    await respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '🗑️ جاري الحذف', color: THEME.DARK })],
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
}

async function handleTicketClose(interaction) {
  if (interaction.replied || interaction.deferred) return;
  if (!(await requireControllerInteraction(interaction))) return;

  const channel = interaction.channel;

  if (!channel.name.startsWith('تذكرة-')) {
    return respondToInteraction(interaction, {
      embeds: [createEmbed({ title: '⚠️ ليست تذكرة', color: THEME.WARN })],
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
        createEmbed({ title: '⚠️ مغلقة مسبقًا', color: THEME.WARN }),
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

  if (ticketOwnerId && config.ticketRatingEnabled !== false) {
    try {
      await TicketRating.findOneAndUpdate(
        { guildId: interaction.guild.id, ticketId: channel.id },
        {
          $setOnInsert: {
            guildId: interaction.guild.id,
            userId: ticketOwnerId,
            closedBy: interaction.user.id,
            section: sectionName,
            ticketId: channel.id,
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      reportError('ticket-rating-init', error);
    }

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
        embeds: [createEmbed({ title: '❌ ليس لك', color: THEME.ERROR })],
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
      embeds: [createEmbed({ title: '❌ ليس لك', color: THEME.ERROR })],
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return respondToInteraction(interaction, {
      embeds: [
        createEmbed({ title: '❌ تقييم غير صالح', color: THEME.ERROR }),
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
            value: member ? member.user.tag : `<@${ownerId}>`,
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
            value: closedByMember ? closedByMember.user.tag : 'غير معروف',
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
          .send({ embeds: [logEmbed], allowedMentions: { parse: [] } })
          .catch(error => reportError('ticket-rating-log', error));
      }
    }
  } catch (error) {
    reportError('ticket-rating', error);
  }

  return interaction.update({
    embeds: [
      createEmbed({
        title: '✅ شكرًا لتقييمك!',
        description: `${'⭐'.repeat(rating)} (${rating}/5)\n\nنقدّر وقتك. 💙`,
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
      embeds: [createEmbed({ title: '❌ ليس لك', color: THEME.ERROR })],
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
            value: member ? member.user.tag : `<@${ownerId}>`,
            inline: true,
          },
          {
            name: '🎯 التقييم',
            value: ratingData?.rating
              ? `${'⭐'.repeat(ratingData.rating)} (${ratingData.rating}/5)`
              : 'لم يقيّم بعد',
            inline: true,
          },
          { name: '💬 التعليق', value: comment, inline: false },
        ]);

        await ratingChannel
          .send({ embeds: [commentEmbed], allowedMentions: { parse: [] } })
          .catch(error => reportError('ticket-comment-log', error));
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
  const page = parseInt(interaction.customId.split(':')[1]);

  if (!Number.isInteger(page) || page < 0) return interaction.deferUpdate();

  const config = await getGuildConfig(interaction.guild.id);
  const panel = await buildTicketPanel(interaction.guild, config, page);

  if (panel.empty || !panel.row) return interaction.deferUpdate();

  return interaction.update({
    embeds: [panel.embed],
    components: panel.rows,
  });
}

// ============================================================
// ========== تغيير الاسم ==========
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
  const newName = interaction.fields.getTextInputValue('new_name').trim();

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
    await interaction.member.setNickname(newName, `KINGDOM • تغيير ذاتي`);
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
        createEmbed({ title: '❌ لا يمكن إدارتها', color: THEME.ERROR }),
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
// ========== تفاعلات الاقتراحات ==========
// ============================================================

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();

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

    if (
      reaction.message.id === suggestion.yesMessageId ||
      (reaction.message.id === suggestion.messageId && emoji === '✅')
    ) {
      if (emoji === '✅' && !suggestion.yesUsers.includes(userId)) {
        suggestion.yesUsers.push(userId);
        const noIndex = suggestion.noUsers.indexOf(userId);
        if (noIndex !== -1) suggestion.noUsers.splice(noIndex, 1);
        await suggestion.save();
      } else if (emoji !== '✅' && emoji !== '❌') {
        await reaction.users.remove(userId).catch(() => {});
      }
    }

    if (
      reaction.message.id === suggestion.noMessageId ||
      (reaction.message.id === suggestion.messageId && emoji === '❌')
    ) {
      if (emoji === '❌' && !suggestion.noUsers.includes(userId)) {
        suggestion.noUsers.push(userId);
        const yesIndex = suggestion.yesUsers.indexOf(userId);
        if (yesIndex !== -1) suggestion.yesUsers.splice(yesIndex, 1);
        await suggestion.save();
      }
    }
  } catch (error) {
    reportError('reaction-add', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();

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
// ========== الإيقاف الآمن ==========
// ============================================================

let shuttingDown = false;

async function shutdownBot(reason = 'unknown') {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`🛑 بدء الإيقاف الآمن • السبب: ${reason}`);

  try {
    webServer.close();

    if (client.isReady()) client.destroy();

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
