import { Injectable } from '@nestjs/common'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

export type PresignPutResult = {
  method: 'PUT'
  url: string
  publicUrl: string
  objectKey: string
  bucket: string
}

@Injectable()
export class StorageService {
  private s3: S3Client

  constructor() {
    this.s3 = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: true,
      credentials: process.env.S3_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY || ''
          }
        : undefined
    })
  }

  async presignPut(params: { filename: string; contentType?: string }) {
    const bucket = process.env.S3_BUCKET || 'ganzi'
    const ext = this.safeExt(params.filename)
    const objectKey = `uploads/${this.ymd()}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: params.contentType || 'application/octet-stream'
    })
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: 600 })
    const publicBase = (process.env.STORAGE_PUBLIC_BASE_URL || '').replace(/\/+$/, '')
    const publicUrl = publicBase ? `${publicBase}/${objectKey}` : objectKey
    const res: PresignPutResult = { method: 'PUT', url, publicUrl, objectKey, bucket }
    return res
  }

  private ymd() {
    const d = new Date()
    const y = String(d.getFullYear())
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}`
  }

  private safeExt(filename: string) {
    const m = filename.toLowerCase().match(/\.([a-z0-9]{1,10})$/)
    return m ? m[1] : ''
  }
}

