# Use a stable Python base image
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory inside container
WORKDIR /app

# Install system dependencies needed for pandas/numpy
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy dependency file and install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy all backend files
COPY . /app

# Expose the port Render expects
EXPOSE 10000

# Default command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
