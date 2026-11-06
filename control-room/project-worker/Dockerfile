FROM mcr.microsoft.com/playwright/python:v1.64.1-noble
RUN pip install --no-cache-dir playwright==1.64.1 Pillow==12.0.0
WORKDIR /app
COPY worker.py /app/worker.py
USER pwuser
ENV PROJECT_BIND=0.0.0.0
CMD ["python", "/app/worker.py"]
