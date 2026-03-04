export async function fetchActressCountFromEmby(embyPersonId: string): Promise<number> {
  const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
  const apiKey = process.env.EMBY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Emby server URL or API key is not configured in environment variables.');
  }

  const params = new URLSearchParams({
    Recursive: 'true',
    IncludeItemTypes: 'Movie,Video',
    PersonIds: embyPersonId,
    api_key: apiKey,
  });

  const url = `${baseUrl}/emby/Items?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Emby: ${response.statusText}`);
    }
    const data = await response.json();
    return data.TotalRecordCount || 0;
  } catch (error) {
    console.error('Error fetching actress count from Emby:', error);
    return 0;
  }
}
