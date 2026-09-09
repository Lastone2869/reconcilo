/**
 * S3 Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon S3
 * --------------------------------
 * 1. Open AWS Console -> S3 -> Create bucket
 * 2. Name: reconcilo-sync-batches-<account-id>
 * 3. Configure event notification on `transactions/*.json` PUT to trigger Ingestion Lambda
 * 4. Replace this stub implementation with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
 */

const mockS3Store = new Map<string, string>();

export class S3Adapter {
  /**
   * Uploads a batch JSON object to S3.
   * // TODO: Replace stub with real AWS SDK S3 PutObjectCommand
   */
  static async uploadBatch(
    bucket: string,
    key: string,
    data: Record<string, any> | string
  ): Promise<{ success: boolean; eTag?: string; key: string }> {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const fullKey = `${bucket}/${key}`;
    mockS3Store.set(fullKey, content);
    return {
      success: true,
      eTag: `"stub-etag-${Date.now()}"`,
      key,
    };
  }

  /**
   * Retrieves a batch object from S3.
   * // TODO: Replace stub with real AWS SDK S3 GetObjectCommand
   */
  static async getBatch<T>(bucket: string, key: string): Promise<T | null> {
    const fullKey = `${bucket}/${key}`;
    const content = mockS3Store.get(fullKey);
    if (!content) return null;
    return JSON.parse(content) as T;
  }

  /**
   * Generates a presigned URL for direct client upload.
   * // TODO: Replace stub with real AWS SDK getSignedUrl
   */
  static async generatePresignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 300
  ): Promise<string> {
    return `https://${bucket}.s3.amazonaws.com/${key}?stub_token=${Date.now()}&expires=${expiresInSeconds}`;
  }

  /**
   * Clears mock storage.
   */
  static resetMockStore(): void {
    mockS3Store.clear();
  }
}
