import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { FinancialTransactionsService } from './financial-transactions.service';

import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FinancialTransactionQueryDto } from './dto/financial-transaction-query.dto';

type PaymentProofUploadBody = {
  accountId?: string;
  categoryId?: string;
  type?: 'INCOME' | 'EXPENSE';
  autoCreate?: string;
};

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
    return this.financialTransactionsService.create(dto);
  }

  @Post('payment-proof/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: 'Enviar comprovante e lançar movimentação automaticamente',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: {
          type: 'string',
          enum: ['INCOME', 'EXPENSE'],
          example: 'EXPENSE',
        },
        accountId: {
          type: 'string',
        },
        categoryId: {
          type: 'string',
        },
        autoCreate: {
          type: 'string',
          example: 'true',
        },
      },
      required: ['file', 'accountId'],
    },
  })
  uploadPaymentProof(
    @UploadedFile()
    file: Express.Multer.File,

    @Body()
    body: PaymentProofUploadBody,
  ) {
    return this.financialTransactionsService.uploadPaymentProof(file, body);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar lançamentos',
  })
  findAll(
    @Query()
    query: FinancialTransactionQueryDto,
  ) {
    return this.financialTransactionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar lançamento',
  })
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.findOne(id);
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
    return this.financialTransactionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir lançamento',
  })
  remove(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.remove(id);
  }

  @Patch(':id/pay')
  @ApiOperation({
    summary: 'Marcar como pago',
  })
  markAsPaid(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.markAsPaid(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar lançamento',
  })
  cancel(
    @Param('id')
    id: string,
  ) {
    return this.financialTransactionsService.cancel(id);
  }
}