export async function syncEmbyIds(actressIds: string[]) {
  const response = await fetch('/api/actresses/sync-emby-ids', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ actressIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to start Emby ID sync.');
  }

  return response.json();
}

export async function syncMovieCounts(actressIds: string[]) {
  const response = await fetch('/api/actresses/sync-movie-counts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ actressIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to start movie count sync.');
  }

  return response.json();
}
