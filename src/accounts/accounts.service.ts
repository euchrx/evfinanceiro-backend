import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AccountType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountQueryDto } from './dto/account-query.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(dto: CreateAccountDto) {
    const existing = await this.prisma.financialAccount.findFirst({
      where: {
        deletedAt: null,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe uma conta com esse nome.',
      );
    }

    return this.prisma.financialAccount.create({
      data: {
        name: dto.name,
        type: dto.type,
        initialBalance: dto.initialBalance,
      },
    });
  }

  async findAll(query: AccountQueryDto) {
    const page = Number(query.page ?? 1);
    const take = Number(query.take ?? 20);

    const where: Prisma.FinancialAccountWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.type) {
      where.type = query.type as AccountType;
    }

    const [items, total] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.financialAccount.count({
        where,
      }),
    ]);

    return {
      items,
      total,
      page,
      take,
    };
  }

  async findOne(id: string) {
    const account =
      await this.prisma.financialAccount.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

    if (!account) {
      throw new NotFoundException(
        'Conta não encontrada.',
      );
    }

    return account;
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
  ) {
    await this.findOne(id);

    return this.prisma.financialAccount.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.financialAccount.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  }
}