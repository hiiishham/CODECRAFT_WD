import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} folder - Destination folder in Cloudinary
 * @param {string} resource_type - 'image', 'video', 'raw', or 'auto'
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadBuffer = (buffer, folder = 'staffpulse', resource_type = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary by its public ID
 * @param {string} publicId - The public ID of the file to delete
 * @param {string} resource_type - 'image', 'video', 'raw'
 * @returns {Promise<Object>} - Cloudinary delete result
 */
export const deleteFile = async (publicId, resource_type = 'auto') => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type });
  } catch (error) {
    console.error(`[CloudinaryService] Failed to delete file ${publicId}:`, error.message);
    throw error; // Or return null depending on handling
  }
};

/**
 * Generates an optimized secure URL for images
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  });
};

export default {
  uploadBuffer,
  deleteFile,
  getOptimizedImageUrl,
  cloudinary,
};
