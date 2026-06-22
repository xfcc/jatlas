import { fetchActressCountFromEmby, fetchEmbyIdsByName } from '../../apps/desktop/core/embyApi';

describe('Emby Fetcher', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.EMBY_SERVER_URL = 'http://fake-emby-server:8096';
    process.env.EMBY_API_KEY = 'fake-api-key';
  });

  it('should fetch and return actress count from Emby', async () => {
    const embyPersonId = '12345';
    const mockApiResponse = {
      Items: [],
      TotalRecordCount: 42,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const count = await fetchActressCountFromEmby([embyPersonId]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/emby/Items?Recursive=true&IncludeItemTypes=Movie%2CVideo&PersonIds=${embyPersonId}`),
    );
    expect(count).toBe(42);
  });

  it('should return 0 if the fetch fails', async () => {
    const embyPersonId = '12345';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const count = await fetchActressCountFromEmby([embyPersonId]);

    expect(count).toBe(0);
  });

  it('should return 0 if the response is not valid JSON', async () => {
    const embyPersonId = '12345';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    const count = await fetchActressCountFromEmby([embyPersonId]);

    expect(count).toBe(0);
  });
});

describe('fetchEmbyIdsByName', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.EMBY_SERVER_URL = 'http://fake-emby-server:8096';
    process.env.EMBY_API_KEY = 'fake-api-key';
  });

  it('uses /emby/Persons when the server responds 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Items: [{ Id: 'p1' }, { Id: 'p2' }] }),
    });

    const ids = await fetchEmbyIdsByName('Test Actor');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/emby\/Persons\?/)
    );
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('returns empty array for whitespace-only name without calling fetch', async () => {
    await expect(fetchEmbyIdsByName('   ')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
