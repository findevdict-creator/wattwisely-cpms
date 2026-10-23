/** Fastify's trustProxy test: is the address `hop` steps away from the API a proxy to believe? */
export type TrustProxyTest = (address: string, hop: number) => boolean;

/**
 * Which X-Forwarded-For entries the API believes (module 12). Caddy replaces whatever
 * X-Forwarded-For a client sends with the address it saw, so behind Caddy exactly one hop
 * is trusted and a client cannot pretend to be someone else.
 */
export class TrustedProxies {
  /** False for none, so request.ip is the socket's address. */
  static forHops(hops: number): TrustProxyTest | false {
    if (!Number.isInteger(hops) || hops <= 0) {
      return false;
    }
    return (_address, hop) => hop < hops;
  }
}
