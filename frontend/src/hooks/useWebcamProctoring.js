import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { studentAPI } from '../api/studentAPI'

function useWebcamProctoring(attemptId, onAutoSubmit, active = true) {
  const [cameraStatus, setCameraStatus] = useState('loading')

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const intervalRef = useRef(null)
  const noFaceCountRef = useRef(0)
  const isDetectingRef = useRef(false)
  const processingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    if (!active || !attemptId) return

    mountedRef.current = true

    const postViolation = async (showNoFaceToast = true) => {
      if (processingRef.current) return

      processingRef.current = true
      try {
        const { data } = await studentAPI.recordViolation(attemptId)
        if (!mountedRef.current) return

        if (data?.auto_submitted) {
          toast.error('Exam auto-submitted due to repeated proctoring violations.', {
            autoClose: false,
            closeOnClick: false,
          })
          onAutoSubmit?.('camera_violation')
          return
        }

        if (showNoFaceToast) {
          toast.warning(
            'No face detected. Please stay in front of your camera.',
            { autoClose: 5000 },
          )
        }
      } catch {
        if (mountedRef.current) {
          toast.error('Unable to register proctoring violation.')
        }
      } finally {
        processingRef.current = false
      }
    }

    const runDetection = async () => {
      if (isDetectingRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      isDetectingRef.current = true
      try {
        await detectorRef.current.send({ image: video })
      } catch {
        // Detection failure on a single frame is non-fatal.
      } finally {
        isDetectingRef.current = false
      }
    }

    const initialize = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        const video = document.createElement('video')
        video.autoplay = true
        video.muted = true
        video.playsInline = true
        video.srcObject = stream
        Object.assign(video.style, {
          position: 'fixed',
          top: '-1px',
          left: '-1px',
          width: '1px',
          height: '1px',
          opacity: '0',
          pointerEvents: 'none',
        })
        document.body.appendChild(video)
        videoRef.current = video

        await new Promise((resolve, reject) => {
          video.oncanplay = resolve
          video.onerror = reject
          if (video.readyState >= 2) resolve()
        })

        if (!mountedRef.current) return

        const FaceDetectionCtor = window.FaceDetection

        if (!FaceDetectionCtor) {
          throw new Error('MediaPipe FaceDetection not available. Check CDN script tags.')
        }

        const detector = new FaceDetectionCtor({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        })

        detector.setOptions({
          modelSelection: 0,
          minDetectionConfidence: 0.5,
        })

        detector.onResults((results) => {
          if (!mountedRef.current) return
          const found = Array.isArray(results?.detections) && results.detections.length > 0

          if (!found) {
            noFaceCountRef.current += 1
            // Two consecutive 5-second checks with no face = one violation.
            if (noFaceCountRef.current >= 2) {
              noFaceCountRef.current = 0
              void postViolation(true)
            }
            return
          }

          noFaceCountRef.current = 0
        })

        detectorRef.current = detector

        if (!mountedRef.current) return

        setCameraStatus('active')

        intervalRef.current = window.setInterval(() => {
          void runDetection()
        }, 5000)
      } catch {
        if (!mountedRef.current) return

        setCameraStatus('denied')
        toast.error(
          'Camera access denied. A proctoring violation has been recorded.',
          { autoClose: false, closeOnClick: false },
        )
        void postViolation(false)
      }
    }

    void initialize()

    return () => {
      mountedRef.current = false

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (detectorRef.current) {
        try { detectorRef.current.close() } catch {
          // Ignore cleanup errors.
        }
        detectorRef.current = null
      }

      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop())
        } catch {
          // Ignore cleanup errors.
        }
        streamRef.current = null
      }

      if (videoRef.current) {
        try {
          if (videoRef.current.parentNode) {
            videoRef.current.parentNode.removeChild(videoRef.current)
          }
          videoRef.current.srcObject = null
        } catch {
          // Ignore cleanup errors.
        }
        videoRef.current = null
      }
    }
  }, [attemptId, active, onAutoSubmit])

  return { cameraStatus }
}

export default useWebcamProctoring
