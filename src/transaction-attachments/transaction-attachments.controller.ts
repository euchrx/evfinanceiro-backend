import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
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

import type { Response } from 'express';

import { diskStorage } from 'multer';

import { extname } from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { TransactionAttachmentsService } from './transaction-attachments.service';

@ApiTags('Transaction Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transaction-attachments')
export class TransactionAttachmentsController {
  constructor(
    private readonly transactionAttachmentsService: TransactionAttachmentsService,
  ) {}

  @Post(':transactionId/upload')
  @ApiOperation({ summary: 'Enviar comprovante de lançamento' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/transaction-attachments',
        filename: (_req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}`;

          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  upload(
    @Param('transactionId') transactionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.transactionAttachmentsService.upload(transactionId, file);
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Listar comprovantes de um lançamento' })
  findByTransaction(@Param('transactionId') transactionId: string) {
    return this.transactionAttachmentsService.findByTransaction(transactionId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Baixar comprovante' })
  async download(@Param('id') id: string, @Res() response: Response) {
    const attachment = await this.transactionAttachmentsService.findOne(id);

    return response.download(attachment.filePath, attachment.originalName);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir comprovante' })
  remove(@Param('id') id: string) {
    return this.transactionAttachmentsService.remove(id);
  }
}
