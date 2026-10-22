import { Injectable } from '@nestjs/common';
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import { OcppCallError } from '../transport/ocpp-call-error';
import { V16Schemas } from './v16-schemas';

/**
 * Checks payloads against the OCPP 1.6J schemas, compiled once at start. A wrong type
 * answers TypeConstraintViolation, anything else (a missing field, a bad enum value,
 * an unknown field) PropertyConstraintViolation, both naming the field.
 */
@Injectable()
export class SchemaValidator {
  /** RFC 3339, which is what OCPP calls dateTime. */
  static readonly DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

  private readonly validators = new Map<string, ValidateFunction>();

  constructor() {
    const ajv = new Ajv({ allErrors: false, strict: false });
    ajv.addFormat('date-time', SchemaValidator.DATE_TIME);
    for (const [name, schema] of Object.entries(V16Schemas.SHARED)) {
      ajv.addSchema(schema, name);
    }
    for (const [name, schema] of Object.entries(V16Schemas.MESSAGES)) {
      this.validators.set(name, ajv.compile(schema));
    }
  }

  /** True when the gateway has a schema for the message (an unknown action is not implemented). */
  knows(message: string): boolean {
    return this.validators.has(message);
  }

  /** Throws the right OcppCallError when the payload does not match the message's schema. */
  validate(message: string, payload: unknown): void {
    const validator = this.validators.get(message);
    if (!validator) {
      throw new OcppCallError('NotImplemented', `${message} is not supported.`);
    }
    if (!validator(payload)) {
      throw SchemaValidator.toError(validator.errors?.[0]);
    }
  }

  private static toError(error: ErrorObject | undefined): OcppCallError {
    const field = error?.instancePath?.replace(/^\//, '').replace(/\//g, '.') || '(payload)';
    const reason = error?.message ?? 'does not match the schema';
    const code =
      error?.keyword === 'type' ? 'TypeConstraintViolation' : 'PropertyConstraintViolation';
    return new OcppCallError(code, `${field} ${reason}`, { field });
  }
}
