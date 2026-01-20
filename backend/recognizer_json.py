import os
import json
import numpy as np
import cv2
from insightface.app import FaceAnalysis


class FaceRecognizerJSON:
    def __init__(self, vectors_dir, similarity_threshold=0.3):
        self.vectors_dir = os.path.abspath(vectors_dir)
        self.similarity_threshold = similarity_threshold
        self.known_faces = {}

        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )
        self.app.prepare(ctx_id=0, det_size=(320, 320))

    def load_embeddings(self):
        self.known_faces.clear()

        for f in os.listdir(self.vectors_dir):
            if not f.endswith(".json"):
                continue

            with open(os.path.join(self.vectors_dir, f)) as file:
                d = json.load(file)

            emb = np.array(d["embedding"], dtype=np.float32)
            emb /= np.linalg.norm(emb)

            self.known_faces[d["id"]] = {
                "name": d.get("name"),
                "relation": d.get("relationship", ""),
                "embedding": emb,
            }

        print(f"Loaded {len(self.known_faces)} embeddings")

    @staticmethod
    def cosine(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def process_frame(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces = self.app.get(rgb)

        results = []

        for face in faces:
            emb = face.embedding.astype(np.float32)
            emb /= np.linalg.norm(emb)

            best, score = None, 0
            for p in self.known_faces.values():
                s = self.cosine(emb, p["embedding"])
                if s > score:
                    score = s
                    best = p

            if best and score >= self.similarity_threshold:
                results.append({
                    "name": best["name"],
                    "relation": best["relation"],
                    "confidence": round(float(score), 3),
                    "bbox": face.bbox.astype(int).tolist()
                })
            else:
                results.append({
                    "name": "Unknown",
                    "confidence": round(float(score), 3),
                    "bbox": face.bbox.astype(int).tolist()
                })

        return results
