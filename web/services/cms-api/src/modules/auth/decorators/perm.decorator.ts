import { SetMetadata } from '@nestjs/common'

export const PERM_KEY = 'perm'
export const Perm = (perm: string) => SetMetadata(PERM_KEY, perm)

