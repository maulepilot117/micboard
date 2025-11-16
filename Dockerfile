FROM node:20-slim AS frontend

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY js ./js
COPY css ./css
COPY webpack.config.js babel.config.json ./

RUN npm run build

# Python runtime stage
FROM python:3.11-slim

MAINTAINER Karl Swanson <karlcswanson@gmail.com>

WORKDIR /usr/src/app

# Copy Python requirements
COPY py/requirements.txt ./py/
RUN pip3 install --no-cache-dir -r py/requirements.txt

# Copy application
COPY py ./py
COPY demo.html index.html about.html ./
COPY democonfig.json ./

# Copy built assets from frontend stage
COPY --from=frontend /usr/src/app/static ./static

EXPOSE 8058

CMD ["python3", "py/micboard.py"]
