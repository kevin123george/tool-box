# Docker Deployment Guide

This guide explains how to run the Toolbox application using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Building the Application

Before running Docker Compose, you need to build the backend JAR file:

```bash
./gradlew build -x test
```

This step is required for the simple `Dockerfile.backend`. If you prefer to build everything inside Docker, see the "Advanced Build Options" section below.

## Quick Start

### Start all services

```bash
docker compose up -d
```

This will start:
- MongoDB database (port 27017)
- Spring Boot backend (port 9099)
- Bun frontend (port 3000)

### Start with Stock API service

If you need the Python stock API service:

```bash
docker compose --profile with-stock-api up -d
```

### Stop all services

```bash
docker compose down
```

### Stop and remove volumes (clean slate)

```bash
docker compose down -v
```

## Service URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:9099
- **MongoDB**: mongodb://localhost:27017
- **Stock API** (if enabled): http://localhost:5000

## Build Individual Services

### Backend
```bash
docker build -f Dockerfile.backend -t toolbox-backend .
```

### Frontend
```bash
docker build -f Dockerfile.frontend -t toolbox-frontend .
```

### Stock API
```bash
docker build -f Dockerfile.stockapi -t toolbox-stockapi .
```

## Development

### View logs

All services:
```bash
docker compose logs -f
```

Specific service:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Rebuild after code changes

```bash
docker compose up -d --build
```

### Rebuild specific service

```bash
docker compose up -d --build backend
```

## Troubleshooting

### Backend fails to start

The backend depends on MongoDB being healthy. If it fails:

1. Check MongoDB logs: `docker compose logs mongodb`
2. Wait for MongoDB to be ready
3. Restart backend: `docker compose restart backend`

### Port conflicts

If ports are already in use, you can modify them in `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:3000"  # Change YOUR_PORT to available port
```

### Clear all data

To start fresh with no data:

```bash
docker compose down -v
docker compose up -d
```

## Production Deployment

For production deployment:

1. Set appropriate environment variables
2. Use production-ready MongoDB (external or managed service)
3. Configure proper health checks and resource limits
4. Use Docker secrets for sensitive data
5. Consider using Docker Swarm or Kubernetes for orchestration

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓ (port 3000)
┌─────────────┐
│  Frontend   │ (Bun)
└──────┬──────┘
       │
       ↓ (API calls)
┌─────────────┐
│   Backend   │ (Spring Boot)
└──────┬──────┘
       │
       ↓ (port 27017)
┌─────────────┐
│   MongoDB   │
└─────────────┘
```

## Notes

- The frontend proxies API calls to the backend
- MongoDB data persists in a Docker volume named `mongodb_data`
- All services run in a shared network called `toolbox-network`
- The Stock API is optional and can be enabled with the `with-stock-api` profile
- The default `Dockerfile.backend` uses a pre-built JAR for faster builds

## Advanced Build Options

### Multi-stage Build

If you prefer to build the JAR inside Docker (requires internet connectivity):

1. Rename or use the multi-stage Dockerfile:
```bash
docker build -f Dockerfile.backend.multistage -t toolbox-backend .
```

2. Or modify `docker compose.yml` to use:
```yaml
backend:
  build:
    context: .
    dockerfile: Dockerfile.backend.multistage
```

### Building from Scratch

To rebuild everything from scratch:

```bash
# Clean existing build artifacts
./gradlew clean

# Build the JAR
./gradlew build -x test

# Rebuild all Docker images
docker compose build --no-cache
```
