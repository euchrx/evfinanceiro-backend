import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  CategoryType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: {
        deletedAt: null,
        name: dto.name,
        type: dto.type,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe uma categoria com esse nome.',
      );
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color,
      },
    });
  }

  async findAll(query: CategoryQueryDto) {
    const page = query.page ?? 1;
    const take = query.take ?? 20;

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
    };

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.type) {
      where.type = query.type as CategoryType;
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.category.count({
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
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Categoria não encontrada.',
      );
    }

    return category;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ) {
    await this.findOne(id);

    return this.prisma.category.update({
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

    await this.prisma.category.update({
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