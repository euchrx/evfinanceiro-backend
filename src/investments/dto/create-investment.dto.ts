import { InvestmentType } from '@prisma/client';

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

export class CreateInvestmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsEnum(InvestmentType)
  type: InvestmentType;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsNumber()
  @Min(0.01)
  investedAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @IsOptional()
  @IsNumber()
  profitability?: number;

  @IsDateString()
  investedAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
