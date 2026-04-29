"""
API Gateway service for Jira Migration backend.
Provides authentication and routing for various microservices.
"""

import os
import sys

from flasgger import Swagger
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required
from dotenv import load_dotenv


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# pylint: disable=wrong-import-position
from shared.core.config import Config
from shared.core.errors import register_error_handlers
from shared.core.extensions import jwt, mongo
from shared.core.logger import setup_logger

load_dotenv()

def create_app():
    """Create and configure the API Gateway Flask application."""
    app = Flask(__name__)
    CORS(app)

    app.config["MONGO_URI"] = Config.MONGO_URI
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY

    mongo.init_app(app)
    jwt.init_app(app)

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "JiraMigration API Gateway",
            "description": "API Gateway with JWT Authentication",
            "version": "1.0.0",
        },
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": (
                    "Enter the token with the `Bearer ` prefix, "
                    "e.g. 'Bearer abcde12345'"
                ),
            }
        },
    }
    Swagger(app, template=swagger_template)

    setup_logger(app)
    register_error_handlers(app)

    user_credentials = {
        "email": "admin@test.com",
        "password": "1234",
    }

    @app.route("/api/login", methods=["POST"])
    def login():
        """
        User login endpoint
        ---
        parameters:
          - name: body
            in: body
            required: true
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
        responses:
          200:
            description: Login successful, returns JWT token
          401:
            description: Invalid credentials
        """
        data = request.json
        if (
            data["email"] == user_credentials["email"]
            and data["password"] == user_credentials["password"]
        ):
            token = create_access_token(identity=data["email"])
            return jsonify({"token": token})
        return jsonify({"error": "Invalid credentials"}), 401

    @app.route("/api/analyze", methods=["POST"])
    @jwt_required()
    def analyze():
        """
        Trigger analysis job (Requires JWT)
        ---
        tags:
          - Analysis
        security:
          - Bearer: []
        responses:
          200:
            description: Job created
          401:
            description: Unauthorized
        """
        data = request.json
        result = {"status": "queued", "input": data}
        return jsonify(result)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "gateway"})

    return app


if __name__ == "__main__":
    gateway_app = create_app()
    gateway_app.run(host="0.0.0.0", port=5000, debug=True)
