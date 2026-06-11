import { AccountType } from '@prisma/client';

import { Type } from 'class-transformer';

import {
  IsEnum,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  initialBalance!: number;
}