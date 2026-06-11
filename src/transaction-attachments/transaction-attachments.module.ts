import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { TransactionAttachmentsController } from './transaction-attachments.controller';
import { TransactionAttachmentsService } from './transaction-attachments.service';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionAttachmentsController],
  providers: [TransactionAttachmentsService],
  exports: [TransactionAttachmentsService],
})
export class TransactionAttachmentsModule {}
