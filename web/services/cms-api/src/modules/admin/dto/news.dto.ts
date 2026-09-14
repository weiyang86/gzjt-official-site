import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator'

export class NewsCreateDto {
  @IsString()
  @MaxLength(255)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  summary?: string

  @IsOptional()
  @IsInt()
  categoryId?: number

  @IsOptional()
  @IsInt()
  coverFileId?: number

  @IsString()
  contentHtml!: string
}

export class NewsUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  summary?: string

  @IsOptional()
  @IsInt()
  categoryId?: number

  @IsOptional()
  @IsInt()
  coverFileId?: number

  @IsOptional()
  @IsString()
  contentHtml?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsInt()
  isTop?: number

  @IsOptional()
  @IsInt()
  isRecommend?: number
}

