export async function fetchActressCountFromEmby(embyPersonIds: string[]): Promise<number> {
  if (embyPersonIds.length === 0) {
    return 0;
  }

  const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
  const apiKey = process.env.EMBY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Emby server URL or API key is not configured in environment variables.');
  }

  // Use Promise.all to fetch counts for all IDs concurrently
  const counts = await Promise.all(embyPersonIds.map(async (personId) => {
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
        return 0; // Return 0 for this ID if fetch fails
      }
      const data = await response.json();
      return data.TotalRecordCount || 0;
    } catch (error) {
      console.error(`Error fetching actress count from Emby for ID ${personId}:`, error);
      return 0; // Return 0 in case of error
    }
  }));

  // Sum up all the counts
  return counts.reduce((total, count) => total + count, 0);
}

export async function fetchEmbyIdsByName(actressName: string): Promise<string[]> {
    const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
    const apiKey = process.env.EMBY_API_KEY;
  
    if (!baseUrl || !apiKey) {
      throw new Error('Emby server URL or API key is not configured in environment variables.');
    }
  
    const params = new URLSearchParams({
      searchTerm: actressName,
      api_key: apiKey,
    });
  
    const url = `${baseUrl}/emby/Persons?${params.toString()}`;
  
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data from Emby: ${response.statusText}`);
      }
      const data = await response.json();
      // Assuming the response is an array of persons under the "Items" key
      if (data.Items && Array.isArray(data.Items)) {
        return data.Items.map((person: any) => person.Id);
      }
      return [];
    } catch (error) {
      console.error('Error fetching actress IDs from Emby by name:', error);
      return [];
    }
  }

