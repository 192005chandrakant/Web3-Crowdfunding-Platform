const { v2: cloudinary } = require("cloudinary");

function getCloudinaryCloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME?.trim();
}

function getCloudinaryApiKey() {
  return process.env.CLOUDINARY_API_KEY?.trim();
}

function getCloudinaryApiSecret() {
  return process.env.CLOUDINARY_API_SECRET?.trim();
}

function isCloudinaryConfigured() {
  return Boolean(
    getCloudinaryCloudName() &&
      getCloudinaryApiKey() &&
      getCloudinaryApiSecret()
  );
}

function isCloudinaryDeliveryConfigured() {
  return Boolean(getCloudinaryCloudName());
}

function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Missing Cloudinary credentials");
  }

  cloudinary.config({
    cloud_name: getCloudinaryCloudName(),
    api_key: getCloudinaryApiKey(),
    api_secret: getCloudinaryApiSecret()
  });
}

function toPublicId(filename) {
  const basename = String(filename || "campaign-cover")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return basename || "campaign-cover";
}

function buildUniquePublicId(filename) {
  const base = toPublicId(filename);
  const random = Math.random().toString(36).slice(2, 8);
  return `${base}-${Date.now()}-${random}`;
}

function uploadImageBuffer(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Cloudinary upload requires a non-empty image buffer");
  }

  configureCloudinary();

  return new Promise((resolve, reject) => {
    const resolvedPublicId = options.publicId || buildUniquePublicId(options.filename);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "milestonechain/campaigns",
        resource_type: "image",
        public_id: resolvedPublicId,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        invalidate: true,
        context: options.context || {},
        transformation: [{ quality: "auto", fetch_format: "auto" }]
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({
          url: result.secure_url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          assetId: result.asset_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format
        });
      }
    );

    stream.end(buffer);
  });
}

function buildFetchImageUrl(remoteUrl) {
  if (!isCloudinaryDeliveryConfigured()) {
    throw new Error("Missing Cloudinary cloud name");
  }

  let parsed;
  try {
    parsed = new URL(remoteUrl);
  } catch {
    throw new Error("Remote image URL is invalid");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Remote image URL must use http or https");
  }

  const cloudName = encodeURIComponent(getCloudinaryCloudName());
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto/${encodeURI(parsed.href)}`;
}

module.exports = {
  isCloudinaryConfigured,
  isCloudinaryDeliveryConfigured,
  uploadImageBuffer,
  buildFetchImageUrl
};
