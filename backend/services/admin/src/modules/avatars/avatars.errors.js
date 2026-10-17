'use strict';

const { defineErrors } = require('@ibitplay/common');

/** The largest avatar accepted: shown at 64–160px, 1 MB is ample for a 600px PNG. */
const MAX_AVATAR_BYTES = 1024 * 1024;

module.exports = defineErrors('AVATARS', {
  NOT_FOUND: { status: 404, message: 'No such avatar' },
  NO_FILE: { status: 400, message: 'No image was uploaded' },
  NOT_AN_IMAGE: { status: 415, message: 'That file is not a PNG, JPEG or WebP image' },
  FORMAT_REFUSED: { status: 415, message: 'That image format is not accepted here' },
  TOO_LARGE: { status: 413, message: `An avatar may not exceed ${MAX_AVATAR_BYTES / 1024 / 1024} MB` },
  TOO_SMALL: { status: 400, message: 'That upload is too small to be an image — it may have been truncated' },
});

module.exports.MAX_AVATAR_BYTES = MAX_AVATAR_BYTES;
