"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Silk from "@/components/Silk";
import "./../../globals.css";

export default function AddAcquaintance() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageData(result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } 
      });
      streamRef.current = stream;
      setShowCamera(true);
      setError("");
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
      }, 100);
    } catch (err) {
      setError("Camera access denied");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    setImagePreview(imageDataUrl);
    setImageData(imageDataUrl);
    stopCamera();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!imageData) {
      setError("Please select an image");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      console.log("Token from localStorage:", token ? "exists" : "missing");
      
      if (!token) {
        console.log("No token found, redirecting to login");
        router.push("/login");
        return;
      }

      console.log("Sending request to add acquaintance...");

      const response = await fetch("http://localhost:5000/api/acquaintances/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          relationship: formData.relationship,
          image: imageData,
        }),
      });

      const data = await response.json();
      
      console.log("Response status:", response.status);
      console.log("Response data:", data);

      if (response.ok) {
        setSuccess(true);
        setFormData({ name: "", relationship: "" });
        setImagePreview(null);
        setImageData(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        console.log("Person added successfully, redirecting to home...");
        
        setTimeout(() => {
          router.push("/home");
        }, 1500);
      } else {
        setError(data.error || "Failed to add acquaintance");
      }
    } catch (err) {
      console.error("Add acquaintance error:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10">
      <div className="fixed inset-0 -z-10">
        <Silk 
          color="#747474"
          scale={0.75}
          speed={4}
          noiseIntensity={20}
          rotation={75}
        />
      </div>
      
      {/* Back button */}
      <Link
        href="/home"
        className="absolute top-6 left-6 text-white/60 hover:text-white transition font-serif text-sm"
      >
        ← Back to Home
      </Link>

      <h1 className="font-serif text-7xl mb-6 text-center tracking-tighter text-green-400">
        Add Person
      </h1>
      
      <form
        onSubmit={handleSubmit}
        className="w-1/3 p-6 flex flex-col gap-4 text-white rounded-2xl bg-white/10 glass"
      >
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-full px-4 py-2 text-center">
            ✓ Person added successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-full px-4 py-2 text-center text-sm">
            {error}
          </div>
        )}

        {/* Image Upload with Drag & Drop + Camera */}
        <div className="mt-4">
          {showCamera ? (
            <div className="relative">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/30 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    console.log("Camera loaded");
                  }}
                />
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-2 bg-green-400 hover:bg-green-500 text-black rounded-full font-bold transition-all"
                >
                  📸 Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-6 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : imagePreview ? (
            <div className="relative">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/30">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setImageData(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="absolute top-2 right-2 px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs font-bold transition-all"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`block w-full h-64 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-green-400 bg-green-400/10 scale-[1.02]' 
                    : 'border-white/30 hover:border-white/50 bg-white/5'
                }`}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <svg
                    className={`w-16 h-16 mb-3 transition-colors ${
                      isDragging ? 'text-green-400' : 'text-white/30'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className={`text-sm mb-1 transition-colors ${
                    isDragging ? 'text-green-400 font-bold' : 'text-white/60'
                  }`}>
                    {isDragging ? 'Drop image here!' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-white/40 text-xs">PNG, JPG up to 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-xs">OR</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="w-full py-3 rounded-full bg-white/10 border border-white/30 text-white font-serif text-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo with Camera
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="rounded-full px-3 py-2 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-serif text-xl"
        />

        <select
          value={formData.relationship}
          onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
          className="rounded-full px-3 py-2 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-serif text-xl"
        >
          <option value="" className="bg-slate-900">Select Relationship (Optional)</option>
          <option value="Family" className="bg-slate-900">Family</option>
          <option value="Friend" className="bg-slate-900">Friend</option>
          <option value="Colleague" className="bg-slate-900">Colleague</option>
          <option value="Acquaintance" className="bg-slate-900">Acquaintance</option>
          <option value="Other" className="bg-slate-900">Other</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-white text-black px-6 py-2 font-medium font-serif text-xl mt-4 hover:bg-white/0 hover:text-white border border-white/30 transition-all duration-1000 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Person"}
        </button>
      </form>
    </div>
  );
}