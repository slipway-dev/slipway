export function downloadBytes(data: Uint8Array, filename: string, type = "application/zip") {
  const blob = new Blob([data as BlobPart], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
