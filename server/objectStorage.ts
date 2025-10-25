// Simplified AWS S3-backed storage implementation (no ACLs)
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

const s3 = new S3Client({ region: process.env.AWS_REGION });

export class ObjectStorageService {
  constructor() {}

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set");
    }
    return dir;
  }

  // Generate a presigned PUT URL where clients can upload directly.
  // Returns both the signed URL and the internal normalized object path
  // (e.g. `/objects/uploads/<id>`) so callers can store that as the photo URL.
  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir(); // e.g. /bucket/path
    const objectId = randomUUID();
    const entityId = `uploads/${objectId}`;
    const fullPath = `${privateObjectDir}/${entityId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    const cmd = new PutObjectCommand({ Bucket: bucketName, Key: objectName });
    const signed = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    return { uploadURL: signed, objectPath: `/objects/${entityId}` };
  }

  // Resolve a normalized object path like /objects/<id> to an S3 file wrapper
  async getObjectEntityFile(objectPath: string): Promise<S3File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const file = new S3File(bucketName, objectName);
    const exists = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  // Accept S3 URL or already normalized paths and return normalized /objects/:id
  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      // s3 URL like https://bucket.s3.region.amazonaws.com/key
      const hostParts = url.hostname.split(".");
      if (hostParts.length && hostParts[0]) {
        const bucket = hostParts[0];
        const key = url.pathname.replace(/^\//, "");
        const privateDir = this.getPrivateObjectDir().replace(/^\//, "");
        if (key.startsWith(privateDir)) {
          const entityId = key.slice(privateDir.length).replace(/^\//, "");
          return `/objects/${entityId}`;
        }
      }
    } catch (e) {
      // not a URL
    }
    return rawPath;
  }

  // Note: ACL-related helpers were removed — storage assumes the API layer
  // handles authentication/authorization and that objects under the
  // configured PRIVATE_OBJECT_DIR are accessible to authenticated users.

  // Stream object to response
  async downloadObject(file: S3File, res: Response, cacheTtlSec = 3600) {
    try {
      const meta = await file.getMetadata();
      res.set({
        "Content-Type": meta.ContentType || "application/octet-stream",
        "Content-Length": meta.ContentLength?.toString() ?? undefined,
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });
      const body = await file.createReadStream();
      (body as unknown as NodeJS.ReadableStream).pipe(res);
    } catch (err) {
      console.error("Error streaming S3 object:", err);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }
}

// helper S3 file wrapper used by the service
class S3File {
  bucket: string;
  key: string;
  constructor(bucket: string, key: string) {
    this.bucket = bucket;
    this.key = key;
  }

  async exists(): Promise<boolean> {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }));
      return true;
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }

  async getMetadata() {
    const head = await s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }));
    return {
      ContentType: head.ContentType,
      ContentLength: head.ContentLength,
      Metadata: head.Metadata || {},
    };
  }

  async createReadStream() {
    const resp = await s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key }));
    return resp.Body as any;
  }

  publicUrl() {
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(this.key)}`;
  }
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid path");
  const bucketName = parts[0];
  const objectName = parts.slice(1).join("/");
  return { bucketName, objectName };
}
