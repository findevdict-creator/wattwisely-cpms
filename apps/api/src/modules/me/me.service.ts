import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { MeResponseDto } from './dto/me-response.dto';

/** Describes the logged-in user. Module 2 adds names and roles from the database. */
@Injectable()
export class MeService {
  describe(user: AuthenticatedUser): MeResponseDto {
    return new MeResponseDto(user);
  }
}
