import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProblemDetailsFactory } from './problem-details.factory';
import { ProblemException } from './problem.exception';

describe('ProblemDetailsFactory', () => {
  const factory = new ProblemDetailsFactory();

  it('keeps the code and detail of a ProblemException', () => {
    const problem = factory.create(
      new ProblemException(404, 'tenant_not_found', 'This tenant does not exist.'),
      'req-1',
    );

    expect(problem.toJSON()).toEqual({
      type: 'https://docs.wattwisely.com/problems/tenant_not_found',
      title: 'Not found',
      status: 404,
      detail: 'This tenant does not exist.',
      code: 'tenant_not_found',
      request_id: 'req-1',
    });
  });

  it('turns validation errors into validation_failed with every message', () => {
    const problem = factory.create(
      new BadRequestException(['name must be a string', 'email is required']),
      'req-2',
    );

    expect(problem.code).toBe('validation_failed');
    expect(problem.detail).toBe('name must be a string; email is required');
  });

  it('names other HTTP errors after their status', () => {
    expect(factory.create(new NotFoundException(), 'req-3').code).toBe('not_found');
  });

  it('hides the details of unexpected errors', () => {
    const problem = factory.create(new Error('database password is wrong'), 'req-4');

    expect(problem.status).toBe(500);
    expect(problem.detail).not.toContain('password');
  });
});
