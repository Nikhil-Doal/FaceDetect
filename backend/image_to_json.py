import cv2
import numpy as np
import uuid
import json
import os
import sys
from insightface.app import FaceAnalysis

# ---------------------------
# Initialize model (ArcFace 512)
# ---------------------------
app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)
app.prepare(ctx_id=0, det_size=(640, 640))

# ---------------------------
# Image → embedding
# ---------------------------
def generate_embedding(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError("Failed to load image")

    faces = app.get(img)
    if len(faces) == 0:
        raise RuntimeError("No face detected")
    if len(faces) > 1:
        raise RuntimeError("Multiple faces detected. Use a single face image.")

    emb = faces[0].embedding.astype(np.float32)
    emb /= np.linalg.norm(emb)

    return emb.tolist()

# ---------------------------
# Main
# ---------------------------
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python image_to_json.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    print("Processing image...")
    embedding = generate_embedding(image_path)

    name = input("Enter name: ").strip()
    relationship = input("Enter relationship: ").strip()

    person_id = uuid.uuid4().hex[:8]

    record = {
        "id": person_id,
        "name": name,
        "relationship": relationship,
        "embedding_dim": 512,
        "embedding": embedding
    }

    os.makedirs("output", exist_ok=True)
    output_path = os.path.join("output", f"{person_id}.json")

    with open(output_path, "w") as f:
        json.dump(record, f, indent=2)

    print(f"Saved: {output_path}")
