import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { PublicServicesController } from './public-services.controller';

@Module({
  controllers: [ServicesController, PublicServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
