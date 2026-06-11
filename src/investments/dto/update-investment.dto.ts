import {
  InvestmentStatus,
  InvestmentType,
} from '@prisma/client';

import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateInvestmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(InvestmentType)
  type?: InvestmentType;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  investedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @IsOptional()
  @IsNumber()
  profitability?: number;

  @IsOptional()
  @IsDateString()
  investedAt?: string;

  @IsOptional()
  @IsDateString()
  redeemedAt?: string;

  @IsOptional()
  @IsEnum(InvestmentStatus)
  status?: InvestmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
