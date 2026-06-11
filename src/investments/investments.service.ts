import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateInvestmentDto } from './dto/create-investment.dto';
import { InvestmentQueryDto } from './dto/investment-query.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvestmentDto) {
    return this.prisma.investment.create({
      data: {
        name: dto.name,
        type: dto.type,
        institution: dto.institution,
        investedAmount: dto.investedAmount,
        currentAmount: dto.currentAmount,
        profitability: dto.profitability,
        investedAt: new Date(dto.investedAt),
        notes: dto.notes,
      },
    });
  }

  async findAll(query: InvestmentQueryDto) {
    const page = query.page ?? 1;
    const take = query.take ?? 20;

    const where: Prisma.InvestmentWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.investment.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: {
          investedAt: 'desc',
        },
      }),
      this.prisma.investment.count({
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
    const investment = await this.prisma.investment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!investment) {
      throw new NotFoundException('Investimento não encontrado.');
    }

    return investment;
  }

  async update(id: string, dto: UpdateInvestmentDto) {
    await this.findOne(id);

    return this.prisma.investment.update({
      where: {
        id,
      },
      data: {
        ...dto,
        investedAt: dto.investedAt ? new Date(dto.investedAt) : undefined,
        redeemedAt: dto.redeemedAt ? new Date(dto.redeemedAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.investment.update({
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
