import { supabase } from "./supabase";

// Pictures on cards. One picture per card, kept in the public bucket
// "card-images" as  <user id>/<random name>.webp  (see supabase/pictures.sql).
// Every picture is made small in the browser BEFORE it is uploaded.

export const IMAGE_BUCKET = "card-images";
export const MAX_PICTURES = 100; // per account. Must match pictures.sql.

const ALLOWED_INPUT = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // the file the student picks
const MAX_OUTPUT_BYTES = 400 * 1024; // after shrinking (the bucket allows 512 KB)
const ATTEMPTS = [
  [800, 0.8],
  [640, 0.7],
  [480, 0.6],
]; // [longest side in pixels, quality]

// An error with a friendly message that is safe to show to students.
export class PictureError extends Error {}

// The student already has the most pictures allowed.
export class PictureLimitError extends PictureError {
  constructor() {
    super(`You can keep up to ${MAX_PICTURES} pictures.`);
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new PictureError(
          "We could not open that picture. Try a JPG, PNG or WebP file.",
        ),
      );
    };
    img.src = url;
  });
}

function drawToCanvas(img, width, height, whiteBackground) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (whiteBackground) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Makes a small picture. Returns { blob, type, ext }.
// Throws a PictureError with a friendly message if it cannot.
export async function shrinkImage(file) {
  if (!ALLOWED_INPUT.includes(file.type)) {
    throw new PictureError("Please choose a JPG, PNG, WebP or GIF picture.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PictureError("That picture is too big (max 15 MB). Try another.");
  }
  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (!longest) throw new PictureError("We could not read that picture.");

  for (const [side, quality] of ATTEMPTS) {
    const scale = Math.min(1, side / longest);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    // WebP first. Some browsers cannot make WebP and quietly give PNG,
    // so we check the type we really got and fall back to JPEG.
    let blob = await toBlob(
      drawToCanvas(img, width, height, false),
      "image/webp",
      quality,
    );
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(
        drawToCanvas(img, width, height, true),
        "image/jpeg",
        quality,
      );
    }
    if (blob && blob.size <= MAX_OUTPUT_BYTES) {
      return {
        blob,
        type: blob.type,
        ext: blob.type === "image/webp" ? "webp" : "jpg",
      };
    }
  }
  throw new PictureError(
    "We could not make that picture small enough. Try a simpler one.",
  );
}

// The web address of a picture (public, so it works for anyone with the link).
export function cardImageUrl(path) {
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// How many pictures this student has uploaded, or null if we could not check.
export async function countMyPictures(userId) {
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list(userId, { limit: MAX_PICTURES + 50 });
  if (error) {
    console.error(error);
    return null;
  }
  return data.length;
}

// Uploads one shrunk picture into the student's own folder. Returns its path.
// image = { blob, type, ext }
export async function uploadCardImage(userId, image) {
  const path = `${userId}/${crypto.randomUUID()}.${image.ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, image.blob, {
      contentType: image.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    // The database refuses an upload after the limit, with a security message.
    const text = String(error.message || "").toLowerCase();
    if (
      text.includes("row-level security") ||
      String(error.statusCode) === "403"
    ) {
      throw new PictureLimitError();
    }
    throw error;
  }
  return path;
}

// Tries to delete picture files. The database only allows it when the file is
// yours and NO card anywhere still uses it, so this is safe to call.
// It never throws: a leftover file is not worth stopping the student.
export async function removeCardImages(paths) {
  const list = [...new Set((paths || []).filter(Boolean))];
  if (list.length === 0) return;
  try {
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(list);
    if (error) console.error(error);
  } catch (err) {
    console.error(err);
  }
}
