import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { FinancialTransactionsService } from './financial-transactions.service';

import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FinancialTransactionQueryDto } from './dto/financial-transaction-query.dto';

@ApiTags('Financial Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial-transactions')
export class FinancialTransactionsController {
  constructor(
    private readonly financialTransactionsService: FinancialTransactionsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Criar lançamento',
  })
  create(
    @Body()
    dto: CreateFinancialTransactionDto,
  ) {
    return this.financialTransactionsService.create(
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar lançamentos',
  })
  findAll(
    @Query()
    query: FinancialTransactionQueryDto,
  ) {
    return this.financialTransactionsService.findAll(
      query,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar lançamento',
  })
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.findOne(
      id,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar lançamento',
  })
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFinancialTransactionDto,
  ) {
    return this.financialTransactionsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir lançamento',
  })
  remove(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.remove(
      id,
    );
  }

  @Patch(':id/pay')
  @ApiOperation({
    summary: 'Marcar como pago',
  })
  markAsPaid(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.markAsPaid(
      id,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar lançamento',
  })
  cancel(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.cancel(
      id,
    );
  }
}