import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { FinancialTransactionsController } from './financial-transactions.controller';
import { FinancialTransactionsService } from './financial-transactions.service';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialTransactionsController],
  providers: [FinancialTransactionsService],
  exports: [FinancialTransactionsService],
})
export class FinancialTransactionsModule {}