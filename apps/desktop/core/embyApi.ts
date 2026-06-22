interface EmbyPerson {
  Id: string;
}

interface EmbyItemCountResponse {
  TotalRecordCount?: number;
}

interface EmbyPersonSearchResponse {
  Items?: unknown;
}

function isEmbyPerson(value: unknown): value is EmbyPerson {
  return (
    value !== null &&
    typeof value === 'object' &&
    'Id' in value &&
    typeof (value as { Id?: unknown }).Id === 'string'
  );
}

export async function fetchActressCountFromEmby(embyPersonIds: string[]): Promise<number> {
  if (embyPersonIds.length === 0) {
    return 0;
  }

  const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
  const apiKey = process.env.EMBY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Emby server URL or API key is not configured in environment variables.');
  }

  const counts = await Promise.all(
    embyPersonIds.map(async (personId) => {
      const params = new URLSearchParams({
        Recursive: 'true',
        IncludeItemTypes: 'Movie,Video',
        PersonIds: personId,
        api_key: apiKey,
      });
      const url = `${baseUrl}/emby/Items?${params.toString()}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch data from Emby for ID ${personId}: ${response.statusText}`);
          return 0;
        }
        const data = (await response.json()) as EmbyItemCountResponse;
        return data.TotalRecordCount || 0;
      } catch (error) {
        console.error(`Error fetching actress count from Emby for ID ${personId}:`, error);
        return 0;
      }
    }),
  );

  return counts.reduce((total: number, count: number) => total + count, 0);
}

export async function fetchEmbyIdsByName(actressName: string): Promise<string[]> {
  const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
  const apiKey = process.env.EMBY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Emby server URL or API key is not configured in environment variables.');
  }

  const term = actressName.trim();
  if (!term) {
    return [];
  }

  const params = new URLSearchParams({
    searchTerm: term,
    api_key: apiKey,
  });

  const url = `${baseUrl}/emby/Persons?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from Emby: ${response.status} ${response.statusText}`.trim());
  }

  const data = (await response.json()) as EmbyPersonSearchResponse;
  if (data.Items && Array.isArray(data.Items)) {
    return data.Items.filter(isEmbyPerson).map((person) => person.Id);
  }
  return [];
}
