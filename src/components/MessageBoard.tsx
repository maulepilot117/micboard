/**
 * MessageBoard component - Displays connection error messages
 */

import React from 'react';

const MessageBoard: React.FC = () => {
  return (
    <div className="message-board">
      <div className="container">
        <div className="row">
          <div className="col-12 text-center">
            <h1>Connection Error!</h1>
            <p>
              Could not connect to the micboard server. Please{' '}
              <a href="#" onClick={() => window.location.reload()}>
                refresh
              </a>{' '}
              the page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoard;