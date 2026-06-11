import {
  TransactionType,
  TransactionStatus,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFinancialTransactionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  description!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsUUID()
  transferAccountId?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}