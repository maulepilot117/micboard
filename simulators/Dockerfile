FROM python:3.11-slim

WORKDIR /app

COPY shure_simulator.py .

ENV DEVICE_ID=QLXD-SIM
ENV CHANNELS=4
ENV PORT=2202

EXPOSE 2202

CMD ["python", "-u", "shure_simulator.py"]
