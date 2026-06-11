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

import { CreateInvestmentDto } from './dto/create-investment.dto';
import { InvestmentQueryDto } from './dto/investment-query.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentsService } from './investments.service';

@ApiTags('Investments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar investimento' })
  create(@Body() dto: CreateInvestmentDto) {
    return this.investmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar investimentos' })
  findAll(@Query() query: InvestmentQueryDto) {
    return this.investmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar investimento' })
  findOne(@Param('id') id: string) {
    return this.investmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar investimento' })
  update(@Param('id') id: string, @Body() dto: UpdateInvestmentDto) {
    return this.investmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir investimento' })
  remove(@Param('id') id: string) {
    return this.investmentsService.remove(id);
  }
}
