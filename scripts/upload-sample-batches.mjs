import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Read .env file
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const bucketName = env.S3_SYNC_BUCKET || 'reconcilo-sync-batches-319426459693';
const region = env.AWS_REGION || 'us-east-1';

console.log(`Connecting to AWS S3...`);
console.log(`Target Bucket: ${bucketName}`);
console.log(`Region: ${region}`);

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Sample batches matching Reconcilo schema (architecture.md §16.3)
const sampleBatches = [
  {
    key: 'batches/batch-store001-20260914-0830.json',
    content: {
      batch_id: 'batch-store001-20260914-0830',
      store_id: 'store-001',
      device_id: 'reg-01-downtown',
      created_at: '2026-09-14T08:30:15.000Z',
      transaction_count: 14,
      transactions: [
        {
          transaction_id: 'tx-8f92-411a-9812-downtown-01',
          store_id: 'store-001',
          user_id: 'user_staff_01',
          device_id: 'reg-01-downtown',
          device_sequence: 1,
          product_id: 'CF-ESP-1KG',
          quantity: 2,
          unit_price: 24.5,
          type: 'SALE',
          created_at: '2026-09-14T08:12:00.000Z',
          lifecycle_state: 'PENDING',
        },
        {
          transaction_id: 'tx-8f92-411a-9812-downtown-02',
          store_id: 'store-001',
          user_id: 'user_staff_01',
          device_id: 'reg-01-downtown',
          device_sequence: 2,
          product_id: 'MLK-OAT-1L',
          quantity: 4,
          unit_price: 4.25,
          type: 'SALE',
          created_at: '2026-09-14T08:18:22.000Z',
          lifecycle_state: 'PENDING',
        },
        {
          transaction_id: 'tx-8f92-411a-9812-downtown-03',
          store_id: 'store-001',
          user_id: 'user_staff_01',
          device_id: 'reg-01-downtown',
          device_sequence: 3,
          product_id: 'SYR-VAN-750',
          quantity: 1,
          unit_price: 11.5,
          type: 'SALE',
          created_at: '2026-09-14T08:25:40.000Z',
          lifecycle_state: 'PENDING',
        },
      ],
    },
  },
  {
    key: 'batches/batch-store001-20260914-1215.json',
    content: {
      batch_id: 'batch-store001-20260914-1215',
      store_id: 'store-001',
      device_id: 'reg-01-downtown',
      created_at: '2026-09-14T12:15:22.000Z',
      transaction_count: 28,
      transactions: [
        {
          transaction_id: 'tx-9a01-411b-9813-downtown-15',
          store_id: 'store-001',
          user_id: 'user_staff_01',
          device_id: 'reg-01-downtown',
          device_sequence: 15,
          product_id: 'CF-FLT-250G',
          quantity: 3,
          unit_price: 14.0,
          type: 'SALE',
          created_at: '2026-09-14T11:45:10.000Z',
          lifecycle_state: 'PENDING',
        },
        {
          transaction_id: 'tx-9a01-411b-9813-downtown-16',
          store_id: 'store-001',
          user_id: 'user_staff_02',
          device_id: 'reg-01-downtown',
          device_sequence: 16,
          product_id: 'CUP-COM-12',
          quantity: 2,
          unit_price: 18.0,
          type: 'SALE',
          created_at: '2026-09-14T12:02:18.000Z',
          lifecycle_state: 'PENDING',
        },
      ],
    },
  },
  {
    key: 'batches/batch-store002-20260914-1100.json',
    content: {
      batch_id: 'batch-store002-20260914-1100',
      store_id: 'store-002',
      device_id: 'reg-02-uptown',
      created_at: '2026-09-14T11:00:10.000Z',
      transaction_count: 19,
      transactions: [
        {
          transaction_id: 'tx-7c33-411c-9814-uptown-01',
          store_id: 'store-002',
          user_id: 'user_staff_03',
          device_id: 'reg-02-uptown',
          device_sequence: 1,
          product_id: 'CF-ESP-1KG',
          quantity: 5,
          unit_price: 24.5,
          type: 'SALE',
          created_at: '2026-09-14T10:30:00.000Z',
          lifecycle_state: 'PENDING',
        },
      ],
    },
  },
];

async function run() {
  for (const item of sampleBatches) {
    console.log(`Uploading ${item.key}...`);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: item.key,
        Body: JSON.stringify(item.content, null, 2),
        ContentType: 'application/json',
      })
    );
    console.log(`✅ Uploaded: ${item.key}`);
  }

  console.log(`\nVerifying objects in ${bucketName}...`);
  const listRes = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'batches/',
    })
  );

  console.log(`\n🎉 S3 Bucket currently contains ${listRes.Contents?.length || 0} objects:`);
  listRes.Contents?.forEach((obj) => {
    console.log(` - ${obj.Key} (${obj.Size} bytes, LastModified: ${obj.LastModified})`);
  });
}

run().catch((err) => {
  console.error('Upload failed:', err);
});
