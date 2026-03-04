import { fetchActressCountFromEmby } from '@/lib/emby';

describe('Emby Fetcher', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
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

    const count = await fetchActressCountFromEmby(embyPersonId);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/emby/Items?Recursive=true&IncludeItemTypes=Movie%2CVideo&PersonIds=${embyPersonId}`)
    );
    expect(count).toBe(42);
  });

  it('should return 0 if the fetch fails', async () => {
    const embyPersonId = '12345';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const count = await fetchActressCountFromEmby(embyPersonId);

    expect(count).toBe(0);
  });

  it('should return 0 if the response is not valid JSON', async () => {
    const embyPersonId = '12345';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    const count = await fetchActressCountFromEmby(embyPersonId);

    expect(count).toBe(0);
  });
});
