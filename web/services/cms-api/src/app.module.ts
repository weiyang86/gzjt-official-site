import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PublicModule } from './modules/public/public.module'

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
}

preloadEnv()

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath }),
    PublicModule
  ]
})
export class AppModule {}
