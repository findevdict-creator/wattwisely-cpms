import { ApiProperty } from '@nestjs/swagger';
import { OperatorLinkRecord } from '../operator-link-record';

/** An operator the driver is linked with, as GET /v1/driver/operators lists them (module 19). */
export class DriverOperatorDto {
  @ApiProperty() readonly tenant_id: string;
  @ApiProperty({ example: 'Acme Charging' }) readonly operator_name: string;
  @ApiProperty({ example: 'acme-charging' }) readonly operator_slug: string;
  @ApiProperty({ description: 'The name the operator keeps for you' }) readonly driver_name: string;
  @ApiProperty({ description: 'The operator’s own id for you: an employee number, a plate' })
  readonly reference: string;
  @ApiProperty({ enum: ['active', 'blocked'] }) readonly status: string;
  @ApiProperty({
    enum: ['inherit', 'pay', 'free'],
    description: 'Whether your sessions with this operator are paid; inherit means the operator decides (pay)',
  })
  readonly payment_mode: string;
  @ApiProperty({ nullable: true, type: String }) readonly linked_at: string | null;

  constructor(link: OperatorLinkRecord) {
    this.tenant_id = link.tenantId;
    this.operator_name = link.operatorName;
    this.operator_slug = link.operatorSlug;
    this.driver_name = link.driverName;
    this.reference = link.reference;
    this.status = link.status;
    this.payment_mode = link.paymentMode;
    this.linked_at = link.linkedAt?.toISOString() ?? null;
  }
}
