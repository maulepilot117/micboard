"use strict";

import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

// Make bootstrap available globally
window.bootstrap = bootstrap;

import '../css/colors.scss';
import '../css/about.scss';
import '../node_modules/@ibm/plex/css/ibm-plex.css';


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('version').innerHTML = 'Micboard ' + VERSION;
});
