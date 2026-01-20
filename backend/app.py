from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from dotenv import load_dotenv
import base64
import cv2
import numpy as np
import os

from routes import auth_bp
from recognizer_json import FaceRecognizerJSON

# --------------------
# App / Config
# --------------------
load_dotenv()

app = Flask(__name__)

CORS(
    app,
    origins=["http://localhost:3000"],
    supports_credentials=True
)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "supersecretkey")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "superjwtkey")

jwt = JWTManager(app)

# --------------------
# Blueprints
# --------------------
app.register_blueprint(auth_bp, url_prefix="/api/auth")

# --------------------
# Face Recognizer
# --------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

recognizer = FaceRecognizerJSON(
    vectors_dir=os.path.join(BASE_DIR, "vectors"),
    similarity_threshold=0.3
)
recognizer.load_embeddings()

# --------------------
# Recognition API
# --------------------
# Set to True to require authentication, False for public access
REQUIRE_AUTH = False

def recognize_face():
    """Core recognition logic"""
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    try:
        img_b64 = data["image"]
        # Handle both raw base64 and data URL format
        if "," in img_b64:
            img_b64 = img_b64.split(",")[-1]
        
        img_bytes = base64.b64decode(img_b64)
        np_img = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"error": "Invalid image"}), 400

        results = recognizer.process_frame(frame)
        return jsonify(results)

    except Exception as e:
        print(f"Recognition error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/recognize", methods=["POST"])
def recognize():
    """Public endpoint - no authentication required"""
    if REQUIRE_AUTH:
        return jsonify({"error": "Authentication required"}), 401
    return recognize_face()


@app.route("/api/recognize/secure", methods=["POST"])
@jwt_required()
def recognize_secure():
    """Secure endpoint - requires JWT authentication"""
    return recognize_face()


# --------------------
# Reload Embeddings API
# --------------------
@app.route("/api/reload-embeddings", methods=["POST"])
def reload_embeddings():
    """Reload face embeddings from disk (useful after adding new faces)"""
    try:
        recognizer.load_embeddings()
        count = len(recognizer.known_faces)
        return jsonify({
            "message": f"Reloaded {count} embeddings successfully",
            "count": count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------
# List Known Faces
# --------------------
@app.route("/api/known-faces", methods=["GET"])
def list_known_faces():
    """List all known faces (without embeddings)"""
    faces = []
    for face_id, data in recognizer.known_faces.items():
        faces.append({
            "id": face_id,
            "name": data.get("name"),
            "relation": data.get("relation", "")
        })
    return jsonify(faces)


# --------------------
# Health Check
# --------------------
@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "known_faces": len(recognizer.known_faces),
        "auth_required": REQUIRE_AUTH
    })


# --------------------
# Entrypoint
# --------------------
if __name__ == "__main__":
    print(f"\n{'='*50}")
    print(f"Face Recognition Server Starting...")
    print(f"Known faces loaded: {len(recognizer.known_faces)}")
    print(f"Authentication required: {REQUIRE_AUTH}")
    print(f"{'='*50}\n")
    app.run(debug=True, port=5000)