import { IsOptional, IsString } from 'class-validator';

export class MetaWebhookQueryDto {
  @IsString()
  @IsOptional()
  readonly 'hub.mode'?: string;

  @IsString()
  @IsOptional()
  readonly 'hub.verify_token'?: string;

  @IsString()
  @IsOptional()
  readonly 'hub.challenge'?: string;
}
