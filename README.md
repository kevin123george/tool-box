# ToolBox

A full-stack personal finance and productivity tool built with Spring Boot, MongoDB, and Bun.

## Features

- 📝 Memo management with file attachments
- 📈 Stock portfolio tracking
- 💰 Financial goal setting and tracking
- 🏦 Bank account management
- 📊 Real-time stock price updates

## Tech Stack

- **Backend**: Spring Boot 3.5, Java 17
- **Database**: MongoDB 7.0
- **Frontend**: Bun + TypeScript
- **Stock API**: Python Flask + yfinance (optional)

## Quick Start with Docker 🐳

### Prerequisites

- Docker and Docker Compose
- Java 17 (for building the JAR)

### Running the Application

1. **Build the backend JAR**:
   ```bash
   ./gradlew build -x test
   ```

2. **Start all services**:
   ```bash
   docker compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:9099
   - MongoDB: mongodb://localhost:27017

4. **Stop the services**:
   ```bash
   docker compose down
   ```

For more detailed Docker instructions, see [DOCKER.md](DOCKER.md).

## Traditional Deployment

### Prerequisites

- Java 17
- MongoDB running on localhost:27017
- Bun runtime

### Running the Backend

```bash
./gradlew bootRun
```

The backend will start on port 9099.

### Running the Frontend

```bash
cd toolbox-frontend
bun run dev
```

The frontend will start on port 3000.

### Quick Deploy Script

```bash
./start_all.sh
```

This script will:
1. Stop existing services
2. Build the backend
3. Start the backend
4. Start the frontend

## API Endpoints

- `GET /api/memos` - List all memos
- `POST /api/memos` - Create a new memo
- `GET /api/stocks` - List stock holdings
- `POST /api/stocks` - Add a stock holding
- `GET /api/stocks/stats` - Get portfolio statistics
- `GET /api/goals` - List financial goals
- `POST /api/goals` - Create a financial goal

For complete API documentation, explore the controllers in `src/main/java/com/example/mongo/controller/`.

## Development

### Running Tests

```bash
./gradlew test
```

### Code Formatting

```bash
./gradlew spotlessApply
```

### Building

```bash
./gradlew build
```

## Project Structure

```
.
├── src/main/java/com/example/mongo/
│   ├── controller/          # REST API controllers
│   ├── services/            # Business logic
│   ├── models/              # Data models
│   ├── repositories/        # MongoDB repositories
│   └── crons/               # Scheduled tasks
├── toolbox-frontend/
│   ├── src/                 # Frontend TypeScript code
│   └── public/              # Static assets
├── mongo/                   # MongoDB initialization data
├── Dockerfile.backend       # Backend Docker image
├── Dockerfile.frontend      # Frontend Docker image
├── Dockerfile.stockapi      # Stock API Docker image
└── docker-compose.yml       # Docker Compose configuration
```

## Environment Variables

### Backend
- `SPRING_DATA_MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/mongo`)
- `SERVER_PORT` - Server port (default: `9099`)

### Frontend
- `BACKEND_URL` - Backend API URL (default: `http://localhost:9099`)

## License

This project is private and not licensed for public use.

## Contributing

This is a personal project. Contributions are not currently being accepted.
