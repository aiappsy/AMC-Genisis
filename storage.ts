import { Storage } from '@google-cloud/storage';
import path from 'path';
// Explicitly import Buffer to fix the ReferenceError in environments where it is not globally scoped
import { Buffer } from 'buffer';

const storage = new Storage();

/**
 * Uploads a tree of files to a specific GCS bucket and prefix.
 * Files are expected to be base64 encoded.
 */
export async function uploadFileTree(bucketName: string, prefix: string, files: Array<{ path: string, contentBase64: string }>) {
  const bucket = storage.bucket(bucketName);
  
  const uploadPromises = files.map(async (file) => {
    // Construct the full destination path
    const destination = `${prefix}/${file.path}`.replace(/\/+/g, '/');
    const gcsFile = bucket.file(destination);
    
    // Decode base64 content
    // Using Buffer.from to decode base64 strings into Node.js buffers
    const buffer = Buffer.from(file.contentBase64, 'base64');
    
    // Infer content type
    const contentType = getContentType(file.path);
    
    // Save to GCS
    await gcsFile.save(buffer, {
      contentType,
      resumable: false,
      validation: 'md5',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      }
    });
  });

  await Promise.all(uploadPromises);
}

/**
 * Basic content-type inference based on file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.ts': 'text/plain',
    '.tsx': 'text/plain',
    '.map': 'application/json',
  };
  return mimeMap[ext] || 'application/octet-stream';
}