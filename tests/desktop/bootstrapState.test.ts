import { getBootstrapFailureMessage } from '../../apps/desktop/renderer/src/bootstrapState';

describe('getBootstrapFailureMessage', () => {
  it('surfaces initialization failures after desktop config exists', () => {
    expect(
      getBootstrapFailureMessage({
        configured: true,
        initialized: false,
        configPath: '/tmp/desktop-config.json',
        message: '数据库初始化失败。',
      }),
    ).toBe('数据库初始化失败。');
  });

  it('does not show a missing-config message as an error on first run', () => {
    expect(
      getBootstrapFailureMessage({
        configured: false,
        initialized: false,
        configPath: '/tmp/desktop-config.json',
        message: 'Desktop config not found. Please complete initial setup.',
      }),
    ).toBe('');
  });
});
