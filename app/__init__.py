from flask import Flask
from flasgger import Flasgger
from app.core.config import Config
from app.core.extensions import mongo, jwt  
from app.core.errors import register_error_handlers
from app.core.logger import setup_logger
from werkzeug.middleware.proxy_fix import ProxyFix

def create_app():
    app = Flask(__name__)
    
    # Elle permet à Flask de respecter les headers envoyés par le serveur de l'entreprise
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    import os
    print("DEBUG MONGO_URI:", os.getenv("MONGO_URI"), flush=True)
    print("DEBUG CONFIG URI:", Config.MONGO_URI, flush=True)
    app.config["MONGO_URI"] = Config.MONGO_URI
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY

    # Init extensions
    mongo.init_app(app)
    jwt.init_app(app)
    
    # --- SWAGGER JWT CONFIGURATION ---
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "My Flask API",
            "description": "API with JWT Authentication",
            "version": "1.0.0"
        },
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Enter the token with the `Bearer ` prefix, e.g. 'Bearer abcde12345'"
            }
        }
    }
    # Swagger
    Flasgger(app, template=swagger_template)

    # Logger
    setup_logger(app)

    # Errors
    register_error_handlers(app)

    # Routes
    from app.api.routes import api
    app.register_blueprint(api, url_prefix="/api")

    return app