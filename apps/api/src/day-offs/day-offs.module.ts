import { Module } from '@nestjs/common';
import { DayOffsService } from './day-offs.service';
import { DayOffsController } from './day-offs.controller';

@Module({
  controllers: [DayOffsController],
  providers: [DayOffsService],
  exports: [DayOffsService],
})
export class DayOffsModule {}
