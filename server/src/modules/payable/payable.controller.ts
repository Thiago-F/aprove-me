import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { PayableService } from './payable.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';

@Controller('payable')
export class PayableController {
  constructor(private readonly payableService: PayableService) {}

  @Post()
  create(@Body() data: CreatePayableDto) {
    return this.payableService.create({
      data
    });
  }

  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payableService.findOne({
      id
    });
  }

  @Get()
  findAll(
    @Query() query
  ) {
    let { page = 1, itemsPerPage = 10 } = query
    const { assignorId } = query


    return this.payableService.findAll({
      filters: {
        assignorId
      },
      page: Number(page),
      itemsPerPage: Number(itemsPerPage),
    });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdatePayableDto,
  ) {
    return this.payableService.update({
      id,
      data
    });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string
  ) {
    await this.payableService.remove({
      id,
    });

    return {
      message: 'Payable deleted with success'
    }
  }
}
