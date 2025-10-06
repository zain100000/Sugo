const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const path = require("path");
require("dotenv").config();

/**
 * @description Configure Cloudinary with credentials from environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * @description Multer in-memory storage
 */
const storage = multer.memoryStorage();

/**
 * @description Allowed image and video types
 */
const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
];

const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/x-matroska"];

/**
 * @description File filter to allow only images and videos
 */
const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(new Error("No file uploaded."), false);
  }

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "❌ Invalid file type. Only image (JPG, PNG, WEBP) and video (MP4, MOV, MKV) files are allowed."
      ),
      false
    );
  }
};

/**
 * @description Multer middleware to handle file uploads securely
 */
exports.upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).fields([{ name: "profilePicture", maxCount: 1 }]);

/**
 * @description Middleware to check if files are uploaded
 */
exports.checkUploadedFiles = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No files uploaded" });
  }
  next();
};

/**
 * @description Uploads an image buffer to Cloudinary with optional overwrite
 */
exports.uploadToCloudinary = async (
  file,
  type,
  userId = null,
  existingPublicId = null
) => {
  const baseFolder = "Sugo";
  let folder = baseFolder;
  let resourceType = "image";
  let transformation = {};

  switch (type) {
    case "profilePicture":
      folder += "/profilePictures";
      transformation = {
        width: 500,
        height: 500,
        crop: "fill",
        quality: "auto",
      };
      break;

    default:
      throw new Error("Invalid file type");
  }

  try {
    let public_id;

    if (existingPublicId) {
      public_id = existingPublicId;
    } else {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1e6);

      if (type === "profilePicture") {
        public_id = `${folder}/profile_${timestamp}-${randomNum}`;
      }
    }

    const fileBuffer = `data:${file.mimetype};base64,${file.buffer.toString(
      "base64"
    )}`;

    const uploadOptions = {
      public_id: public_id,
      resource_type: resourceType,
      overwrite: true,
      invalidate: true,
    };

    if (resourceType === "image" && Object.keys(transformation).length > 0) {
      uploadOptions.transformation = transformation;
    }

    const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error("❌ Error Uploading to Cloudinary:", error);
    throw new Error("Error uploading to Cloudinary");
  }
};

/**
 * @description Deletes an image or video from Cloudinary using its URL or public_id
 */
exports.deleteFromCloudinary = async (fileUrlOrId, resourceType = "image") => {
  try {
    let publicId = fileUrlOrId;

    if (fileUrlOrId.startsWith("http")) {
      const urlParts = fileUrlOrId.split("/");
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      publicId = publicIdWithExtension.split(".")[0];

      const cloudinaryIndex = urlParts.findIndex((part) =>
        part.includes("cloudinary")
      );
      if (cloudinaryIndex !== -1) {
        const resourceIndex = urlParts.findIndex(
          (part, index) =>
            index > cloudinaryIndex && (part === "image" || part === "video")
        );

        if (resourceIndex !== -1) {
          publicId = urlParts
            .slice(resourceIndex + 1)
            .join("/")
            .replace(/\.[^.]+$/, "");
        }
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result !== "ok") {
      console.error(`❌ Cloudinary Deletion Failed for: ${publicId}`);
    } else {
      console.log(`✅ Successfully deleted: ${publicId}`);
    }
  } catch (error) {
    console.error("❌ Error Deleting from Cloudinary:", error);
    throw new Error("Cloudinary Deletion Failed");
  }
};
