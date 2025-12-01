/**
 * HelpScreen component - Shows keyboard shortcuts and color guide
 */

import React from 'react';

interface HelpScreenProps {
  onClose: () => void;
}

const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  return (
    <div id="hud" className="container" style={{ display: 'block' }}>
      <div className="row">
        <div className="col-4 keyboard-guide">
          <h2 className="text-center">Keyboard Shortcuts</h2>
          <ul>
            <li><kbd>?</kbd> - Show keyboard shortcuts</li>
            <li><kbd>0</kbd> - Show all slots</li>
            <li><kbd>1</kbd>...<kbd>9</kbd> - Load group</li>
            <li><kbd>d</kbd> - Start demo mode</li>
            <li><kbd>e</kbd> - Open group editor</li>
            <li><kbd>t</kbd> - Toggle TV view</li>
            <li><kbd>i</kbd> - Change tv display mode</li>
            <li><kbd>f</kbd> - Toggle fullscreen</li>
            <li><kbd>g</kbd> - Toggle image backgrounds</li>
            <li><kbd>v</kbd> - Toggle video backgrounds</li>
            <li><kbd>n</kbd> - Extended Name editor</li>
            <li><kbd>s</kbd> - Device configuration editor</li>
            <li><kbd>q</kbd> - Show QR code</li>
            <li><kbd>esc</kbd> - reload micboard</li>
          </ul>
        </div>

        <div className="col-8 color-guide">
          <h2 className="text-center">Color Guide</h2>

          <div className="container">
            <div className="row">
              <div className="col color-guide-color GOOD">
                <h3>Good</h3>
                <p>Mic ON. 4 - 5 Battery Bars.</p>
              </div>
              <div className="col color-guide-color PREV_GOOD">
                <h3>Previously Good</h3>
                <p>Mic OFF. 4 - 5 Battery Bars.</p>
              </div>
            </div>

            <div className="row">
              <div className="col color-guide-color REPLACE">
                <h3>Replace</h3>
                <p>Mic ON. 3 Battery Bars.</p>
              </div>
              <div className="col color-guide-color PREV_REPLACE">
                <h3>Previously Replace</h3>
                <p>Mic OFF. 3 Battery Bars.</p>
              </div>
            </div>

            <div className="row">
              <div className="col color-guide-color CRITICAL">
                <h3>Critical</h3>
                <p>Mic ON. 1 - 2 Battery Bars.</p>
              </div>
              <div className="col color-guide-color PREV_CRITICAL">
                <h3>Previously Critical</h3>
                <p>Mic OFF. 1 - 2 Battery Bars.</p>
              </div>
            </div>

            <div className="row">
              <div className="col color-guide-color UNASSIGNED">
                <h3>Unknown</h3>
                <p>Micboard doesn't make battery assumptions once a mic is off for over 30 minutes.</p>
              </div>
            </div>

            <div className="row">
              <div className="col color-guide-color RX_COM_ERROR">
                <h3>RX COM Error</h3>
                <p>Micboard can't connect to the device.</p>
              </div>
              <div className="col color-guide-color AUDIO_PEAK">
                <h3>Audio Peak</h3>
                <p>Input peak.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        id="hud-button"
        type="button"
        className="btn btn-success btn-lg btn-block"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
};

export default HelpScreen;