import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { AccountsModule } from './accounts/accounts.module';
import { FinancialTransactionsModule } from './financial-transactions/financial-transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InvestmentsModule } from './investments/investments.module';
import { TransactionAttachmentsModule } from './transaction-attachments/transaction-attachments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    CategoriesModule,
    AccountsModule,
    FinancialTransactionsModule,
    DashboardModule,
    InvestmentsModule,
    TransactionAttachmentsModule,
  ],
})
export class AppModule {}