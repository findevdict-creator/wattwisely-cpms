import { FastifyRequest } from 'fastify';
import { RequestAuth } from './request-auth';

/** A Fastify request after AuthenticationGuard has run. */
export interface AuthenticatedRequest extends FastifyRequest {
  auth?: RequestAuth;
}
