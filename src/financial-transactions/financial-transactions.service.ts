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

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';

import { PrismaService } from '../prisma/prisma.service';

import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FinancialTransactionQueryDto } from './dto/financial-transaction-query.dto';

type PaymentProofUploadBody = {
  accountId?: string;
  categoryId?: string;
  type?: 'INCOME' | 'EXPENSE';
  autoCreate?: string;
};

type ParsedPaymentProof = {
  rawText: string;
  amount: number | null;
  transactionDate: string | null;
  payerName: string | null;
  recipientName: string | null;
  bankName: string | null;
  pixKey: string | null;
  endToEndId: string | null;
  confidence: number;
  warnings: string[];
};

@Injectable()
export class FinancialTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFinancialTransactionDto) {
    if (dto.type === TransactionType.TRANSFER && !dto.transferAccountId) {
      throw new BadRequestException('Conta destino obrigatória.');
    }

    return this.prisma.financialTransaction.create({
      data: {
        description: dto.description,
        type: dto.type,
        amount: dto.amount,
        transactionDate: this.parseDateForDatabase(dto.transactionDate),
        dueDate: dto.dueDate ? this.parseDateForDatabase(dto.dueDate) : null,
        notes: dto.notes,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        transferAccountId: dto.transferAccountId,
        status: dto.status ?? TransactionStatus.PENDING,
        paidAt: dto.status === TransactionStatus.PAID ? new Date() : null,
      },
      include: {
        category: true,
        account: true,
        transferAccount: true,
        attachments: true,
      },
    });
  }

  async uploadPaymentProof(
    file: Express.Multer.File,
    body: PaymentProofUploadBody,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum comprovante enviado.');
    }

    if (!body.accountId) {
      throw new BadRequestException(
        'Conta obrigatória para lançar o comprovante.',
      );
    }

    const account = await this.prisma.financialAccount.findFirst({
      where: {
        id: body.accountId,
        deletedAt: null,
        active: true,
      },
    });

    if (!account) {
      throw new BadRequestException('Conta informada não encontrada.');
    }

    if (body.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: body.categoryId,
          deletedAt: null,
          active: true,
        },
      });

      if (!category) {
        throw new BadRequestException('Categoria informada não encontrada.');
      }
    }

    const parsed = await this.readPaymentProof(file);

    const canCreate =
      parsed.amount !== null &&
      parsed.transactionDate !== null &&
      parsed.confidence >= 50;

    const shouldAutoCreate = body.autoCreate !== 'false';

    if (parsed.endToEndId) {
      const duplicate = await this.prisma.financialTransaction.findFirst({
        where: {
          proofEndToEndId: parsed.endToEndId,
          deletedAt: null,
        },
        include: {
          category: true,
          account: true,
          transferAccount: true,
          attachments: true,
        },
      });

      if (duplicate) {
        return {
          status: 'DUPLICATE',
          message: 'Este comprovante parece já ter sido lançado no sistema.',
          parsed,
          transaction: duplicate,
        };
      }
    }

    if (!canCreate || !shouldAutoCreate) {
      return {
        status: 'NEEDS_REVIEW',
        message: 'Comprovante lido, mas precisa de conferência manual.',
        parsed,
        transaction: null,
      };
    }

    const amount = parsed.amount;
    const transactionDate = parsed.transactionDate;

    if (amount === null || transactionDate === null) {
      return {
        status: 'NEEDS_REVIEW',
        message: 'Comprovante lido, mas precisa de conferência manual.',
        parsed,
        transaction: null,
      };
    }

    const transactionType =
      body.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;

    const description = this.buildProofDescription(parsed, transactionType);

    const savedFile = await this.saveAttachmentFile(file);

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        description,
        type: transactionType,
        status: TransactionStatus.PAID,
        amount,
        transactionDate: this.parseDateForDatabase(transactionDate),
        paidAt: new Date(),
        accountId: body.accountId,
        categoryId: body.categoryId || null,
        notes: this.buildProofNotes(parsed),
        proofEndToEndId: parsed.endToEndId,
        proofPixKey: parsed.pixKey,
        proofPayerName: parsed.payerName,
        proofRecipientName: parsed.recipientName,
        proofBankName: parsed.bankName,
        proofConfidence: parsed.confidence,
        proofRawText: parsed.rawText,
        attachments: {
          create: {
            originalName: file.originalname || 'comprovante',
            fileName: savedFile.fileName,
            mimeType: file.mimetype || 'application/octet-stream',
            fileSize: file.size,
            filePath: savedFile.filePath,
          },
        },
      },
      include: {
        category: true,
        account: true,
        transferAccount: true,
        attachments: true,
      },
    });

    return {
      status: 'CREATED',
      message: 'Movimentação lançada automaticamente pelo comprovante.',
      parsed,
      transaction,
    };
  }

  async findAll(query: FinancialTransactionQueryDto) {
    const page = query.page ?? 1;
    const take = query.take ?? 20;

    const where: Prisma.FinancialTransactionWhereInput = {
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

    if (query.startDate || query.endDate) {
      where.transactionDate = {};

      if (query.startDate) {
        where.transactionDate.gte = this.startOfDayBrasilia(query.startDate);
      }

      if (query.endDate) {
        where.transactionDate.lte = this.endOfDayBrasilia(query.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
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
          attachments: true,
        },
      }),

      this.prisma.financialTransaction.count({
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
    const transaction = await this.prisma.financialTransaction.findFirst({
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
    });

    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    return transaction;
  }

  async update(id: string, dto: UpdateFinancialTransactionDto) {
    await this.findOne(id);

    if (dto.type === TransactionType.TRANSFER && !dto.transferAccountId) {
      throw new BadRequestException('Conta destino obrigatória.');
    }

    return this.prisma.financialTransaction.update({
      where: {
        id,
      },
      data: {
        ...dto,
        transactionDate: dto.transactionDate
          ? this.parseDateForDatabase(dto.transactionDate)
          : undefined,
        dueDate: dto.dueDate
          ? this.parseDateForDatabase(dto.dueDate)
          : undefined,
        paidAt:
          dto.status === TransactionStatus.PAID
            ? new Date()
            : dto.status === TransactionStatus.PENDING
              ? null
              : undefined,
      },
      include: {
        category: true,
        account: true,
        transferAccount: true,
        attachments: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.financialTransaction.update({
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

  async markAsPaid(id: string) {
    await this.findOne(id);

    return this.prisma.financialTransaction.update({
      where: {
        id,
      },
      data: {
        status: TransactionStatus.PAID,
        paidAt: new Date(),
      },
      include: {
        category: true,
        account: true,
        transferAccount: true,
        attachments: true,
      },
    });
  }

  async cancel(id: string) {
    await this.findOne(id);

    return this.prisma.financialTransaction.update({
      where: {
        id,
      },
      data: {
        status: TransactionStatus.CANCELED,
      },
      include: {
        category: true,
        account: true,
        transferAccount: true,
        attachments: true,
      },
    });
  }

  private async readPaymentProof(
    file: Express.Multer.File,
  ): Promise<ParsedPaymentProof> {
    const rawText = await this.extractTextFromFile(file);
    return this.parsePaymentProof(rawText);
  }

  private async extractTextFromFile(file: Express.Multer.File) {
    const mimeType = file.mimetype?.toLowerCase() ?? '';

    if (mimeType.includes('pdf')) {
      const parser = new PDFParse({
        data: file.buffer,
      });

      try {
        const result = await parser.getText();
        return result.text ?? '';
      } finally {
        await parser.destroy();
      }
    }

    if (
      mimeType.includes('image/jpeg') ||
      mimeType.includes('image/jpg') ||
      mimeType.includes('image/png') ||
      mimeType.includes('image/webp')
    ) {
      const worker = await createWorker('por+eng');

      try {
        const result = await worker.recognize(file.buffer);
        return result.data.text ?? '';
      } finally {
        await worker.terminate();
      }
    }

    throw new BadRequestException(
      'Formato de arquivo inválido. Envie PDF, JPG, PNG ou WEBP.',
    );
  }

  private parsePaymentProof(rawText: string): ParsedPaymentProof {
    const text = this.normalizeText(rawText);

    const amount = this.extractAmount(text);
    const transactionDate = this.extractDate(text);
    const payerName = this.extractPayerName(text);
    const recipientName = this.extractRecipientName(text);
    const bankName = this.extractBankName(text);
    const pixKey = this.extractPixKey(text);
    const endToEndId = this.extractEndToEndId(text);

    const warnings: string[] = [];
    let confidence = 0;

    if (amount !== null) {
      confidence += 30;
    } else {
      warnings.push('Valor do comprovante não identificado.');
    }

    if (transactionDate) {
      confidence += 25;
    } else {
      warnings.push('Data do comprovante não identificada.');
    }

    if (payerName) {
      confidence += 10;
    } else {
      warnings.push('Pagador não identificado.');
    }

    if (recipientName) {
      confidence += 10;
    } else {
      warnings.push('Destinatário não identificado.');
    }

    if (bankName) {
      confidence += 10;
    }

    if (pixKey) {
      confidence += 5;
    }

    if (endToEndId) {
      confidence += 10;
    }

    if (!text.trim()) {
      confidence = 0;
      warnings.push('Não foi possível ler o comprovante automaticamente.');
    }

    return {
      rawText,
      amount,
      transactionDate,
      payerName,
      recipientName,
      bankName,
      pixKey,
      endToEndId,
      confidence,
      warnings,
    };
  }

  private normalizeText(value: string) {
    return value
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private extractAmount(text: string): number | null {
    const patterns = [
      /(?:valor|valor pago|valor da transação|total|pagamento)\s*[:\-]?\s*R?\$?\s*([\d.]+,\d{2})/i,
      /R\$\s*([\d.]+,\d{2})/i,
      /\b([\d.]+,\d{2})\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        return this.parseBrazilianMoney(match[1]);
      }
    }

    return null;
  }

  private parseBrazilianMoney(value: string) {
    return Number(value.replace(/\./g, '').replace(',', '.'));
  }

  private extractDate(text: string): string | null {
    const dateTimeMatch = text.match(
      /(\d{2})\/(\d{2})\/(\d{4})(?:\s*(?:às|as|-)?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?/i,
    );

    if (dateTimeMatch) {
      const [, day, month, year, hour = '12', minute = '00', second = '00'] =
        dateTimeMatch;

      return `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
    }

    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);

    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month}-${day}T12:00:00-03:00`;
    }

    return null;
  }

  private extractPayerName(text: string): string | null {
    const patterns = [
      /(?:pagador|quem pagou|origem|de)\s*[:\-]?\s*([A-ZÀ-Ú0-9 .'-]{4,})/i,
      /(?:nome do pagador)\s*[:\-]?\s*([A-ZÀ-Ú0-9 .'-]{4,})/i,
    ];

    return this.extractCleanLine(text, patterns);
  }

  private extractRecipientName(text: string): string | null {
    const patterns = [
      /(?:destinatário|recebedor|favorecido|destino|para)\s*[:\-]?\s*([A-ZÀ-Ú0-9 .'-]{4,})/i,
      /(?:nome do recebedor)\s*[:\-]?\s*([A-ZÀ-Ú0-9 .'-]{4,})/i,
    ];

    return this.extractCleanLine(text, patterns);
  }

  private extractBankName(text: string): string | null {
    const banks = [
      'SICREDI',
      'NUBANK',
      'ITAÚ',
      'ITAU',
      'BRADESCO',
      'SANTANDER',
      'BANCO DO BRASIL',
      'CAIXA',
      'INTER',
      'MERCADO PAGO',
      'PAGBANK',
      'STONE',
      'C6 BANK',
      'COOPERATIVA',
    ];

    const upperText = text.toUpperCase();

    const found = banks.find((bank) => upperText.includes(bank));

    return found ?? null;
  }

  private extractPixKey(text: string): string | null {
    const labelMatch = text.match(
      /(?:chave pix|chave|pix)\s*[:\-]?\s*([A-Z0-9._%+\-@/]{5,})/i,
    );

    if (labelMatch?.[1]) {
      return labelMatch[1].trim();
    }

    const cnpjOrCpfMatch = text.match(/\b\d{11}\b|\b\d{14}\b/);

    if (cnpjOrCpfMatch?.[0]) {
      return cnpjOrCpfMatch[0];
    }

    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );

    if (emailMatch?.[0]) {
      return emailMatch[0];
    }

    const phoneMatch = text.match(
      /\+?55?\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/,
    );

    if (phoneMatch?.[0]) {
      return phoneMatch[0];
    }

    return null;
  }

  private extractEndToEndId(text: string): string | null {
    const patterns = [
      /\bE\d{8,}[A-Z0-9]{10,}\b/i,
      /(?:endtoend|end to end|id da transação|identificador|txid|e2e)\s*[:\-]?\s*([A-Z0-9]{15,})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        return match[1].trim();
      }

      if (match?.[0]?.toUpperCase().startsWith('E')) {
        return match[0].trim();
      }
    }

    return null;
  }

  private extractCleanLine(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        const line = match[1]
          .split('\n')[0]
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (line.length >= 4) {
          return line;
        }
      }
    }

    return null;
  }

  private buildProofDescription(
    parsed: ParsedPaymentProof,
    type: TransactionType,
  ) {
    if (type === TransactionType.INCOME) {
      if (parsed.payerName) {
        return `Recebimento de ${parsed.payerName}`;
      }

      return 'Recebimento importado por comprovante';
    }

    if (parsed.recipientName) {
      return `Pagamento para ${parsed.recipientName}`;
    }

    return 'Pagamento importado por comprovante';
  }

  private buildProofNotes(parsed: ParsedPaymentProof) {
    const rows = [
      'Lançado automaticamente por leitura de comprovante.',
      parsed.endToEndId ? `Identificador/EndToEnd: ${parsed.endToEndId}` : null,
      parsed.pixKey ? `Chave Pix: ${parsed.pixKey}` : null,
      parsed.payerName ? `Pagador: ${parsed.payerName}` : null,
      parsed.recipientName ? `Destinatário: ${parsed.recipientName}` : null,
      parsed.bankName ? `Banco: ${parsed.bankName}` : null,
      `Confiança da leitura: ${parsed.confidence}%`,
      parsed.warnings.length ? `Avisos: ${parsed.warnings.join(' | ')}` : null,
    ];

    return rows.filter(Boolean).join('\n');
  }

  private parseDateForDatabase(value: string | Date) {
    if (value instanceof Date) {
      return value;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T12:00:00-03:00`);
    }

    return new Date(value);
  }

  private startOfDayBrasilia(value: string) {
    return new Date(`${value}T00:00:00-03:00`);
  }

  private endOfDayBrasilia(value: string) {
    return new Date(`${value}T23:59:59-03:00`);
  }

  private async saveAttachmentFile(file: Express.Multer.File) {
    const uploadDir = path.resolve(
      process.cwd(),
      'uploads',
      'transaction-attachments',
    );

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    const extension = this.getFileExtension(file);
    const fileName = `${randomUUID()}${extension}`;
    const absolutePath = path.join(uploadDir, fileName);
    const relativePath = path.join(
      'uploads',
      'transaction-attachments',
      fileName,
    );

    await fs.writeFile(absolutePath, file.buffer);

    return {
      fileName,
      filePath: relativePath,
    };
  }

  private getFileExtension(file: Express.Multer.File) {
    const originalExtension = path.extname(file.originalname || '');

    if (originalExtension) {
      return originalExtension.toLowerCase();
    }

    const mimeType = file.mimetype?.toLowerCase() ?? '';

    if (mimeType.includes('pdf')) {
      return '.pdf';
    }

    if (mimeType.includes('png')) {
      return '.png';
    }

    if (mimeType.includes('webp')) {
      return '.webp';
    }

    return '.jpg';
  }
}