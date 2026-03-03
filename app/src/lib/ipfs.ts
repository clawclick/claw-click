/**
 * IPFS Storage via Pinata
 * Handles memory file uploads for agent creation
 */

export interface PinataUploadResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

/**
 * Upload files to Pinata IPFS
 * @param files Array of File objects to upload
 * @returns IPFS CID (Content Identifier)
 */
export async function uploadToPinata(files: File[]): Promise<string> {
  if (files.length === 0) {
    throw new Error('No files provided for upload')
  }

  const formData = new FormData()
  
  // Add each file to form data
  files.forEach((file, index) => {
    formData.append('file', file, file.name)
  })

  // Add metadata
  const metadata = JSON.stringify({
    name: `Agent Memory Bundle - ${Date.now()}`,
    keyvalues: {
      type: 'agent-memory',
      timestamp: Date.now().toString(),
      fileCount: files.length.toString()
    }
  })
  formData.append('pinataMetadata', metadata)

  // Pinata options
  const options = JSON.stringify({
    cidVersion: 1 // Use CIDv1 for better compatibility
  })
  formData.append('pinataOptions', options)

  try {
    // Call our API route which handles the Pinata JWT
    const res = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Upload failed: ${error}`)
    }

    const data: PinataUploadResponse = await res.json()
    return data.IpfsHash
  } catch (error) {
    console.error('Failed to upload to IPFS:', error)
    throw error
  }
}

/**
 * Upload a single text/JSON content to Pinata
 * @param content Text or JSON string
 * @param filename Filename to use
 * @returns IPFS CID
 */
export async function uploadTextToPinata(content: string, filename: string): Promise<string> {
  const blob = new Blob([content], { type: 'text/plain' })
  const file = new File([blob], filename)
  return uploadToPinata([file])
}

/**
 * Generate IPFS gateway URL for a CID
 * @param cid IPFS Content Identifier
 * @returns Public gateway URL
 */
export function getIPFSUrl(cid: string): string {
  // Use Pinata's gateway (faster for files we uploaded)
  return `https://gateway.pinata.cloud/ipfs/${cid}`
}

/**
 * Fetch content from IPFS via gateway
 * @param cid IPFS Content Identifier
 * @returns File content as text
 */
export async function fetchFromIPFS(cid: string): Promise<string> {
  try {
    const url = getIPFSUrl(cid)
    const res = await fetch(url)
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from IPFS: ${res.statusText}`)
    }

    return await res.text()
  } catch (error) {
    console.error('Failed to fetch from IPFS:', error)
    throw error
  }
}

/**
 * Validate CID format
 * @param cid String to validate
 * @returns true if valid CID
 */
export function isValidCID(cid: string): boolean {
  // Basic CID validation (v0 or v1)
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
  const cidV1Regex = /^[a-z0-9]{59}$/
  
  return cidV0Regex.test(cid) || cidV1Regex.test(cid)
}

/**
 * Upload agent birth certificate JSON to IPFS
 */
export async function uploadBirthCertificate(data: {
  name: string
  symbol: string
  wallet: string
  creator: string
  creatorType: 'human' | 'agent'
  timestamp: number
}): Promise<string> {
  const json = JSON.stringify(data, null, 2)
  return uploadTextToPinata(json, 'birth-certificate.json')
}
