import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { ModuleCatalog } from '../../common/permissions/module-catalog';
import { ModuleDto } from './dto/module.dto';

/** GET /v1/admin/modules: the feature registry, for the plan editor. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/modules')
export class AdminModulesController {
  @Get()
  @RouteAccess.platform('plans:read')
  list(): ModuleDto[] {
    return ModuleCatalog.ENTRIES.map((module) => new ModuleDto(module));
  }
}
