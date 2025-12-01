/**
 * QRModal component - Displays QR code for sharing URL
 */

import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRModalProps {
  onClose: () => void;
}

const QRModal: React.FC<QRModalProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Generate current URL
    const url = window.location.href;

    // QR code options
    const options = {
      width: 600,
      margin: 0,
    };

    // Generate QR code
    QRCode.toCanvas(canvasRef.current, url, options, (error: Error | null | undefined) => {
      if (error) {
        console.error('Error generating QR code:', error);
      }
    });
  }, []);

  const currentUrl = window.location.href;
  const version = '0.8.5'; // From package.json

  return (
    <div className="modal fade show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Share Micboard</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="qr text-center">
              <p id="micboard-version">Micboard version: {version}</p>
              <p>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  {currentUrl}
                </a>
              </p>
              <canvas ref={canvasRef} id="qrcode"></canvas>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRModal;