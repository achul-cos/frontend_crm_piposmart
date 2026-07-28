
$content = Get-Content .\app\lib\api.ts -Raw
$newApis = @"

export async function bulkUpdateOwnerOutlets(
  ownerId: number,
  items: { id: number; code?: string; name?: string; phone?: string; province?: string; city?: string; address?: string }[],
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });
  return handleResponse(res);
}

export async function bulkSoftDeleteOwnerOutlets(
  ownerId: number,
  ids: number[],
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(res);
}
"@

$content = $content -replace "export async function bulkForceDeleteOutlets", ($newApis + "`n`nexport async function bulkForceDeleteOutlets")
Set-Content .\app\lib\api.ts -Value $content

