export const MAX_IMAGE_EDGE = 1600
export const JPEG_QUALITY = 0.8

export interface TargetDimensions {
  width: number
  height: number
}

export interface CompressedImage {
  file: File
  originalSize: number
  compressed: boolean
}

export function getTargetDimensions(
  width: number,
  height: number,
  maxLongEdge = MAX_IMAGE_EDGE,
): TargetDimensions {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height }

  const scale = maxLongEdge / longEdge
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function jpegFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  return `${baseName}.jpg`
}

function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
}

export async function compressImage(file: File): Promise<CompressedImage> {
  try {
    const image = await createImageBitmap(file)
    const dimensions = getTargetDimensions(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    const context = canvas.getContext('2d')
    if (!context) {
      image.close()
      return { file, originalSize: file.size, compressed: false }
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height)
    image.close()

    const blob = await toJpegBlob(canvas)
    if (!blob || blob.size >= file.size) {
      return { file, originalSize: file.size, compressed: false }
    }

    return {
      file: new File([blob], jpegFileName(file.name), {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      }),
      originalSize: file.size,
      compressed: true,
    }
  } catch {
    return { file, originalSize: file.size, compressed: false }
  }
}
