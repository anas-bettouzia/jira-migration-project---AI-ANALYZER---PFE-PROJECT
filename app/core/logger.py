import logging

def setup_logger(app):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    app.logger.info("🚀 App started")