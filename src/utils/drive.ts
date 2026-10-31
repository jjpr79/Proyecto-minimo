export async function uploadToDrive(file: File, folderId: string, accessToken: string) {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  console.log('Uploading to:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Drive upload failed:', res.status, errorBody);
    throw new Error(`Failed to upload file to Google Drive: ${res.statusText}`);
  }

  return await res.json();
}

export async function getDriveImageUrl(fileId: string, accessToken: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink,webContentLink`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch file metadata from Google Drive');
  }

  const data = await res.json();
  return data.thumbnailLink || data.webContentLink;
}
