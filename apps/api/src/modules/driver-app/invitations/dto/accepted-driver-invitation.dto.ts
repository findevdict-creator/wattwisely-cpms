import { ApiProperty } from '@nestjs/swagger';
import { DriverOperatorDto } from '../../operators/dto/driver-operator.dto';

/** Answer to accepting a driver invitation: the operator the driver is now linked with. */
export class AcceptedDriverInvitationDto {
  @ApiProperty({ type: DriverOperatorDto })
  readonly operator: DriverOperatorDto;

  constructor(operator: DriverOperatorDto) {
    this.operator = operator;
  }
}
