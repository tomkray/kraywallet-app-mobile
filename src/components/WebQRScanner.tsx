/**
 * Web QR Scanner Component
 * Uses browser MediaDevices API and BarcodeDetector
 * Works on Chrome, Edge, Safari (iOS 15+, macOS 12+)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WebQRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
  hint?: string;
}

export function WebQRScanner({
  visible,
  onClose,
  onScan,
  title = 'Scan QR Code',
  hint = 'Point your camera at a Bitcoin address QR code',
}: WebQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasScanned, setHasScanned] = useState(false);

  // Start camera when modal opens
  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [visible]);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setHasScanned(false);
    setIsLoading(true);
    setError('');
  };

  const startCamera = async () => {
    if (Platform.OS !== 'web') {
      setError('Camera only available on web');
      setIsLoading(false);
      return;
    }

    setError('');
    setIsLoading(true);
    setHasScanned(false);

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });
      
      streamRef.current = stream;

      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().then(() => {
            setIsLoading(false);
            startQRScanning();
          }).catch(err => {
            console.error('Video play error:', err);
            setIsLoading(false);
          });
        }
      }, 200);

    } catch (err: any) {
      console.error('Camera error:', err);
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied.\nPlease allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application.');
      } else {
        setError('Failed to access camera.\n' + err.message);
      }
    }
  };

  const startQRScanning = async () => {
    // Check if BarcodeDetector is available (Chrome 83+, Edge 83+, Safari 17.4+)
    if (!('BarcodeDetector' in window)) {
      console.log('BarcodeDetector not available');
      // Don't show error - camera still works for manual viewing
      return;
    }

    try {
      // @ts-ignore - BarcodeDetector types not available
      const barcodeDetector = new window.BarcodeDetector({ 
        formats: ['qr_code'] 
      });
      
      // Scan every 150ms
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4 || hasScanned) {
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          
          if (barcodes.length > 0) {
            const qrData = barcodes[0].rawValue;
            console.log('QR Code detected:', qrData);
            
            // Validate it looks like an address
            if (qrData && isValidAddress(qrData)) {
              setHasScanned(true);
              stopCamera();
              onScan(qrData);
              onClose();
            } else if (qrData) {
              // Try to extract address from bitcoin: URI
              const match = qrData.match(/bitcoin:([a-zA-Z0-9]+)/i);
              if (match && match[1]) {
                setHasScanned(true);
                stopCamera();
                onScan(match[1]);
                onClose();
              }
            }
          }
        } catch (scanErr) {
          // Ignore scan errors, keep trying
        }
      }, 150);

    } catch (err: any) {
      console.error('BarcodeDetector error:', err);
    }
  };

  // Validate address format
  const isValidAddress = (data: string): boolean => {
    // Bitcoin addresses
    if (data.startsWith('bc1') || data.startsWith('1') || data.startsWith('3')) {
      return data.length >= 26 && data.length <= 90;
    }
    // Taproot
    if (data.startsWith('bc1p')) {
      return data.length === 62;
    }
    return false;
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleRetry = () => {
    setError('');
    startCamera();
  };

  if (Platform.OS !== 'web') {
    return null; // Only works on web
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          {isLoading && !error && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Starting camera...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="camera-outline" size={48} color="#666" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <video
                ref={videoRef as any}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                playsInline
                autoPlay
                muted
              />
              
              {/* Scanner overlay frame */}
              <View style={styles.overlay}>
                <View style={styles.frame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  frame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  hintContainer: {
    backgroundColor: '#000',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default WebQRScanner;



