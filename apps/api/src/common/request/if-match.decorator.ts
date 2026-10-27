import { createParamDecorator, ExecutionContext, HttpStatus } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ProblemException } from '../problem/problem.exception';

/**
 * Reads the If-Match header of an update: the version the client last saw (API Design,
 * "Concurrency"). Without it the API cannot tell whether the edit overwrites someone
 * else's, so it answers 428. Both `3` and `"3"` are accepted.
 */
export class IfMatchReader {
  static read(_data: unknown, context: ExecutionContext): number {
    return IfMatchReader.readFrom(context, 1);
  }

  /** For settings that may not exist yet: `If-Match: 0` says "I saw none" (module 17). */
  static readAllowingNew(_data: unknown, context: ExecutionContext): number {
    return IfMatchReader.readFrom(context, 0);
  }

  private static readFrom(context: ExecutionContext, lowest: number): number {
    const header = context.switchToHttp().getRequest<FastifyRequest>().headers['if-match'];
    const version = Number(String(header ?? '').replace(/^(W\/)?"|"$/g, ''));
    if (!header || !Number.isInteger(version) || version < lowest) {
      throw new ProblemException(
        HttpStatus.PRECONDITION_REQUIRED,
        'version_required',
        'Send the If-Match header with the version you are changing.',
      );
    }
    return version;
  }
}

/** Controller parameter decorator: `update(@IfMatch() version: number)`. */
export const IfMatch = createParamDecorator(IfMatchReader.read);

/** The same, accepting 0 for a row that does not exist yet. */
export const IfMatchAllowingNew = createParamDecorator(IfMatchReader.readAllowingNew);
