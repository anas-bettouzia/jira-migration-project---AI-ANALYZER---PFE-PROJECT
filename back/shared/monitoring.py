"""
Prometheus monitoring instrumentation module for Flask applications.
"""

import time

from flask import Flask, Response, request
from prometheus_client import Counter, Gauge, Histogram, REGISTRY, generate_latest

# Define metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=(0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

service_health = Gauge(
    'service_health',
    'Service health status (1=healthy, 0=unhealthy)',
    ['service']
)

active_requests = Gauge(
    'active_requests',
    'Number of active requests',
    ['endpoint']
)


def init_prometheus_metrics(app: Flask, service_name: str):
    """Initialize Prometheus metrics for a Flask application."""

    # Set initial health status
    service_health.labels(service=service_name).set(1)

    @app.before_request
    def before_request():
        """Record request start time and increment active requests."""
        request.start_time = time.time()
        active_requests.labels(endpoint=request.path).inc()

    @app.after_request
    def after_request(response):
        """Record request metrics after response."""

        # Calculate request duration
        duration = time.time() - request.start_time

        # Record metrics
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.path
        ).observe(duration)

        http_requests_total.labels(
            method=request.method,
            endpoint=request.path,
            status=response.status_code
        ).inc()

        active_requests.labels(endpoint=request.path).dec()

        return response

    @app.route('/metrics', methods=['GET'])
    def metrics():
        """Prometheus metrics endpoint."""
        return Response(
            generate_latest(REGISTRY),
            mimetype='text/plain; version=0.0.4; charset=utf-8'
        )

    return app
