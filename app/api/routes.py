from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required
from app.services.analysis_service import analyze_data

api = Blueprint("api", __name__)

# Fake user 
USER = {
    "email": "admin@test.com",
    "password": "1234"
}

@api.route("/login", methods=["POST"])
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

    if data["email"] == USER["email"] and data["password"] == USER["password"]:
        token = create_access_token(identity=data["email"])
        return jsonify({"token": token})

    return jsonify({"error": "Invalid credentials"}), 401


@api.route("/analyze", methods=["POST"])
@jwt_required()
def analyze():
    """
    Analyze Data endpoint (Requires JWT)
    ---
    tags:
      - Data
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            sample_data:
              type: string
              example: "data to analyze"
    responses:
      200:
        description: Analysis successful
      401:
        description: Unauthorized (Token missing or invalid)
    """
    data = request.json
    # result = analyze_data(data)
    result = {"status": "analyzed", "input": data} # Mocked for example
    return jsonify(result)


@api.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}