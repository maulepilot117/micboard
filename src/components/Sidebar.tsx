/**
 * Sidebar component - Navigation sidebar for groups and settings
 */

import React from 'react';
import { useMicboardStore } from '../store/micboard-store';

interface SidebarProps {
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const {
    groups,
    currentGroup,
    switchGroup,
    setSettingsMode,
  } = useMicboardStore();

  const handleGroupClick = (groupNum: number) => {
    switchGroup(groupNum);
    onClose();
  };

  const handleSettingsClick = (mode: 'CONFIG' | 'EXTENDED' | 'GROUP') => {
    setSettingsMode(mode);
    if (mode !== 'GROUP') {
      onClose();
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">Micboard</a>

        <button
          className="navbar-toggler"
          type="button"
          onClick={onClose}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse show">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {/* Group navigation */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
              >
                Groups
              </a>
              <ul className="dropdown-menu">
                <li>
                  <a
                    className="dropdown-item preset-link"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleGroupClick(0);
                    }}
                  >
                    0: All Slots
                  </a>
                </li>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <li key={num}>
                    <a
                      className="dropdown-item preset-link"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleGroupClick(num);
                      }}
                    >
                      {num}: {groups[num]?.title || '(empty)'}
                    </a>
                  </li>
                ))}
              </ul>
            </li>

            {/* Settings menu */}
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
              >
                Settings
              </a>
              <ul className="dropdown-menu">
                <li>
                  <a
                    className="dropdown-item"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSettingsClick('CONFIG');
                    }}
                  >
                    Device Configuration
                  </a>
                </li>
                <li>
                  <a
                    className="dropdown-item"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSettingsClick('EXTENDED');
                    }}
                  >
                    Extended Names
                  </a>
                </li>
                {currentGroup !== 0 && (
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSettingsClick('GROUP');
                      }}
                    >
                      Edit Current Group
                    </a>
                  </li>
                )}
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;