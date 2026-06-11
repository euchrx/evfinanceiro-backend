import { AccountType } from '@prisma/client';

import { Type } from 'class-transformer';

import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialBalance?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}