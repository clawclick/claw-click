import { NextRequest, NextResponse } from 'next/server'

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'

export async function POST(request: NextRequest) {
  const jwt = process.env.PINATA_JWT
  if (!jwt) {
    return NextResponse.json(
      { error: 'IPFS upload not configured' },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()

    // Forward the form data to Pinata
    const pinataForm = new FormData()

    // Forward all file entries
    const files = formData.getAll('file')
    for (const file of files) {
      if (file instanceof File) {
        pinataForm.append('file', file, file.name)
      }
    }

    // Forward metadata and options if present
    const metadata = formData.get('pinataMetadata')
    if (metadata) {
      pinataForm.append('pinataMetadata', metadata as string)
    }

    const options = formData.get('pinataOptions')
    if (options) {
      pinataForm.append('pinataOptions', options as string)
    }

    const res = await fetch(PINATA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: pinataForm,
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Pinata upload failed:', res.status, error)
      return NextResponse.json(
        { error: 'Upload to IPFS failed' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('IPFS upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
