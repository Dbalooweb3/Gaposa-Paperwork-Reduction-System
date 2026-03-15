#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Install the browser for Puppeteer in the Render environment
npx puppeteer install
