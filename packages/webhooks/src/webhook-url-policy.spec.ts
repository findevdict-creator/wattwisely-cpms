import { WebhookUrlPolicy } from './webhook-url-policy';

describe('WebhookUrlPolicy', () => {
  it('accepts public https addresses only', () => {
    expect(WebhookUrlPolicy.problemOf('https://hooks.acme.example/wattwisely')).toBeNull();
    expect(WebhookUrlPolicy.problemOf('https://203.0.113.10:8080/hook?x=1')).toBeNull();
    expect(WebhookUrlPolicy.problemOf('http://hooks.acme.example/wattwisely')).toMatch(/https/);
  });

  it('refuses other schemes, credentials, and addresses inside the network', () => {
    expect(WebhookUrlPolicy.problemOf('ftp://hooks.acme.example')).toMatch(/https/);
    expect(WebhookUrlPolicy.problemOf('not a url')).toMatch(/https/);
    expect(WebhookUrlPolicy.problemOf('https://user:pw@hooks.acme.example')).toMatch(/password/);
    for (const host of [
      'localhost',
      'object-storage:8333',
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.5',
      '192.168.1.1',
      '169.254.169.254',
      '[::1]',
      '[fd00::1]',
    ]) {
      expect(WebhookUrlPolicy.problemOf(`https://${host}/hook`)).toMatch(/public/);
    }
  });

  it('lets a deployment allow private addresses for testing', () => {
    expect(WebhookUrlPolicy.problemOf('http://localhost:4000/hook', true)).toBeNull();
  });
});
