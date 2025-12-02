FROM node:20-slim AS frontend

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

# Copy source files for Vite build
COPY src ./src
COPY css ./css
COPY index.html app.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./

# Build React app with Vite
RUN npm run build

# Python runtime stage
FROM python:3.11-slim

LABEL maintainer="Karl Swanson <karlcswanson@gmail.com>"

WORKDIR /usr/src/app

# Copy Python requirements
COPY py/requirements.txt ./py/
RUN pip3 install --no-cache-dir -r py/requirements.txt

# Copy application
COPY py ./py
COPY demo.html index.html ./
COPY democonfig.json package.json ./

# Copy static assets (legacy webpack build for about page)
COPY static ./static

# Copy built React app from frontend stage
COPY --from=frontend /usr/src/app/dist ./dist

EXPOSE 8058

CMD ["python3", "py/micboard.py"]
