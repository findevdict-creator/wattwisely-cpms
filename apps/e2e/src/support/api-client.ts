import { StackUrls } from './stack-urls';

export interface ApiAnswer {
  status: number;
  headers: Headers;
  body: unknown;
}

/** Plain HTTP calls to the API, with an API key or a user's access token as the bearer. */
export class ApiClient {
  constructor(private readonly bearer?: string) {}

  async call(
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<ApiAnswer> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (this.bearer) {
      headers['Authorization'] = `Bearer ${this.bearer}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${StackUrls.API}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: ApiClient.parse(text) };
  }

  get(path: string): Promise<ApiAnswer> {
    return this.call('GET', path);
  }

  private static parse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
