const { TextChannel } = require('discord.js');

const TYPE_PLAIN = 'plain';
const TYPE_PRIMARY = 'primary';
const TYPE_INFO = 'info';
const TYPE_SUCCESS = 'success';
const TYPE_WARNING = 'warning';
const TYPE_ERROR = 'error';

/**
 * Sends an alert message to a channel
 * @param content
 * @param type
 * @param mentions
 * @returns null
 */
TextChannel.prototype.alert = async function (content, type, mentions) {
  let messageOptions = {};
  let pings = [];

  if (typeof mentions !== 'undefined' && mentions.length > 0) {
    pings = mentions.map((m) => `<@!${m}>`);
  }

  const types = [
    TYPE_PLAIN,
    TYPE_PRIMARY,
    TYPE_INFO,
    TYPE_SUCCESS,
    TYPE_WARNING,
    TYPE_ERROR,
  ];

  if (!types.includes(type)) {
    return this.send('Invalid alert type.');
  }

  const colors = {
    [TYPE_PLAIN]: 0,
    [TYPE_PRIMARY]: 5392267,
    [TYPE_INFO]: 3901635,
    [TYPE_SUCCESS]: 7844437,
    [TYPE_WARNING]: 16763981,
    [TYPE_ERROR]: 12458289,
  };

  const emotes = {
    [TYPE_PLAIN]: ':grey_exclamation:',
    [TYPE_PRIMARY]: ':bookmark_tabs:',
    [TYPE_INFO]: ':information_source:',
    [TYPE_SUCCESS]: ':white_check_mark:',
    [TYPE_WARNING]: ':warning:',
    [TYPE_ERROR]: ':no_entry:',
  };

  const headings = {
    [TYPE_PLAIN]: 'Text',
    [TYPE_PRIMARY]: 'Alert',
    [TYPE_INFO]: 'Info',
    [TYPE_SUCCESS]: 'Success!',
    [TYPE_WARNING]: 'Warning!',
    [TYPE_ERROR]: 'Error!',
  };

  const color = colors[type];
  const emote = emotes[type];
  const heading = headings[type];

  if (type !== TYPE_PLAIN) {
    content = `\u200B\n${content}`;
  }

  const embed = {
    color,
    fields: [
      {
        name: `${emote} ${heading}`,
        value: content,
      },
    ],
  };

  // Embed Field Values can only be up to 1024 characters
  if (content.length > 1024) {
    messageOptions = {
      content: pings.join(', '),
      files: [{
        attachment: Buffer.from(content, 'utf-8'),
        name: 'message.txt',
      }],
    };

    await this.send(messageOptions);
    this.send('The output was too big, therefore the message is attached as a text file.');
  }

  if (type === TYPE_PLAIN) {
    if (pings.length > 0) {
      messageOptions.content = `${pings.join(', ')}\n${content}`;
    } else {
      messageOptions.content = content;
    }
  } else {
    messageOptions.content = pings.join(', ');
    messageOptions.embeds = [embed];
  }

  return this.send(messageOptions);
};

TextChannel.prototype.primary = function (content, mentions) {
  return this.alert(content, TYPE_PRIMARY, mentions);
};

TextChannel.prototype.info = function (content, mentions) {
  return this.alert(content, TYPE_INFO, mentions);
};

TextChannel.prototype.success = function (content, mentions) {

  return this.alert(content, TYPE_SUCCESS, mentions);
};

TextChannel.prototype.warn = function (content, mentions) {
  return this.alert(content, TYPE_WARNING, mentions);
};

TextChannel.prototype.error = function (content, mentions) {
  return this.alert(content, TYPE_ERROR, mentions).then((m) => m.delete({ timeout: 30000 }));
};
