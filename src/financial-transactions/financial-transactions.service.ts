import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FinancialTransactionQueryDto } from './dto/financial-transaction-query.dto';

@Injectable()
export class FinancialTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateFinancialTransactionDto,
  ) {
    if (
      dto.type === TransactionType.TRANSFER &&
      !dto.transferAccountId
    ) {
      throw new BadRequestException(
        'Conta destino obrigatória.',
      );
    }

    return this.prisma.financialTransaction.create({
      data: {
        description: dto.description,
        type: dto.type,
        amount: dto.amount,
        transactionDate: new Date(dto.transactionDate),
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : null,
        notes: dto.notes,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        transferAccountId:
          dto.transferAccountId,
        status:
          dto.status ??
          TransactionStatus.PENDING,
      },
      include: {
        category: true,
        account: true,
        transferAccount: true,
      },
    });
  }

  async findAll(
    query: FinancialTransactionQueryDto,
  ) {
    const page = query.page ?? 1;
    const take = query.take ?? 20;

    const where: Prisma.FinancialTransactionWhereInput =
      {
        deletedAt: null,
      };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (
      query.startDate ||
      query.endDate
    ) {
      where.transactionDate = {};

      if (query.startDate) {
        where.transactionDate.gte =
          new Date(query.startDate);
      }

      if (query.endDate) {
        where.transactionDate.lte =
          new Date(query.endDate);
      }
    }

    const [items, total] =
      await Promise.all([
        this.prisma.financialTransaction.findMany(
          {
            where,
            skip: (page - 1) * take,
            take,
            orderBy: {
              transactionDate: 'desc',
            },
            include: {
              category: true,
              account: true,
              transferAccount: true,
            },
          },
        ),

        this.prisma.financialTransaction.count(
          {
            where,
          },
        ),
      ]);

    return {
      items,
      total,
      page,
      take,
    };
  }

  async findOne(id: string) {
    const transaction =
      await this.prisma.financialTransaction.findFirst(
        {
          where: {
            id,
            deletedAt: null,
          },
          include: {
            category: true,
            account: true,
            transferAccount: true,
            attachments: true,
          },
        },
      );

    if (!transaction) {
      throw new NotFoundException(
        'Lançamento não encontrado.',
      );
    }

    return transaction;
  }

  async update(
    id: string,
    dto: UpdateFinancialTransactionDto,
  ) {
    await this.findOne(id);

    if (
      dto.type === TransactionType.TRANSFER &&
      !dto.transferAccountId
    ) {
      throw new BadRequestException(
        'Conta destino obrigatória.',
      );
    }

    return this.prisma.financialTransaction.update(
      {
        where: {
          id,
        },
        data: {
          ...dto,
          transactionDate:
            dto.transactionDate
              ? new Date(
                  dto.transactionDate,
                )
              : undefined,
          dueDate:
            dto.dueDate
              ? new Date(dto.dueDate)
              : undefined,
        },
        include: {
          category: true,
          account: true,
          transferAccount: true,
        },
      },
    );
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.financialTransaction.update(
      {
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
        },
      },
    );

    return {
      success: true,
    };
  }

  async markAsPaid(id: string) {
    await this.findOne(id);

    return this.prisma.financialTransaction.update(
      {
        where: {
          id,
        },
        data: {
          status:
            TransactionStatus.PAID,
          paidAt: new Date(),
        },
      },
    );
  }

  async cancel(id: string) {
    await this.findOne(id);

    return this.prisma.financialTransaction.update(
      {
        where: {
          id,
        },
        data: {
          status:
            TransactionStatus.CANCELED,
        },
      },
    );
  }
}