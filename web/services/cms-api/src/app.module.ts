import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AdminModule } from './modules/admin/admin.module'
import { AuthModule } from './modules/auth/auth.module'
import { PublicModule } from './modules/public/public.module'
import { PrismaModule } from './prisma/prisma.module'
import { StorageModule } from './storage/storage.module'

const envFilePath = [
  resolve(__dirname, '..', '.env'),
  resolve(__dirname, '..', '..', '..', '..', '.env.directus')
]
const parseEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) return {}
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex <= 0) return acc
      const key = trimmed.slice(0, eqIndex).trim()
      const rawValue = trimmed.slice(eqIndex + 1).trim()
      acc[key] = rawValue.replace(/^['"]|['"]$/g, '')
      return acc
    }, {})
}

const preloadEnv = () => {
  envFilePath
    .map(parseEnvFile)
    .forEach((entries) => {
      Object.entries(entries).forEach(([key, value]) => {
        if (!process.env[key]) process.env[key] = value
      })
    })
  if (!process.env.CMS_API_PUBLIC_ONLY) process.env.CMS_API_PUBLIC_ONLY = 'true'
}

preloadEnv()

const publicOnly = process.env.CMS_API_PUBLIC_ONLY === 'true'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath }),
    ...(publicOnly ? [] : [PrismaModule, StorageModule, AuthModule, AdminModule]),
    PublicModule
  ]
})
export class AppModule {}
