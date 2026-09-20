FROM python:3.13-slim
WORKDIR /app
COPY server/requirements.txt /app/server/requirements.txt
RUN pip install --no-cache-dir -r /app/server/requirements.txt
COPY server /app/server
COPY frontend /app/frontend
EXPOSE 8000
CMD ["python","-m","server.main"]
