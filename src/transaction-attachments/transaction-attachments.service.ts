import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(transactionId: string, file: Express.Multer.File) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id: transactionId,
        deletedAt: null,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    return this.prisma.transactionAttachment.create({
      data: {
        transactionId,
        originalName: file.originalname,
        fileName: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
      },
    });
  }

  async findByTransaction(transactionId: string) {
    await this.ensureTransactionExists(transactionId);

    return this.prisma.transactionAttachment.findMany({
      where: {
        transactionId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const attachment = await this.prisma.transactionAttachment.findUnique({
      where: {
        id,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Comprovante não encontrado.');
    }

    return attachment;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.transactionAttachment.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
    };
  }

  private async ensureTransactionExists(transactionId: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id: transactionId,
        deletedAt: null,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    return transaction;
  }
}
