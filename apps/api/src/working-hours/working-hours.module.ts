import { Module } from '@nestjs/common';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';

@Module({
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService],
  exports: [WorkingHoursService],
})
export class WorkingHoursModule {}
