'use strict';

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ActivityType
} = require('discord.js');

// ======================================================
// الإعدادات
// يمكنك تعديلها هنا أو استخدام متغيرات البيئة.
// لا تنشر توكن البوت ولا ترفعه إلى مستودع عام.
// ======================================================

const CONFIG = {
  token: process.env.DISCORD_TOKEN || 'PUT_BOT_TOKEN_HERE',

// اختياري: تسجيل الأوامر في سيرفر محدد، أسرع للتجربة.
  // اتركه فارغًا لتسجيل الأوامر على مستوى البوت.
  guildId: process.env.GUILD_ID || '',

// اختياري: قناة الترحيب.
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',

// اختياري: رتبة تُعطى للأعضاء الجدد.
  autoRoleId: process.env.AUTO_ROLE_ID || '',

// اختياري: رتبة فريق الدعم التي تشاهد التذاكر.
  supportRoleId: process.env.SUPPORT_ROLE_ID || '',

// اختياري: تصنيف تُنشأ التذاكر داخله.
  ticketCategoryId: process.env.TICKET_CATEGORY_ID || '',

color: 0x5865f2
};

if (
  !CONFIG.token.trim() ||
  CONFIG.token === 'PUT_BOT_TOKEN_HERE'
) {
  console.error('ضع توكن البوت في CONFIG.token أو DISCORD_TOKEN.');
  process.exit(1);
}

for (const key of [
  'guildId',
  'welcomeChannelId',
  'autoRoleId',
  'supportRoleId',
  'ticketCategoryId'
]) {
  if (CONFIG[key] && !/^\d{17,20}$/.test(CONFIG[key])) {
    console.error(`القيمة الموجودة في ${key} ليست معرّف ديسكورد صحيحًا.`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  allowedMentions: {
    parse: [],
    repliedUser: false
  }
});

// التحذيرات مؤقتة: تزول عند إعادة تشغيل البوت.
const warnings = new Map();

// يمنع فتح تذكرتين بالتزامن للعضو نفسه.
const ticketLocks = new Set();

const TICKET_PREFIX = 'BOT_TICKET_OWNER:';
const EPHEMERAL = MessageFlags.Ephemeral;

class UserError extends Error {}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(CONFIG.color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function command(name, description) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDMPermission(false);
}

const commands = [
  command('help', 'عرض أوامر البوت'),

command('ping', 'عرض سرعة اتصال البوت'),

command('server', 'عرض معلومات السيرفر'),

command('user', 'عرض معلومات عضو')
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو، أو اتركه فارغًا لعرض معلوماتك')
    ),

command('avatar', 'عرض الصورة الشخصية')
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو، أو اتركه فارغًا لعرض صورتك')
    ),

command('clear', 'حذف الرسائل الحديثة من القناة')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('عدد الرسائل من 1 إلى 100')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

command('kick', 'طرد عضو من السيرفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب الطرد')
        .setMaxLength(400)
    ),

command('ban', 'حظر مستخدم من السيرفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('المستخدم')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب الحظر')
        .setMaxLength(400)
    ),

command('timeout', 'تقييد عضو لمدة محددة')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('المدة بالدقائق، بحد أقصى 28 يومًا')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب التقييد')
        .setMaxLength(400)
    ),

command('untimeout', 'إلغاء تقييد عضو')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو')
        .setRequired(true)
    ),

command('warn', 'إضافة تحذير مؤقت لعضو')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('سبب التحذير')
        .setRequired(true)
        .setMaxLength(300)
    ),

command('warnings', 'عرض آخر تحذيرات عضو')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('العضو')
        .setRequired(true)
    ),

command('say', 'إرسال إعلان بواسطة البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('نص الإعلان، دون تنبيهات جماعية')
        .setRequired(true)
        .setMaxLength(2000)
    ),

command('poll', 'إنشاء تصويت بخيارين إلى أربعة خيارات')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('سؤال التصويت')
        .setRequired(true)
        .setMaxLength(200)
    )
    .addStringOption(option =>
      option
        .setName('option1')
        .setDescription('الخيار الأول')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('option2')
        .setDescription('الخيار الثاني')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('option3')
        .setDescription('الخيار الثالث')
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('option4')
        .setDescription('الخيار الرابع')
        .setMaxLength(100)
    ),

command('ticketpanel', 'إرسال لوحة فتح التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

command('close', 'طلب إغلاق التذكرة الحالية')
];

function assertPermission(interaction, permission) {
  if (!interaction.memberPermissions?.has(permission)) {
    throw new UserError('ما عندك الصلاحية المطلوبة لتنفيذ هذا الأمر.');
  }
}

async function getBotMember(guild) {
  return guild.members.me || guild.members.fetchMe();
}

async function assertBotPermissions(
  interaction,
  permissions,
  channel = interaction.channel
) {
  const bot = await getBotMember(interaction.guild);
  const effective = channel
    ? channel.permissionsFor(bot)
    : bot.permissions;

if (!effective?.has(permissions)) {
    throw new UserError(
      'البوت ناقصه صلاحيات لتنفيذ العملية. راجع صلاحيات رتبته والقناة.'
    );
  }

return bot;
}

function getSendableChannel(interaction) {
  const channel = interaction.channel;

if (
    !channel ||
    !channel.isTextBased() ||
    typeof channel.send !== 'function'
  ) {
    throw new UserError('استخدم الأمر داخل قناة نصية مناسبة.');
  }

return channel;
}

async function fetchMember(guild, userId, required = true) {
  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    if (Number(error.code) === 10007) {
      if (!required) return null;
      throw new UserError('هذا المستخدم ليس عضوًا في السيرفر.');
    }

throw error;
  }
}

async function checkTarget(interaction, user, member) {
  if (user.id === interaction.user.id) {
    throw new UserError('لا يمكنك تنفيذ هذا الإجراء على نفسك.');
  }

if (user.id === client.user.id) {
    throw new UserError('لا يمكنك تنفيذ هذا الإجراء على البوت نفسه.');
  }

if (user.id === interaction.guild.ownerId) {
    throw new UserError('لا يمكنك تنفيذ هذا الإجراء على مالك السيرفر.');
  }

if (member && interaction.user.id !== interaction.guild.ownerId) {
    const actor = await fetchMember(
      interaction.guild,
      interaction.user.id
    );

if (
      actor.roles.highest.comparePositionTo(member.roles.highest) <= 0
    ) {
      throw new UserError(
        'رتبة العضو مساوية لرتبتك أو أعلى منها.'
      );
    }
  }
}

function reasonFor(interaction) {
  const reason =
    interaction.options.getString('reason') || 'لم يتم تحديد سبب';

return `${reason} | بواسطة ${interaction.user.id}`;
}

function warningKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function ticketOwner(channel) {
  if (channel?.type !== ChannelType.GuildText) return null;

const topic = channel.topic || '';
  if (!topic.startsWith(TICKET_PREFIX)) return null;

const ownerId = topic.slice(TICKET_PREFIX.length);
  return /^\d{17,20}$/.test(ownerId) ? ownerId : null;
}

function assertCanClose(interaction) {
  const ownerId = ticketOwner(interaction.channel);

if (!ownerId) {
    throw new UserError('هذه القناة ليست تذكرة أنشأها هذا البوت.');
  }

const isSupport =
    CONFIG.supportRoleId &&
    interaction.member.roles.cache.has(CONFIG.supportRoleId);

const canManage =
    interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageChannels
    );

if (
    interaction.user.id !== ownerId &&
    !isSupport &&
    !canManage
  ) {
    throw new UserError(
      'إغلاق التذكرة متاح لصاحبها أو فريق الدعم أو الإدارة.'
    );
  }
}

async function requestTicketClose(interaction) {
  assertCanClose(interaction);

const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `ticket:confirm:${interaction.channelId}:${interaction.user.id}`
      )
      .setLabel('نعم، احذف التذكرة')
      .setStyle(ButtonStyle.Danger),

new ButtonBuilder()
      .setCustomId(
        `ticket:cancel:${interaction.channelId}:${interaction.user.id}`
      )
      .setLabel('إلغاء')
      .setStyle(ButtonStyle.Secondary)
  );

await interaction.reply({
    content:
      'هل تريد إغلاق التذكرة؟ سيتم حذف القناة ورسائلها، ولا يتم حفظ نسخة منها.',
    components: [row],
    flags: EPHEMERAL
  });
}

async function createTicket(interaction) {
  const key = `${interaction.guildId}:${interaction.user.id}`;

if (ticketLocks.has(key)) {
    throw new UserError('طلبك قيد التنفيذ، انتظر قليلًا.');
  }

ticketLocks.add(key);

try {
    await interaction.deferReply({ flags: EPHEMERAL });

await assertBotPermissions(
      interaction,
      [PermissionFlagsBits.ManageChannels],
      null
    );

const channels = await interaction.guild.channels.fetch();

const existing = channels.find(
      channel =>
        channel &&
        ticketOwner(channel) === interaction.user.id
    );

if (existing) {
      await interaction.editReply({
        content: `عندك تذكرة مفتوحة بالفعل: <#${existing.id}>`
      });
      return;
    }

let parent = null;

if (CONFIG.ticketCategoryId) {
      parent = channels.get(CONFIG.ticketCategoryId);

if (!parent || parent.type !== ChannelType.GuildCategory) {
        throw new UserError(
          'تصنيف التذاكر غير موجود في هذا السيرفر. راجع ticketCategoryId.'
        );
      }

await assertBotPermissions(
        interaction,
        [PermissionFlagsBits.ManageChannels],
        parent
      );
    }

let supportRole = null;

if (CONFIG.supportRoleId) {
      supportRole = await interaction.guild.roles.fetch(
        CONFIG.supportRoleId
      );

if (
        !supportRole ||
        supportRole.id === interaction.guild.id
      ) {
        throw new UserError(
          'رتبة الدعم غير صحيحة. لا تستخدم رتبة everyone.'
        );
      }
    }

const memberPermissions = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles
    ];

const overwrites = [
      {
        id: interaction.guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: memberPermissions
      },
      {
        id: client.user.id,
        allow: [
          ...memberPermissions,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

if (supportRole) {
      overwrites.push({
        id: supportRole.id,
        allow: memberPermissions
      });
    }

const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: parent?.id,
      topic: `${TICKET_PREFIX}${interaction.user.id}`,
      permissionOverwrites: overwrites,
      reason: `فتح تذكرة بواسطة ${interaction.user.id}`
    });

const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:close')
        .setLabel('إغلاق التذكرة')
        .setStyle(ButtonStyle.Danger)
    );

await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [
        makeEmbed(
          'تذكرتك مفتوحة',
          'اكتب تفاصيل طلبك هنا، وسيتمكن فريق الدعم من مساعدتك.\n\n' +
          'استخدم الزر أدناه لطلب إغلاق التذكرة.'
        )
      ],
      components: [row],
      allowedMentions: {
        parse: [],
        users: [interaction.user.id]
      }
    });

await interaction.editReply({
      content: `تم فتح تذكرتك: <#${channel.id}>`
    });
  } finally {
    ticketLocks.delete(key);
  }
}

async function handleButton(interaction) {
  // لا نعالج أزرار رسائل أرسلتها بوتات أخرى.
  if (interaction.message.author.id !== client.user.id) return;

if (interaction.customId === 'ticket:create') {
    await createTicket(interaction);
    return;
  }

if (interaction.customId === 'ticket:close') {
    await requestTicketClose(interaction);
    return;
  }

const match = interaction.customId.match(
    /^ticket:(confirm|cancel):(\d{17,20}):(\d{17,20})$/
  );

if (!match) return;

const [, action, channelId, userId] = match;

if (
    channelId !== interaction.channelId ||
    userId !== interaction.user.id
  ) {
    throw new UserError('هذا التأكيد ليس مخصصًا لك.');
  }

if (action === 'cancel') {
    await interaction.update({
      content: 'تم إلغاء إغلاق التذكرة.',
      components: []
    });
    return;
  }

assertCanClose(interaction);

await assertBotPermissions(
    interaction,
    [PermissionFlagsBits.ManageChannels]
  );

await interaction.update({
    content: 'جارٍ حذف التذكرة...',
    components: []
  });

await interaction.channel.delete(
    `إغلاق التذكرة بواسطة ${interaction.user.id}`
  );
}

async function handleCommand(interaction) {
  switch (interaction.commandName) {
    case 'help': {
      const embed = makeEmbed(
        'أوامر البوت',
        'الأوامر الإدارية تتطلب صلاحيات مناسبة، ' +
        'وقد لا تظهر للأعضاء الذين لا يملكونها.'
      ).addFields(
        {
          name: 'المعلومات',
          value:
            '`/ping`\n`/server`\n`/user`\n`/avatar`'
        },
        {
          name: 'الإدارة',
          value:
            '`/clear`\n`/kick`\n`/ban`\n' +
            '`/timeout`\n`/untimeout`\n`/warn`\n`/warnings`'
        },
        {
          name: 'التفاعل والتذاكر',
          value:
            '`/say`\n`/poll`\n`/ticketpanel`\n`/close`'
        }
      ).setFooter({
        text: 'التحذيرات مؤقتة وتزول عند إعادة تشغيل البوت.'
      });

await interaction.reply({
        embeds: [embed],
        flags: EPHEMERAL
      });
      break;
    }

case 'ping': {
      await interaction.reply({
        content: `سرعة اتصال البوت: ${Math.max(0, Math.round(client.ws.ping))}ms`,
        flags: EPHEMERAL
      });
      break;
    }

case 'server': {
      const guild = interaction.guild;

const embed = makeEmbed(
        'معلومات السيرفر',
        guild.name
      ).addFields(
        { name: 'المعرّف', value: guild.id, inline: true },
        {
          name: 'عدد الأعضاء',
          value: String(guild.memberCount),
          inline: true
        },
        {
          name: 'مالك السيرفر',
          value: `<@${guild.ownerId}>`,
          inline: true
        },
        {
          name: 'تاريخ الإنشاء',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
        }
      );

const icon = guild.iconURL({ size: 256 });
      if (icon) embed.setThumbnail(icon);

await interaction.reply({
        embeds: [embed],
        flags: EPHEMERAL
      });
      break;
    }

case 'user': {
      await interaction.deferReply({ flags: EPHEMERAL });

const user =
        interaction.options.getUser('member') ||
        interaction.user;

const member = await fetchMember(
        interaction.guild,
        user.id,
        false
      );

const embed = makeEmbed(
        'معلومات المستخدم',
        `${user.tag}`
      )
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'المعرّف', value: user.id, inline: true },
          {
            name: 'نوع الحساب',
            value: user.bot ? 'بوت' : 'مستخدم',
            inline: true
          },
          {
            name: 'إنشاء الحساب',
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`
          }
        );

if (member?.joinedTimestamp) {
        embed.addFields(
          {
            name: 'الانضمام للسيرفر',
            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
          },
          {
            name: 'أعلى رتبة',
            value: member.roles.highest.name
          }
        );
      }

await interaction.editReply({ embeds: [embed] });
      break;
    }

case 'avatar': {
      const user =
        interaction.options.getUser('member') ||
        interaction.user;

const url = user.displayAvatarURL({ size: 1024 });

await interaction.reply({
        embeds: [
          makeEmbed(
            `صورة ${user.username}`,
            `[فتح الصورة](${url})`
          ).setImage(url)
        ],
        flags: EPHEMERAL
      });
      break;
    }

case 'clear': {
      assertPermission(
        interaction,
        PermissionFlagsBits.ManageMessages
      );

const channel = getSendableChannel(interaction);

if (typeof channel.bulkDelete !== 'function') {
        throw new UserError('الحذف الجماعي غير متاح في هذه القناة.');
      }

await interaction.deferReply({ flags: EPHEMERAL });

await assertBotPermissions(interaction, [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]);

const amount = interaction.options.getInteger(
        'amount',
        true
      );

// Discord لا يسمح بالحذف الجماعي لرسائل عمرها 14 يومًا أو أكثر.
      const deleted = await channel.bulkDelete(amount, true);

await interaction.editReply({
        content:
          `تم حذف ${deleted.size} رسالة.\n` +
          'الرسائل التي عمرها 14 يومًا أو أكثر يتم تجاهلها.'
      });
      break;
    }

case 'kick':
    case 'ban':
    case 'timeout':
    case 'untimeout': {
      const action = interaction.commandName;

const permission = {
        kick: PermissionFlagsBits.KickMembers,
        ban: PermissionFlagsBits.BanMembers,
        timeout: PermissionFlagsBits.ModerateMembers,
        untimeout: PermissionFlagsBits.ModerateMembers
      }[action];

assertPermission(interaction, permission);
      await interaction.deferReply({ flags: EPHEMERAL });

await assertBotPermissions(
        interaction,
        [permission],
        null
      );

const user = interaction.options.getUser(
        'member',
        true
      );

const member = await fetchMember(
        interaction.guild,
        user.id,
        action !== 'ban'
      );

await checkTarget(interaction, user, member);

const reason = reasonFor(interaction);
      let result;

if (action === 'kick') {
        if (!member.kickable) {
          throw new UserError(
            'لا أستطيع طرد هذا العضو. تأكد أن رتبة البوت أعلى من رتبته.'
          );
        }

await member.kick(reason);
        result = `تم طرد ${user.tag}.`;
      } else if (action === 'ban') {
        if (member && !member.bannable) {
          throw new UserError(
            'لا أستطيع حظر هذا العضو. تأكد أن رتبة البوت أعلى من رتبته.'
          );
        }

await interaction.guild.members.ban(user.id, {
          reason
        });

result = `تم حظر ${user.tag}.`;
      } else {
        if (!member.moderatable) {
          throw new UserError(
            'لا أستطيع تعديل تقييد هذا العضو. ' +
            'راجع ترتيب الرتب وصلاحيات العضو.'
          );
        }

if (action === 'timeout') {
          const minutes = interaction.options.getInteger(
            'minutes',
            true
          );

await member.timeout(minutes * 60_000, reason);
          result = `تم تقييد ${user.tag} لمدة ${minutes} دقيقة.`;
        } else {
          await member.timeout(null, reason);
          result = `تم إلغاء تقييد ${user.tag}.`;
        }
      }

await interaction.editReply({ content: result });
      break;
    }

case 'warn': {
      assertPermission(
        interaction,
        PermissionFlagsBits.ModerateMembers
      );

await interaction.deferReply({ flags: EPHEMERAL });

const user = interaction.options.getUser(
        'member',
        true
      );

const member = await fetchMember(
        interaction.guild,
        user.id
      );

await checkTarget(interaction, user, member);

const key = warningKey(interaction.guildId, user.id);
      const entries = warnings.get(key) || [];

entries.push({
        reason: interaction.options.getString('reason', true),
        moderatorId: interaction.user.id,
        createdAt: Date.now()
      });

// الاحتفاظ بآخر 50 تحذيرًا للعضو.
      if (entries.length > 50) entries.shift();
      warnings.set(key, entries);

await interaction.editReply({
        content:
          `تم إضافة تحذير إلى ${user.tag}.\n` +
          `التحذيرات المحفوظة حاليًا: ${entries.length}.\n` +
          'تنبيه: هذه البيانات تزول عند إعادة تشغيل البوت.'
      });
      break;
    }

case 'warnings': {
      assertPermission(
        interaction,
        PermissionFlagsBits.ModerateMembers
      );

const user = interaction.options.getUser(
        'member',
        true
      );

const entries =
        warnings.get(warningKey(interaction.guildId, user.id)) ||
        [];

const latest = entries.slice(-10).reverse();

const embed = makeEmbed(
        `تحذيرات ${user.username}`,
        latest.length
          ? `آخر ${latest.length} تحذير من أصل ${entries.length} محفوظ.`
          : 'لا توجد تحذيرات محفوظة لهذا المستخدم.'
      ).setFooter({
        text: 'بيانات مؤقتة، تُصفّر عند إعادة تشغيل البوت.'
      });

latest.forEach((entry, index) => {
        embed.addFields({
          name: `تحذير ${index + 1}`,
          value:
            `${entry.reason}\n` +
            `بواسطة: <@${entry.moderatorId}>\n` +
            `<t:${Math.floor(entry.createdAt / 1000)}:F>`
        });
      });

await interaction.reply({
        embeds: [embed],
        flags: EPHEMERAL
      });
      break;
    }

case 'say': {
      assertPermission(
        interaction,
        PermissionFlagsBits.ManageMessages
      );

await interaction.deferReply({ flags: EPHEMERAL });

const channel = getSendableChannel(interaction);

await assertBotPermissions(interaction, [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages
      ]);

await channel.send({
        content: interaction.options.getString('text', true),
        allowedMentions: { parse: [] }
      });

await interaction.editReply({
        content: 'تم إرسال الإعلان دون تنبيهات منشن.'
      });
      break;
    }

case 'poll': {
      assertPermission(
        interaction,
        PermissionFlagsBits.ManageMessages
      );

await interaction.deferReply({ flags: EPHEMERAL });

const channel = getSendableChannel(interaction);

await assertBotPermissions(interaction, [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ReadMessageHistory
      ]);

const options = [
        interaction.options.getString('option1', true),
        interaction.options.getString('option2', true),
        interaction.options.getString('option3'),
        interaction.options.getString('option4')
      ].filter(Boolean);

const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

const embed = makeEmbed(
        interaction.options.getString('question', true),
        options
          .map((option, index) => `${emojis[index]} ${option}`)
          .join('\n\n')
      ).setFooter({
        text: 'صوّت بإضافة تفاعل. يمكن للعضو اختيار أكثر من خيار.'
      });

const message = await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] }
      });

for (let index = 0; index < options.length; index++) {
        await message.react(emojis[index]);
      }

await interaction.editReply({
        content: 'تم إنشاء التصويت.'
      });
      break;
    }

case 'ticketpanel': {
      assertPermission(
        interaction,
        PermissionFlagsBits.ManageGuild
      );

await interaction.deferReply({ flags: EPHEMERAL });

const channel = getSendableChannel(interaction);

await assertBotPermissions(interaction, [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks
      ]);

const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:create')
          .setLabel('فتح تذكرة')
          .setStyle(ButtonStyle.Primary)
      );

await channel.send({
        embeds: [
          makeEmbed(
            'مركز الدعم',
            'اضغط الزر أدناه لفتح تذكرة خاصة.\n' +
            'يمكنك فتح تذكرة واحدة في الوقت نفسه.\n\n' +
            'الإدارة، وأعضاء رتبة الدعم إذا كانت محددة، ' +
            'يمكنهم مشاهدة التذكرة.'
          )
        ],
        components: [row]
      });

await interaction.editReply({
        content: 'تم إرسال لوحة التذاكر.'
      });
      break;
    }

case 'close': {
      await requestTicketClose(interaction);
      break;
    }

default: {
      throw new UserError('هذا الأمر غير معروف.');
    }
  }
}

function friendlyError(error) {
  if (error instanceof UserError) return error.message;

switch (Number(error.code)) {
    case 50013:
      return 'صلاحيات البوت غير كافية، أو ترتيب رتبته لا يسمح بالعملية.';
    case 50001:
      return 'البوت لا يستطيع الوصول إلى القناة أو العنصر المطلوب.';
    case 10003:
      return 'القناة لم تعد موجودة.';
    case 10007:
      return 'العضو غير موجود في السيرفر.';
    case 10008:
      return 'الرسالة لم تعد موجودة.';
    case 30013:
      return 'وصل السيرفر إلى الحد المسموح من القنوات.';
    default:
      return 'حدث خطأ أثناء التنفيذ. راجع سجل البوت وحاول مجددًا.';
  }
}

async function reportError(interaction, error) {
  if (!(error instanceof UserError)) {
    // تسجيل رمز الخطأ فقط، دون طباعة التوكن أو بيانات الطلب.
    console.error('فشل تنفيذ تفاعل:', {
      name: error.name,
      code: error.code || 'UNKNOWN',
      command: interaction.commandName || interaction.customId
    });
  }

const payload = {
    content: friendlyError(error),
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
    console.error('تعذر إرسال رسالة الخطأ؛ ربما انتهت صلاحية التفاعل.');
  }
}

client.on(Events.InteractionCreate, async interaction => {
  if (
    !interaction.isChatInputCommand() &&
    !interaction.isButton()
  ) {
    return;
  }

try {
    if (!interaction.inGuild()) {
      throw new UserError('هذا البوت يعمل داخل السيرفرات فقط.');
    }

// ضمان توفر Guild وGuildMember من الكاش.
    if (!interaction.inCachedGuild()) {
      throw new UserError(
        'السيرفر غير جاهز في ذاكرة البوت بعد. حاول مجددًا بعد قليل.'
      );
    }

if (interaction.isButton()) {
      await handleButton(interaction);
    } else {
      await handleCommand(interaction);
    }
  } catch (error) {
    await reportError(interaction, error);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  if (CONFIG.autoRoleId) {
    try {
      const role = await member.guild.roles.fetch(
        CONFIG.autoRoleId
      );

if (role) {
        const bot = await getBotMember(member.guild);

if (
          !role.managed &&
          role.id !== member.guild.id &&
          bot.permissions.has(PermissionFlagsBits.ManageRoles) &&
          bot.roles.highest.comparePositionTo(role) > 0
        ) {
          await member.roles.add(
            role,
            'إضافة الرتبة التلقائية للعضو الجديد'
          );
        } else {
          console.error(
            'تعذر إعطاء الرتبة التلقائية: راجع صلاحيات وترتيب الرتب.'
          );
        }
      } else {
        console.error('رتبة الترحيب غير موجودة في هذا السيرفر.');
      }
    } catch (error) {
      console.error('فشل إعطاء الرتبة التلقائية:', error.code || error.name);
    }
  }

if (!CONFIG.welcomeChannelId) return;

try {
    const channel = await member.guild.channels.fetch(
      CONFIG.welcomeChannelId
    );

if (
      !channel?.isTextBased() ||
      typeof channel.send !== 'function'
    ) {
      return;
    }

await channel.send({
      content: `أهلًا وسهلًا <@${member.id}>!`,
      embeds: [
        makeEmbed(
          `مرحبًا بك في ${member.guild.name}`,
          'سعداء بانضمامك! اقرأ قوانين السيرفر واستمتع بوقتك.'
        )
          .setThumbnail(
            member.user.displayAvatarURL({ size: 256 })
          )
          .setFooter({
            text: `عدد الأعضاء الآن: ${member.guild.memberCount}`
          })
      ],
      allowedMentions: {
        parse: [],
        users: [member.id]
      }
    });
  } catch (error) {
    console.error('فشل إرسال الترحيب:', error.code || error.name);
  }
});

client.once(Events.ClientReady, async readyClient => {
  try {
    readyClient.user.setActivity('/help | إدارة وتذاكر', {
      type: ActivityType.Watching
    });

const rest = new REST({ version: '10' }).setToken(
      CONFIG.token
    );

const route = CONFIG.guildId
      ? Routes.applicationGuildCommands(
          readyClient.user.id,
          CONFIG.guildId
        )
      : Routes.applicationCommands(readyClient.user.id);

// تسجيل القائمة كاملة يستبدل أوامر هذا البوت في النطاق المختار.
    await rest.put(route, {
      body: commands.map(item => item.toJSON())
    });

console.log(`البوت متصل: ${readyClient.user.tag}`);
    console.log(
      CONFIG.guildId
        ? `تم تسجيل الأوامر في السيرفر: ${CONFIG.guildId}`
        : 'تم تسجيل الأوامر العامة؛ قد تحتاج وقتًا حتى تظهر.'
    );
  } catch (error) {
    console.error(
      'فشل تسجيل الأوامر. راجع معرّف السيرفر وصلاحية التوكن:',
      error.code || error.name
    );

client.destroy();
    process.exitCode = 1;
  }
});

client.on(Events.Error, error => {
  console.error('خطأ في عميل Discord:', error.code || error.name);
});

client.on(Events.Warn, () => {
  console.warn('صدر تنبيه من عميل Discord.');
});

function shutdown() {
  console.log('جارٍ إيقاف البوت...');
  client.destroy();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

client.login(CONFIG.token).catch(error => {
  console.error(
    'فشل تسجيل الدخول. راجع التوكن وServer Members Intent:',
    error.code || error.name
  );
  process.exitCode = 1;
});
