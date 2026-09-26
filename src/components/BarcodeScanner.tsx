import { useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

type Props = {
  // Called once per mount with the first decoded code; parents are expected to
  // unmount the scanner (or remount it via `key`) to scan again.
  onScan: (decodedText: string) => void
  onError?: (message: string) => void
}

// Settles once the most recently mounted scanner has fully released the
// camera. Every scanner renders into the same element and phones won't open
// the camera twice, so a new scanner must not start until the previous one
// has stopped — otherwise (e.g. StrictMode's double mount, or closing one
// scanner and opening another) the old instance's stop() tears down the new
// one's UI and the video shows but never decodes.
let previousScanner: Promise<void> = Promise.resolve()

const formatsToSupport = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
]

// html5-qrcode only decodes the shaded box, copied into a canvas at the box's
// on-screen size, so a small fixed box starves the decoder of detail. Size it
// to the viewfinder instead: wide and short, suited to 1D barcodes.
function qrbox(viewfinderWidth: number, viewfinderHeight: number) {
  const width = Math.floor(viewfinderWidth * 0.9)
  const height = Math.floor(Math.min(viewfinderHeight * 0.7, width * 0.6))
  return { width, height }
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  const elementId = 'barcode-scanner-region'

  useEffect(() => {
    onScanRef.current = onScan
    onErrorRef.current = onError
  })

  useEffect(() => {
    let cancelled = false
    let scanned = false
    let scanner: Html5Qrcode | null = null

    const started = previousScanner.then(async () => {
      if (cancelled) return false
      scanner = new Html5Qrcode(elementId, {
        formatsToSupport,
        // native BarcodeDetector (Android Chrome) is faster and far better at 1D codes
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      })
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox },
          (decodedText) => {
            // html5-qrcode keeps decoding frames until stopped, so the same code
            // can arrive several times before the parent unmounts us.
            if (scanned || cancelled) return
            scanned = true
            onScanRef.current(decodedText)
          },
          () => {
            // fires for every frame without a readable code — ignore
          }
        )
        return true
      } catch (err) {
        if (!cancelled) onErrorRef.current?.(`Camera start failed: ${err}`)
        return false
      }
    })

    return () => {
      cancelled = true
      // The next scanner waits for this one to finish starting (if it had
      // begun) and then stopping.
      previousScanner = started
        .then((running) => (running && scanner ? scanner.stop() : undefined))
        .catch(() => {})
    }
  }, [])

  return <div id={elementId} className="w-full max-w-sm mx-auto" />
}
