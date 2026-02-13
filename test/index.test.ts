import { describe, it, expect } from 'vitest';
import * as api from '../src/index';

describe('index exports', () => {
  it('has expected exports', () => {
    expect(api).toHaveProperty('TableProxy');
    expect(api).toHaveProperty('SessionDO');
    expect(api).toHaveProperty('verifyAccess');
    expect(api).toHaveProperty('encrypt');
    expect(api).toHaveProperty('decrypt');
    expect(api).toHaveProperty('HttpResp');
    expect(api).toHaveProperty('HttpError');
    expect(api).toHaveProperty('UnauthorizedError');
    expect(api).toHaveProperty('ForbiddenError');
    expect(api).toHaveProperty('NotFoundError');
    expect(api).toHaveProperty('PermissionError');
    expect(api).toHaveProperty('MessageType');
    expect(api).toHaveProperty('ErrorCode');
    expect(api).toHaveProperty('perms');
    expect(api).toHaveProperty('EventBus');
    expect(api).toHaveProperty('formatSSE');
    expect(api).toHaveProperty('transformBackend');
    expect(api).toHaveProperty('buildCache');
    expect(api).toHaveProperty('generateStorageRegistry');
    expect(api).toHaveProperty('filterApplicable');
    expect(api).toHaveProperty('inlineMiddlewareChain');
    expect(api).toHaveProperty('diffSchemas');
  });
});
